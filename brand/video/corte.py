#!/usr/bin/env python3
"""Corte no ritmo: junta um vídeo de surf a uma música e corta nos tempos dela.

    python3 corte.py surf.mp4 musica.mp3 [--dur 30] [--saida reel.mp4] [--vertical]

O que ele faz, e por quê:

  1. ESCUTA A MÚSICA. Não pede o BPM: descobre. Extrai o áudio, calcula o fluxo espectral
     (o quanto o som "muda" a cada instante, que é o que a gente percebe como batida) e
     acha o andamento por autocorrelação. Depois encaixa a fase, pra saber não só a QUE
     velocidade a música bate, mas EM QUE MOMENTO.

  2. OLHA O VÍDEO. Decodifica ele minúsculo (64x36, cinza) e mede o movimento quadro a
     quadro. Onda quebrando, manobra, spray: movimento. Alguém remando parado: quase nada.
     É esse número que separa "melhor momento" de "tempo morto".

  3. CORTA NA BATIDA. Cada trecho escolhido dura um número INTEIRO de batidas, e começa
     numa batida. É isso que faz o corte "casar" com a música em vez de só acontecer junto.
     Um corte 200ms fora do tempo é percebido como erro mesmo por quem não sabe dizer por quê.

  4. GUARDA O MELHOR PRO REFRÃO. O trecho de maior movimento não vai pro começo: ele vai
     pro ponto de maior energia da MÚSICA. É o que um editor faz sem pensar, e o que um
     script ingênuo nunca faz.

Nada de IA aqui: é medição de sinal, do começo ao fim.
"""

import argparse
import json
import pathlib
import subprocess
import tempfile

import numpy as np
from scipy.signal import stft


# ── ferramentas ──────────────────────────────────────────────────────────────
def rodar(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def duracao(arquivo):
    out = rodar(['ffprobe', '-v', 'quiet', '-print_format', 'json',
                 '-show_format', str(arquivo)]).stdout
    return float(json.loads(out)['format']['duration'])


# ── 1. a música ──────────────────────────────────────────────────────────────
TAXA = 22050


def ler_audio(musica):
    """O áudio vira um vetor de números. É só isso que som é."""
    bruto = rodar(['ffmpeg', '-v', 'quiet', '-i', str(musica),
                   '-ac', '1', '-ar', str(TAXA), '-f', 'f32le', '-']).stdout
    return np.frombuffer(bruto, dtype=np.float32)


def envelope_de_ataque(x):
    """O 'fluxo espectral': o quanto o espectro CRESCE de um instante pro outro.

    Uma batida não é um som alto, é uma MUDANÇA brusca de som. Por isso não basta olhar o
    volume: uma nota longa e forte tem volume alto o tempo todo e não é batida nenhuma.
    O que a gente ouve como batida é energia nova aparecendo, e é exatamente isso que o
    fluxo espectral mede: só a parte que subiu, ignorando a que caiu.
    """
    salto = 256                                   # ~11.6 ms por passo
    _, _, Z = stft(x, fs=TAXA, nperseg=1024, noverlap=1024 - salto)
    S = np.abs(Z)
    diff = np.diff(S, axis=1)
    fluxo = np.sum(np.maximum(diff, 0), axis=0)   # só o que subiu
    fluxo = fluxo - np.median(fluxo)              # tira o "chão" do som
    fluxo = np.maximum(fluxo, 0)
    if fluxo.max() > 0:
        fluxo /= fluxo.max()
    return fluxo, TAXA / salto                    # envelope e quadros por segundo dele


def achar_bpm(env, fps_env, bpm_min=70, bpm_max=180):
    """Autocorrelação: em que atraso o envelope se parece mais consigo mesmo?

    Se a música bate a cada 0,5 s, então o padrão de batidas deslocado em 0,5 s cai quase
    em cima dele mesmo. O atraso que dá a maior semelhança É o intervalo entre batidas.
    """
    env = env - env.mean()
    ac = np.correlate(env, env, mode='full')[len(env) - 1:]
    lag_min = int(fps_env * 60 / bpm_max)
    lag_max = int(fps_env * 60 / bpm_min)
    trecho = ac[lag_min:lag_max]
    lag = lag_min + int(np.argmax(trecho))
    return 60.0 * fps_env / lag, lag


def achar_batidas(env, fps_env, lag):
    """Onde as batidas caem. Sabendo o intervalo, falta descobrir a FASE.

    Testo todos os começos possíveis dentro de um intervalo e fico com o que soma mais
    energia de ataque. É o começo que 'acerta' as batidas em vez de cair no meio delas.
    """
    melhor, melhor_soma = 0, -1
    for inicio in range(lag):
        idx = np.arange(inicio, len(env), lag)
        soma = env[idx].sum()
        if soma > melhor_soma:
            melhor, melhor_soma = inicio, soma
    idx = np.arange(melhor, len(env), lag)
    return idx / fps_env                          # as batidas, em segundos


def pico_da_musica(env, fps_env, dur):
    """O momento de maior energia da música dentro da janela que vamos usar.

    É pra lá que o melhor trecho do vídeo vai. Um refrão com imagem morta é um refrão
    desperdiçado, e a pessoa sente isso mesmo sem saber nomear.
    """
    janela = int(fps_env * 1.5)
    suave = np.convolve(env, np.ones(janela) / janela, mode='same')
    limite = int(fps_env * dur)
    return float(np.argmax(suave[:limite]) / fps_env)


# ── 2. o vídeo ───────────────────────────────────────────────────────────────
def energia_do_video(video, fps=8, larg=64, alt=36):
    """Quanto MOVIMENTO tem em cada instante do vídeo.

    Decodifica em 64x36, cinza. Nesse tamanho não dá pra ver nada, e é de propósito: o que
    interessa não é o que aparece, é o quanto MUDA. Onda quebrando muda tudo; alguém
    boiando não muda quase nada.
    """
    bruto = rodar(['ffmpeg', '-v', 'quiet', '-i', str(video),
                   '-vf', f'fps={fps},scale={larg}:{alt},format=gray',
                   '-f', 'rawvideo', '-']).stdout
    q = np.frombuffer(bruto, dtype=np.uint8)
    n = len(q) // (larg * alt)
    q = q[:n * larg * alt].reshape(n, alt, larg).astype(np.float32)

    mov = np.abs(np.diff(q, axis=0)).mean(axis=(1, 2))
    mov = np.concatenate([[mov[0]], mov]) if len(mov) else np.zeros(1)

    # Corte inútil demais: quadro preto (transição, fade) tem movimento alto e imagem zero.
    brilho = q.mean(axis=(1, 2))
    mov[brilho < 12] = 0

    if mov.max() > 0:
        mov = mov / mov.max()
    return mov, fps


# ── 3. a montagem ────────────────────────────────────────────────────────────
def escolher_trechos(mov, fps_mov, batidas, dur_alvo, batidas_por_corte, pico_musica):
    """Escolhe os trechos e os coloca onde eles rendem mais.

    Cada trecho tem um número inteiro de batidas, e começa numa batida do VÍDEO alinhada à
    grade da música. A escolha é gulosa: pego o de maior movimento, jogo fora tudo que
    encosta nele, pego o próximo. Simples e difícil de enganar.
    """
    if len(batidas) < 2:
        raise SystemExit('não consegui achar batidas nessa música')

    passo = float(np.median(np.diff(batidas)))
    dur_corte = passo * batidas_por_corte
    n_cortes = max(2, int(round(dur_alvo / dur_corte)))

    dur_video = len(mov) / fps_mov
    if dur_video < dur_corte * 2:
        raise SystemExit('o vídeo é curto demais pra render um corte')

    # a nota de cada começo possível: o movimento MÉDIO daquele pedaço
    candidatos = []
    passo_busca = max(1, int(fps_mov * 0.25))      # varre de 0,25 em 0,25 s
    janela = int(dur_corte * fps_mov)
    for i in range(0, len(mov) - janela, passo_busca):
        candidatos.append((float(mov[i:i + janela].mean()), i / fps_mov))
    candidatos.sort(reverse=True)

    # O PISO. Sem ele, o script preenchia o tempo que faltava com o que tivesse: pedia 6
    # cortes, achava 3 momentos bons e completava com imagem morta. Um reel de 30s com 10s
    # parados é pior que um reel de 20s inteiro, porque a pessoa desiste no trecho morto e
    # nunca chega no bom. Agora ele prefere entregar MENOS a entregar enchimento.
    piso = candidatos[0][0] * 0.30 if candidatos else 0

    escolhidos = []
    for nota, t in candidatos:
        if len(escolhidos) >= n_cortes:
            break
        if nota < piso:
            break                                  # daqui pra baixo é tempo morto
        # nada de dois cortes vizinhos: o reel viraria a mesma cena repetida
        if any(abs(t - t2) < dur_corte * 1.2 for _, t2 in escolhidos):
            continue
        escolhidos.append((nota, t))

    if len(escolhidos) < n_cortes:
        falta = (n_cortes - len(escolhidos)) * dur_corte
        print(f'    (só achei {len(escolhidos)} trechos que prestam. O reel sai {falta:.0f}s '
              f'mais curto, e é melhor assim: enchimento é onde a pessoa desiste.)')

    escolhidos.sort(key=lambda e: -e[0])           # o melhor primeiro, por enquanto
    melhor = escolhidos[0]
    resto = escolhidos[1:]
    resto.sort(key=lambda e: e[1])                 # os outros, na ordem em que acontecem

    # O melhor trecho vai pro pico da música, não pro começo do vídeo.
    pos_pico = min(int(round(pico_musica / dur_corte)), len(resto))
    ordem = resto[:pos_pico] + [melhor] + resto[pos_pico:]

    return [t for _, t in ordem], dur_corte


def montar(video, musica, trechos, dur_corte, dur_total, saida, vertical):
    tmp = pathlib.Path(tempfile.mkdtemp())
    pedacos = []

    escala = ('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
              if vertical else
              'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080')

    for i, t in enumerate(trechos):
        p = tmp / f'{i:02d}.mp4'
        # -ss antes do -i busca rápido; o -ss depois busca EXATO. Aqui o exato importa:
        # meio segundo de erro e o corte deixa de cair na batida.
        rodar(['ffmpeg', '-v', 'quiet', '-y', '-ss', f'{t:.3f}', '-i', str(video),
               '-t', f'{dur_corte:.3f}', '-an',
               '-vf', f'{escala},fps=30', '-c:v', 'libx264', '-preset', 'veryfast',
               '-crf', '18', '-pix_fmt', 'yuv420p', str(p)])
        pedacos.append(p)

    lista = tmp / 'lista.txt'
    lista.write_text(''.join(f"file '{p}'\n" for p in pedacos))

    dur = dur_corte * len(pedacos)
    rodar(['ffmpeg', '-v', 'quiet', '-y',
           '-f', 'concat', '-safe', '0', '-i', str(lista),
           '-i', str(musica),
           '-t', f'{dur:.3f}',
           '-af', f'afade=t=out:st={max(0, dur - 1.2):.2f}:d=1.2',
           '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
           '-shortest', str(saida)])
    return dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('musica')
    ap.add_argument('--dur', type=float, default=30, help='duração alvo, em segundos')
    ap.add_argument('--batidas', type=int, default=4, help='batidas por corte (4 = um compasso)')
    ap.add_argument('--saida', default='reel.mp4')
    ap.add_argument('--vertical', action='store_true', help='1080x1920 (story/reels)')
    a = ap.parse_args()

    print('  ouvindo a música…')
    x = ler_audio(a.musica)
    env, fps_env = envelope_de_ataque(x)
    bpm, lag = achar_bpm(env, fps_env)
    batidas = achar_batidas(env, fps_env, lag)
    pico = pico_da_musica(env, fps_env, a.dur)
    print(f'    {bpm:.1f} BPM · {len(batidas)} batidas · o refrão bate aos {pico:.1f}s')

    print('  olhando o vídeo…')
    mov, fps_mov = energia_do_video(a.video)
    print(f'    {len(mov)/fps_mov:.0f}s de imagem, movimento medido a cada {1/fps_mov:.2f}s')

    trechos, dur_corte = escolher_trechos(mov, fps_mov, batidas, a.dur, a.batidas, pico)
    print(f'  cortando: {len(trechos)} trechos de {dur_corte:.2f}s (= {a.batidas} batidas cada)')
    for i, t in enumerate(trechos):
        print(f'    {i+1:2d}. {t:6.2f}s')

    dur = montar(a.video, a.musica, trechos, dur_corte, a.dur, a.saida, a.vertical)
    print(f'\n  pronto: {a.saida}  ({dur:.1f}s, {bpm:.0f} BPM)\n')


if __name__ == '__main__':
    main()
