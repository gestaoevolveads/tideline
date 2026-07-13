#!/usr/bin/env node
/* Notícia nova no celular.
 *
 * Roda logo depois do gerador do feed. Compara o feed recém-publicado com o que já foi
 * avisado e manda push só do que é genuinamente novo.
 *
 * Duas travas, porque notificação de notícia é o caminho mais rápido pra pessoa desligar
 * as notificações do app inteiro (e aí ela perde o alerta de swell, que é o que importa):
 *
 *   1. NO MÁXIMO UMA por rodada. Se saíram três notícias novas, vai a mais recente.
 *   2. SÓ QUEM PEDIU. É um opt-in separado do Alerta Sniper, no perfil da pessoa.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC, VAPID_PRIVATE
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const webpush = require('web-push');

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUB = process.env.VAPID_PUBLIC;
const VAPID_PRIV = process.env.VAPID_PRIVATE;

if (!SB_URL || !SB_KEY) { console.error('faltam as chaves do Supabase'); process.exit(1); }
if (!VAPID_PUB || !VAPID_PRIV) { console.log('sem chaves de push. nada a enviar.'); process.exit(0); }
webpush.setVapidDetails('mailto:gestao@evolveanuncios.com', VAPID_PUB, VAPID_PRIV);

async function sb(caminho, opts = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${caminho}`, {
    ...opts,
    headers: { apikey: SB_KEY, authorization: `Bearer ${SB_KEY}`, 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const corpo = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${corpo.slice(0, 200)}`);
  // O Supabase responde a um INSERT com 201 e corpo VAZIO (a linha só volta se você pedir
  // com Prefer: return=representation). Chamar .json() nisso explode com "Unexpected end
  // of JSON input", e o robô morre bem na hora de gravar o primeiro alerta.
  return corpo ? JSON.parse(corpo) : null;
}

const idDe = (n) => crypto.createHash('sha1').update(n.url || n.title).digest('hex').slice(0, 16);

(async () => {
  const feed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'demo', 'feed.json'), 'utf8'));
  if (!feed.length) { console.log('feed vazio.'); return; }

  const enviadas = await sb('feed_sent?select=hash');
  const jaFoi = new Set(enviadas.map(x => x.hash));

  const novas = feed.filter(n => !jaFoi.has(idDe(n)));
  if (!novas.length) { console.log('nenhuma notícia nova desde a última rodada.'); return; }

  // A primeira vez que isso roda, TODAS as notícias parecem novas. Registrar sem avisar
  // evita disparar oito notificações de uma vez na cara de quem acabou de instalar.
  const primeiraVez = jaFoi.size === 0;
  for (const n of novas) {
    await sb('feed_sent', { method: 'POST', body: JSON.stringify({ hash: idDe(n), titulo: n.title }) });
  }
  if (primeiraVez) { console.log(`primeira rodada: ${novas.length} notícias registradas, sem avisar ninguém.`); return; }

  const noticia = novas[0];                       // a mais recente, já que o feed vem ordenado
  const inscritos = await sb('sniper_config?select=user_id&noticias=eq.true&ativo=eq.true');
  if (!inscritos.length) { console.log('ninguém pediu notícia por push.'); return; }

  let enviados = 0;
  for (const { user_id } of inscritos) {
    const subs = await sb(`push_subs?user_id=eq.${user_id}&select=id,endpoint,p256dh,auth`);
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({
            titulo: noticia.title,
            corpo: `${noticia.source} · toque para ler`,
            praia: 'noticias',                    // agrupa: notícia nova substitui a anterior
            url: '/app.html#feed',
          })
        );
        enviados++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await sb(`push_subs?id=eq.${s.id}`, { method: 'DELETE' });   // aparelho sumiu
        }
      }
    }
  }
  console.log(`"${noticia.title}" → ${enviados} aparelhos (${novas.length - 1} outras novas ficaram só no feed)`);
})().catch(e => { console.error('falhou:', e.message); process.exit(1); });
