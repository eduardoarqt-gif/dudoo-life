// Abastecimentos da Garagem (25/11/2026): média de km/l e custo por km de cada carro (a gasolina ou híbrido).
// Mesma conta e mesmos campos do computador (app/services/abastecimentos_service.py): método do tanque cheio — o trecho vai de um
// tanque cheio até o próximo; os litros são os de todos os abastecimentos depois do primeiro (parciais do meio inclusive).
const Abastecimentos = (function () {
  const MODOS = { "": "—", ev: "EV (elétrico)", hev: "HEV (híbrido)" }, USOS = { "": "—", cidade: "Cidade", estrada: "Estrada", misto: "Misto" };
  let x = null, carroId = "";
  const iniciar = (ctx) => { x = ctx; };

  // ------------------------------------------------------------------ conta (pura, testada em testes.js)
  const grupo = (ts) => {
    const km = ts.reduce((s, t) => s + t.km, 0), litros = ts.reduce((s, t) => s + t.litros, 0), valor = ts.reduce((s, t) => s + t.valor, 0);
    return { trechos: ts.length, km, litros, valor, media: litros ? km / litros : null, custo_km: km ? valor / km : null };
  };
  function analisar(itens) {
    const ordem = itens.filter((i) => i.km != null && i.litros > 0).sort((a, b) => (a.km - b.km) || String(a.data).localeCompare(String(b.data)) || String(a.criado_em).localeCompare(String(b.criado_em)));
    const trechos = []; let ref = null, litros = 0, valor = 0;
    for (const i of ordem) {
      if (!ref) { if (i.tanque_cheio !== false) { ref = i; litros = 0; valor = 0; } continue; }
      litros += i.litros; valor += i.valor || 0;
      if (i.tanque_cheio === false) continue;
      const km = i.km - ref.km;
      if (km > 0 && litros > 0) trechos.push({ data: i.data, km_ini: ref.km, km_fim: i.km, km, litros, valor, media: km / litros, custo_km: valor / km, modo: i.modo || "", save: !!i.save_ativo, save_pct: i.save_pct == null ? null : i.save_pct, uso: i.uso || "" });
      ref = i; litros = 0; valor = 0;
    }
    const todosLitros = ordem.reduce((s, i) => s + i.litros, 0), todoValor = ordem.reduce((s, i) => s + (i.valor || 0), 0);
    const resumo = Object.assign(grupo(trechos), { abastecimentos: ordem.length, gasto_total: todoValor, preco_litro: todosLitros ? todoValor / todosLitros : null,
      ultima: trechos.length ? trechos[trechos.length - 1].media : null, melhor: trechos.length ? Math.max(...trechos.map((t) => t.media)) : null, pior: trechos.length ? Math.min(...trechos.map((t) => t.media)) : null });
    const por = (chave) => { const g = {}; trechos.forEach((t) => { const k = chave(t); if (k) (g[k] = g[k] || []).push(t); }); return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, grupo(v)])); };
    return { trechos, resumo, por_modo: por((t) => t.modo), por_save: por((t) => (t.save ? "com" : "sem")), por_uso: por((t) => t.uso), por_mes: por((t) => String(t.data).slice(0, 7)) };
  }
  const fmt = (v) => (v == null ? "—" : Number(v).toFixed(2).replace(".", ","));
  const media = (v) => (v == null ? "—" : fmt(v) + " km/l"), custoKm = (v) => (v == null ? "—" : "R$ " + fmt(v) + "/km");

  // ------------------------------------------------------------------ telas (folha)
  const carro = () => Dados.itens("garagem").find((c) => c.id === carroId);
  const hibrido = () => (carro() || {}).motor === "hibrido";
  const doCarro = () => Dados.itens("abastecimentos").filter((a) => a.carro_id === carroId).sort((a, b) => ((b.km || 0) - (a.km || 0)) || String(b.data).localeCompare(String(a.data)));
  const fatos = (l) => `<div class="fatos">${l.map(([v, r]) => `<div><b>${x.esc(v)}</b><small>${r}</small></div>`).join("")}</div>`;

  function abrir(id) {
    carroId = id || carroId;
    const c = carro(); if (!c) return;
    const itens = doCarro(), a = analisar(itens), r = a.resumo, nomeModo = { ev: "EV", hev: "HEV" }, mesFmt = (m) => `${m.slice(5)}/${m.slice(0, 4)}`;
    const bloco = (titulo, linhas, usaCusto) => `<h2>${titulo}</h2>` + linhas.map(([n, g]) => `<p class="peq" style="margin:2px 0">${x.esc(n)}: <b>${usaCusto ? custoKm(g.custo_km) : media(g.media)}</b> <span style="color:var(--sec)">· ${g.trechos} trecho(s), ${Math.round(g.km)} km</span></p>`).join("");
    const comps = [];
    if (Object.keys(a.por_modo).length > 1 || (Object.keys(a.por_modo).length && hibrido())) comps.push(bloco("Por modo", Object.entries(a.por_modo).map(([k, g]) => [nomeModo[k] || k, g])));
    if (Object.keys(a.por_save).length > 1) comps.push(bloco("Save", Object.entries(a.por_save).map(([k, g]) => [k === "com" ? "Save ligado" : "Save desligado", g])));
    if (Object.keys(a.por_uso).length > 1) comps.push(bloco("Por uso", Object.entries(a.por_uso).map(([k, g]) => [USOS[k] || k, g])));
    const meses = Object.entries(a.por_mes).sort((p, q) => p[0].localeCompare(q[0])).slice(-6);
    if (meses.length > 1) comps.push(bloco("Custo por km, mês a mês", meses.map(([m, g]) => [mesFmt(m), g]), true));
    const mediaDe = new Map(a.trechos.map((t) => [t.km_fim, t]));
    const linhas = itens.map((i) => {
      const t = mediaDe.get(i.km), litro = i.valor && i.litros ? ` · R$ ${fmt(i.valor / i.litros)}/L` : "";
      const partes = [`${fmt(i.litros)} L`, `R$ ${fmt(i.valor)}${litro}`, i.tanque_cheio === false ? "parcial" : "tanque cheio", i.modo ? MODOS[i.modo].split(" ")[0] : "", i.save_ativo ? "Save" + (i.save_pct != null ? ` ${i.save_pct}%` : "") : "", i.uso ? USOS[i.uso].toLowerCase() : "", i.posto || ""].filter(Boolean);
      return `<div class="linha-lugar" data-acao="abast-editar" data-id="${i.id}"><div style="flex:1"><b>${Dados.isoParaBR(i.data)} · ${Math.round(i.km).toLocaleString("pt-BR")} km</b><small>${x.esc(partes.join(" · "))}</small></div>${t ? `<span class="est">${media(t.media)}</span>` : ""}<span>›</span></div>`;
    }).join("");
    const extra = [`${r.abastecimentos} abastecimento(s)`, `gasto total R$ ${fmt(r.gasto_total)}`, r.preco_litro ? `litro a R$ ${fmt(r.preco_litro)}` : ""].filter(Boolean).join(" · ");
    x.abrirFolha(`<div class="linha-titulo"><h2>⛽ ${x.esc(Dados.nomeCarro(c))}</h2><button class="btn p" data-acao="abast-novo">+ Abastecimento</button></div>
      <p class="eyebrow" style="margin-top:0">${hibrido() ? "Híbrido" : "Gasolina"}</p>
      ${fatos([[media(r.media), "média geral"], [custoKm(r.custo_km), "custo por km"], [media(r.ultima), "último trecho"], [media(r.melhor), "melhor trecho"]])}
      <p class="peq" style="color:var(--sec)">${extra}</p>
      ${a.trechos.length ? "" : '<p class="peq" style="color:var(--sec)">A média aparece a partir do segundo tanque cheio: o primeiro é só o ponto de partida.</p>'}
      ${comps.join("")}
      <h2>Histórico</h2>${linhas || '<p class="vazio">Nenhum abastecimento ainda.</p>'}
      <button class="btn" data-acao="fechar" style="margin-top:12px">Fechar</button>`);
  }

  const opcoes = (obj, atual) => Object.entries(obj).map(([k, n]) => `<option value="${k}" ${atual === k ? "selected" : ""}>${n}</option>`).join("");
  const num = (v) => (v == null || v === "" ? "" : String(v).replace(".", ","));
  function form(i) {
    const hib = hibrido();
    x.abrirFolha(`<h2>${i ? "Editar abastecimento" : "Novo abastecimento"}</h2>
      <div class="duas"><label>Data<input id="abData" inputmode="numeric" data-mascara="data" placeholder="DD/MM/AAAA" value="${Dados.isoParaBR(i ? i.data : Dados.hojeISO())}"></label>
        <label>Km atual (odômetro)<input id="abKm" inputmode="numeric" value="${i && i.km != null ? Math.round(i.km) : ""}"></label></div>
      <div class="duas"><label>Valor pago (R$)<input id="abValor" inputmode="decimal" data-mascara="dinheiro" value="${num(i && i.valor)}"></label>
        <label>Litros<input id="abLitros" inputmode="decimal" placeholder="37,5" value="${num(i && i.litros)}"></label></div>
      <label class="op"><input type="checkbox" id="abCheio" ${!i || i.tanque_cheio !== false ? "checked" : ""}> Encheu o tanque <small style="color:var(--sec)">(a média só fecha de um tanque cheio até o próximo)</small></label>
      ${hib ? `<div class="duas"><label>Modo de condução<select id="abModo">${opcoes(MODOS, i ? i.modo || "" : "")}</select></label><label>Uso<select id="abUso">${opcoes(USOS, i ? i.uso || "" : "")}</select></label></div>
        <div class="duas"><label class="op"><input type="checkbox" id="abSave" ${i && i.save_ativo ? "checked" : ""}> Modo Save ativado</label>
          <label>Save em quantos %<input id="abPct" inputmode="numeric" placeholder="30" value="${i && i.save_pct != null ? i.save_pct : ""}"></label></div>`
        : `<label>Uso<select id="abUso">${opcoes(USOS, i ? i.uso || "" : "")}</select></label>`}
      <label>Posto (opcional)<input id="abPosto" value="${x.esc(i ? i.posto || "" : "")}" placeholder="Ex.: Shell da Av. Brasil"></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="abast-voltar">Cancelar</button><button class="btn p" data-acao="abast-salvar" data-id="${i ? i.id : ""}">Salvar</button></div>
      ${i ? `<button class="link perigo" data-acao="abast-excluir" data-id="${i.id}">Excluir</button>` : ""}`);
  }
  function salvar(id) {
    const erro = (t) => { x.$("#fErro").textContent = t; return false; };
    const data = Dados.brParaISO(x.$("#abData").value.trim()); if (!data) return erro("A data precisa estar em DD/MM/AAAA.");
    const km = Dados.numeroBR(x.$("#abKm").value.trim().replace(/\./g, "")), valor = Dados.numeroBR(x.$("#abValor").value), litros = Dados.numeroBR(x.$("#abLitros").value);
    if (!(km > 0)) return erro("Informe o km atual do carro.");
    if (!(valor > 0)) return erro("O valor precisa ser maior que zero.");
    if (!(litros > 0)) return erro("Os litros precisam ser maior que zero.");
    const save = !!(x.$("#abSave") && x.$("#abSave").checked); let pct = null;
    if (save && x.$("#abPct").value.trim() !== "") { pct = Dados.numeroBR(x.$("#abPct").value); if (Number.isNaN(pct) || pct < 0 || pct > 100) return erro("O % do Save vai de 0 a 100."); }
    const campos = { carro_id: carroId, data, valor, litros, km, tanque_cheio: x.$("#abCheio").checked, modo: x.$("#abModo") ? x.$("#abModo").value : "", save_ativo: save, save_pct: save ? pct : null,
      uso: x.$("#abUso").value, posto: x.$("#abPosto").value.trim().replace(/\s+/g, " ") };
    if (id) Dados.atualizar("abastecimentos", id, campos); else Dados.adicionar("abastecimentos", campos);
    return true;
  }

  function acao(a, d) {
    switch (a) {
      case "abastecimentos": abrir(d.id); return true;
      case "abast-novo": form(null); return true;
      case "abast-editar": form(Dados.itens("abastecimentos").find((i) => i.id === d.id)); return true;
      case "abast-voltar": abrir(); return true;
      case "abast-salvar": if (salvar(d.id)) { x.sincronizar("abastecimentos"); abrir(); } return true;
      case "abast-excluir": if (confirm("Excluir este abastecimento?")) { Dados.remover("abastecimentos", d.id); x.sincronizar("abastecimentos"); abrir(); } return true;
    }
    return false;
  }
  return { iniciar, acao, analisar, media, custoKm };
})();
