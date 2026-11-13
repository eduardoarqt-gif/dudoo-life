// Preços de mercados no iPhone (13/11/2026): só LEITURA do quadro que o computador calcula e publica (`precos_quadro`, item "atual").
// A coleta e a cesta ficam no computador (app/services/precos_mercado_service.py); aqui só se consulta.
const Precos = (function () {
  let x = null;
  const TELAS = ["precos"];
  const iniciar = (ctx) => { x = ctx; };
  const reais = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bruto = (s) => String(s == null ? "" : s);
  const dataBR = (iso) => { const t = bruto(iso).slice(0, 10).split("-"); return t.length === 3 && t[0] ? `${t[2]}/${t[1]}/${t[0]}` : ""; };

  // ---- contas puras (testadas em testes.js)
  // Quadro vindo da nuvem: tolera item ausente, formato antigo ou campos faltando. Devolve null se ainda não chegou nada utilizável.
  function parse(doc) {
    const reg = (doc || []).filter((i) => i && !i.excluido_em).sort((a, b) => bruto(b.atualizado_em).localeCompare(bruto(a.atualizado_em)))
      .find((i) => i.quadro && Array.isArray(i.quadro.itens));
    if (!reg) return null;
    const q = reg.quadro;
    return {
      data: q.data || bruto(reg.atualizado_em).slice(0, 10),
      mercados: (Array.isArray(q.mercados) ? q.mercados : []).filter((m) => m && m.chave),
      itens: q.itens.filter((i) => i && i.nome).map((i) => Object.assign({}, i, { precos: i.precos || {} })),
      totais: q.totais || {}, total_comum: q.total_comum || {}, itens_comuns: Number(q.itens_comuns) || 0,
      mercado_mais_barato: q.mercado_mais_barato || "", abaixo_da_media: Array.isArray(q.abaixo_da_media) ? q.abaixo_da_media : [],
    };
  }
  const quadro = () => parse(Dados.itens("precos_quadro"));
  const nomeMercado = (q, ch) => { const m = q.mercados.find((y) => y.chave === ch); return m ? m.nome : ch; };
  // Mercado mais barato de um item: o que o computador marcou (`mais_barato`); sem isso, o menor preço entre os que têm preço.
  function maisBarato(item) {
    const p = item.precos || {};
    if (item.mais_barato && p[item.mais_barato] && Number(p[item.mais_barato].preco) > 0) return item.mais_barato;
    let melhor = "";
    Object.keys(p).forEach((m) => { const v = Number(p[m] && p[m].preco); if (v > 0 && (!melhor || v < Number(p[melhor].preco))) melhor = m; });
    return melhor;
  }
  // Totais por mercado. Total bruto não compara (cada mercado tem um nº de itens): ordena pelo total comum (mesmos itens em todos);
  // quem não tem total comum vem depois, pelo total. `menor` marca o mais barato no total comum (ou, sem total comum, o menor total).
  function ranking(q) {
    const comum = (m) => (q.total_comum[m] == null ? null : Number(q.total_comum[m]));
    const lista = Object.keys(q.totais).map((m) => ({ chave: m, nome: nomeMercado(q, m), total: Number(q.totais[m].total) || 0, itens: Number(q.totais[m].itens) || 0, comum: comum(m) }))
      .filter((r) => r.itens > 0).sort((a, b) => ((a.comum == null) - (b.comum == null)) || ((a.comum == null ? a.total - b.total : a.comum - b.comum)) || a.nome.localeCompare(b.nome, "pt-BR"));
    return lista.map((r, i) => Object.assign(r, { menor: i === 0 }));
  }
  // Mercado do cartão: o `mercado_mais_barato` do quadro; sem ele, o menor `total_comum`.
  function vencedor(q) {
    let ch = q.mercado_mais_barato;
    if (!ch || q.total_comum[ch] == null) { ch = ""; Object.keys(q.total_comum).forEach((m) => { if (!ch || Number(q.total_comum[m]) < Number(q.total_comum[ch])) ch = m; }); }
    return ch ? { chave: ch, nome: nomeMercado(q, ch), total: q.total_comum[ch] == null ? null : Number(q.total_comum[ch]) } : null;
  }
  // Itens agrupados por categoria (ordem alfabética, "Outros" no fim), itens em ordem alfabética.
  function porCategoria(q) {
    const g = {};
    q.itens.forEach((i) => { const c = i.categoria || "Outros"; (g[c] = g[c] || []).push(i); });
    return Object.keys(g).sort((a, b) => ((a === "Outros") - (b === "Outros")) || a.localeCompare(b, "pt-BR"))
      .map((c) => [c, g[c].sort((a, b) => bruto(a.nome).localeCompare(bruto(b.nome), "pt-BR"))]);
  }
  // Preços de um item em todos os mercados, do mais barato pro mais caro.
  function linhasDoItem(q, item) {
    return Object.keys(item.precos).map((m) => Object.assign({ chave: m, nome: nomeMercado(q, m) }, item.precos[m])).filter((p) => Number(p.preco) > 0)
      .sort((a, b) => Number(a.preco) - Number(b.preco)).map((p, i) => Object.assign(p, { menor: i === 0 }));
  }

  // ---- tela
  function tela() {
    const q = quadro(), esc = x.esc, abas = x.abasListas("precos");
    if (!q || !q.itens.length) return `${abas}<p class="vazio">Ainda não sincronizou os preços — abra o Dudoo Life no computador e atualize.</p>`;
    const v = vencedor(q), rk = ranking(q);
    const cartao = v ? `<div class="painel-vidro"><small>Mais barato no total comum${q.itens_comuns ? " · " + q.itens_comuns + " itens em todos" : ""}</small><b>${esc(v.nome)}${v.total != null ? " · " + reais(v.total) : ""}</b></div>` : "";
    const totais = rk.length ? `<h2>Total por mercado</h2>${rk.map((r) => `<div class="linha-lugar"><div><b>${r.menor ? "🏆 " : ""}${esc(r.nome)}</b><small>${r.itens} ${r.itens === 1 ? "item" : "itens"}${r.comum != null ? " · nos itens em comum " + reais(r.comum) : ""}</small></div><b style="${r.menor ? "color:var(--acc)" : ""}">${reais(r.total)}</b></div>`).join("")}` : "";
    const baixo = q.abaixo_da_media.length ? `<h2>Abaixo da média</h2>${q.abaixo_da_media.map((a) => `<div class="linha-lugar"><div><b>${esc(a.nome)}</b><small>${esc(nomeMercado(q, a.mercado))} · média ${reais(a.media)}${a.economia_pct != null ? " · " + Math.round(a.economia_pct) + "% abaixo" : ""}</small></div><b>${reais(a.preco)}</b></div>`).join("")}` : "";
    const grupos = porCategoria(q).map(([c, itens]) => `<h2>${esc(c)}</h2>${itens.map((i) => {
      const m = maisBarato(i), p = m ? i.precos[m] : null;
      return `<div class="linha-lugar" data-acao="preco-item" data-id="${esc(i.item_id || i.nome)}" style="cursor:pointer"><div><b>${esc(i.nome)}</b><small>${p ? "Mais barato: " + esc(nomeMercado(q, m)) : "Sem preço ainda"}</small></div>${p ? `<b>${reais(p.preco)}</b>` : ""}<span>›</span></div>`;
    }).join("")}`).join("");
    return `${abas}<small style="color:var(--ter)">Atualizado em ${dataBR(q.data)}</small>${cartao}${totais}${baixo}${grupos}`;
  }
  function detalhe(id) {
    const q = quadro(); if (!q) return;
    const i = q.itens.find((y) => (y.item_id || y.nome) === id); if (!i) return;
    const esc = x.esc;
    const linhas = linhasDoItem(q, i).map((p) => {
      const un = bruto(p.unidade_base).toLowerCase() === "l" ? "L" : (p.unidade_base || "un");
      const sub = [p.produto ? esc(p.produto) : "", p.comparavel === false ? "outra embalagem" : "",
        Number(p.preco_unitario) > 0 ? `${reais(p.preco_unitario)}/${esc(un)}` : "",
        p.visto_em ? "visto em " + dataBR(p.visto_em) : "",
        p.historico && p.historico.media != null ? `média ${reais(p.historico.media)} · menor ${reais(p.historico.menor)}` : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar"><div><b>${p.menor ? "🏆 " : ""}${esc(p.nome)}</b><small>${sub}</small></div><b>${reais(p.preco)}</b></div>`;
    }).join("");
    x.abrirFolha(`<h2>${esc(i.nome)}</h2>${linhas || '<p class="vazio">Nenhum mercado com preço pra esse item ainda.</p>'}<div class="duas"><button class="btn" data-acao="fechar">Fechar</button></div>`);
  }
  function acao(a, d) {
    if (a === "preco-item") { detalhe(d.id); return true; }
    return false;
  }
  return { iniciar, tela, acao, TELAS, parse, maisBarato, ranking, vencedor, porCategoria, linhasDoItem, dataBR };
})();
