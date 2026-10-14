// Dudoo Life — PWA do iPhone: Meu dia, Minha vida (com o bonequinho), Assistente (texto e voz),
// Lugares, Memória e Dados. Mesmos dados do app desktop, pelo repositório privado no GitHub.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const tela = $("#tela"), folha = $("#folha"), estado = $("#estadoSync");
  let atual = "dia", sub = "menu", selecionado = null, bravoTimer = null;
  let filtroLugar = "tudo", camadaMem = "fato", filtroTarefa = "abertas", soFaltam = true, filtroReceita = "tudo", filtroFilme = "quero", filtroBucket = "abertos", filtroCarro = "tudo", carroSel = null, palco = null;
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
    const e = Dados.estatisticas(), prox = e.proximo, rt = Dados.resumoTarefas();
    const ult = e.ultimos.map((m) => { const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia;
      return `<li><span class="ic">${t.icone}</span><div><b>${esc(m.titulo)}</b><small>${Dados.isoParaBR(m.data)}</small></div></li>`; }).join("");
    const painelViagem = prox
      ? `<button class="painel-vidro" data-acao="aba" data-t="vida"><small>Próxima viagem</small><b>${esc(prox.titulo)}</b>
          <small>${Dados.diasAte(prox.data)} dias · ${Dados.isoParaBR(prox.data)}</small></button>` : "";
    const painelTarefas = rt.abertas
      ? `<button class="painel-vidro" data-acao="ir-tarefas"><small>Tarefas</small><b>${rt.hoje ? rt.hoje + " para hoje" : rt.abertas + " em aberto"}</b>
          <small>${rt.atrasadas ? rt.atrasadas + " atrasada(s) · " : ""}${rt.abertas} no total</small></button>` : "";
    return `<section class="abertura">
        <p class="eyebrow">${esc(extenso())}</p>
        <h1 class="hero">${saudacao()}, Eduardo.<span>Tudo certo por aí?</span></h1>
        <div class="vao"></div>
        <div class="paineis">${painelViagem}${painelTarefas}</div>
        <button class="busca-ia" data-acao="aba" data-t="assistente"><span>Pergunte ao Dudoo…</span><span>🎙</span></button>
      </section>
      <div class="atalhos"><button class="chip on" data-acao="sub-mais" data-s="mercado">Supermercado</button>
        <button class="chip" data-acao="sub-mais" data-s="garagem">Garagem</button>
        <button class="chip" data-acao="sub-mais" data-s="bucket">Bucket list</button></div>
      <div class="indicadores" style="margin-top:22px">
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
    if (sub === "tarefas") return telaTarefas();
    if (sub === "mercado") return telaMercado();
    if (sub === "garagem") return telaGaragem();
    if (sub === "receitas") return telaReceitas();
    if (sub === "filmes") return telaFilmes();
    if (sub === "bucket") return telaBucket();
    const rt = Dados.resumoTarefas(), faltam = Dados.itens("supermercado").filter((i) => !i.comprado).length;
    return `<h1>Mais</h1>
      <button class="item-menu" data-acao="sub" data-s="garagem"><span>◉</span>Garagem &amp; Wishlist<small>${Dados.itens("garagem").length} carros</small></button>
      <button class="item-menu" data-acao="sub" data-s="mercado"><span>🛒</span>Supermercado<small>${faltam} para comprar</small></button>
      <button class="item-menu" data-acao="sub" data-s="receitas"><span>♨</span>Receitas<small>${Dados.itens("receitas").length} receitas</small></button>
      <button class="item-menu" data-acao="sub" data-s="filmes"><span>▶</span>Filmes e séries<small>${Dados.itens("filmes").filter((t) => t.status === "quero").length} na fila</small></button>
      <button class="item-menu" data-acao="sub" data-s="bucket"><span>★</span>Bucket list<small>${Dados.itens("bucket").filter((x) => x.status === "realizado").length} de ${Dados.itens("bucket").length} realizados</small></button>
      <button class="item-menu" data-acao="sub" data-s="tarefas"><span>☑</span>Tarefas<small>${rt.abertas} em aberto${rt.atrasadas ? " · " + rt.atrasadas + " atrasada(s)" : ""}</small></button>
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

  function telaTarefas() {
    const hoje = Dados.hojeISO(), filtros = [["abertas", "Em aberto"], ["hoje", "Para hoje"], ["feitas", "Concluídas"], ["tudo", "Todas"]];
    const chips = filtros.map(([k, n]) => `<button class="chip ${k === filtroTarefa ? "on" : ""}" data-acao="filtro-tarefa" data-k="${k}">${n}</button>`).join("");
    const linhas = Dados.tarefasOrdenadas(filtroTarefa).map((t) => {
      const atrasada = !t.feita && t.prazo && t.prazo < hoje;
      const rec = t.recorrencia && t.recorrencia !== "nenhuma" ? " · " + Dados.RECORRENCIAS[t.recorrencia] : "";
      return `<div class="linha-lugar tarefa ${t.feita ? "off" : ""}"><label class="marcar"><input type="checkbox" data-acao="alternar-tarefa" data-id="${t.id}" ${t.feita ? "checked" : ""}></label>
        <div data-acao="editar-tarefa" data-id="${t.id}"><b>${esc(t.titulo)}</b>
        <small style="${atrasada ? "color:var(--erro)" : ""}">${t.prazo ? (atrasada ? "atrasada · " : "") + Dados.isoParaBR(t.prazo) : "sem prazo"} · ${esc(Dados.PRIORIDADES[t.prioridade] || "")}${t.categoria ? " · " + esc(t.categoria) : ""}${rec}</small></div><span>›</span></div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Tarefas</h1><button class="btn p" data-acao="nova-tarefa">+ Tarefa</button></div>
      <div class="chips">${chips}</div>${linhas || '<p class="vazio">Nenhuma tarefa por aqui. Que paz.</p>'}`;
  }

  function telaMercado() {
    const grupos = Dados.mercadoPorSecao(soFaltam), todos = Dados.itens("supermercado");
    const faltam = todos.filter((i) => !i.comprado).length, comprados = todos.length - faltam;
    const secoes = grupos.map(([s, itens]) => `<h2>${esc(Dados.SECOES[s])}</h2>` + itens.map((i) =>
      `<label class="linha-lugar item-mercado ${i.comprado ? "off" : ""}"><input type="checkbox" data-acao="alternar-item" data-id="${i.id}" ${i.comprado ? "checked" : ""}>
        <div><b>${esc(i.nome)}</b>${i.quantidade || i.origem ? `<small>${esc(i.quantidade || "")}${i.quantidade && i.origem ? " · " : ""}${i.origem ? "da receita " + esc(i.origem) : ""}</small>` : ""}</div>
        <button class="link perigo" data-acao="excluir" data-col="supermercado" data-id="${i.id}">Excluir</button></label>`).join("")).join("");
    const opcoes = Object.entries(Dados.SECOES).map(([k, n]) => `<option value="${k}" ${k === "outros" ? "selected" : ""}>${n}</option>`).join("");
    return `${voltar}<div class="linha-titulo"><h1>Supermercado</h1>${comprados ? '<button class="btn" data-acao="limpar-comprados">Limpar comprados</button>' : ""}</div>
      <p class="peq">${faltam} para comprar${comprados ? " · " + comprados + " no carrinho" : ""}</p>
      <div class="entrada"><input id="novoItem" placeholder="Adicionar item…" autocapitalize="sentences"><select id="novaSecao">${opcoes}</select>
        <button class="btn p" data-acao="add-item">+</button></div>
      <label class="op"><input type="checkbox" id="soFaltam" ${soFaltam ? "checked" : ""}> Esconder o que já está no carrinho</label>
      ${secoes || '<p class="vazio">A lista está vazia. Adicione o primeiro item.</p>'}`;
  }

  function formTarefa(t) {
    const op = (obj, atual) => Object.entries(obj).map(([k, n]) => `<option value="${k}" ${atual === k ? "selected" : ""}>${n}</option>`).join("");
    abrirFolha(`<h2>${t ? "Editar tarefa" : "Nova tarefa"}</h2>
      <label>O que precisa ser feito<input id="tTitulo" value="${esc(t ? t.titulo : "")}" placeholder="Ex.: Renovar o seguro"></label>
      <div class="duas"><label>Prazo<input id="tPrazo" inputmode="numeric" placeholder="DD/MM/AAAA" value="${t && t.prazo ? Dados.isoParaBR(t.prazo) : ""}"></label>
      <label>Prioridade<select id="tPrio">${op(Dados.PRIORIDADES, t ? t.prioridade : "media")}</select></label></div>
      <div class="duas"><label>Repete?<select id="tRec">${op(Dados.RECORRENCIAS, t ? t.recorrencia : "nenhuma")}</select></label>
      <label>Categoria<input id="tCat" value="${esc(t ? t.categoria || "" : "")}"></label></div>
      <label>Anotações<textarea id="tNotas" rows="2">${esc(t ? t.notas || "" : "")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-tarefa" data-id="${t ? t.id : ""}">Salvar</button></div>
      ${t ? `<button class="link perigo" data-acao="excluir" data-col="tarefas" data-id="${t.id}">Excluir tarefa</button>` : ""}`);
  }

  const estrelas = (n) => (n ? "★".repeat(n) : "");
  const chipsDe = (lista, atual, acao) => lista.map(([k, n]) => `<button class="chip ${k === atual ? "on" : ""}" data-acao="${acao}" data-k="${k}">${n}</button>`).join("");
  const opcoesDe = (obj, atual, vazio) => (vazio ? `<option value="">—</option>` : "") + Object.entries(obj).map(([k, n]) => `<option value="${k}" ${atual === k ? "selected" : ""}>${n}</option>`).join("");
  const opcoesNota = (atual) => ["", 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${String(atual ?? "") === String(n) ? "selected" : ""}>${n === "" ? "—" : n}</option>`).join("");
  const lerNota = (id) => { const v = $(id).value; return v === "" ? null : Number(v); };

  function telaReceitas() {
    const chips = chipsDe([["tudo", "Todas"], ["favoritas", "Favoritas"]].concat(Object.entries(Dados.CATEGORIAS_RECEITA)), filtroReceita, "filtro-receita");
    const linhas = Dados.receitasOrdenadas(filtroReceita).map((r) => {
      const n = Dados.ingredientesDaReceita(r).length;
      const sub = [Dados.CATEGORIAS_RECEITA[r.categoria], r.porcoes, r.tempo, n ? n + " ingrediente(s)" : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar"><div data-acao="editar-receita" data-id="${r.id}" style="flex:1;cursor:pointer"><b>${r.favorita ? "♥ " : ""}${esc(r.nome)}</b><small>${esc(sub)}${r.nota ? " · " + estrelas(r.nota) : ""}</small></div>
        ${n ? `<button class="btn" data-acao="receita-mercado" data-id="${r.id}">→ Mercado</button>` : ""}</div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Receitas</h1><button class="btn p" data-acao="nova-receita">+ Receita</button></div>
      <div class="chips">${chips}</div>${linhas || '<p class="vazio">Nenhuma receita salva ainda.</p>'}`;
  }

  function telaFilmes() {
    const filtros = [["quero", "Quero assistir"], ["assistindo", "Assistindo"], ["assistido", "Assistidos"], ["favoritos", "Favoritos"], ["abandonado", "Abandonados"], ["tudo", "Todos"]];
    const linhas = Dados.filmesOrdenados(filtroFilme).map((t) => {
      const sub = [Dados.TIPOS_TELA[t.tipo], t.genero, t.ano, t.streaming, t.assistido_em ? "em " + Dados.isoParaBR(t.assistido_em) : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar" data-acao="editar-filme" data-id="${t.id}" style="cursor:pointer"><div><b>${t.favorito ? "♥ " : ""}${esc(t.titulo)}</b><small>${esc(sub)}</small></div>
        <span>${t.nota ? estrelas(t.nota) : esc(Dados.STATUS_TELA[t.status] || "")}</span></div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Filmes e séries</h1><button class="btn p" data-acao="novo-filme">+ Título</button></div>
      <div class="chips">${chipsDe(filtros, filtroFilme, "filtro-filme")}</div>${linhas || '<p class="vazio">Nada na lista ainda. Qual é o próximo filme?</p>'}`;
  }

  function telaBucket() {
    const filtros = [["abertos", "A realizar"], ["planejado", "Planejados"], ["realizado", "Realizados"], ["tudo", "Todos"]];
    const linhas = Dados.bucketOrdenado(filtroBucket).map((x) => {
      const feito = x.status === "realizado";
      const sub = [Dados.CATEGORIAS_BUCKET[x.categoria], Dados.STATUS_BUCKET[x.status], !feito ? "prioridade " + (Dados.PRIORIDADES[x.prioridade] || "").toLowerCase() : "",
        feito && x.realizado_em ? "em " + Dados.isoParaBR(x.realizado_em) : x.prazo ? "até " + Dados.isoParaBR(x.prazo) : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar tarefa ${feito ? "off" : ""}"><label class="marcar"><input type="checkbox" data-acao="alternar-bucket" data-id="${x.id}" ${feito ? "checked" : ""}></label>
        <div data-acao="editar-bucket" data-id="${x.id}"><b>${esc(x.titulo)}</b><small>${esc(sub)}</small></div><span>›</span></div>`;
    }).join("");
    return `${voltar}<div class="linha-titulo"><h1>Bucket list</h1><button class="btn p" data-acao="novo-bucket">+ Sonho</button></div>
      <div class="chips">${chipsDe(filtros, filtroBucket, "filtro-bucket")}</div>${linhas || '<p class="vazio">Sua lista de realizações está vazia. Sonhe um pouco.</p>'}`;
  }

  function formReceita(r) {
    const v = (k) => esc(r ? r[k] || "" : "");
    abrirFolha(`<h2>${r ? "Editar receita" : "Nova receita"}</h2>
      <label>Nome<input id="rNome" value="${v("nome")}"></label>
      <div class="duas"><label>Categoria<select id="rCat">${opcoesDe(Dados.CATEGORIAS_RECEITA, r ? r.categoria : "prato")}</select></label>
      <label>Sua nota<select id="rNota">${opcoesNota(r ? r.nota : "")}</select></label></div>
      <div class="duas"><label>Rendimento<input id="rPorc" value="${v("porcoes")}" placeholder="4 porções"></label>
      <label>Tempo<input id="rTempo" value="${v("tempo")}" placeholder="40 min"></label></div>
      <label>Ingredientes (um por linha)<textarea id="rIng" rows="5">${v("ingredientes")}</textarea></label>
      <label>Modo de preparo<textarea id="rPrep" rows="4">${v("preparo")}</textarea></label>
      <label>De onde veio<input id="rOrigem" value="${v("origem")}"></label>
      <label class="op"><input type="checkbox" id="rFav" ${r && r.favorita ? "checked" : ""}> Favorita</label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-receita" data-id="${r ? r.id : ""}">Salvar</button></div>
      ${r ? `<button class="link perigo" data-acao="excluir" data-col="receitas" data-id="${r.id}">Excluir receita</button>` : ""}`);
  }

  function formFilme(t) {
    const v = (k) => esc(t ? t[k] || "" : "");
    abrirFolha(`<h2>${t ? "Editar título" : "Novo título"}</h2>
      <label>Título<input id="fiTitulo" value="${v("titulo")}"></label>
      <div class="duas"><label>Tipo<select id="fiTipo">${opcoesDe(Dados.TIPOS_TELA, t ? t.tipo : "filme")}</select></label>
      <label>Situação<select id="fiStatus">${opcoesDe(Dados.STATUS_TELA, t ? t.status : "quero")}</select></label></div>
      <div class="duas"><label>Sua nota<select id="fiNota">${opcoesNota(t ? t.nota : "")}</select></label>
      <label>Assistido em<input id="fiData" inputmode="numeric" placeholder="DD/MM/AAAA" value="${t && t.assistido_em ? Dados.isoParaBR(t.assistido_em) : ""}"></label></div>
      <div class="duas"><label>Gênero<input id="fiGenero" value="${v("genero")}"></label><label>Ano<input id="fiAno" inputmode="numeric" value="${v("ano")}" placeholder="2019"></label></div>
      <label>Onde assistir<input id="fiStream" value="${v("streaming")}" placeholder="Netflix, Max, cinema…"></label>
      <label>Comentários<textarea id="fiNotas" rows="2">${v("notas")}</textarea></label>
      <label class="op"><input type="checkbox" id="fiFav" ${t && t.favorito ? "checked" : ""}> Favorito</label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-filme" data-id="${t ? t.id : ""}">Salvar</button></div>
      ${t ? `<button class="link perigo" data-acao="excluir" data-col="filmes" data-id="${t.id}">Excluir</button>` : ""}`);
  }

  function formBucket(x) {
    const v = (k) => esc(x ? x[k] || "" : "");
    abrirFolha(`<h2>${x ? "Editar sonho" : "Novo sonho"}</h2>
      <label>O que quer realizar<input id="bTitulo" value="${v("titulo")}" placeholder="Ex.: Ver a aurora boreal"></label>
      <div class="duas"><label>Categoria<select id="bCat">${opcoesDe(Dados.CATEGORIAS_BUCKET, x ? x.categoria : "experiencia")}</select></label>
      <label>Prioridade<select id="bPrio">${opcoesDe(Dados.PRIORIDADES, x ? x.prioridade : "media")}</select></label></div>
      <div class="duas"><label>Situação<select id="bStatus">${opcoesDe(Dados.STATUS_BUCKET, x ? x.status : "desejado")}</select></label>
      <label>Quando quer<input id="bPrazo" inputmode="numeric" placeholder="DD/MM/AAAA" value="${x && x.prazo ? Dados.isoParaBR(x.prazo) : ""}"></label></div>
      <label>Anotações e relato<textarea id="bNotas" rows="3">${v("notas")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-bucket" data-id="${x ? x.id : ""}">Salvar</button></div>
      ${x ? `<button class="link perigo" data-acao="excluir" data-col="bucket" data-id="${x.id}">Excluir</button>` : ""}`);
  }

  function telaGaragem() {
    const todos = Dados.carrosOrdenados(filtroCarro);
    if (!carroSel || !todos.find((c) => c.id === carroSel)) carroSel = todos.length ? todos[0].id : null;
    const c = todos.find((x) => x.id === carroSel);
    const chips = chipsDe([["tudo", "Todos"]].concat(Object.entries(Dados.SITUACOES_CARRO)), filtroCarro, "filtro-carro");
    const idx = c ? todos.indexOf(c) : -1;
    const nota = (rot, v) => (v == null || v === "" ? "" : `<div class="nota-barra"><div class="l"><span>${rot}</span><b>${String(v).replace(".", ",")}</b></div><div class="t"><i style="width:${Math.min(100, v * 10)}%"></i></div></div>`);
    const dinheiro = (v) => (v == null || v === "" ? "—" : "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
    const custo = c ? (c.valor_compra != null ? (c.valor_compra - (c.valor_venda || 0)) : null) : null;
    const palcoHtml = c ? `<div class="palco3d" id="palco3d"></div><p class="dica3d">arraste para girar · gira sozinho</p>
      <div class="seletor"><button class="btn" data-acao="carro-ant" ${idx <= 0 ? "disabled" : ""}>‹</button>
        <span class="peq" style="color:var(--sec)">${idx + 1} de ${todos.length}</span>
        <button class="btn" data-acao="carro-prox" ${idx >= todos.length - 1 ? "disabled" : ""}>›</button></div>
      <div class="fatos"><div><b>${esc(c.ano || "—")}</b><small>ano</small></div><div><b>${esc(Dados.tempoDePosse(c) || "—")}</b><small>de posse</small></div>
        <div><b>${dinheiro(custo != null ? custo : c.preco_alvo)}</b><small>${c.situacao === "quero" ? "preço-alvo" : "custo"}</small></div></div>
      ${nota("Desempenho", c.desempenho)}${nota("Conforto", c.conforto)}${nota("Prazer de dirigir", c.prazer)}
      ${c.motivo_troca ? `<p class="peq" style="color:var(--sec)">Motivo da troca: ${esc(c.motivo_troca)}</p>` : ""}
      <div class="mini-acoes"><button class="link" data-acao="editar-carro" data-id="${c.id}">Editar</button>
        <button class="link perigo" data-acao="excluir" data-col="garagem" data-id="${c.id}">Excluir</button></div>`
      : '<p class="vazio">Nenhum carro por aqui. Eles chegam do computador ou você cadastra um.</p>';
    return `${voltar}<div class="linha-titulo"><h1>${c ? esc(Dados.nomeCarro(c)) : "Garagem"}</h1><button class="btn p" data-acao="novo-carro">+ Carro</button></div>
      <p class="eyebrow" style="margin-top:0">${c ? esc(Dados.SITUACOES_CARRO[c.situacao] || "") + (c.cor ? " · " + esc(c.cor) : "") : "Garagem & Wishlist"}</p>
      <div class="chips">${chips}</div>${palcoHtml}`;
  }

  function formCarro(c) {
    const v = (k) => esc(c ? c[k] ?? "" : "");
    const sit = Object.entries(Dados.SITUACOES_CARRO).map(([k, n]) => `<option value="${k}" ${(c ? c.situacao : "teve") === k ? "selected" : ""}>${n}</option>`).join("");
    abrirFolha(`<h2>${c ? "Editar carro" : "Novo carro"}</h2>
      <div class="duas"><label>Marca<input id="gMarca" value="${v("marca")}" placeholder="Peugeot"></label><label>Modelo<input id="gModelo" value="${v("modelo")}" placeholder="206"></label></div>
      <div class="duas"><label>Ano<input id="gAno" inputmode="numeric" value="${v("ano")}" placeholder="2004"></label><label>Cor<input id="gCor" value="${v("cor")}" placeholder="Prata"></label></div>
      <div class="duas"><label>Situação<select id="gSit">${sit}</select></label><label>Nota (0–10)<input id="gNota" inputmode="decimal" value="${v("nota")}"></label></div>
      <div class="duas"><label>Desempenho<input id="gDes" inputmode="decimal" value="${v("desempenho")}"></label><label>Conforto<input id="gCon" inputmode="decimal" value="${v("conforto")}"></label></div>
      <label>Prazer de dirigir<input id="gPra" inputmode="decimal" value="${v("prazer")}"></label>
      <label>Motivo da troca<input id="gMotivo" value="${v("motivo_troca")}"></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-carro" data-id="${c ? c.id : ""}">Salvar</button></div>`);
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
    if (palco) { palco.destruir(); palco = null; }
    tela.innerHTML = TELAS[atual]();
    document.body.classList.toggle("interna", !(atual === "dia"));
    const pal = $("#palco3d");
    if (pal && window.Garagem3D) { const carro = Dados.itens("garagem").find((x) => x.id === carroSel); palco = Garagem3D.montar(pal, carro); }
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

  function adicionarItemMercado() {
    const campo = $("#novoItem"), nome = campo.value.trim().replace(/\s+/g, " "); if (!nome) return;
    const existe = Dados.itens("supermercado").find((i) => !i.comprado && Dados.normalizar(i.nome) === Dados.normalizar(nome));
    if (!existe) Dados.adicionar("supermercado", { nome, quantidade: "", secao: $("#novaSecao").value, comprado: false, origem: "" });
    desenhar(); const novo = $("#novoItem"); if (novo) novo.focus(); sincronizar("supermercado");
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
      case "filtro-tarefa": filtroTarefa = d.k; desenhar(); break;
      case "nova-tarefa": formTarefa(null); break;
      case "editar-tarefa": formTarefa(Dados.itens("tarefas").find((x) => x.id === d.id)); break;
      case "alternar-tarefa": Dados.alternarTarefa(d.id); desenhar(); sincronizar("tarefas"); break;
      case "salvar-tarefa": {
        const titulo = $("#tTitulo").value.trim(), bruto = $("#tPrazo").value.trim(), iso = bruto ? Dados.brParaISO(bruto) : "";
        if (!titulo) { $("#fErro").textContent = "Escreva o que precisa ser feito."; return; }
        if (bruto && !iso) { $("#fErro").textContent = "O prazo precisa estar em DD/MM/AAAA."; return; }
        const rec = $("#tRec").value;
        if (rec !== "nenhuma" && !iso) { $("#fErro").textContent = "Tarefa que se repete precisa de um prazo."; return; }
        const campos = { titulo, prazo: iso, prioridade: $("#tPrio").value, recorrencia: rec, categoria: $("#tCat").value.trim(), notas: $("#tNotas").value.trim() };
        if (d.id) Dados.atualizar("tarefas", d.id, campos);
        else Dados.adicionar("tarefas", Object.assign({ feita: false, concluida_em: "" }, campos));
        fecharFolha(); desenhar(); sincronizar("tarefas"); break;
      }
      case "alternar-item": Dados.alternarItemMercado(d.id); desenhar(); sincronizar("supermercado"); break;
      case "limpar-comprados": Dados.limparComprados(); desenhar(); sincronizar("supermercado"); break;
      case "add-item": adicionarItemMercado(); break;
      case "ir-tarefas": atual = "mais"; sub = "tarefas"; desenhar(); break;
      case "filtro-receita": filtroReceita = d.k; desenhar(); break;
      case "filtro-filme": filtroFilme = d.k; desenhar(); break;
      case "filtro-bucket": filtroBucket = d.k; desenhar(); break;
      case "nova-receita": formReceita(null); break;
      case "editar-receita": formReceita(Dados.itens("receitas").find((x) => x.id === d.id)); break;
      case "receita-mercado": {
        const r = Dados.enviarReceitaAoMercado(d.id);
        alert(r.erro || `${r.novos} ingrediente(s) enviados ao supermercado` + (r.repetidos ? ` (${r.repetidos} já estavam na lista).` : "."));
        if (!r.erro) { desenhar(); sincronizar("supermercado"); }
        break;
      }
      case "salvar-receita": {
        const nome = $("#rNome").value.trim(); if (!nome) { $("#fErro").textContent = "Dê um nome à receita."; return; }
        const campos = { nome, categoria: $("#rCat").value, nota: lerNota("#rNota"), porcoes: $("#rPorc").value.trim(), tempo: $("#rTempo").value.trim(),
          ingredientes: $("#rIng").value.trim(), preparo: $("#rPrep").value.trim(), origem: $("#rOrigem").value.trim(), favorita: $("#rFav").checked };
        if (d.id) Dados.atualizar("receitas", d.id, campos); else Dados.adicionar("receitas", campos);
        fecharFolha(); desenhar(); sincronizar("receitas"); break;
      }
      case "novo-filme": formFilme(null); break;
      case "editar-filme": formFilme(Dados.itens("filmes").find((x) => x.id === d.id)); break;
      case "salvar-filme": {
        const titulo = $("#fiTitulo").value.trim(); if (!titulo) { $("#fErro").textContent = "Escreva o nome do filme ou série."; return; }
        const bruta = $("#fiData").value.trim(), iso = bruta ? Dados.brParaISO(bruta) : "", ano = $("#fiAno").value.trim();
        if (bruta && !iso) { $("#fErro").textContent = "A data precisa estar em DD/MM/AAAA."; return; }
        if (ano && !/^\d{4}$/.test(ano)) { $("#fErro").textContent = "O ano precisa ter 4 dígitos (ex.: 2019)."; return; }
        const campos = { titulo, tipo: $("#fiTipo").value, status: $("#fiStatus").value, nota: lerNota("#fiNota"), genero: $("#fiGenero").value.trim(), ano,
          streaming: $("#fiStream").value.trim(), assistido_em: iso, favorito: $("#fiFav").checked, notas: $("#fiNotas").value.trim() };
        if (d.id) Dados.atualizar("filmes", d.id, campos); else Dados.adicionar("filmes", campos);
        fecharFolha(); desenhar(); sincronizar("filmes"); break;
      }
      case "novo-bucket": formBucket(null); break;
      case "editar-bucket": formBucket(Dados.itens("bucket").find((x) => x.id === d.id)); break;
      case "alternar-bucket": Dados.alternarBucket(d.id); desenhar(); sincronizar("bucket"); break;
      case "salvar-bucket": {
        const titulo = $("#bTitulo").value.trim(); if (!titulo) { $("#fErro").textContent = "Escreva o que quer realizar."; return; }
        const bruta = $("#bPrazo").value.trim(), iso = bruta ? Dados.brParaISO(bruta) : "";
        if (bruta && !iso) { $("#fErro").textContent = "O prazo precisa estar em DD/MM/AAAA."; return; }
        const status = $("#bStatus").value, antes = d.id ? Dados.itens("bucket").find((i) => i.id === d.id) : null;
        const realizado = status === "realizado" ? ((antes && antes.realizado_em) || Dados.hojeISO()) : "";
        const campos = { titulo, categoria: $("#bCat").value, prioridade: $("#bPrio").value, status, prazo: iso, realizado_em: realizado, notas: $("#bNotas").value.trim() };
        if (d.id) Dados.atualizar("bucket", d.id, campos); else Dados.adicionar("bucket", campos);
        fecharFolha(); desenhar(); sincronizar("bucket"); break;
      }
      case "aba": atual = d.t; sub = "menu"; desenhar(); break;
      case "sub-mais": atual = "mais"; sub = d.s; desenhar(); break;
      case "filtro-carro": filtroCarro = d.k; carroSel = null; desenhar(); break;
      case "carro-ant": case "carro-prox": {
        const lista = Dados.carrosOrdenados(filtroCarro), i = lista.findIndex((x) => x.id === carroSel);
        const j = acao === "carro-ant" ? i - 1 : i + 1; if (lista[j]) { carroSel = lista[j].id; desenhar(); } break;
      }
      case "novo-carro": formCarro(null); break;
      case "editar-carro": formCarro(Dados.itens("garagem").find((x) => x.id === d.id)); break;
      case "salvar-carro": {
        const marca = $("#gMarca").value.trim(), modelo = $("#gModelo").value.trim();
        if (!marca && !modelo) { $("#fErro").textContent = "Informe ao menos a marca ou o modelo."; return; }
        const ano = $("#gAno").value.trim(); if (ano && !/^\d{4}$/.test(ano)) { $("#fErro").textContent = "O ano precisa ter 4 dígitos (ex.: 2019)."; return; }
        const nums = {}; for (const [campo, id] of [["nota", "#gNota"], ["desempenho", "#gDes"], ["conforto", "#gCon"], ["prazer", "#gPra"]]) {
          const b = $(id).value.trim().replace(",", "."), n = b === "" ? null : Number(b);
          if (n !== null && (!Number.isFinite(n) || n < 0 || n > 10)) { $("#fErro").textContent = "As notas vão de 0 a 10."; return; }
          nums[campo] = n;
        }
        const campos = Object.assign({ marca, modelo, ano, cor: $("#gCor").value.trim(), situacao: $("#gSit").value, motivo_troca: $("#gMotivo").value.trim() }, nums);
        if (d.id) Dados.atualizar("garagem", d.id, campos);
        else { const novo = Dados.adicionar("garagem", Object.assign({ apelido: "", data_compra: "", data_venda: "", km: null, valor_compra: null, valor_venda: null,
          preco_alvo: null, link: "", notas: "", momento_id: "", carroceria: "", portas: 4, foto: "" }, campos)); carroSel = novo.id; }
        fecharFolha(); desenhar(); sincronizar("garagem"); break;
      }
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
    if (ev.target.id === "soFaltam") { soFaltam = ev.target.checked; desenhar(); return; }
    if (ev.target.id === "aprender") { Dados.definirAprendizado(camadaMem, ev.target.checked); return; }
    if (ev.target.id !== "arquivo" || !ev.target.files[0]) return;
    try { Dados.substituir("momentos", JSON.parse(await ev.target.files[0].text())); atual = "vida"; desenhar(); sincronizar("momentos"); }
    catch (e) { alert("Não consegui ler o arquivo: " + e.message); }
  });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.id === "novoItem") { adicionarItemMercado(); return; }
  if (ev.key === "Enter" && ev.target.id === "msg") { const t = ev.target.value; ev.target.value = ""; enviarMensagem(t); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar().then(desenhar); });

  // ---------- foto do dia (rotaciona entre as fotos de abertura) ----------
  (function fotoDoDia() {
    const n = Math.floor(Date.now() / 86400000) % 4 + 1;
    document.documentElement.style.setProperty("--foto", `url("img/abertura${n}.jpg")`);
  })();

  // ---------- partida ----------
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  estado.textContent = Nuvem.disponivel() ? "Sincronizando…" : "Só neste aparelho";
  desenhar();
  if (Nuvem.disponivel()) sincronizar().then(desenhar);
})();
