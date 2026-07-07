/* ────────────────────────────────────────────────────────────
   Tideline — Templates de "Minha Temporada" (compartilhado)
   Usado pelo app (card real) e pelo painel (preview real).
   Cada função desenha num canvas 540x960. d = {sessions, praia,
   maiorMar, conquista, period, range}. opts = {colors, photo}.
   ──────────────────────────────────────────────────────────── */
(function () {
  const CB = { deep:'#172726', mid:'#243F3D', muted:'#476664', surface:'#D3E2DE', accent:'#F95831', paper:'#F2EFE9' };
  const FF = '"Helvetica Neue",Helvetica,Arial,sans-serif';

  function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function fit(ctx,t,maxW,base,min,weight){let fs=base;ctx.font=`${weight} ${fs}px ${FF}`;while(ctx.measureText(t).width>maxW&&fs>min){fs--;ctx.font=`${weight} ${fs}px ${FF}`;}return fs;}
  // logotipo oficial: "tide"(fino) + "line"(negrito) + "."(laranja). Retorna a largura total.
  function logo(ctx,x,y,size,col,center){
    ctx.textAlign='left';
    ctx.font=`300 ${size}px ${FF}`;const wt=ctx.measureText('tide').width;
    ctx.font=`700 ${size}px ${FF}`;const wl=ctx.measureText('line').width;const wd=ctx.measureText('.').width;
    const total=wt+wl+wd;const sx=center?x-total/2:x;
    ctx.fillStyle=col;ctx.font=`300 ${size}px ${FF}`;ctx.fillText('tide',sx,y);
    ctx.font=`700 ${size}px ${FF}`;ctx.fillText('line',sx+wt,y);
    ctx.fillStyle=CB.accent;ctx.fillText('.',sx+wt+wl,y);
    return total;
  }

  /* ── GRADE (free) — grade 2x2 clássica, com foto, 3 esquemas de cor ── */
  function grade(ctx,W,H,d,opts){
    const c = opts.colors;
    ctx.fillStyle=c.bg;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=CB.accent;ctx.fillRect(0,0,W,7);
    ctx.textAlign='left';ctx.fillStyle=c.text;ctx.font=`300 34px ${FF}`;const tW=ctx.measureText('tide').width;
    ctx.fillText('tide',28,54);ctx.font=`700 34px ${FF}`;ctx.fillText('line',28+tW,54);
    ctx.fillStyle=CB.accent;ctx.fillText('.',28+tW+ctx.measureText('line').width,54);
    // foto
    const PX=28,PY=88,PW=484,PH=350;rrect(ctx,PX,PY,PW,PH,16);
    if(opts.photo){ctx.save();ctx.clip();const ph=opts.photo,imgR=ph.naturalWidth/ph.naturalHeight,boxR=PW/PH;let sw,sh,sx,sy;
      if(imgR>boxR){sh=ph.naturalHeight;sw=sh*boxR;sx=(ph.naturalWidth-sw)/2;sy=0;}else{sw=ph.naturalWidth;sh=sw/boxR;sx=0;sy=(ph.naturalHeight-sh)/2;}
      ctx.drawImage(ph,sx,sy,sw,sh,PX,PY,PW,PH);ctx.restore();
    }else{ctx.fillStyle=c.card;ctx.fill();const cx=PX+PW/2,cy=PY+PH/2;
      ctx.strokeStyle=c.sub;ctx.lineWidth=2;ctx.beginPath();rrect(ctx,cx-26,cy-20,52,40,6);ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy-2,12,0,7);ctx.stroke();
      ctx.fillStyle=c.sub;ctx.font=`600 12px ${FF}`;ctx.textAlign='center';ctx.fillText('SUA FOTO AQUI',cx,cy+34);ctx.textAlign='left';}
    // grade 2x2
    const GX=28,GY=454,GW=236,GH=128,GG=12;
    const stats=[['SESSÕES',d.sessions],['PRAIA FAVORITA',d.praia],['MAIOR MAR',d.maiorMar],['CONQUISTA',d.conquista]];
    [[0,0],[0,1],[1,0],[1,1]].forEach(([r,col],i)=>{
      const sx=GX+col*(GW+GG),sy=GY+r*(GH+GG);rrect(ctx,sx,sy,GW,GH,12);ctx.fillStyle=c.card;ctx.fill();
      ctx.fillStyle=c.sub;ctx.font=`700 10px ${FF}`;ctx.textAlign='left';ctx.fillText(stats[i][0],sx+14,sy+24);
      ctx.fillStyle=c.num;const fs=fit(ctx,stats[i][1],GW-28,36,16,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.fillText(stats[i][1],sx+14,sy+78);
    });
    ctx.fillStyle=c.sub;ctx.font=`500 12px ${FF}`;ctx.fillText(d.range,28,GY+2*(GH+GG)+28);
    ctx.font=`400 11px ${FF}`;ctx.fillText('tideline.app',28,H-26);
    ctx.fillStyle=CB.accent;ctx.fillRect(0,H-7,W,7);
  }

  /* ── MANCHETE (premium) ── */
  function manchete(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.deep;ctx.fillRect(0,0,W,H);ctx.fillStyle=C.accent;ctx.fillRect(0,0,W,6);
    ctx.textAlign='left';ctx.fillStyle=C.surface;ctx.font=`300 26px ${FF}`;const tw=ctx.measureText('tide').width;
    ctx.fillText('tide',40,64);ctx.font=`700 26px ${FF}`;ctx.fillText('line',40+tw,64);ctx.fillStyle=C.accent;ctx.fillText('.',40+tw+ctx.measureText('line').width,64);
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`600 13px ${FF}`;ctx.textAlign='right';ctx.fillText(d.period,W-40,60);ctx.textAlign='left';
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`700 15px ${FF}`;ctx.fillText('SESSÕES NO MAR',40,340);
    ctx.fillStyle=C.accent;ctx.font=`800 260px ${FF}`;ctx.fillText(d.sessions,32,530);
    ctx.strokeStyle='rgba(211,226,222,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,600);ctx.lineTo(W-40,600);ctx.stroke();
    [['PRAIA FAVORITA',d.praia],['MAIOR MAR',d.maiorMar],['CONQUISTA',d.conquista]].forEach((r,i)=>{const y=660+i*66;
      ctx.fillStyle='rgba(211,226,222,.45)';ctx.font=`700 12px ${FF}`;ctx.textAlign='left';ctx.fillText(r[0],40,y);
      ctx.fillStyle=C.surface;const fs=fit(ctx,r[1],W-260,34,20,'700');ctx.font=`700 ${fs}px ${FF}`;ctx.textAlign='right';ctx.fillText(r[1],W-40,y+2);ctx.textAlign='left';});
    ctx.fillStyle='rgba(211,226,222,.35)';ctx.font=`500 12px ${FF}`;ctx.fillText('MINHA TEMPORADA · tideline.app',40,H-34);
    ctx.fillStyle=C.accent;ctx.fillRect(0,H-6,W,6);
  }

  /* ── BILHETE (premium) ── */
  function bilhete(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.mid;ctx.fillRect(0,0,W,H);
    const m=34,tw=W-2*m,tx=m,ty=104,th=580;ctx.fillStyle=C.paper;rrect(ctx,tx,ty,tw,th,20);ctx.fill();
    const cutY=ty+th*0.66;ctx.fillStyle=C.mid;
    ctx.beginPath();ctx.arc(tx,cutY,15,0,7);ctx.fill();ctx.beginPath();ctx.arc(tx+tw,cutY,15,0,7);ctx.fill();
    ctx.strokeStyle='rgba(23,39,38,.22)';ctx.lineWidth=2;ctx.setLineDash([2,6]);ctx.beginPath();ctx.moveTo(tx+24,cutY);ctx.lineTo(tx+tw-24,cutY);ctx.stroke();ctx.setLineDash([]);
    const lw=logo(ctx,tx+32,ty+52,22,C.deep,false);
    ctx.textAlign='left';ctx.fillStyle=C.accent;ctx.font=`700 11px ${FF}`;ctx.fillText('· PASSE DE TEMPORADA',tx+32+lw+8,ty+49);
    ctx.fillStyle='rgba(23,39,38,.45)';ctx.font=`600 12px ${FF}`;ctx.textAlign='right';ctx.fillText(d.period,tx+tw-32,ty+49);ctx.textAlign='left';
    ctx.strokeStyle='rgba(23,39,38,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx+32,ty+68);ctx.lineTo(tx+tw-32,ty+68);ctx.stroke();
    ctx.fillStyle='rgba(23,39,38,.4)';ctx.font=`700 12px ${FF}`;ctx.fillText('PICO DA TEMPORADA',tx+32,ty+112);
    ctx.fillStyle=C.deep;const fs=fit(ctx,d.praia,tw-64,56,26,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.fillText(d.praia,tx+32,ty+168);
    [['SESSÕES',d.sessions],['MAIOR MAR',d.maiorMar]].forEach((f,i)=>{const fx=tx+32+i*(tw/2-16);
      ctx.fillStyle='rgba(23,39,38,.4)';ctx.font=`700 11px ${FF}`;ctx.fillText(f[0],fx,ty+232);
      ctx.fillStyle=C.accent;ctx.font=`800 48px ${FF}`;ctx.fillText(f[1],fx,ty+284);});
    ctx.fillStyle='rgba(23,39,38,.4)';ctx.font=`700 11px ${FF}`;ctx.fillText('CONQUISTA',tx+32,ty+338);
    ctx.fillStyle=C.deep;ctx.font=`800 30px ${FF}`;ctx.fillText(d.conquista,tx+32,ty+372);
    ctx.fillStyle='rgba(23,39,38,.5)';ctx.font=`600 12px ${FF}`;ctx.fillText('PERÍODO',tx+32,cutY+40);
    ctx.fillStyle=C.deep;ctx.font=`700 16px ${FF}`;ctx.fillText(d.range,tx+32,cutY+64);
    let bx=tx+32;const by=cutY+92;for(let i=0;i<70;i++){const bw=1+((i*7)%3);ctx.fillStyle=C.deep;ctx.fillRect(bx,by,bw,40);bx+=bw+2;if(bx>tx+tw-40)break;}
    ctx.fillStyle='rgba(211,226,222,.6)';ctx.font=`500 12px ${FF}`;ctx.textAlign='center';ctx.fillText('MINHA TEMPORADA · tideline.app',W/2,ty+th+52);ctx.textAlign='left';
  }

  /* ── ONDA (premium) ── */
  function onda(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.deep;ctx.fillRect(0,0,W,H);ctx.fillStyle=C.accent;ctx.fillRect(0,0,W,6);
    ctx.textAlign='left';ctx.fillStyle=C.surface;ctx.font=`300 26px ${FF}`;const tw=ctx.measureText('tide').width;
    ctx.fillText('tide',40,66);ctx.font=`700 26px ${FF}`;ctx.fillText('line',40+tw,66);ctx.fillStyle=C.accent;ctx.fillText('.',40+tw+ctx.measureText('line').width,66);
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`600 13px ${FF}`;ctx.textAlign='right';ctx.fillText(d.period,W-40,62);ctx.textAlign='left';
    ctx.fillStyle=C.surface;ctx.font=`800 210px ${FF}`;ctx.fillText(d.sessions,32,330);
    ctx.fillStyle=C.accent;ctx.font=`700 24px ${FF}`;ctx.fillText('SESSÕES NO MAR',44,380);
    function wv(yB,amp,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,yB);for(let x=0;x<=W;x+=8){ctx.lineTo(x,yB+Math.sin(x/95+yB)*amp);}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();}
    wv(470,24,C.muted);wv(545,28,C.mid);wv(660,24,C.accent);
    ctx.fillStyle='rgba(234,242,239,.55)';for(let i=0;i<44;i++){ctx.beginPath();ctx.arc((i*73)%W,452+((i*29)%36),1.6+((i*13)%2),0,7);ctx.fill();}
    [['PICO',d.praia],['MAIOR MAR',d.maiorMar],['CONQUISTA',d.conquista]].forEach((s,i)=>{const y=752+i*52;
      ctx.fillStyle='rgba(23,39,38,.55)';ctx.font=`700 11px ${FF}`;ctx.textAlign='left';ctx.fillText(s[0],44,y);
      ctx.fillStyle=C.deep;const fs=fit(ctx,s[1],W-230,28,16,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.textAlign='right';ctx.fillText(s[1],W-44,y+2);ctx.textAlign='left';});
    ctx.fillStyle='rgba(23,39,38,.5)';ctx.font=`500 11px ${FF}`;ctx.fillText('MINHA TEMPORADA · tideline.app',44,H-28);
  }

  /* ── SOL RETRÔ (premium) ── */
  function sol(ctx,W,H,d){
    const C=CB;const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#F9A03F');g.addColorStop(.5,C.accent);g.addColorStop(1,C.deep);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const cx=W/2,cy=150;ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
    for(let i=0;i<40;i++){const a=(i/40)*Math.PI*2;ctx.fillStyle=i%2?'rgba(255,255,255,.06)':'rgba(255,255,255,.11)';ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,900,a,a+Math.PI*2/40);ctx.closePath();ctx.fill();}
    ctx.restore();
    ctx.fillStyle=C.paper;ctx.beginPath();ctx.arc(cx,cy,54,0,7);ctx.fill();
    logo(ctx,cx,cy+7,22,C.deep,true);
    ctx.textAlign='center';
    ctx.fillStyle=C.paper;const mt=fit(ctx,'MINHA TEMPORADA',W-80,40,24,'800');ctx.font=`800 ${mt}px ${FF}`;ctx.fillText('MINHA TEMPORADA',cx,300);
    ctx.font=`600 16px ${FF}`;ctx.fillStyle='rgba(245,239,232,.85)';ctx.fillText(d.period,cx,330);
    const bx=40,by=380,bw=W-80,bh=460;ctx.fillStyle='rgba(23,39,38,.35)';rrect(ctx,bx,by,bw,bh,20);ctx.fill();
    [['SESSÕES',d.sessions],['PRAIA FAVORITA',d.praia],['MAIOR MAR',d.maiorMar],['CONQUISTA',d.conquista]].forEach((r,i)=>{const y=by+70+i*108;
      ctx.textAlign='left';ctx.fillStyle='rgba(245,239,232,.6)';ctx.font=`700 12px ${FF}`;ctx.fillText(r[0],bx+30,y);
      ctx.textAlign='right';ctx.fillStyle=C.paper;const fs=fit(ctx,r[1],bw-180,40,22,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.fillText(r[1],bx+bw-30,y+4);
      if(i<3){ctx.strokeStyle='rgba(245,239,232,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bx+30,y+32);ctx.lineTo(bx+bw-30,y+32);ctx.stroke();}});
    ctx.textAlign='center';ctx.fillStyle='rgba(245,239,232,.7)';ctx.font=`500 12px ${FF}`;ctx.fillText('tideline.app',cx,H-34);ctx.textAlign='left';
  }

  // quebra texto em linhas que cabem em maxW; retorna array de linhas
  function wrapLines(ctx,text,maxW,font){ctx.font=font;const words=String(text||'').split(' ');const lines=[];let cur='';
    for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}
    if(cur)lines.push(cur);return lines;}

  /* ══════════ SESSION SHARE (uma sessão só) ══════════
     d = {praia, data, ondaMax, nota, prancha, condicao, frase}
     (dados reais do check-in: waveH, rating, board, notes) */

  /* ── SESSÃO (premium) — recap escuro, maior onda em destaque ── */
  function sessao(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.deep;ctx.fillRect(0,0,W,H);ctx.fillStyle=C.accent;ctx.fillRect(0,0,W,6);
    const lw=logo(ctx,40,62,24,C.surface,false);
    ctx.fillStyle=C.accent;ctx.font=`700 11px ${FF}`;ctx.textAlign='left';ctx.fillText('· SESSÃO',40+lw+8,59);
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`600 13px ${FF}`;ctx.textAlign='right';ctx.fillText(d.data,W-40,59);ctx.textAlign='left';
    ctx.fillStyle='rgba(211,226,222,.45)';ctx.font=`700 13px ${FF}`;ctx.fillText('FUI PRO MAR EM',40,150);
    ctx.fillStyle=C.surface;const fs=fit(ctx,d.praia,W-80,60,28,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.fillText(d.praia,40,212);
    ctx.fillStyle=C.accent;ctx.font=`600 16px ${FF}`;ctx.fillText(d.condicao,40,246);
    ctx.fillStyle=C.accent;ctx.font=`800 200px ${FF}`;ctx.fillText(d.ondaMax,28,500);
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`700 15px ${FF}`;ctx.fillText('MAIOR ONDA',44,548);
    ctx.strokeStyle='rgba(211,226,222,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,596);ctx.lineTo(W-40,596);ctx.stroke();
    [['NOTA',d.nota],['PRANCHA',d.prancha]].forEach((s,i)=>{const x=40+i*(W/2-20);
      ctx.fillStyle='rgba(211,226,222,.45)';ctx.font=`700 12px ${FF}`;ctx.fillText(s[0],x,646);
      ctx.fillStyle=C.surface;const fz=fit(ctx,s[1],W/2-60,40,18,'800');ctx.font=`800 ${fz}px ${FF}`;ctx.fillText(s[1],x,694);});
    if(d.frase){ctx.fillStyle='rgba(211,226,222,.85)';const ls=wrapLines(ctx,'"'+d.frase+'"',W-80,`italic 500 18px ${FF}`);
      ls.slice(0,3).forEach((l,i)=>ctx.fillText(l,40,760+i*26));}
    ctx.fillStyle='rgba(211,226,222,.35)';ctx.font=`500 12px ${FF}`;ctx.fillText('tideline.app',40,H-34);
    ctx.fillStyle=C.accent;ctx.fillRect(0,H-6,W,6);
  }

  /* ── DIÁRIO (premium) — entrada de diário, claro/editorial ── */
  function diario(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.paper;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=C.deep;ctx.fillRect(0,0,W,7);
    const lw=logo(ctx,40,66,24,C.deep,false);
    ctx.fillStyle='rgba(23,39,38,.45)';ctx.font=`600 13px ${FF}`;ctx.textAlign='right';ctx.fillText(d.data,W-40,63);ctx.textAlign='left';
    ctx.strokeStyle='rgba(23,39,38,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(40,92);ctx.lineTo(W-40,92);ctx.stroke();
    ctx.fillStyle='rgba(23,39,38,.4)';ctx.font=`700 12px ${FF}`;ctx.fillText('DIÁRIO DE BORDO',40,150);
    ctx.fillStyle=C.deep;const fs=fit(ctx,d.praia,W-80,58,26,'800');ctx.font=`800 ${fs}px ${FF}`;ctx.fillText(d.praia,40,208);
    ctx.fillStyle=C.accent;ctx.font=`600 17px ${FF}`;ctx.fillText(d.condicao,40,242);
    // 3 stats em coluna com régua
    [['MAIOR ONDA',d.ondaMax],['NOTA',d.nota],['PRANCHA',d.prancha]].forEach((s,i)=>{const y=320+i*96;
      ctx.fillStyle='rgba(23,39,38,.4)';ctx.font=`700 12px ${FF}`;ctx.textAlign='left';ctx.fillText(s[0],40,y);
      ctx.fillStyle=C.deep;const fz=fit(ctx,s[1],W-260,52,22,'800');ctx.font=`800 ${fz}px ${FF}`;ctx.textAlign='right';ctx.fillText(s[1],W-40,y+10);ctx.textAlign='left';
      ctx.strokeStyle='rgba(23,39,38,.1)';ctx.beginPath();ctx.moveTo(40,y+34);ctx.lineTo(W-40,y+34);ctx.stroke();});
    if(d.frase){ctx.fillStyle=C.mid;const ls=wrapLines(ctx,d.frase,W-96,`italic 500 20px ${FF}`);
      ls.slice(0,4).forEach((l,i)=>ctx.fillText(l,40,660+i*30));}
    ctx.fillStyle=C.accent;ctx.font=`700 40px ${FF}`;ctx.fillText('"',40,640);
    ctx.fillStyle='rgba(23,39,38,.5)';ctx.font=`500 12px ${FF}`;ctx.fillText('SESSÃO · tideline.app',40,H-34);
    ctx.fillStyle=C.accent;ctx.fillRect(0,H-7,W,7);
  }

  /* ── PICO (premium) — destaque da maior onda, com gráfico de onda ── */
  function pico(ctx,W,H,d){
    const C=CB;ctx.fillStyle=C.mid;ctx.fillRect(0,0,W,H);
    const lw=logo(ctx,40,64,24,C.surface,false);
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`600 13px ${FF}`;ctx.textAlign='right';ctx.fillText(d.data,W-40,60);ctx.textAlign='left';
    ctx.fillStyle='rgba(211,226,222,.5)';ctx.font=`700 14px ${FF}`;ctx.fillText('MAIOR ONDA DA SESSÃO',40,150);
    ctx.fillStyle=C.surface;ctx.font=`800 200px ${FF}`;ctx.fillText(d.ondaMax,32,320);
    ctx.fillStyle=C.accent;const fp=fit(ctx,d.praia,W-80,40,20,'700');ctx.font=`700 ${fp}px ${FF}`;ctx.fillText(d.praia,40,368);
    ctx.fillStyle='rgba(211,226,222,.6)';ctx.font=`600 15px ${FF}`;ctx.fillText(d.condicao,40,398);
    // ondas gráficas
    function wv(yB,amp,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,yB);for(let x=0;x<=W;x+=8){ctx.lineTo(x,yB+Math.sin(x/95+yB)*amp);}ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();}
    wv(470,22,C.muted);wv(540,26,C.deep);wv(650,22,C.accent);
    ctx.fillStyle='rgba(234,242,239,.5)';for(let i=0;i<40;i++){ctx.beginPath();ctx.arc((i*79)%W,452+((i*31)%34),1.5+((i*11)%2),0,7);ctx.fill();}
    [['NOTA',d.nota],['PRANCHA',d.prancha]].forEach((s,i)=>{const y=756+i*54;
      ctx.fillStyle='rgba(23,39,38,.55)';ctx.font=`700 11px ${FF}`;ctx.textAlign='left';ctx.fillText(s[0],44,y);
      ctx.fillStyle=C.deep;const fz=fit(ctx,s[1],W-240,30,14,'800');ctx.font=`800 ${fz}px ${FF}`;ctx.textAlign='right';ctx.fillText(s[1],W-44,y+4);ctx.textAlign='left';});
    ctx.fillStyle='rgba(23,39,38,.5)';ctx.font=`500 11px ${FF}`;ctx.fillText('SESSÃO · tideline.app',44,H-28);
  }

  const FNS = { grade, manchete, bilhete, onda, sol, sessao, diario, pico };

  // Esquemas de cor da grade (free)
  const S1={bg:'#172726',card:'#243F3D',num:'#F95831',text:'#D3E2DE',sub:'rgba(211,226,222,0.45)'};
  const S2={bg:'#D3E2DE',card:'#FFFFFF',num:'#F95831',text:'#172726',sub:'rgba(23,39,38,0.45)'};
  const S3={bg:'#476664',card:'#172726',num:'#F95831',text:'#D3E2DE',sub:'rgba(211,226,222,0.45)'};

  // Registro. tipo: 'temporada' (agrega o ano) ou 'sessao' (uma sessão só).
  const LIST = [
    // ── Temporada ──
    {id:'grade-noite',  nome:'Noite no Mar',  premium:false, fn:'grade', colors:S1, usaFoto:true, tipo:'temporada'},
    {id:'grade-espuma', nome:'Espuma',        premium:false, fn:'grade', colors:S2, usaFoto:true, tipo:'temporada'},
    {id:'grade-fundo',  nome:'Profundidade',  premium:false, fn:'grade', colors:S3, usaFoto:true, tipo:'temporada'},
    {id:'manchete',     nome:'Manchete',      premium:true,  fn:'manchete', tipo:'temporada'},
    {id:'bilhete',      nome:'Bilhete',       premium:true,  fn:'bilhete',  tipo:'temporada'},
    {id:'onda',         nome:'Onda',          premium:true,  fn:'onda',     tipo:'temporada'},
    {id:'sol',          nome:'Sol Retrô',     premium:true,  fn:'sol',      tipo:'temporada'},
    // ── Session Share (uma sessão) ──
    {id:'sessao',       nome:'Sessão',        premium:true,  fn:'sessao',   tipo:'sessao'},
    {id:'diario',       nome:'Diário',        premium:true,  fn:'diario',   tipo:'sessao'},
    {id:'pico',         nome:'Pico',          premium:true,  fn:'pico',     tipo:'sessao'},
  ];

  function render(ctx, W, H, d, templateId, photo){
    ctx.clearRect(0,0,W,H);
    const t = LIST.find(x=>x.id===templateId) || LIST[0];
    FNS[t.fn](ctx, W, H, d, { colors: t.colors, photo: photo || null });
  }

  window.TLTemplates = { LIST, render, get: id => LIST.find(x=>x.id===id) };
})();
