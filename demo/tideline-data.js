/* ────────────────────────────────────────────────────────────
   Tideline — Camada de dados
   Usa Supabase se configurado (ao vivo, sem deploy); senão cai
   nos arquivos JSON estáticos. Usada pelo app e pelo painel.
   ──────────────────────────────────────────────────────────── */
window.TLData = (function () {
  const cfg = window.TIDELINE_CONFIG || {};
  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  let _client = null;

  async function client() {
    if (!enabled) return null;
    if (_client) return _client;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return _client;
  }

  // leitura genérica: tabela do Supabase OU arquivo JSON de fallback
  async function load(table, jsonFile, orderCol) {
    const c = await client();
    if (c) {
      let q = c.from(table).select('*');
      if (orderCol) q = q.order(orderCol);
      const { data, error } = await q;
      // só usa o Supabase se ele REALMENTE tem dados; vazio = ainda não semeado,
      // então cai no JSON (evita loja/ranking vazios antes do 1º "Publicar").
      if (!error && Array.isArray(data) && data.length) return data;
    }
    try {
      const r = await fetch('./' + jsonFile + '?v=' + Date.now());
      if (r.ok) return await r.json();
    } catch (e) {}
    return [];
  }

  return {
    enabled,
    client,
    loadProducts: () => load('products', 'products.json', 'id'),
    loadCoupons:  () => load('coupons', 'coupons.json'),
    loadTemplates:() => load('templates', 'templates.json'),
    // ranking: tabela 'rankings' filtrada por gênero, senão ranking-{gender}.json
    async loadRanking(gender) {
      const c = await client();
      if (c) {
        const { data, error } = await c.from('rankings').select('*').eq('gender', gender).order('rank');
        if (!error && Array.isArray(data) && data.length) return data;
      }
      try { const r = await fetch('./ranking-' + gender + '.json?v=' + Date.now()); if (r.ok) return await r.json(); } catch (e) {}
      return [];
    },
    async replaceRanking(gender, rows) {
      const c = await client(); if (!c) return false;
      await c.from('rankings').delete().eq('gender', gender);
      const withGender = rows.map((a, i) => ({ gender, rank: a.rank || i + 1, name: a.name, country: a.country, points: a.points, photo: a.photo || null }));
      const { error } = await c.from('rankings').insert(withGender);
      return !error;
    },
    // escrita (só quando Supabase ativo)
    async upsert(table, row) {
      const c = await client(); if (!c) return false;
      const { error } = await c.from(table).upsert(row);
      return !error;
    },
    async remove(table, idField, idValue) {
      const c = await client(); if (!c) return false;
      const { error } = await c.from(table).delete().eq(idField, idValue);
      return !error;
    },
    async replaceAll(table, rows) {
      const c = await client(); if (!c) return false;
      await c.from(table).delete().neq('id', '___none___'); // limpa
      const { error } = await c.from(table).insert(rows);
      return !error;
    },
  };
})();
