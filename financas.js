// Finanças no iPhone (22/10/2026), atrás do Face ID (o mesmo de Pessoas/Saúde: `Pessoal`). Mesmas telas e contas do computador
// (app/services/financas_service.py + app/ui/telas/tela_financas.py): Visão do mês · Recorrentes · Assinaturas · Planejamento.
// Só LEITURA do resumo que o computador publica (`financas_resumo`: números agregados); a única coisa que se grava aqui é a decisão
// "essencial" / "cortar" de cada gasto recorrente (`financas_marcas`), que vai e volta pela nuvem.
const Financas = (function () {
  let x = null, aba = "mes", mesSel = "";
  const TELAS = ["financas"];
  const iniciar = (ctx) => { x = ctx; Pessoal.iniciar(ctx); };
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const GRUPOS = { despesas: "Despesas fixas", financiamentos: "Financiamentos", cartoes: "Cartões" };
  const ABAS = [["mes", "Visão do mês"], ["recorrentes", "Recorrentes"], ["assinaturas", "Assinaturas"], ["plano", "Planejamento"]];
  const reais = (v) => (Number(v) < 0 ? "-R$ " : "R$ ") + Math.abs(Number(v || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nomeMes = (m, curto) => { const n = Number(String(m).slice(5, 7)); const nome = MESES[n - 1] || m; return curto ? `${nome.slice(0, 3)}/${String(m).slice(0, 4)}` : `${nome[0].toUpperCase()}${nome.slice(1)} de ${String(m).slice(0, 4)}`; };
  const arred = (v) => Math.round(v * 100) / 100;

  // ---- contas puras (testadas em testes.js)
  const resumo = () => { const r = Dados.itens("financas_resumo").sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)))[0]; return r && r.dados && r.dados.meses ? r : null; };
  const marcas = () => { const o = {}; Dados.itens("financas_marcas").forEach((m) => { if (m.chave) o[m.chave] = m.decisao || ""; }); return o; };
  // decisão da pessoa; sem ela, o palpite do app (luz, condomínio, diarista… são essenciais)
  const decisaoDe = (r, mk) => mk[r.base] || (r.essencial_padrao ? "essencial" : "");
  const porPadrao = (r, mk) => !mk[r.base] && !!r.essencial_padrao;
  const recorrentes = (dados, mk) => dados.recorrentes.map((r) => Object.assign({}, r, { decisao: decisaoDe(r, mk), por_padrao: porPadrao(r, mk) }));
  const assinaturas = (dados, mk) => recorrentes(dados, mk).filter((r) => !r.por_padrao && r.assinatura);
  function economia(dados, mk) {
    const cortar = recorrentes(dados, mk).filter((r) => r.decisao === "cortar"), porMes = arred(cortar.reduce((t, r) => t + r.media, 0));
    return { itens: cortar, por_mes: porMes, por_ano: arred(porMes * 12) };
  }
  function planejamento(dados, mk, quantos = 12) {
    const cortar = recorrentes(dados, mk).filter((r) => r.decisao === "cortar");
    return dados.meses.filter((m) => m.mes >= dados.mes_atual).slice(0, quantos).map((m) => {
      const eco = arred(cortar.filter((r) => (r.presentes || []).includes(m.mes)).reduce((t, r) => t + r.media, 0));
      return Object.assign({}, m, { economia_cortando: eco, saldo_cortando: arred(m.saldo + eco) });
    });
  }

  // ---- telas
  function tela() {
    if (!Pessoal.liberado()) return Pessoal.telaTrancada("Finanças", "financas");
    const r = resumo();
    const topo = `${x.voltar}<h1>Finanças</h1><div class="chips">${x.chipsDe(ABAS, aba, "fin-aba")}</div>`;
    if (!r) return `${topo}<p class="vazio">O resumo ainda não chegou. Abra o Dudoo Life no computador (com o financeiro do Dudoo disponível) e deixe sincronizar.</p>
      <button class="link" data-acao="bio-trancar">Trancar</button>`;
    const dados = r.dados, mk = marcas();
    const corpo = { mes: () => visaoMes(dados), recorrentes: () => listaRecorrentes(dados, mk, recorrentes(dados, mk), "Nenhum gasto se repete em 3 meses ou mais ainda."),
      assinaturas: () => listaRecorrentes(dados, mk, assinaturas(dados, mk), "Não achei assinaturas: gastos fixos e pequenos que se repitam por 3 meses ou mais."), plano: () => planejamentoHtml(dados, mk) }[aba]();
    return `${topo}${corpo}<p class="peq">Resumo do computador de ${x.esc(Dados.isoParaBR(String(r.gerado_em || r.atualizado_em).slice(0, 10)))}. Os lançamentos ficam só no computador.</p>
      <button class="link" data-acao="bio-trancar">Trancar</button>`;
  }

  function barra(nome, valor, total) {
    return `<div class="gasto-mes"><div class="topo"><span>${x.esc(nome)}</span><b>${reais(valor)}${total ? " · " + Math.round((valor / total) * 100) + "%" : ""}</b></div>
      <div class="barra-gasto"><i style="width:${total ? Math.min(100, Math.round((valor / total) * 100)) : 0}%"></i></div></div>`;
  }
  function visaoMes(dados) {
    const meses = dados.meses.map((m) => m.mes);
    if (!meses.includes(mesSel)) mesSel = dados.mes_atual;
    const i = meses.indexOf(mesSel), r = dados.meses[i];
    const nav = `<div class="linha-titulo"><button class="btn" data-acao="fin-mes" data-d="-1" ${i <= 0 ? "disabled" : ""} aria-label="Mês anterior">◀</button><h2>${nomeMes(r.mes)}</h2>
      <button class="btn" data-acao="fin-mes" data-d="1" ${i >= meses.length - 1 ? "disabled" : ""} aria-label="Próximo mês">▶</button></div>`;
    const ind = `<div class="indicadores"><div><b>${reais(r.entradas)}</b><small>Entradas</small></div><div><b>${reais(r.saidas)}</b><small>Saídas</small></div>
      <div><b>${reais(r.saldo)}</b><small>Saldo</small></div><div><b>${reais(r.a_pagar)}</b><small>Ainda a pagar</small></div></div>`;
    if (!r.saidas) return `${nav}${ind}<p class="vazio">Nenhuma saída lançada neste mês.</p>`;
    return `${nav}${ind}<h2>Para onde foi</h2>${Object.keys(GRUPOS).map((g) => barra(GRUPOS[g], (r.por_grupo || {})[g] || 0, r.saidas)).join("")}
      <h2>Por origem</h2>${(r.origens || []).map(([o, v]) => barra(o, v, r.saidas)).join("")}
      <h2>Maiores lançamentos</h2>${(r.maiores || []).map((m) => `<div class="linha-lugar"><div><b>${x.esc(m.descricao)}</b><small>${x.esc((GRUPOS[m.grupo] || "") + " · " + m.origem)}</small></div><span class="selo">${reais(m.valor)}</span></div>`).join("")}`;
  }
  function cartaoCorte(dados, mk) {
    const e = economia(dados, mk);
    return `<div class="gasto-mes"><div class="topo"><span>Marcado para cortar</span></div><b>${reais(e.por_mes)} por mês · ${reais(e.por_ano)} por ano</b>
      <small>${e.itens.length ? e.itens.length + " gasto(s): " + x.esc(e.itens.slice(0, 5).map((r) => r.nome).join(", ")) : "Nada marcado ainda. Use “Cortar” nos gastos que você quer eliminar."}</small></div>`;
  }
  function listaRecorrentes(dados, mk, lista, vazio) {
    const total = arred(lista.reduce((t, r) => t + r.media, 0));
    const linhas = lista.map((r) => {
      const variacao = r.maximo === r.minimo ? "" : ` · varia de ${reais(r.minimo)} a ${reais(r.maximo)}`;
      const botao = (d, nome) => `<button class="btn ${r.decisao === d ? "p" : ""}" data-acao="fin-marcar" data-base="${x.esc(r.base)}" data-d="${d}">${nome}</button>`;
      return `<div class="linha-lugar" style="flex-wrap:wrap"><div style="flex:1;min-width:200px"><b ${r.decisao === "essencial" ? 'style="opacity:.6"' : ""}>${x.esc(r.nome)}</b>
        <small>${x.esc(r.origem)} · ${r.meses} meses · média ${reais(r.media)}/mês · ${reais(r.media * 12)}/ano${variacao}${r.futuros ? " · " + r.futuros + " ainda por vir" : ""}</small></div>
        <div class="mini-acoes">${botao("essencial", "Essencial")}${botao("cortar", "Cortar")}</div></div>`;
    }).join("");
    return `${cartaoCorte(dados, mk)}<p class="peq">${lista.length} ${aba === "assinaturas" ? "assinaturas e planos" : "gastos que se repetem"} · ${reais(total)} por mês${aba === "assinaturas" ? " · " + reais(total * 12) + " por ano" : " (parcelas e financiamentos ficam de fora)"}</p>
      ${linhas || `<p class="vazio">${vazio}</p>`}`;
  }
  function planejamentoHtml(dados, mk) {
    const linhas = planejamento(dados, mk, 12), e = economia(dados, mk);
    const cor = (v) => `style="color:var(${v < 0 ? "--erro" : "--ok,#7DB070"})"`;
    return `<p class="peq">Só conta o que já está lançado no Dudoo (despesas fixas, financiamentos e cartões). “Cortando” soma de volta o que você marcou como “Cortar”.</p>
      ${linhas.map((p) => `<div class="gasto-mes"><div class="topo"><b>${nomeMes(p.mes, true)}</b><b ${cor(p.saldo)}>${reais(p.saldo)}</b></div>
        <small>Entradas ${reais(p.entradas)} · Saídas ${reais(p.saidas)} · Parcelas ${reais(p.parcelas)}</small>
        ${p.economia_cortando ? `<small>Cortando: <b ${cor(p.saldo_cortando)}>${reais(p.saldo_cortando)}</b></small>` : ""}</div>`).join("")}
      ${e.por_mes ? `<p class="peq">Cortando o que você marcou: ${reais(e.por_mes)} a mais por mês (${reais(e.por_ano)} por ano).</p>` : ""}`;
  }

  function marcar(base, decisao) {
    const atual = Dados.itens("financas_marcas").find((m) => m.chave === base);
    const nova = atual && atual.decisao === decisao ? "" : decisao;                        // clicar de novo desfaz
    if (atual) Dados.atualizar("financas_marcas", atual.id, { decisao: nova });
    else if (nova) Dados.adicionar("financas_marcas", { chave: base, decisao: nova });
  }
  function acao(a, d) {
    switch (a) {
      case "fin-aba": aba = d.k; x.desenhar(); return true;
      case "fin-mes": { const r = resumo(); if (r) { const ms = r.dados.meses.map((m) => m.mes), i = Math.max(0, Math.min(ms.length - 1, ms.indexOf(mesSel) + Number(d.d))); mesSel = ms[i]; } x.desenhar(); return true; }
      case "fin-marcar": marcar(d.base, d.d); x.desenhar(); x.sincronizar("financas_marcas"); return true;
    }
    return false;
  }
  return { iniciar, tela, acao, TELAS, economia, planejamento, assinaturas, recorrentes, decisaoDe };
})();
