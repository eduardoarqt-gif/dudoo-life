// Dudoo Life — PWA do iPhone: Meu dia, Minha vida (com o bonequinho), Assistente (texto e voz),
// Lugares, Memória e Dados. Mesmos dados do app desktop, pelo repositório privado no GitHub.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const tela = $("#tela"), folha = $("#folha"), estado = $("#estadoSync");
  let atual = "dia", sub = "menu", selecionado = null, bravoTimer = null;
  let filtroLugar = "tudo", camadaMem = "fato";
  const chat = []; let assistente = null, falarRespostas = false, ocupado = false, ouvindo = null;

  const driver = {
    disponivel: () => Nuvem.disponivel(),
    baixar: (n) => Nuvem.baixar(n),
    enviar: (n, d, e) => Nuvem.enviar(n, d, e),
  };
  const Sync = SyncDudoo.criar(driver, (t, ok) => { estado.textContent = t; estado.style.color = ok === true ? "var(--ok)" : ok === false ? "var(--erro)" : ""; });

  // ---------- utilidades ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const saudacao = () => { const h = new Date().getHours(); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; };
  const extenso = () => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sincronizar = (c) => (c ? Sync.colecao(c) : Sync.tudo());

  function bonequinho(bravo) {
    const boca = bravo ? '<path d="M-5 -53 Q0 -58 5 -53" stroke="#f1d2c0" stroke-width="2" fill="none" stroke-linecap="round"/>'
                       : '<path d="M-5 -56 Q0 -52 5 -56" stroke="#f1d2c0" stroke-width="2" fill="none" stroke-linecap="round"/>';
    const sobr = bravo ? '<path d="M-13 -77 L-3 -72 M13 -77 L3 -72" stroke="#241812" stroke-width="3.4" stroke-linecap="round"/>'
                       : '<path d="M-13 -76 Q-8 -79 -3 -76 M13 -76 Q8 -79 3 -76" stroke="#241812" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return `<svg viewBox="-34 -112 68 120" width="46" height="82" aria-hidden="true">
      <ellipse cx="0" cy="2" rx="16" ry="4" fill="rgba(0,0,0,.45)"/>
      <rect x="-12" y="-20" width="9" height="16" rx="4" fill="#18181a" stroke="#1b1410" stroke-width="1.6"/>
      <rect x="3" y="-20" width="9" height="16" rx="4" fill="#18181a" stroke="#1b1410" stroke-width="1.6"/>
      <ellipse cx="-8" cy="-2" rx="8" ry="4.5" fill="#F7F5EF" stroke="#1b1410" stroke-width="1.6"/>
      <ellipse cx="8" cy="-2" rx="8" ry="4.5" fill="#F7F5EF" stroke="#1b1410" stroke-width="1.6"/>
      <rect x="-15" y="-49" width="30" height="31" rx="11" fill="#7B2A57" stroke="#1b1410" stroke-width="1.8"/>
      <ellipse cx="0" cy="-68" rx="20.5" ry="19.5" fill="#D9A579" stroke="#1b1410" stroke-width="1.8"/>
      <path d="M-19.5 -69 Q-24 -88 -9 -94 Q4 -103 19 -93 Q24 -82 19.5 -69 Q15 -79 0 -80 Q-15 -79 -19.5 -69Z" fill="#241812" stroke="#1b1410" stroke-width="1.6"/>
      <path d="M-18 -66 Q-19 -48 0 -47 Q19 -48 18 -66 Q14 -58 0 -58 Q-14 -58 -18 -66Z" fill="#241812"/>
      <ellipse cx="-7.5" cy="-67" rx="4.4" ry="5.2" fill="#fff" stroke="#1b1410" stroke-width="1.3"/>
      <ellipse cx="7.5" cy="-67" rx="4.4" ry="5.2" fill="#fff" stroke="#1b1410" stroke-width="1.3"/>
      <circle cx="-7" cy="-66.5" r="2.6" fill="#1b1410"/><circle cx="8" cy="-66.5" r="2.6" fill="#1b1410"/>
      ${sobr}${boca}${bravo ? '<text x="14" y="-90" font-size="15">💢</text>' : ""}
    </svg>`;
  }

  // ---------- telas ----------
  function telaDia() {
    const e = Dados.estatisticas(), prox = e.proximo;
    const ult = e.ultimos.map((m) => { const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia;
      return `<li><span class="ic" style="color:${t.cor}">${t.icone}</span><div><b>${esc(m.titulo)}</b><small>${Dados.isoParaBR(m.data)}</small></div></li>`; }).join("");
    return `<p class="eyebrow">${esc(extenso())}</p><h1>${saudacao()}, Eduardo</h1>
      <div class="indicadores">
        <div><b>${e.total}</b><small>Momentos</small></div><div><b>${e.viagens}</b><small>Viagens</small></div>
        <div><b>${e.carros}</b><small>Carros</small></div>
        <div><b>${prox ? Dados.diasAte(prox.data) : "—"}</b><small>${prox ? "dias até " + esc(prox.titulo) : "próximo marco"}</small></div>
      </div>
      <h2>Últimos momentos</h2>
      ${ult ? `<ul class="lista">${ult}</ul>` : '<p class="vazio">Nada por aqui ainda. Abra “Minha vida” e conte o primeiro momento.</p>'}`;
  }

  function telaVida() {
    const itens = Dados.itens("momentos"), hoje = Dados.hojeISO();
    if (!itens.length) return `<h1>Minha vida</h1><p class="vazio">Sua linha do tempo está vazia.</p>
      <button class="btn" data-acao="exemplos">Carregar exemplos</button><button class="btn p" data-acao="novo-momento">+ Contar um momento</button>`;
    const sel = (selecionado && itens.find((i) => i.id === selecionado.id)) || itens.filter((i) => i.data <= hoje).slice(-1)[0] || itens[0];
    let ano = null;
    const linhas = itens.slice().reverse().map((m) => {
      const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia, fut = m.data > hoje, on = sel && sel.id === m.id;
      const cab = m.data.slice(0, 4) !== ano ? (ano = m.data.slice(0, 4), `<div class="ano">${ano}</div>`) : "";
      return `${cab}<div class="marco ${on ? "on" : ""} ${fut ? "fut" : ""}" data-id="${m.id}">
        <div class="trilho"><span class="pino" style="border-color:${t.cor};${on ? "background:" + t.cor : ""}">${t.icone}</span></div>
        <div class="cartao"><div class="boneco">${on ? bonequinho(!!bravoTimer) : ""}</div>
          <b>${esc(m.titulo)}</b><small>${t.nome} · ${Dados.isoParaBR(m.data)}${fut ? " · em breve" : ""}${m.local ? " · " + esc(m.local) : ""}</small>
          ${on && m.texto ? `<p>“${esc(m.texto)}”</p>` : ""}
          ${on ? `<div class="mini-acoes"><button class="link" data-acao="editar-momento" data-id="${m.id}">Editar</button><button class="link perigo" data-acao="excluir" data-col="momentos" data-id="${m.id}">Excluir</button></div>` : ""}</div></div>`;
    }).join("");
    return `<div class="linha-titulo"><h1>Minha vida</h1><button class="btn p" data-acao="novo-momento">+ Momento</button></div><div class="caminho">${linhas}</div>`;
  }

  function telaAssistente() {
    const cfg = window.DUDOO_CONFIG || {}, ligado = !!cfg.proxyIA;
    const msgs = chat.map((m) => m.pendencia
      ? `<div class="conf"><small>Confirma?</small><b>${esc(m.pendencia.resumo)}</b>
           <div class="duas"><button class="btn p" data-acao="confirmar" data-i="${m.i}">Confirmar</button><button class="btn" data-acao="cancelar" data-i="${m.i}">Cancelar</button></div></div>`
      : `<div class="bolha ${m.eu ? "eu" : ""} ${m.erro ? "erro-b" : ""}">${esc(m.texto)}</div>`).join("");
    const sug = !chat.length && ligado ? ["Quais viagens eu já fiz?", "Qual é o meu próximo marco?", "Registra um jantar dia 30/10"]
      .map((t) => `<button class="chip" data-acao="sugestao" data-t="${esc(t)}">${esc(t)}</button>`).join("") : "";
    return `<div class="linha-titulo"><h1>Assistente</h1><button class="btn" data-acao="nova-conversa">Nova</button></div>
      ${ligado ? "" : `<div class="aviso"><b>Em preparação</b><p>O assistente ainda não está ligado nesta versão.</p></div>`}
      <div class="chat" id="chat">${msgs || (ligado ? '<p class="vazio">Pergunte ou peça algo ao Dudoo.</p>' : "")}${ocupado ? '<div class="bolha">…</div>' : ""}</div>
      <div class="chips">${sug}</div>
      <div class="entrada"><input id="msg" placeholder="Pergunte ou peça algo…" ${ligado ? "" : "disabled"}>
        ${AssistenteDudoo.Voz.ditadoDisponivel ? `<button class="btn ${ouvindo ? "p" : ""}" data-acao="ditar" aria-label="Falar">🎙</button>` : ""}
        <button class="btn p" data-acao="enviar" ${ligado ? "" : "disabled"}>Enviar</button></div>
      <label class="op"><input type="checkbox" id="falar" ${falarRespostas ? "checked" : ""}> Ler as respostas em voz alta</label>
      <p class="peq">Cofre e Contatinhos nunca são enviados à IA.</p>`;
  }

  function telaMais() {
    if (sub === "lugares") return telaLugares();
    if (sub === "memoria") return telaMemoria();
    if (sub === "dados") return telaDados();
    if (sub === "uso") return telaUso();
    if (sub === "destinos") return telaDestinos();
    return `<h1>Mais</h1>
      <button class="item-menu" data-acao="sub" data-s="lugares"><span>⚑</span>Lugares &amp; Favoritos<small>${Dados.itens("lugares").length} lugares</small></button>
      <button class="item-menu" data-acao="sub" data-s="destinos"><span>⚐</span>Destinos<small>${Dados.itens("destinos").length} destinos</small></button>
      <button class="item-menu" data-acao="sub" data-s="memoria"><span>❖</span>Memória inteligente<small>${Dados.itens("memorias").length} itens</small></button>
      <button class="item-menu" data-acao="sub" data-s="uso"><span>◔</span>Uso da IA<small>US$ ${Dados.resumoUsoIA().custo.toFixed(2).replace(".", ",")} no mês</small></button>
      <button class="item-menu" data-acao="sub" data-s="dados"><span>☁</span>Dados e sincronização<small>${Nuvem.disponivel() ? "sincronizado" : "só neste aparelho"}</small></button>`;
  }
  const voltar = '<button class="link" data-acao="sub" data-s="menu">‹ Mais</button>';

  function telaLugares() {
    const todos = Dados.itens("lugares"), lista = todos.filter((l) => filtroLugar === "tudo" || l.status === filtroLugar);
    const chips = [["tudo", "Todos"]].concat(Object.entries(Dados.STATUS)).map(([k, n]) => `<button class="chip ${k === filtroLugar ? "on" : ""}" data-acao="filtro-lugar" data-k="${k}">${n}</button>`).join("");
    let cid = null;
    const linhas = lista.sort((a, b) => Dados.normalizar(a.cidade).localeCompare(Dados.normalizar(b.cidade)) || Dados.normalizar(a.nome).localeCompare(Dados.normalizar(b.nome))).map((l) => {
      const cab = (l.cidade || "Sem cidade") !== cid ? (cid = l.cidade || "Sem cidade", `<h2>${esc(cid)}</h2>`) : "";
      return `${cab}<div class="linha-lugar"><div><b>${esc(l.nome)}</b><small>${esc(Dados.CATEGORIAS[l.categoria] || "")} · ${esc(Dados.STATUS[l.status] || "")}${l.nota != null ? " · ★ " + String(l.nota).replace(".", ",") : ""}</small></div>
        <button class="link perigo" data-acao="excluir" data-col="lugares" data-id="${l.id}">Excluir</button></div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Lugares</h1><button class="btn p" data-acao="novo-lugar">+ Lugar</button></div>
      <div class="chips">${chips}</div>${linhas || '<p class="vazio">Nenhum lugar por aqui ainda.</p>'}`;
  }

  function telaMemoria() {
    const chips = Object.entries(Dados.CAMADAS).map(([k, n]) => `<button class="chip ${k === camadaMem ? "on" : ""}" data-acao="camada" data-k="${k}">${n}</button>`).join("");
    const lista = Dados.itens("memorias").filter((m) => m.camada === camadaMem).map((m) => `<div class="linha-lugar ${m.ativa === false ? "off" : ""}">
        <div><b>${esc(m.texto)}</b><small>${m.origem === "usuario" ? "você escreveu" : m.origem === "assistente" ? "o assistente guardou" : "inferido"}${m.confianca !== "confirmada" ? " · não confirmada" : ""}</small></div>
        <div class="mini-acoes"><button class="link" data-acao="mem-ativa" data-id="${m.id}">${m.ativa === false ? "Ativar" : "Desativar"}</button>
        <button class="link perigo" data-acao="excluir" data-col="memorias" data-id="${m.id}">Apagar</button></div></div>`).join("");
    return `${voltar}<h1>Memória</h1><p class="peq">Tudo o que o assistente usa para te conhecer. Você corrige, desliga ou apaga.</p>
      <div class="chips">${chips}</div>
      <div class="entrada"><input id="novaMem" placeholder="Algo para lembrar…"><button class="btn p" data-acao="mem-add">Lembrar</button></div>
      <label class="op"><input type="checkbox" id="aprender" ${Dados.aprendizadoLigado(camadaMem) ? "checked" : ""}> Deixar o assistente aprender em “${Dados.CAMADAS[camadaMem]}”</label>
      ${lista || '<p class="vazio">Nada guardado nesta camada.</p>'}`;
  }

  function telaDestinos() {
    const itens = Dados.itens("destinos").slice().sort((a, b) =>
      (a.tipo !== "pais") - (b.tipo !== "pais") || Dados.normalizar(a.pais || a.nome).localeCompare(Dados.normalizar(b.pais || b.nome)) || Dados.normalizar(a.nome).localeCompare(Dados.normalizar(b.nome)));
    const linhas = itens.map((d) => {
      const nota = d.nota != null && d.nota !== "" ? ` · ★ ${String(d.nota).replace(".", ",")}` : "";
      const rep = d.repetiria ? ` · ${esc(Dados.REPETIRIA[d.repetiria] || "")}` : "";
      const resumo = esc((d.gostei || d.nao_gostei || d.dicas || "").slice(0, 90));
      return `<div class="linha-lugar" data-acao="editar-destino" data-id="${d.id}"><div><b>${esc(d.nome)}</b>
        <small>${d.tipo === "pais" ? "País" : esc(d.pais || "Cidade")}${nota}${rep}</small>${resumo ? `<small>${resumo}</small>` : ""}</div><span>›</span></div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Destinos</h1><button class="btn p" data-acao="novo-destino">+ Destino</button></div>
      <p class="peq">O que você gostou (ou não) em cada lugar. Vira memória para o assistente.</p>
      ${linhas || '<p class="vazio">Nenhum destino ainda. Eles chegam do computador ou do planejador.</p>'}`;
  }

  function telaUso() {
    const r = Dados.resumoUsoIA(), usd = (v) => "US$ " + (v >= 0.01 ? v.toFixed(2) : v.toFixed(4)).replace(".", ",");
    const nomes = { assistente: "Assistente (conversa)", classificar_peca: "Guarda-roupa · reconhecer peça", memoria: "Memória inteligente" };
    const linhas = Object.entries(r.porFuncao).sort((a, b) => b[1].custo - a[1].custo).map(([f, d]) =>
      `<div class="linha-lugar"><div><b>${esc(nomes[f] || f)}</b><small>${d.chamadas} chamadas · ${d.entrada} entrada · ${d.saida} saída</small></div><b>${usd(d.custo)}</b></div>`).join("");
    const orig = Object.entries(r.porOrigem).map(([o, v]) => `${o === "iphone" ? "iPhone" : "Computador"} ${usd(v)}`).join(" · ");
    return `${voltar}<h1>Uso da IA</h1>
      <div class="bloco"><h2>Este mês</h2><p><b>${usd(r.custo)}</b> em ${r.chamadas} chamadas</p><p class="peq">Hoje: ${usd(r.hoje)}${orig ? " · " + orig : ""}</p></div>
      <h2>Por função</h2>${linhas || '<p class="vazio">Nenhuma chamada registrada neste mês.</p>'}
      <p class="peq">Estimativa pelos tokens informados pela OpenAI e preços de tabela; o limite mensal e a cotação ficam no app do computador.</p>`;
  }

  function telaDados() {
    const ligado = Nuvem.disponivel();
    return `${voltar}<h1>Dados</h1>
      <div class="bloco"><h2>Sincronização</h2>
        <p class="peq">${ligado ? "Conectado ao repositório privado " + esc(Nuvem.repo()) + ". Os dados são os mesmos do computador."
          : "Cole o token do GitHub (restrito ao repositório " + esc(Nuvem.repo()) + ") para usar os mesmos dados do computador."}</p>
        <input id="tokenGit" class="campo" type="password" placeholder="Token do GitHub" value="${esc(Nuvem.token())}">
        <button class="btn p" data-acao="salvar-github">Salvar e sincronizar</button>
        ${ligado ? '<button class="btn" data-acao="sincronizar">Sincronizar agora</button>' : ""}</div>
      <div class="bloco"><h2>Arquivos</h2>
        <button class="btn" data-acao="importar">Importar momentos.json</button>
        <button class="btn" data-acao="exportar">Copiar dados (JSON)</button>
        <button class="btn" data-acao="exemplos">Carregar exemplos</button>
        <input type="file" id="arquivo" accept=".json,application/json" hidden></div>
      <div class="bloco"><h2>Assistente</h2>
        <p class="peq">Token do assistente — é o mesmo token do Dudoo Web (fica só neste aparelho).</p>
        <input id="tokenIA" class="campo" type="password" placeholder="Token" value="${esc(localStorage.getItem("dudoolife.tokenIA") || "")}">
        <button class="btn" data-acao="salvar-token">Salvar token</button></div>`;
  }

  const TELAS = { dia: telaDia, vida: telaVida, assistente: telaAssistente, mais: telaMais };

  function desenhar() {
    const foco = document.activeElement && document.activeElement.id, val = foco && document.activeElement.value;
    tela.innerHTML = TELAS[atual]();
    document.querySelectorAll(".abas button").forEach((b) => b.classList.toggle("on", b.dataset.tela === atual));
    if (foco && $("#" + foco) && val != null) { $("#" + foco).value = val; $("#" + foco).focus(); }
    const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight;
  }

  // ---------- folhas (formulários) ----------
  function abrirFolha(html) { folha.hidden = false; folha.innerHTML = `<div class="painel">${html}</div>`; }
  function fecharFolha() { folha.hidden = true; folha.innerHTML = ""; }

  function formMomento(m) {
    const op = Object.entries(Dados.TIPOS).map(([k, v]) => `<option value="${k}" ${m && m.tipo === k ? "selected" : ""}>${v.icone} ${v.nome}</option>`).join("");
    abrirFolha(`<h2>${m ? "Editar momento" : "Contar um momento"}</h2>
      <label>Título<input id="fTitulo" value="${esc(m ? m.titulo : "")}" placeholder="Ex.: Viagem para Lisboa"></label>
      <div class="duas"><label>Tipo<select id="fTipo">${op}</select></label>
      <label>Data<input id="fData" inputmode="numeric" placeholder="DD/MM/AAAA" value="${Dados.isoParaBR(m ? m.data : Dados.hojeISO())}"></label></div>
      <label>Onde<input id="fLocal" value="${esc(m ? m.local || "" : "")}" placeholder="Cidade, lugar…"></label>
      <label>Como foi<textarea id="fTexto" rows="3">${esc(m ? m.texto || "" : "")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-momento" data-id="${m ? m.id : ""}">Salvar</button></div>`);
  }
  function formDestino(d) {
    const rep = Object.entries(Dados.REPETIRIA).map(([k, n]) => `<option value="${k}" ${d && d.repetiria === k ? "selected" : ""}>${n}</option>`).join("");
    const v = (k) => esc(d ? d[k] || "" : "");
    abrirFolha(`<h2>${d ? esc(d.nome) : "Novo destino"}</h2>
      <label>Destino<input id="dNome" value="${v("nome")}" placeholder="Ex.: Tailândia ou Lisboa"></label>
      <div class="duas"><label>Tipo<select id="dTipo"><option value="pais" ${!d || d.tipo === "pais" ? "selected" : ""}>País</option><option value="cidade" ${d && d.tipo === "cidade" ? "selected" : ""}>Cidade</option></select></label>
      <label>País (cidades)<input id="dPais" value="${v("pais")}"></label></div>
      <div class="duas"><label>Minha nota (0–10)<input id="dNota" inputmode="decimal" value="${d && d.nota != null ? String(d.nota).replace(".", ",") : ""}"></label>
      <label>Repetiria?<select id="dRep">${rep}</select></label></div>
      <label>O que gostei<textarea id="dGostei" rows="2">${v("gostei")}</textarea></label>
      <label>O que não gostei<textarea id="dNao" rows="2">${v("nao_gostei")}</textarea></label>
      <label>Dicas<textarea id="dDicas" rows="2">${v("dicas")}</textarea></label>
      <label>Melhor época<input id="dEpoca" value="${v("melhor_epoca")}"></label>
      <label>Hotel favorito<input id="dHotel" value="${v("hotel_favorito")}"></label>
      <label>Onde comer<input id="dComida" value="${v("comida_favorita")}"></label>
      <label>Evitar<input id="dEvitar" value="${v("evitar")}"></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-destino" data-id="${d ? d.id : ""}">Salvar</button></div>`);
  }
  function formLugar() {
    const cats = Object.entries(Dados.CATEGORIAS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
    const sts = Object.entries(Dados.STATUS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
    abrirFolha(`<h2>Novo lugar</h2>
      <label>Nome<input id="lNome" placeholder="Ex.: Maní"></label>
      <div class="duas"><label>Categoria<select id="lCat">${cats}</select></label><label>Situação<select id="lSt">${sts}</select></label></div>
      <label>Cidade<input id="lCidade" placeholder="São Paulo"></label>
      <label>Anotações<textarea id="lNotas" rows="2"></textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-lugar">Salvar</button></div>`);
  }

  // ---------- assistente ----------
  function obterAssistente() { if (!assistente) assistente = AssistenteDudoo.criar(); return assistente; }
  async function enviarMensagem(texto) {
    texto = (texto || "").trim(); if (!texto || ocupado) return;
    chat.push({ eu: true, texto }); ocupado = true; desenhar();
    try {
      const r = await obterAssistente().enviar(texto);
      if (r.texto) { chat.push({ texto: r.texto }); if (falarRespostas) AssistenteDudoo.Voz.falar(r.texto); }
      r.pendencias.forEach((p) => chat.push({ pendencia: p, i: chat.length }));
    } catch (e) { chat.push({ texto: e.message, erro: true }); }
    ocupado = false; desenhar();
  }

  // ---------- eventos ----------
  document.addEventListener("click", async (ev) => {
    const aba = ev.target.closest(".abas button");
    if (aba) { atual = aba.dataset.tela; sub = "menu"; desenhar(); return; }
    const marco = ev.target.closest(".marco");
    if (marco && atual === "vida" && !ev.target.closest("[data-acao]")) {
      selecionado = Dados.itens("momentos").find((i) => i.id === marco.dataset.id) || null;
      clearTimeout(bravoTimer); bravoTimer = setTimeout(() => { bravoTimer = null; desenhar(); }, 1500); desenhar(); return;
    }
    const el = ev.target.closest("[data-acao]"); if (!el) return;
    const d = el.dataset, acao = d.acao;
    switch (acao) {
      case "novo-momento": formMomento(null); break;
      case "editar-momento": formMomento(Dados.itens("momentos").find((m) => m.id === d.id)); break;
      case "novo-lugar": formLugar(); break;
      case "novo-destino": formDestino(null); break;
      case "editar-destino": formDestino(Dados.itens("destinos").find((x) => x.id === d.id)); break;
      case "salvar-destino": {
        const nome = $("#dNome").value.trim(); if (!nome) { $("#fErro").textContent = "Dê um nome ao destino."; return; }
        const bruta = $("#dNota").value.trim().replace(",", "."), nota = bruta === "" ? null : Number(bruta);
        if (nota !== null && (!Number.isFinite(nota) || nota < 0 || nota > 10)) { $("#fErro").textContent = "A nota vai de 0 a 10."; return; }
        const tipo = $("#dTipo").value;
        const outro = Dados.itens("destinos").find((x) => x.id !== d.id && x.tipo === tipo && Dados.normalizar(x.nome) === Dados.normalizar(nome));
        if (outro) { $("#fErro").textContent = "Esse destino já está cadastrado."; return; }
        const campos = { nome, tipo, pais: $("#dPais").value.trim(), nota, repetiria: $("#dRep").value, gostei: $("#dGostei").value.trim(),
          nao_gostei: $("#dNao").value.trim(), dicas: $("#dDicas").value.trim(), melhor_epoca: $("#dEpoca").value.trim(),
          hotel_favorito: $("#dHotel").value.trim(), comida_favorita: $("#dComida").value.trim(), evitar: $("#dEvitar").value.trim() };
        let id = d.id;
        if (id) Dados.atualizar("destinos", id, campos); else id = Dados.adicionar("destinos", Object.assign({ memorias: {} }, campos)).id;
        Dados.sincronizarMemoriaDestino(id);
        fecharFolha(); desenhar(); sincronizar("destinos"); sincronizar("memorias"); break;
      }
      case "fechar": fecharFolha(); break;
      case "salvar-momento": {
        const titulo = $("#fTitulo").value.trim(), iso = Dados.brParaISO($("#fData").value);
        if (!titulo) { $("#fErro").textContent = "Dê um título ao momento."; return; }
        if (!iso) { $("#fErro").textContent = "A data precisa estar em DD/MM/AAAA."; return; }
        const campos = { titulo, tipo: $("#fTipo").value, data: iso, texto: $("#fTexto").value.trim(), local: $("#fLocal").value.trim() };
        if (d.id) Dados.atualizar("momentos", d.id, campos);
        else Dados.adicionar("momentos", Object.assign({ privado: false, pessoas: [] }, campos));
        fecharFolha(); desenhar(); sincronizar("momentos"); break;
      }
      case "salvar-lugar": {
        const nome = $("#lNome").value.trim(), cidade = $("#lCidade").value.trim();
        if (!nome) { $("#fErro").textContent = "Dê um nome ao lugar."; return; }
        if (Dados.lugarDuplicado(nome, cidade)) { $("#fErro").textContent = "Esse lugar já está cadastrado."; return; }
        Dados.adicionar("lugares", { nome, categoria: $("#lCat").value, cidade, pais: "", status: $("#lSt").value, nota: null, notas: $("#lNotas").value.trim(), link_maps: "", viagens: [] });
        fecharFolha(); desenhar(); sincronizar("lugares"); break;
      }
      case "excluir": if (confirm("Excluir este item?")) { Dados.remover(d.col, d.id); desenhar(); sincronizar(d.col); } break;
      case "exemplos": Dados.semearExemplos(); desenhar(); sincronizar("momentos"); break;
      case "sub": sub = d.s; desenhar(); break;
      case "filtro-lugar": filtroLugar = d.k; desenhar(); break;
      case "camada": camadaMem = d.k; desenhar(); break;
      case "mem-add": {
        const t = $("#novaMem").value.trim(); if (!t) return;
        if (Dados.itens("memorias").some((m) => Dados.normalizar(m.texto) === Dados.normalizar(t))) { alert("Isso já está na memória."); return; }
        Dados.adicionar("memorias", { camada: camadaMem, texto: t, origem: "usuario", confianca: "confirmada", ativa: true });
        desenhar(); sincronizar("memorias"); break;
      }
      case "mem-ativa": { const m = Dados.itens("memorias").find((x) => x.id === d.id); if (m) { Dados.atualizar("memorias", d.id, { ativa: m.ativa === false }); desenhar(); sincronizar("memorias"); } break; }
      case "importar": $("#arquivo").click(); break;
      case "exportar": try { await navigator.clipboard.writeText(Dados.exportarTexto("momentos")); alert("Dados copiados."); } catch (e) { prompt("Copie:", Dados.exportarTexto("momentos")); } break;
      case "salvar-github": Nuvem.definirToken($("#tokenGit").value); estado.textContent = "Sincronizando…"; await sincronizar(); desenhar(); break;
      case "sincronizar": await sincronizar(); desenhar(); break;
      case "salvar-token": localStorage.setItem("dudoolife.tokenIA", $("#tokenIA").value.trim()); alert("Token salvo neste aparelho."); break;
      case "enviar": { const i = $("#msg"); const t = i.value; i.value = ""; enviarMensagem(t); break; }
      case "sugestao": enviarMensagem(d.t); break;
      case "nova-conversa": chat.length = 0; if (assistente) assistente.limpar(); desenhar(); break;
      case "confirmar": {
        const item = chat.find((m) => m.pendencia && m.i === +d.i); if (!item) break;
        const r = obterAssistente().confirmar(item.pendencia);
        chat.splice(chat.indexOf(item), 1);
        chat.push(r.status === "criado" ? { texto: "Feito! Já está registrado." } : { texto: r.erro || "Não consegui gravar.", erro: true });
        desenhar(); sincronizar(); break;
      }
      case "cancelar": { const item = chat.find((m) => m.pendencia && m.i === +d.i); if (item) chat.splice(chat.indexOf(item), 1); desenhar(); break; }
      case "ditar": {
        if (ouvindo) { try { ouvindo.stop(); } catch (e) {} ouvindo = null; desenhar(); break; }
        ouvindo = AssistenteDudoo.Voz.ditar((t) => { ouvindo = null; enviarMensagem(t); }, () => { ouvindo = null; desenhar(); }, (e) => { ouvindo = null; alert(e.message); });
        desenhar(); break;
      }
    }
  });
  document.addEventListener("change", async (ev) => {
    if (ev.target.id === "falar") { falarRespostas = ev.target.checked; if (!falarRespostas) AssistenteDudoo.Voz.parar(); return; }
    if (ev.target.id === "aprender") { Dados.definirAprendizado(camadaMem, ev.target.checked); return; }
    if (ev.target.id !== "arquivo" || !ev.target.files[0]) return;
    try { Dados.substituir("momentos", JSON.parse(await ev.target.files[0].text())); atual = "vida"; desenhar(); sincronizar("momentos"); }
    catch (e) { alert("Não consegui ler o arquivo: " + e.message); }
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.id === "msg") { const t = ev.target.value; ev.target.value = ""; enviarMensagem(t); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar().then(desenhar); });

  // ---------- partida ----------
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  estado.textContent = Nuvem.disponivel() ? "Sincronizando…" : "Só neste aparelho";
  desenhar();
  if (Nuvem.disponivel()) sincronizar().then(desenhar);
})();
