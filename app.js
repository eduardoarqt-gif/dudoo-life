// Dudoo Life — PWA do iPhone: Meu dia, Minha vida (com o bonequinho), Assistente (texto e voz),
// Lugares, Memória e Dados. Mesmos dados do app desktop, pelo repositório privado no GitHub.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const tela = $("#tela"), folha = $("#folha"), estado = $("#estadoSync");
  let atual = "dia", sub = "menu", selecionado = null, bravoTimer = null;
  let modoVida = "caminho", idxVida = null, sPosVida = null, animVida = null, geoVida = null, itensVida = [], abriuCaminho = false;
  let filtroCidade = "", filtroLugar = "tudo", camadaMem = "fato", filtroTarefa = "abertas", soFaltam = false, filtroReceita = "tudo", filtroFilme = "quero", filtroBucket = "abertos", filtroMeta = "andamento", filtroGuia = "tudo", buscaGuia = "", filtroNota = "tudo", buscaNota = "", filtroDelivery = "tudo", buscaDelivery = "", listaCompra = "casa", soFaltamCompra = false, filtroCarro = "tudo", carroSel = null, palco = null;
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
    const modos = `<div class="chips"><button class="chip ${modoVida === "caminho" ? "on" : ""}" data-acao="vida-modo" data-k="caminho">Caminho</button>
      <button class="chip ${modoVida === "lista" ? "on" : ""}" data-acao="vida-modo" data-k="lista">Lista</button></div>`;
    if (modoVida === "caminho") return telaCaminho(itens, sel, modos);
    let ano = null;
    const linhas = itens.slice().reverse().map((m) => {
      const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia, fut = m.data > hoje, on = sel && sel.id === m.id;
      const cab = m.data.slice(0, 4) !== ano ? (ano = m.data.slice(0, 4), `<div class="ano">${ano}</div>`) : "";
      return `${cab}<div class="marco ${on ? "on" : ""} ${fut ? "fut" : ""}" data-id="${m.id}">
        <div class="trilho"><span class="pino" style="border-color:${t.cor};${on ? "background:" + t.cor : ""}">${t.icone}</span></div>
        <div class="cartao"><div class="boneco">${on ? bonequinho(!!bravoTimer) : ""}</div>
          <b>${esc(m.titulo)}</b><small>${t.nome} · ${Dados.isoParaBR(m.data)}${fut ? " · em breve" : ""}${m.local ? " · " + esc(m.local) : ""}</small>
          ${on && m.texto ? `<p>“${esc(m.texto)}”</p>` : ""}
          ${on ? vinculoHtml(m) : ""}
          ${on ? `<div class="mini-acoes"><button class="link" data-acao="editar-momento" data-id="${m.id}">Editar</button><button class="link perigo" data-acao="excluir" data-col="momentos" data-id="${m.id}">Excluir</button></div>` : ""}</div></div>`;
    }).join("");
    return `<div class="linha-titulo"><h1>Minha vida</h1><button class="btn p" data-acao="novo-momento">+ Momento</button></div>${modos}<div class="caminho">${linhas}</div>`;
  }

  // ---- Minha vida em modo "Caminho": estrada em S, um marco por momento e o bonequinho andando de marco em marco
  function telaCaminho(itens, sel, modos) {
    itensVida = itens;
    geoVida = Dados.geoCaminho(itens.length);
    if (idxVida === null || idxVida >= itens.length || (selecionado && itens[idxVida].id !== selecionado.id)) {
      const k = selecionado ? itens.findIndex((i) => i.id === selecionado.id) : -1;
      idxVida = k >= 0 ? k : Math.max(0, itens.indexOf(sel));
    }
    const g = geoVida, hoje = Dados.hojeISO();
    const estrada = g.rota.map((p) => p.join(",")).join(" ");
    const marcos = itens.map((m, k) => {
      const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia, [x, y] = g.pts[k], fut = m.data > hoje;
      const nome = m.titulo.length > 17 ? m.titulo.slice(0, 16) + "…" : m.titulo;
      return `<g class="m ${k === idxVida ? "on" : ""}" data-acao="vida-ir" data-i="${k}" data-k="${k}">
        <circle cx="${x}" cy="${y}" r="21" fill="${k === idxVida ? t.cor : "var(--card)"}" stroke="${t.cor}" stroke-width="3" ${fut ? 'stroke-dasharray="4 3"' : ""}/>
        <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" fill="currentColor">${t.icone}</text>
        <text x="${x}" y="${y - 29}" text-anchor="middle" font-size="11.5" fill="currentColor">${esc(nome)}</text>
        <text x="${x}" y="${y + 40}" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".6">${m.data.slice(0, 4)}</text></g>`;
    }).join("");
    return `<div class="linha-titulo"><h1>Minha vida</h1><button class="btn p" data-acao="novo-momento">+ Momento</button></div>${modos}
      <div class="caminho-wrap" id="caminhoWrap">
        <svg class="caminho-sv" viewBox="0 0 ${g.W} ${g.H}" role="img" aria-label="Linha do tempo em forma de estrada">
          <polyline points="${estrada}" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${estrada}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-dasharray="7 8" stroke-linejoin="round"/>
          ${marcos}
        </svg>
        <div class="walker" id="walker"></div>
      </div>
      <div class="duas passos"><button class="btn" data-acao="vida-passo" data-d="-1">◀ Anterior</button><button class="btn p" data-acao="vida-passo" data-d="1">Seguir ▶</button></div>
      <div class="detalhe-vida" id="detalheVida"></div>
      <p class="peq">Toque num marco, ou use os botões, para o Eduardo caminhar até lá.</p>`;
  }

  function detalheVida() {
    const m = itensVida[idxVida]; const el = $("#detalheVida"); if (!m || !el) return;
    const t = Dados.TIPOS[m.tipo] || Dados.TIPOS.experiencia, fut = m.data > Dados.hojeISO();
    el.innerHTML = `<b>${t.icone} ${esc(m.titulo)}</b><small>${t.nome} · ${Dados.isoParaBR(m.data)}${fut ? " · em breve" : ""}${m.local ? " · " + esc(m.local) : ""}</small>
      ${m.texto ? `<p>“${esc(m.texto)}”</p>` : ""}
      ${vinculoHtml(m)}
      <div class="mini-acoes"><button class="link" data-acao="editar-momento" data-id="${m.id}">Editar</button><button class="link perigo" data-acao="excluir" data-col="momentos" data-id="${m.id}">Excluir</button></div>`;
    document.querySelectorAll(".caminho-sv .m").forEach((g) => g.classList.toggle("on", +g.dataset.k === idxVida));
  }

  function colocarBoneco(s, bravo) {
    const w = $("#walker"), sv = $(".caminho-sv"); if (!w || !sv || !geoVida) return;
    const p = Dados.pontoNoCaminho(geoVida, s), e = sv.clientWidth / geoVida.W;
    w.innerHTML = bonequinho(!!bravo);
    w.style.transform = `translate(${p.x * e - 23}px, ${p.y * e - 77}px) scaleX(${p.dx < 0 ? -1 : 1})`;
  }

  function andarPara(i, aoChegar) {
    if (!geoVida || !geoVida.dist.length) return;
    i = Math.max(0, Math.min(geoVida.dist.length - 1, i));
    cancelAnimationFrame(animVida);
    const de = sPosVida === null ? geoVida.dist[i] : sPosVida, para = geoVida.dist[i], dur = Math.max(250, Math.abs(para - de) / 170 * 1000);
    idxVida = i; selecionado = itensVida[i];
    const t0 = performance.now();
    const quadro = (agora) => {
      const f = Math.min(1, (agora - t0) / dur), ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      sPosVida = de + (para - de) * ease;
      colocarBoneco(sPosVida, false);
      if (f < 1) { animVida = requestAnimationFrame(quadro); return; }
      sPosVida = para; detalheVida(); colocarBoneco(para, true);       // cara de bravo ao chegar a um marco
      clearTimeout(bravoTimer); bravoTimer = setTimeout(() => { bravoTimer = null; colocarBoneco(para, false); }, 1400);
      if (aoChegar) aoChegar();
    };
    animVida = requestAnimationFrame(quadro);
  }

  function iniciarCaminho() {
    if (!$("#walker")) return;
    detalheVida();
    if (!abriuCaminho && itensVida.length > 1) {                        // ao abrir: sai do primeiro marco e anda até o atual
      abriuCaminho = true; sPosVida = 0; colocarBoneco(0, false); andarPara(idxVida);
    } else {
      sPosVida = geoVida.dist[idxVida]; colocarBoneco(sPosVida, false);
    }
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

  // "Listas": mesma estrutura do computador (abas Tarefas | Supermercado | Receitas | Filmes e séries | Bucket list)
  const SUBS_LISTAS = ["tarefas", "mercado", "compras", "guia", "delivery", "notas", "receitas", "filmes", "bucket", "metas"];
  let ultimaLista = "tarefas";
  const ABAS_LISTAS = [["tarefas", "Tarefas"], ["mercado", "Supermercado"], ["compras:casa", "Compras · Casa"], ["compras:escritorio", "Compras · Escritório"],
    ["compras:shopping", "Compras · Shopping"], ["compras:farmacia", "Compras · Farmácia"], ["guia", "Guia de compras"], ["delivery", "Delivery"], ["notas", "Notas"], ["receitas", "Receitas"], ["filmes", "Filmes e séries"], ["bucket", "Bucket list"], ["metas", "Metas"]];
  // 18/10/2026: sem "‹ Mais", sem o título "Listas" e sem a fileira de abas — só um DROPDOWN com a lista (e o botão de "+ novo" ao lado).
  function abasListas(ativa, acao) {
    return `<div class="seletor-listas"><select class="campo" id="selLista" aria-label="Lista">${ABAS_LISTAS.map(([k, n]) => `<option value="${k}" ${k === ativa ? "selected" : ""}>${n}</option>`).join("")}</select>${acao || ""}</div>`;
  }
  // "Lugares & Viagens": mesma estrutura do computador (abas Mapa-múndi | Lugares | Viagens | Destinos)
  const ABAS_MUNDO = [["mapa", "Mapa-múndi"], ["lugares", "Lugares & Favoritos"], ["viagens", "Viagens"], ["destinos", "Destinos"]];
  let GEO = null;
  function abasMundo(ativa) {
    return `<div class="chips">${ABAS_MUNDO.map(([k, n]) => `<button class="chip ${k === ativa ? "on" : ""}" data-acao="sub-mais" data-s="${k}">${n}</button>`).join("")}</div>`;
  }
  function telaMapa() {
    const r = window.DudooMapa ? DudooMapa.resumo(Dados.itens("lugares"), Dados.itens("pins_viagens")) : { paises: 0, cidades: 0, visitados: 0, desejos: 0 };
    return `${voltar}<h1>Lugares &amp; Viagens</h1>${abasMundo("mapa")}
      <div class="indicadores"><div><b>${r.paises}</b><small>Países visitados</small></div><div><b>${r.cidades}</b><small>Cidades visitadas</small></div>
      <div><b>${r.visitados}</b><small>Lugares visitados</small></div><div><b>${r.desejos}</b><small>Quero conhecer</small></div></div>
      <div id="mapaMundo" class="mapa-mundo"></div>
      <p class="peq">Laranja = visitado; contorno = quero conhecer. Inclui os pinos das suas viagens; lugar sem coordenadas aparece no centro do país.</p>`;
  }
  function desenharMapa() {
    const el = $("#mapaMundo");
    if (!el || !window.DudooMapa) return;
    const pronto = (geo) => DudooMapa.desenhar(el, DudooMapa.pontosDe(Dados.itens("lugares"), geo, Dados.itens("pins_viagens")));
    if (GEO) return pronto(GEO);
    fetch("geo_paises.json").then((r) => r.json()).catch(() => ({})).then((g) => { GEO = g; if ($("#mapaMundo") === el) pronto(g); });
  }
  function telaViagens() {
    const lista = Dados.itens("momentos").filter((m) => m.tipo === "viagem").sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const linhas = lista.map((m) => `<div class="linha-lugar"><div><b>${esc(m.titulo)}</b>
      <small>${esc(Dados.isoParaBR(m.data))}${m.local ? " · " + esc(m.local) : ""}</small></div></div>`).join("");
    return `${voltar}<h1>Lugares &amp; Viagens</h1>${abasMundo("viagens")}
      <p class="peq">Viagens do planejador e as que você contou. Para planejar, use o planejador de viagens.</p>
      ${linhas || '<p class="vazio">Nenhuma viagem ainda.</p>'}`;
  }

  const ctxPessoal = () => ({ esc, $, abrirFolha, fecharFolha, desenhar, sincronizar, voltar, chipsDe, opcoesDe, opcoesNota, lerNota });
  function telaMais() {
    if (Pessoal.TELAS.includes(sub)) { Pessoal.iniciar(ctxPessoal()); return Pessoal.tela(sub); }
    if (Financas.TELAS.includes(sub)) { Financas.iniciar(ctxPessoal()); return Financas.tela(); }
    if (GuardaRoupa.TELAS.includes(sub)) { GuardaRoupa.iniciar(ctxPessoal()); return GuardaRoupa.tela(); }
    if (sub === "mapa") return telaMapa();
    if (sub === "viagens") return telaViagens();
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
    if (sub === "metas") return telaMetas();
    if (sub === "compras") return telaCompras();
    if (sub === "guia") return telaGuia();
    if (sub === "notas") return telaNotas();
    if (sub === "delivery") return telaDelivery();
    const rt = Dados.resumoTarefas(), faltam = Dados.itens("supermercado").filter((i) => !i.comprado).length;
    return `<h1>Mais</h1>
      <button class="item-menu" data-acao="sub" data-s="garagem"><span>◉</span>Garagem &amp; Wishlist<small>${Dados.itens("garagem").length} carros</small></button>
      <button class="item-menu" data-acao="sub" data-s="guarda_roupa"><span>👔</span>Guarda-roupa<small>${Dados.itens("roupas").length} peças</small></button>
      <button class="item-menu" data-acao="sub" data-s="financas"><span>$</span>Finanças<small>Face ID</small></button>
      <button class="item-menu" data-acao="sub" data-s="tarefas"><span>☰</span>Listas<small>${rt.abertas} tarefa(s) · ${faltam} para comprar${rt.atrasadas ? " · " + rt.atrasadas + " atrasada(s)" : ""}</small></button>
      <button class="item-menu" data-acao="sub" data-s="mapa"><span>◍</span>Lugares &amp; Viagens<small>${Dados.itens("lugares").length} lugares · ${Dados.itens("destinos").length} destinos</small></button>
      <button class="item-menu" data-acao="sub" data-s="pessoas"><span>☺</span>Pessoas<small>${Dados.itens("pessoas").length} pessoas</small></button>
      <button class="item-menu" data-acao="sub" data-s="saude"><span>♥</span>Saúde &amp; Shape<small>Face ID</small></button>
      <button class="item-menu" data-acao="sub" data-s="memoria"><span>❖</span>Memória inteligente<small>${Dados.itens("memorias").length} itens</small></button>
      <button class="item-menu" data-acao="sub" data-s="uso"><span>◔</span>Uso da IA<small>US$ ${Dados.resumoUsoIA().custo.toFixed(2).replace(".", ",")} no mês</small></button>
      <button class="item-menu" data-acao="sub" data-s="dados"><span>☁</span>Dados e sincronização<small>${Nuvem.disponivel() ? "sincronizado" : "só neste aparelho"}</small></button>`;
  }
  const voltar = '<button class="link" data-acao="sub" data-s="menu">‹ Mais</button>';

  function telaLugares() {
    const todos = Dados.itens("lugares"), cidades = Dados.cidades();
    if (filtroCidade && !cidades.some((c) => Dados.normalizar(c) === Dados.normalizar(filtroCidade))) filtroCidade = "";
    const lista = todos.filter((l) => (filtroLugar === "tudo" || l.status === filtroLugar) && (!filtroCidade || Dados.normalizar(l.cidade) === Dados.normalizar(filtroCidade)));
    const selCidade = `<select id="selCidadeLugar" class="sel-cidade" aria-label="Cidade"><option value="">Todas as cidades</option>${cidades.map((c) => `<option value="${esc(c)}" ${Dados.normalizar(c) === Dados.normalizar(filtroCidade) ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>`;
    const chips = [["tudo", "Todos"]].concat(Object.entries(Dados.STATUS)).map(([k, n]) => `<button class="chip ${k === filtroLugar ? "on" : ""}" data-acao="filtro-lugar" data-k="${k}">${n}</button>`).join("");
    let cid = null;
    const linhas = lista.sort((a, b) => Dados.normalizar(a.cidade).localeCompare(Dados.normalizar(b.cidade)) || Dados.normalizar(a.nome).localeCompare(Dados.normalizar(b.nome))).map((l) => {
      const cab = (l.cidade || "Sem cidade") !== cid ? (cid = l.cidade || "Sem cidade", `<h2>${esc(cid)}</h2>`) : "";
      return `${cab}<div class="linha-lugar lugar-clique"><div data-acao="ver-lugar" data-id="${l.id}" role="button" tabindex="0"><b>${esc(l.nome)}</b><small>${esc(Dados.CATEGORIAS[l.categoria] || "")}${l.culinaria ? " · " + esc(l.culinaria) : ""} · ${esc(Dados.STATUS[l.status] || "")}${l.nota != null ? " · ★ " + String(l.nota).replace(".", ",") : ""}${l.instagram ? " · " + esc(instaCurto(l.instagram)) : ""}</small></div>
        <button class="link perigo" data-acao="excluir" data-col="lugares" data-id="${l.id}">Excluir</button></div>`;
    }).join("");
    return `${voltar}<h1>Lugares &amp; Viagens</h1>${abasMundo("lugares")}<div class="linha-titulo"><h2>Lugares &amp; Favoritos</h2><button class="btn p" data-acao="novo-lugar">+ Lugar</button></div>
      <div class="chips">${chips}</div><div class="filtro-cidade">${selCidade}</div>${linhas || '<p class="vazio">Nenhum lugar por aqui ainda.</p>'}`;
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
    return `${voltar}<h1>Lugares &amp; Viagens</h1>${abasMundo("destinos")}<div class="linha-titulo"><h2>Destinos</h2><button class="btn p" data-acao="novo-destino">+ Destino</button></div>
      <p class="peq">O que você gostou (ou não) em cada lugar. Vira memória para o assistente.</p>
      ${linhas || '<p class="vazio">Nenhum destino ainda. Eles chegam do computador ou do planejador.</p>'}`;
  }

  function telaTarefas() {
    const hoje = Dados.hojeISO(), filtros = [["abertas", "Em aberto"], ["hoje", "Para hoje"], ["feitas", "Concluídas"], ["tudo", "Todas"]];
    const chips = filtros.map(([k, n]) => `<button class="chip ${k === filtroTarefa ? "on" : ""}" data-acao="filtro-tarefa" data-k="${k}">${n}</button>`).join("");
    const linhas = Dados.comOrdem(Dados.tarefasOrdenadas(filtroTarefa)).map((t) => {
      const atrasada = !t.feita && t.prazo && t.prazo < hoje;
      const rec = t.recorrencia && t.recorrencia !== "nenhuma" ? " · " + Dados.RECORRENCIAS[t.recorrencia] : "";
      return `<div class="linha-lugar tarefa ord ${t.feita ? "off" : ""}" data-id="${t.id}"><span class="alca" aria-label="Arrastar">⠿</span><label class="marcar"><input type="checkbox" data-acao="alternar-tarefa" data-id="${t.id}" ${t.feita ? "checked" : ""}></label>
        <div data-acao="editar-tarefa" data-id="${t.id}"><b>${esc(t.titulo)}</b>
        <small style="${atrasada ? "color:var(--erro)" : ""}">${t.prazo ? (atrasada ? "atrasada · " : "") + Dados.isoParaBR(t.prazo) : "sem prazo"} · ${esc(Dados.PRIORIDADES[t.prioridade] || "")}${t.categoria ? " · " + esc(t.categoria) : ""}${rec}</small></div><span>›</span></div>`;
    }).join("");
    return `${abasListas("tarefas", '<button class="btn p" data-acao="nova-tarefa">+ Tarefa</button>')}
      <div class="chips">${chips}</div>${linhas ? `<div data-ordenavel="tarefas">${linhas}</div>` : '<p class="vazio">Nenhuma tarefa por aqui. Que paz.</p>'}`;
  }

  const reais = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function telaMercado() {
    const grupos = Dados.mercadoPorSecao(soFaltam), todos = Dados.itens("supermercado");
    const faltam = todos.filter((i) => !i.comprado).length, comprados = todos.length - faltam, gasto = Dados.gastoMercadoDoMes().total;
    const secoes = grupos.map(([s, itens]) => (grupos.length > 1 ? `<h2>${esc(Dados.SECOES[s])}</h2>` : "") + `<div data-ordenavel="supermercado">` + itens.map((i) =>
      `<div class="linha-lugar item-mercado ord ${i.comprado ? "off" : ""}" data-id="${i.id}"><span class="alca" aria-label="Arrastar">⠿</span>
        <input type="checkbox" data-acao="alternar-item" data-id="${i.id}" ${i.comprado ? "checked" : ""}>
        <div data-acao="alternar-item" data-id="${i.id}"><b>${esc(i.nome)}</b>${i.quantidade || i.origem ? `<small>${esc(i.quantidade || "")}${i.quantidade && i.origem ? " · " : ""}${i.origem ? "da receita " + esc(i.origem) : ""}</small>` : ""}</div>
        <button class="link perigo" data-acao="excluir" data-col="supermercado" data-id="${i.id}">Excluir</button></div>`).join("") + `</div>`).join("");
    return `${abasListas("mercado")}
      <div class="linha-titulo"><button class="btn p" data-acao="registrar-compra-mercado">Registrar compra</button><button class="btn" data-acao="gastos-mercado">Gastos</button>${comprados ? '<button class="btn" data-acao="limpar-comprados">Limpar comprados</button>' : ""}</div>
      <p class="peq">${faltam} para comprar${comprados ? " · " + comprados + " comprado(s)" : ""}${gasto ? " · gasto do mês: " + reais(gasto) : ""} · segure um item e arraste para mudar a ordem</p>
      <div class="entrada"><input id="novoItem" placeholder="Adicionar item…" autocapitalize="sentences">
        <button class="btn padrao" data-acao="lista-padrao" aria-label="Lista padrão" title="Lista padrão">★</button>
        <button class="btn p" data-acao="add-item" aria-label="Adicionar">+</button></div>
      <label class="op"><input type="checkbox" id="soFaltam" ${soFaltam ? "checked" : ""}> Esconder o que já comprei</label>
      ${secoes || '<p class="vazio">A lista está vazia. Adicione o primeiro item.</p>'}`;
  }

  function folhaRegistrarCompra() {
    const carrinho = Dados.itens("supermercado").filter((i) => i.comprado).length;
    abrirFolha(`<h2>Registrar compra</h2><p class="peq">Anota quanto você gastou nesta ida ao mercado. Fica no histórico do mês.</p>
      <div class="duas"><label>Valor (R$)<input id="rcValor" inputmode="decimal" placeholder="0,00"></label>
      <label>Data<input id="rcData" inputmode="numeric" placeholder="DD/MM/AAAA" value="${Dados.isoParaBR(Dados.hojeISO())}"></label></div>
      <label>Onde comprou<input id="rcLocal" placeholder="Mercado, feira, atacado…" autocapitalize="sentences"></label>
      <label class="op"><input type="checkbox" id="rcTirar" checked> Tirar da lista os itens comprados${carrinho ? " (" + carrinho + ")" : ""}</label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-compra-mercado">Registrar</button></div>`);
  }
  function folhaGastosMercado() {
    const meses = Dados.gastoMercadoPorMes(), maior = Math.max(1, ...meses.map((m) => m.total));
    const cartoes = meses.map((m) => `<div class="gasto-mes"><div class="topo"><b>${esc(Dados.mesPorExtenso(m.mes))}</b><b>${reais(m.total)}</b></div>
      <div class="barra-gasto"><i style="width:${Math.round((m.total / maior) * 100)}%"></i></div>
      <small>${m.compras} compra(s) · média de ${reais(m.media)} por ida${m.itens ? " · " + m.itens + " itens" : ""}</small></div>`).join("");
    const recentes = Dados.comprasMercado().slice(0, 40).map((c) => `<div class="linha-lugar"><div><b>${esc(Dados.isoParaBR(c.data))} · ${reais(c.valor)}</b>
      <small>${esc([c.local, c.itens ? c.itens + " itens" : ""].filter(Boolean).join(" · "))}</small></div>
      <button class="link perigo" data-acao="apagar-compra-mercado" data-id="${c.id}">Apagar</button></div>`).join("");
    abrirFolha(`<h2>Gastos do supermercado</h2>${cartoes || '<p class="vazio">Nenhuma compra registrada ainda. Use “Registrar compra” depois de ir ao mercado.</p>'}
      ${recentes ? `<h2>Compras registradas</h2>${recentes}` : ""}<div class="duas"><button class="btn" data-acao="fechar">Fechar</button></div>`);
  }

  // ---- guia de compras: o que vale a pena (ou não) e os tamanhos/medidas
  function telaGuia() {
    const filtros = [["tudo", "Tudo"], ["vale", "Vale a pena"], ["nao_vale", "Não vale"], ["medida", "Tamanhos e medidas"]], r = Dados.resumoGuia(), porCat = {};
    Dados.guiaOrdenado(filtroGuia, buscaGuia).forEach((i) => { const k = Dados.CATEGORIAS_GUIA[i.categoria] ? i.categoria : "outro"; (porCat[k] = porCat[k] || []).push(i); });
    const linha = (i) => {
      const selo = i.tipo === "medida" ? '<span class="selo">📏 medida</span>' : i.avaliacao === "vale" ? '<span class="selo vale">👍 vale a pena</span>' : i.avaliacao === "nao_vale" ? '<span class="selo nao">👎 não vale</span>' : "";
      const detalhe = i.tipo === "medida" ? i.medidas : [i.marca, i.onde, i.preco ? reais(i.preco) : ""].filter(Boolean).join(" · ");
      const nota = String(i.nota || "").split(/\r?\n/)[0];
      return `<div class="linha-lugar ord" data-id="${i.id}"><span class="alca" aria-label="Arrastar">⠿</span><div data-acao="editar-guia" data-id="${i.id}" style="flex:1;cursor:pointer"><b>${esc(i.titulo)}</b>
        <small>${esc([detalhe, nota].filter(Boolean).join(" · "))}</small></div>${selo}</div>`;
    };
    const corpo = Object.keys(Dados.CATEGORIAS_GUIA).filter((k) => porCat[k]).map((k) => `<h2>${esc(Dados.CATEGORIAS_GUIA[k])}</h2><div data-ordenavel="guia_compras">${porCat[k].map(linha).join("")}</div>`).join("");
    return `${abasListas("guia", '<button class="btn p" data-acao="novo-guia">+ Anotar</button>')}
      <p class="peq">${r.total} anotações · ${r.vale} valem a pena · ${r.nao_vale} não valem · ${r.medidas} medidas</p>
      <div class="chips">${chipsDe(filtros, filtroGuia, "filtro-guia")}</div>
      <input id="buscaGuia" class="campo" placeholder="Buscar…" value="${esc(buscaGuia)}" style="margin:6px 0">
      ${corpo || '<p class="vazio">Nada anotado ainda. Anote o que vale a pena (ou não) e os seus tamanhos.</p>'}`;
  }
  // ---- delivery: favoritos, os que quer testar e os que evita (mesma lista do computador)
  function telaDelivery() {
    const filtros = [["tudo", "Todos"], ["favorito", "Favoritos"], ["testar", "Quero testar"], ["pedi", "Já pedi"], ["evitar", "Evitar"]], r = Dados.resumoDelivery(), porTipo = {};
    Dados.deliveryOrdenado(filtroDelivery, buscaDelivery).forEach((d) => { const k = Dados.TIPOS_DELIVERY[d.tipo] ? d.tipo : "outro"; (porTipo[k] = porTipo[k] || []).push(d); });
    const linha = (d) => {
      const sub = [d.canal !== "app" || d.telefone ? Dados.CANAIS_DELIVERY[d.canal] : "", d.telefone, d.pedir ? "pedir: " + d.pedir : "", d.nao_pedir ? "evitar: " + d.nao_pedir : ""].filter(Boolean).join(" · ");
      const fone = String(d.telefone || "").replace(/[^\d+]/g, "");
      const selo = [d.nota != null && d.nota !== "" ? "★ " + String(d.nota).replace(".", ",") : "", Dados.SITUACOES_DELIVERY[d.situacao]].filter(Boolean).join(" · ");
      return `<div class="linha-lugar ord" data-id="${d.id}"><span class="alca" aria-label="Arrastar">⠿</span><div data-acao="editar-delivery" data-id="${d.id}" style="flex:1;cursor:pointer"><b>${esc(d.nome)}</b>
        <small>${esc(sub)}</small></div>${fone.length >= 8 ? `<a class="btn" href="tel:${fone}" aria-label="Ligar">Ligar</a>` : ""}<span class="selo ${d.situacao === "favorito" ? "vale" : d.situacao === "evitar" ? "nao" : ""}">${esc(selo)}</span></div>`;
    };
    const corpo = Object.keys(Dados.TIPOS_DELIVERY).filter((k) => porTipo[k]).map((k) => `<h2>${esc(Dados.TIPOS_DELIVERY[k])}</h2><div data-ordenavel="delivery">${porTipo[k].map(linha).join("")}</div>`).join("");
    return `${abasListas("delivery", '<button class="btn p" data-acao="novo-delivery">+ Delivery</button>')}
      <p class="peq">${r.favorito} favoritos · ${r.testar} para testar · ${r.pedi} já pedidos · ${r.evitar} para evitar</p>
      <div class="chips">${chipsDe(filtros, filtroDelivery, "filtro-delivery")}</div>
      <input id="buscaDelivery" class="campo" placeholder="Buscar…" value="${esc(buscaDelivery)}" style="margin:6px 0">
      ${corpo || '<p class="vazio">Nenhum delivery ainda. Anote os favoritos e os que você quer testar.</p>'}`;
  }
  function formDelivery(d) {
    const v = (k) => esc(d ? d[k] || "" : "");
    abrirFolha(`<h2>${d ? "Editar delivery" : "Novo delivery"}</h2>
      <label>Delivery<input id="dvNome" value="${v("nome")}" placeholder="Ex.: Cheiro Verde Pizza" autocapitalize="words"></label>
      <div class="duas"><label>Tipo<select id="dvTipo">${opcoesDe(Dados.TIPOS_DELIVERY, d ? d.tipo : "pizza")}</select></label>
      <label>Situação<select id="dvSit">${opcoesDe(Dados.SITUACOES_DELIVERY, d ? d.situacao : "testar")}</select></label></div>
      <div class="duas"><label>Nota (0 a 10)<input id="dvNota" inputmode="decimal" value="${d && d.nota != null ? String(d.nota).replace(".", ",") : ""}"></label>
      <label>Como pede<select id="dvCanal">${opcoesDe(Dados.CANAIS_DELIVERY, d ? d.canal : "app")}</select></label></div>
      <label>Telefone<input id="dvFone" inputmode="tel" value="${v("telefone")}" placeholder="(48) 3346-2692"></label>
      <label>O que pedir<input id="dvPedir" value="${v("pedir")}" placeholder="Ex.: calabresa e frango"></label>
      <label>O que não pedir<input id="dvNao" value="${v("nao_pedir")}" placeholder="Ex.: portuguesa (só cebola)"></label>
      <label>Anotações<textarea id="dvNotas" rows="3">${v("notas")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-delivery" data-id="${d ? d.id : ""}">Salvar</button></div>
      ${d ? `<button class="link perigo" data-acao="excluir" data-col="delivery" data-id="${d.id}">Excluir</button>` : ""}`);
  }
  // ---- notas: o computador sincroniza com o Simplenote (etiqueta dudoo-life); no celular elas também aparecem no app Simplenote
  function telaNotas() {
    const linhas = Dados.notasOrdenadas(filtroNota, buscaNota).map((n) => {
      const resto = String(n.texto || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[1] || "";
      const sub = [resto.slice(0, 90), (n.tags || []).map((t) => "#" + t).join(" ")].filter(Boolean).join(" · ");
      return `<div class="linha-lugar" data-acao="editar-nota" data-id="${n.id}" style="cursor:pointer"><div style="flex:1"><b>${n.fixada ? "📌 " : ""}${esc(Dados.tituloDaNota(n.texto))}</b>
        ${sub ? `<small>${esc(sub)}</small>` : ""}</div><span class="selo">${esc(Dados.isoParaBR(String(n.atualizado_em).slice(0, 10)))}</span></div>`;
    }).join("");
    return `${abasListas("notas", '<button class="btn p" data-acao="nova-nota">+ Nota</button>')}
      <p class="peq">${Dados.itens("notas").length} nota(s) · o computador as sincroniza com o Simplenote (etiqueta dudoo-life)</p>
      <div class="chips">${chipsDe([["tudo", "Todas"], ["fixadas", "Fixadas"]], filtroNota, "filtro-nota")}</div>
      <input id="buscaNota" class="campo" placeholder="Buscar…" value="${esc(buscaNota)}" style="margin:6px 0">
      ${linhas || '<p class="vazio">Nenhuma nota ainda. Anote uma ideia, uma medida, um lembrete.</p>'}`;
  }
  function formNota(n) {
    abrirFolha(`<h2>${n ? "Editar nota" : "Nova nota"}</h2>
      <label>Nota (a 1ª linha é o título)<textarea id="ntTexto" rows="12" autocapitalize="sentences">${esc(n ? n.texto || "" : "")}</textarea></label>
      <label>Etiquetas (opcional)<input id="ntTags" value="${esc(n ? (n.tags || []).join(", ") : "")}" placeholder="casa, ideias, trabalho…"></label>
      <label class="op"><input type="checkbox" id="ntFixada" ${n && n.fixada ? "checked" : ""}> Fixar no topo</label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-nota" data-id="${n ? n.id : ""}">Salvar</button></div>
      ${n ? `<button class="link perigo" data-acao="excluir" data-col="notas" data-id="${n.id}">Excluir</button>` : ""}`);
  }
  function formGuia(i) {
    const v = (k) => esc(i ? i[k] || "" : "");
    abrirFolha(`<h2>${i ? "Editar anotação" : "Nova anotação"}</h2>
      <label>Produto ou item<input id="gdTitulo" value="${v("titulo")}" placeholder="Ex.: Tênis Nike Pegasus · Camisa social" autocapitalize="sentences"></label>
      <div class="duas"><label>Tipo<select id="gdTipo">${opcoesDe(Dados.TIPOS_GUIA, i ? i.tipo : "produto")}</select></label>
      <label>Categoria<select id="gdCat">${opcoesDe(Dados.CATEGORIAS_GUIA, i ? i.categoria : "outro")}</select></label></div>
      <div class="duas"><label>Vale a pena?<select id="gdAval">${opcoesDe(Dados.AVALIACOES_GUIA, i ? i.avaliacao || "" : "")}</select></label>
      <label>Preço (R$)<input id="gdPreco" inputmode="decimal" value="${i && i.preco ? String(i.preco).replace(".", ",") : ""}"></label></div>
      <div class="duas"><label>Marca / modelo<input id="gdMarca" value="${v("marca")}"></label><label>Onde comprou ou viu<input id="gdOnde" value="${v("onde")}"></label></div>
      <label>Tamanho e medidas<input id="gdMedidas" value="${v("medidas")}" placeholder="Ex.: M · pescoço 39 · manga 64 · calça 42"></label>
      <label>Opinião e anotações<textarea id="gdNota" rows="3">${v("nota")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-guia" data-id="${i ? i.id : ""}">Salvar</button></div>
      ${i ? `<button class="link perigo" data-acao="excluir" data-col="guia_compras" data-id="${i.id}">Excluir</button>` : ""}`);
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
    const linhas = Dados.comOrdem(Dados.receitasOrdenadas(filtroReceita)).map((r) => {
      const n = Dados.ingredientesDaReceita(r).length;
      const sub = [Dados.CATEGORIAS_RECEITA[r.categoria], r.porcoes, r.tempo, n ? n + " ingrediente(s)" : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar ord" data-id="${r.id}"><span class="alca" aria-label="Arrastar">⠿</span><div data-acao="editar-receita" data-id="${r.id}" style="flex:1;cursor:pointer"><b>${r.favorita ? "♥ " : ""}${esc(r.nome)}</b><small>${esc(sub)}${r.nota ? " · " + estrelas(r.nota) : ""}</small></div>
        ${n ? `<button class="btn" data-acao="receita-mercado" data-id="${r.id}">→ Mercado</button>` : ""}</div>`;
    }).join("");
    return `${abasListas("receitas", '<button class="btn p" data-acao="nova-receita">+ Receita</button>')}
      <div class="chips">${chips}</div>${linhas ? `<div data-ordenavel="receitas">${linhas}</div>` : '<p class="vazio">Nenhuma receita salva ainda.</p>'}`;
  }

  function telaFilmes() {
    const filtros = [["quero", "Quero assistir"], ["assistindo", "Assistindo"], ["assistido", "Assistidos"], ["favoritos", "Favoritos"], ["abandonado", "Abandonados"], ["tudo", "Todos"]];
    const linhas = Dados.comOrdem(Dados.filmesOrdenados(filtroFilme)).map((t) => {
      const sub = [Dados.TIPOS_TELA[t.tipo], t.genero, t.ano, t.streaming, t.assistido_em ? "em " + Dados.isoParaBR(t.assistido_em) : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar ord" data-acao="editar-filme" data-id="${t.id}" style="cursor:pointer"><span class="alca" aria-label="Arrastar">⠿</span><div style="flex:1"><b>${t.favorito ? "♥ " : ""}${esc(t.titulo)}</b><small>${esc(sub)}</small></div>
        <span>${t.nota ? estrelas(t.nota) : esc(Dados.STATUS_TELA[t.status] || "")}</span></div>`;
    }).join("");
    return `${abasListas("filmes", '<button class="btn p" data-acao="novo-filme">+ Título</button>')}
      <div class="chips">${chipsDe(filtros, filtroFilme, "filtro-filme")}</div>${linhas ? `<div data-ordenavel="filmes">${linhas}</div>` : '<p class="vazio">Nada na lista ainda. Qual é o próximo filme?</p>'}`;
  }

  function telaCompras() {
    const nome = Dados.LISTAS_COMPRAS[listaCompra], itens = Dados.comprasDaLista(listaCompra, soFaltamCompra);
    const todas = Dados.itens("compras").filter((i) => i.lista === listaCompra), faltam = todas.filter((i) => !i.comprado).length, comprados = todas.length - faltam;
    const linhas = itens.map((i) => `<div class="linha-lugar compra ${i.comprado ? "off" : ""}" data-id="${i.id}"><span class="alca" aria-label="Arrastar">⠿</span>
      <input type="checkbox" data-acao="alternar-compra" data-id="${i.id}" ${i.comprado ? "checked" : ""}>
      <div data-acao="editar-compra" data-id="${i.id}" style="flex:1"><b>${esc(i.nome)}</b>${i.nota ? `<small>${esc(i.nota)}</small>` : ""}</div></div>`).join("");
    return `${abasListas("compras:" + listaCompra)}
      <p class="peq">${faltam} para comprar${comprados ? " · " + comprados + " comprado(s)" : ""} · segure um item e arraste para mudar a ordem</p>
      <div class="entrada"><input id="novaCompra" placeholder="Adicionar à lista ${esc(nome)}…" autocapitalize="sentences"><button class="btn p" data-acao="add-compra" aria-label="Adicionar">+</button></div>
      <label class="op"><input type="checkbox" id="soFaltamCompra" ${soFaltamCompra ? "checked" : ""}> Esconder o que já comprei</label>
      ${comprados ? '<button class="link" data-acao="limpar-compras">Limpar comprados</button>' : ""}
      <div id="listaCompras">${linhas || '<p class="vazio">Nada por aqui. Escreva um item acima.</p>'}</div>`;
  }
  function formCompra(i) {
    abrirFolha(`<h2>Editar item</h2><label>Item<input id="cpNome" value="${esc(i.nome)}"></label>
      <label>Nota<input id="cpNota" value="${esc(i.nota || "")}" placeholder="Tamanho, cor, marca, onde ver…"></label>
      <label>Lista<select id="cpLista">${opcoesDe(Dados.LISTAS_COMPRAS, i.lista)}</select></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-compra" data-id="${i.id}">Salvar</button></div>
      <button class="link perigo" data-acao="excluir" data-col="compras" data-id="${i.id}">Excluir</button>`);
  }
  function adicionarCompra() {
    const campo = $("#novaCompra"), nome = campo.value.trim().replace(/\s+/g, " "); if (!nome) return;
    Dados.adicionarCompra(listaCompra, nome);
    campo.value = "";
    desenhar(); const novo = $("#novaCompra"); if (novo) { novo.value = ""; novo.focus(); } sincronizar("compras");
  }

  function telaMetas() {
    const filtros = [["andamento", "Em andamento"], ["pausada", "Pausadas"], ["concluida", "Concluídas"], ["tudo", "Todas"]], r = Dados.resumoMetas();
    const linhas = Dados.comOrdem(Dados.metasOrdenadas(filtroMeta)).map((m) => {
      const feita = m.status === "concluida", hojeI = Dados.hojeISO(), atrasada = !feita && m.prazo && m.prazo < hojeI;
      const sub = [Dados.CATEGORIAS_META[m.categoria], m.status === "pausada" ? "pausada" : "", feita && m.concluida_em ? "concluída em " + Dados.isoParaBR(m.concluida_em) : m.prazo ? (atrasada ? "atrasada · " : "até ") + Dados.isoParaBR(m.prazo) : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar tarefa ord ${feita ? "off" : ""}" data-id="${m.id}"><span class="alca" aria-label="Arrastar">⠿</span><label class="marcar"><input type="checkbox" data-acao="alternar-meta" data-id="${m.id}" ${feita ? "checked" : ""}></label>
        <div data-acao="editar-meta" data-id="${m.id}" style="flex:1"><b>${esc(m.titulo)}</b><small style="${atrasada ? "color:var(--erro)" : ""}">${esc(sub)}</small>
          <div class="nota-barra" style="margin:6px 0 0"><div class="t"><i style="width:${Math.min(100, m.progresso || 0)}%"></i></div></div></div><b style="font-weight:500">${m.progresso || 0}%</b></div>`;
    }).join("");
    return `${abasListas("metas", '<button class="btn p" data-acao="nova-meta">+ Meta</button>')}
      <p class="peq">${r.concluidas} concluída(s) de ${r.total}${r.total > r.concluidas ? " · em andamento: " + r.medio + "% em média" : ""}</p>
      <div class="chips">${chipsDe(filtros, filtroMeta, "filtro-meta")}</div>${linhas ? `<div data-ordenavel="metas">${linhas}</div>` : '<p class="vazio">Nenhuma meta por aqui. Que tal escolher a primeira?</p>'}`;
  }

  function formMeta(m) {
    const v = (k) => esc(m ? m[k] || "" : "");
    abrirFolha(`<h2>${m ? "Editar meta" : "Nova meta"}</h2>
      <label>Qual é a meta<input id="mTitulo" value="${v("titulo")}" placeholder="Ex.: Correr 10 km sem parar"></label>
      <div class="duas"><label>Categoria<select id="mCat">${opcoesDe(Dados.CATEGORIAS_META, m ? m.categoria : "pessoal")}</select></label>
      <label>Situação<select id="mSt">${opcoesDe(Dados.STATUS_META, m ? m.status : "andamento")}</select></label></div>
      <label>Progresso: <b id="mProgV">${m ? m.progresso || 0 : 0}%</b><input id="mProg" type="range" min="0" max="100" step="5" value="${m ? m.progresso || 0 : 0}" style="margin-top:6px"
        oninput="document.getElementById('mProgV').textContent=this.value+'%'"></label>
      <label>Prazo<input id="mPrazo" inputmode="numeric" placeholder="DD/MM/AAAA" value="${m && m.prazo ? Dados.isoParaBR(m.prazo) : ""}"></label>
      <label>Como vou chegar lá · anotações<textarea id="mNotas" rows="3">${v("notas")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-meta" data-id="${m ? m.id : ""}">Salvar</button></div>
      ${m ? `<button class="link perigo" data-acao="excluir" data-col="metas" data-id="${m.id}">Excluir</button>` : ""}`);
  }

  function telaBucket() {
    const filtros = [["abertos", "A realizar"], ["planejado", "Planejados"], ["realizado", "Realizados"], ["tudo", "Todos"]];
    const linhas = Dados.comOrdem(Dados.bucketOrdenado(filtroBucket)).map((x) => {
      const feito = x.status === "realizado";
      const sub = [Dados.CATEGORIAS_BUCKET[x.categoria], Dados.STATUS_BUCKET[x.status], !feito ? "prioridade " + (Dados.PRIORIDADES[x.prioridade] || "").toLowerCase() : "",
        feito && x.realizado_em ? "em " + Dados.isoParaBR(x.realizado_em) : x.prazo ? "até " + Dados.isoParaBR(x.prazo) : ""].filter(Boolean).join(" · ");
      return `<div class="linha-lugar tarefa ord ${feito ? "off" : ""}" data-id="${x.id}"><span class="alca" aria-label="Arrastar">⠿</span><label class="marcar"><input type="checkbox" data-acao="alternar-bucket" data-id="${x.id}" ${feito ? "checked" : ""}></label>
        <div data-acao="editar-bucket" data-id="${x.id}"><b>${esc(x.titulo)}</b><small>${esc(sub)}</small></div><span>›</span></div>`;
    }).join("");
    return `${abasListas("bucket", '<button class="btn p" data-acao="novo-bucket">+ Sonho</button>')}
      <div class="chips">${chipsDe(filtros, filtroBucket, "filtro-bucket")}</div>${linhas ? `<div data-ordenavel="bucket">${linhas}</div>` : '<p class="vazio">Sua lista de realizações está vazia. Sonhe um pouco.</p>'}`;
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

  // Garagem (17/10/2026): todos os carros COM modelo 3D num círculo que gira (`Garagem3D.montarCirculo`); carro sem modelo fica numa lista
  // "ainda sem modelo 3D" (mesmos dados e botões); sem nenhum modelo, cai no palco de um carro só, como antes.
  let carrosNoCirculo = [];
  const dinheiroCarro = (v) => (v == null || v === "" ? "—" : "R$ " + Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 }));
  const barraNota = (rot, v) => (v == null || v === "" ? "" : `<div class="nota-barra"><div class="l"><span>${rot}</span><b>${String(v).replace(".", ",")}</b></div><div class="t"><i style="width:${Math.min(100, v * 10)}%"></i></div></div>`);
  function detalheCarroHtml(c) {
    if (!c) return '<p class="vazio">Nenhum carro por aqui. Eles chegam do computador ou você cadastra um.</p>';
    const custo = c.valor_compra != null ? (c.valor_compra - (c.valor_venda || 0)) : null, dinheiro = dinheiroCarro;
    return `<div class="fatos"><div><b>${esc(c.ano || "—")}</b><small>ano</small></div><div><b>${esc(Dados.tempoDePosse(c) || "—")}</b><small>de posse</small></div>
        <div><b>${dinheiro(custo != null ? custo : c.preco_alvo)}</b><small>${c.situacao === "quero" ? "preço-alvo" : "custo"}</small></div></div>
      ${barraNota("Desempenho", c.desempenho)}${barraNota("Conforto", c.conforto)}${barraNota("Prazer de dirigir", c.prazer)}
      ${c.motivo_troca ? `<p class="peq" style="color:var(--sec)">Motivo da troca: ${esc(c.motivo_troca)}</p>` : ""}
      ${[c.data_compra ? "Compra " + Dados.isoParaBR(c.data_compra) + (c.valor_compra != null ? " · " + dinheiro(c.valor_compra) : "") : (c.valor_compra != null ? "Compra " + dinheiro(c.valor_compra) : ""),
         c.data_venda ? "Venda " + Dados.isoParaBR(c.data_venda) + (c.valor_venda != null ? " · " + dinheiro(c.valor_venda) : "") : (c.valor_venda != null ? "Venda " + dinheiro(c.valor_venda) : ""),
         c.km != null ? Number(c.km).toLocaleString("pt-BR") + " km" : ""].filter(Boolean).map((t) => `<p class="peq" style="color:var(--sec);margin:2px 0">${esc(t)}</p>`).join("")}
      ${c.link ? `<p class="peq"><a href="${esc(c.link)}" target="_blank" rel="noopener" style="color:var(--acc2)">Link do anúncio</a></p>` : ""}
      ${c.notas ? `<p class="peq" style="color:var(--sec);white-space:pre-wrap">${esc(c.notas)}</p>` : ""}
      <div class="mini-acoes"><button class="link" data-acao="editar-carro" data-id="${c.id}">Editar</button>
        <button class="link perigo" data-acao="excluir" data-col="garagem" data-id="${c.id}">Excluir</button></div>`;
  }
  const eyebrowCarro = (c) => (c ? esc(Dados.SITUACOES_CARRO[c.situacao] || "") + (c.cor ? " · " + esc(c.cor) : "") : "Garagem & Wishlist");
  const contadorCarro = () => { const i = carrosNoCirculo.findIndex((x) => x.id === carroSel); return { i, texto: i >= 0 ? `${i + 1} de ${carrosNoCirculo.length}` : `— de ${carrosNoCirculo.length}` }; };

  // o carro da frente do círculo mudou (ou foi escolhido na lista): atualiza só o texto, sem refazer o 3D
  function atualizarCarro(id) {
    carroSel = id;
    const c = Dados.itens("garagem").find((x) => x.id === id);
    const t = $("#tituloCarro"), e = $("#eyebrowCarro"), d = $("#detalheCarro");
    if (t) t.textContent = c ? Dados.nomeCarro(c) : "Garagem";
    if (e) e.innerHTML = eyebrowCarro(c);
    if (d) d.innerHTML = detalheCarroHtml(c);
    const ct = contadorCarro(), cont = $("#contCarro"); if (cont) cont.textContent = ct.texto;
    document.querySelectorAll(".sem-modelo-chip").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
  }

  function telaGaragem() {
    const todos = Dados.carrosOrdenados(filtroCarro);
    if (!carroSel || !todos.find((c) => c.id === carroSel)) carroSel = todos.length ? todos[0].id : null;
    const c = todos.find((x) => x.id === carroSel);
    const chips = chipsDe([["tudo", "Todos"]].concat(Object.entries(Dados.SITUACOES_CARRO)), filtroCarro, "filtro-carro");
    carrosNoCirculo = window.Garagem3D ? todos.filter((x) => Garagem3D.temModelo(x)) : [];
    const semModelo = todos.filter((x) => !carrosNoCirculo.includes(x));
    let palcoHtml;
    if (carrosNoCirculo.length) {
      if (!c || !carrosNoCirculo.includes(c)) { /* carro escolhido sem modelo: o círculo começa no primeiro com modelo */ }
      const ct = contadorCarro();
      palcoHtml = `<div class="palco3d circulo" id="circulo3d"></div><div class="carregando3d" id="carregando3d">Carregando os carros…</div>
        <p class="dica3d">arraste para girar ao redor · toque num carro para trazer pra frente</p>
        <div class="seletor"><button class="btn" data-acao="carro-ant">‹</button><span class="peq" id="contCarro" style="color:var(--sec)">${ct.texto}</span>
          <button class="btn" data-acao="carro-prox">›</button></div>
        <div id="detalheCarro">${detalheCarroHtml(c)}</div>
        ${semModelo.length ? `<h2>Ainda sem modelo 3D</h2><div class="chips">${semModelo.map((x) => `<button class="chip sem-modelo-chip${x.id === carroSel ? " on" : ""}" data-acao="ver-carro" data-id="${x.id}">${esc(Dados.nomeCarro(x))}</button>`).join("")}</div>` : ""}`;
    } else if (c) {
      const idx = todos.indexOf(c);
      palcoHtml = `<div class="palco3d" id="palco3d"></div><p class="dica3d">arraste para girar · gira sozinho</p>
        <div class="seletor"><button class="btn" data-acao="carro-ant" ${idx <= 0 ? "disabled" : ""}>‹</button>
          <span class="peq" style="color:var(--sec)">${idx + 1} de ${todos.length}</span>
          <button class="btn" data-acao="carro-prox" ${idx >= todos.length - 1 ? "disabled" : ""}>›</button></div>
        <div id="detalheCarro">${detalheCarroHtml(c)}</div>`;
    } else palcoHtml = detalheCarroHtml(null);
    return `${voltar}<div class="linha-titulo"><h1 id="tituloCarro">${c ? esc(Dados.nomeCarro(c)) : "Garagem"}</h1><button class="btn p" data-acao="novo-carro">+ Carro</button></div>
      <p class="eyebrow" id="eyebrowCarro" style="margin-top:0">${eyebrowCarro(c)}</p>
      <div class="chips">${chips}</div>${palcoHtml}`;
  }

  const CARROCERIAS = { hatch: "Hatch", sedan: "Sedã", coupe: "Cupê", suv: "SUV", perua: "Perua", picape: "Picape", conversivel: "Conversível" };
  const dinheiroBR = (v) => (v == null || v === "" ? "" : String(v).replace(".", ","));
  const lerDinheiro = (id) => { const b = $(id).value.trim().replace(/R\$|\s/g, ""); if (!b) return null;
    const n = b.includes(",") ? Number(b.replace(/\./g, "").replace(",", ".")) : /^\d{1,3}(\.\d{3})+$/.test(b) ? Number(b.replace(/\./g, "")) : Number(b); return Number.isFinite(n) ? n : NaN; };
  const dataCampo = (id, rot) => { const b = $(id).value.trim(); if (!b) return ""; const iso = Dados.brParaISO(b); if (!iso) throw new Error(`${rot} precisa estar em DD/MM/AAAA.`); return iso; };
  function formCarro(c) {
    const v = (k) => esc(c ? c[k] ?? "" : "");
    const sit = Object.entries(Dados.SITUACOES_CARRO).map(([k, n]) => `<option value="${k}" ${(c ? c.situacao : "teve") === k ? "selected" : ""}>${n}</option>`).join("");
    const carr = `<option value="">Automático (pelo nome)</option>` + Object.entries(CARROCERIAS).map(([k, n]) => `<option value="${k}" ${c && c.carroceria === k ? "selected" : ""}>${n}</option>`).join("");
    const portas = [2, 3, 4, 5].map((n) => `<option value="${n}" ${(c ? c.portas : 4) === n ? "selected" : ""}>${n} portas</option>`).join("");
    const naVida = !!(c && c.momento_id);
    abrirFolha(`<h2>${c ? "Editar carro" : "Novo carro"}</h2>
      <div class="duas"><label>Marca<input id="gMarca" value="${v("marca")}" placeholder="Peugeot"></label><label>Modelo<input id="gModelo" value="${v("modelo")}" placeholder="206"></label></div>
      <div class="duas"><label>Apelido<input id="gApelido" value="${v("apelido")}"></label><label>Situação<select id="gSit">${sit}</select></label></div>
      <div class="duas"><label>Ano<input id="gAno" inputmode="numeric" value="${v("ano")}" placeholder="2004"></label><label>Cor<input id="gCor" value="${v("cor")}" placeholder="Prata"></label></div>
      <div class="duas"><label>Carroceria<select id="gCarr">${carr}</select></label><label>Portas<select id="gPortas">${portas}</select></label></div>
      <div class="duas"><label>Data de compra<input id="gDC" inputmode="numeric" placeholder="DD/MM/AAAA" value="${c && c.data_compra ? Dados.isoParaBR(c.data_compra) : ""}"></label>
        <label>Data de venda<input id="gDV" inputmode="numeric" placeholder="DD/MM/AAAA" value="${c && c.data_venda ? Dados.isoParaBR(c.data_venda) : ""}"></label></div>
      <div class="duas"><label>Valor de compra (R$)<input id="gVC" inputmode="decimal" data-mascara="dinheiro" value="${dinheiroBR(c && c.valor_compra)}"></label>
        <label>Valor de venda (R$)<input id="gVV" inputmode="decimal" data-mascara="dinheiro" value="${dinheiroBR(c && c.valor_venda)}"></label></div>
      <div class="duas"><label>Preço-alvo (wishlist, R$)<input id="gPA" inputmode="decimal" data-mascara="dinheiro" value="${dinheiroBR(c && c.preco_alvo)}"></label>
        <label>Km rodados<input id="gKm" inputmode="numeric" value="${c && c.km != null ? Math.round(c.km) : ""}"></label></div>
      <div class="duas"><label>Minha nota (0–10)<input id="gNota" inputmode="decimal" value="${v("nota")}"></label><label>Desempenho<input id="gDes" inputmode="decimal" value="${v("desempenho")}"></label></div>
      <div class="duas"><label>Conforto<input id="gCon" inputmode="decimal" value="${v("conforto")}"></label><label>Prazer de dirigir<input id="gPra" inputmode="decimal" value="${v("prazer")}"></label></div>
      <label>Motivo da troca<input id="gMotivo" value="${v("motivo_troca")}" placeholder="Por que se desfez do carro"></label>
      <label>Link do anúncio ou referência<input id="gLink" value="${v("link")}" placeholder="https://…" autocapitalize="none"></label>
      <label>Histórias e anotações<textarea id="gNotas" rows="3">${v("notas")}</textarea></label>
      <label class="op"><input type="checkbox" id="gVida" ${naVida ? "checked" : ""}> Mostrar em “Minha vida” (na data de compra)</label>
      <p class="peq">A foto do carro se escolhe no computador.</p>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-carro" data-id="${c ? c.id : ""}">Salvar</button></div>`);
  }

  // "Minha vida": o momento do carro tem id estável gar-<id> (mesma regra do computador: garagem_service.sincronizar_momento)
  function sincronizarMomentoCarro(carro, mostrar) {
    const mid = "gar-" + carro.id, existente = Dados.itens("momentos").find((m) => m.id === mid);
    if (mostrar && carro.situacao !== "quero" && carro.data_compra) {
      const texto = [Dados.SITUACOES_CARRO[carro.situacao], carro.ano, carro.cor, carro.apelido && `“${carro.apelido}”`].filter(Boolean).join(" · ");
      const lig = { vinculo_tipo: "carro", vinculo_id: carro.id, vinculo_nome: Dados.nomeCarro(carro) };
      if (existente) Dados.atualizar("momentos", mid, Object.assign({ titulo: Dados.nomeCarro(carro), data: carro.data_compra, texto }, lig));
      else Dados.adicionar("momentos", Object.assign({ id: mid, titulo: Dados.nomeCarro(carro), tipo: "carro", data: carro.data_compra, texto, origem: "garagem" }, lig));
      if (carro.momento_id !== mid) Dados.atualizar("garagem", carro.id, { momento_id: mid });
      return true;
    }
    if (!mostrar && carro.momento_id && String(carro.momento_id).startsWith("gar-")) { Dados.remover("momentos", carro.momento_id); Dados.atualizar("garagem", carro.id, { momento_id: "" }); }
    return false;
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
    const eu = Dados.itens("perfil").find((p) => p.id === "eu") || {};
    return `${voltar}<h1>Dados</h1>
      <div class="bloco"><h2>Meu perfil</h2>
        <p class="peq">Seu nome e sua data de nascimento. No dia do aniversário o app abre com uma animação de parabéns.</p>
        <input id="perfilNome" class="campo" placeholder="Seu nome" value="${esc(eu.nome || "")}">
        <input id="perfilNasc" class="campo" placeholder="DD/MM/AAAA" data-mascara="data" inputmode="numeric" value="${esc(window.Aniversario ? Aniversario.formatarNascimento(eu) : "")}">
        <button class="btn p" data-acao="salvar-perfil">Salvar perfil</button>
        <button class="btn" data-acao="testar-aniversario">Testar animação</button></div>
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
      <p class="peq">Versão do app: ${esc((window.DUDOO_CONFIG || {}).versao || "?")} · se esta versão não for a mais nova, feche o app e abra de novo.</p>
      <div class="bloco"><h2>Assistente</h2>
        <p class="peq">Token do assistente — é o mesmo token do Dudoo Web (fica só neste aparelho).</p>
        <input id="tokenIA" class="campo" type="password" placeholder="Token" value="${esc(localStorage.getItem("dudoolife.tokenIA") || "")}">
        <button class="btn" data-acao="salvar-token">Salvar token</button></div>
      <div class="bloco"><h2>Provador com IA (Gemini)</h2>
        <p class="peq">Chave do Gemini — gera a foto de você vestindo as peças. Fica só neste aparelho. Crie em aistudio.google.com/api-keys.</p>
        <input id="chaveGemini" class="campo" type="password" placeholder="AIza…" value="${esc(localStorage.getItem("dudoolife.gemini_chave") || "")}">
        <p class="peq">${localStorage.getItem("dudoolife.gemini_chave") ? "Chave configurada ✓" : "Chave não configurada"}</p>
        <button class="btn" data-acao="salvar-gemini">Salvar chave</button></div>`;
  }

  const TELAS = { dia: telaDia, vida: telaVida, assistente: telaAssistente, mais: telaMais };

  function desenhar() {
    const foco = document.activeElement && document.activeElement.id, val = foco && document.activeElement.value;
    if (palco) { palco.destruir(); palco = null; }
    cancelAnimationFrame(animVida);
    tela.innerHTML = TELAS[atual]();
    if (atual === "vida" && modoVida === "caminho") iniciarCaminho();
    document.body.classList.toggle("interna", !(atual === "dia"));
    document.documentElement.classList.toggle("interna", !(atual === "dia"));
    desenharMapa();
    const lc = $("#listaCompras");
    if (lc && window.Ordenavel) Ordenavel.ligar(lc, ".compra", (ids) => { Dados.reordenarCompras(listaCompra, ids); sincronizar("compras"); });
    document.querySelectorAll("[data-ordenavel]").forEach((el) => {          // tarefas, mercado, receitas, filmes, metas, bucket e guia: segurar e arrastar
      const col = el.dataset.ordenavel;
      if (window.Ordenavel) Ordenavel.ligar(el, ".ord", (ids) => { Dados.reordenarVisiveis(col, ids); sincronizar(col); });
    });
    if (typeof GuardaRoupa !== "undefined") { GuardaRoupa.hidratar(); GuardaRoupa.enviarPendentes(); }
    if (typeof Pessoal !== "undefined") { Pessoal.hidratar(); Pessoal.enviarPendentes(); }        // miniaturas das fotos de evolução (se houver na tela)
    const pal = $("#palco3d"), cir = $("#circulo3d");
    if (cir && window.Garagem3D) {
      palco = Garagem3D.montarCirculo(cir, carrosNoCirculo, carroSel, atualizarCarro, (est) => {
        const aviso = $("#carregando3d"); if (!aviso) return;
        if (est.erro || (est.total && est.carregados >= est.total)) aviso.remove(); else aviso.textContent = `Carregando os carros… ${est.carregados}/${est.total}`;
      });
    } else if (pal && window.Garagem3D) { const carro = Dados.itens("garagem").find((x) => x.id === carroSel); palco = Garagem3D.montar(pal, carro); }
    if (atual === "mais" && SUBS_LISTAS.includes(sub)) ultimaLista = sub;
    const abaAtiva = atual === "mais" && SUBS_LISTAS.includes(sub) ? "listas" : atual;       // o botão Listas acende dentro de qualquer lista
    document.querySelectorAll(".abas button").forEach((b) => b.classList.toggle("on", b.dataset.tela === abaAtiva));
    if (foco && $("#" + foco) && val != null) { $("#" + foco).value = val; $("#" + foco).focus(); }
    const c = $("#chat"); if (c) c.scrollTop = c.scrollHeight;
  }

  // ---------- folhas (formulários) ----------
  function abrirFolha(html) { folha.hidden = false; folha.innerHTML = `<div class="painel">${html}</div>`; }
  function fecharFolha() { folha.hidden = true; folha.innerHTML = ""; }

  // 2º dropdown do vínculo: itens do tipo escolhido (um momento de viagem não pode se ligar a si mesmo)
  function opcoesVinculoHtml(tipo, escolhido, proprio) {
    const lista = tipo ? Dados.opcoesVinculo(tipo).filter(([id]) => id !== proprio) : [];
    return lista.length ? lista.map(([id, n]) => `<option value="${esc(String(id))}" ${String(id) === String(escolhido) ? "selected" : ""}>${esc(n)}</option>`).join("") : '<option value="">—</option>';
  }
  const TELA_DO_VINCULO = { carro: "garagem", lugar: "lugares", destino: "destinos", pessoa: "pessoas", meta: "metas", sonho: "bucket" };
  function vinculoHtml(m) {
    if (!m.vinculo_tipo || !Dados.VINCULOS[m.vinculo_tipo]) return "";
    const nome = Dados.nomeDoVinculo(m.vinculo_tipo, m.vinculo_id, m.vinculo_nome); if (!nome) return "";
    return `<button class="link vinculo" data-acao="abrir-vinculo" data-t="${m.vinculo_tipo}" data-id="${esc(String(m.vinculo_id))}">🔗 ${esc(Dados.VINCULOS[m.vinculo_tipo])} · ${esc(nome)} ›</button>`;
  }
  function formMomento(m) {
    const op = Object.entries(Dados.TIPOS).map(([k, v]) => `<option value="${k}" ${m && m.tipo === k ? "selected" : ""}>${v.icone} ${v.nome}</option>`).join("");
    abrirFolha(`<h2>${m ? "Editar momento" : "Contar um momento"}</h2>
      <label>Título<input id="fTitulo" value="${esc(m ? m.titulo : "")}" placeholder="Ex.: Viagem para Lisboa"></label>
      <div class="duas"><label>Tipo<select id="fTipo">${op}</select></label>
      <label>Data<input id="fData" inputmode="numeric" placeholder="DD/MM/AAAA" value="${Dados.isoParaBR(m ? m.data : Dados.hojeISO())}"></label></div>
      <label>Onde<input id="fLocal" value="${esc(m ? m.local || "" : "")}" placeholder="Cidade, lugar…"></label>
      <label>Como foi<textarea id="fTexto" rows="3">${esc(m ? m.texto || "" : "")}</textarea></label>
      <div class="duas"><label>Ligar a algo do app<select id="fVinTipo"><option value="">Nada</option>${opcoesDe(Dados.VINCULOS, m ? m.vinculo_tipo : "")}</select></label>
        <label>Qual<select id="fVinItem">${opcoesVinculoHtml(m ? m.vinculo_tipo : "", m ? m.vinculo_id : "", m ? m.id : "")}</select></label></div>
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
  const instaCurto = (v) => { v = String(v || "").trim(); if (!v) return ""; const m = v.match(/instagram\.com\/([^/?#\s]+)/i); return m ? "@" + m[1].replace(/^@/, "") : (/^https?:/i.test(v) ? v : "@" + v.replace(/^@/, "")); };
  /* Como chegar: Google Maps e Waze. Usa o endereço (com cidade e país), as coordenadas ou o link do Maps cadastrado. */
  const destinoTexto = (l) => [l.nome, l.endereco, l.cidade, l.pais].filter(Boolean).join(", ");
  const temDestino = (l) => !!(l.endereco || (l.lat != null && l.lon != null) || l.link_maps);
  const urlMaps = (l) => l.link_maps || (l.endereco || (l.lat != null && l.lon != null)
    ? "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(l.lat != null && l.lon != null && !l.endereco ? `${l.lat},${l.lon}` : destinoTexto(l)) : "");
  const urlWaze = (l) => (l.endereco || (l.lat != null && l.lon != null))
    ? "https://waze.com/ul?navigate=yes&" + (l.lat != null && l.lon != null && !l.endereco ? `ll=${l.lat},${l.lon}` : "q=" + encodeURIComponent(destinoTexto(l))) : "";
  /* Ficha de leitura: tocar num lugar só CONSULTA; "Editar" abre o formulário. */
  function fichaLugar(l) {
    const linha = (rot, val) => (val ? `<div class="kv-ficha"><small>${rot}</small><span>${val}</span></div>` : "");
    const rota = [urlMaps(l) ? `<a class="btn p" href="${esc(urlMaps(l))}" target="_blank" rel="noopener">📍 Google Maps</a>` : "", urlWaze(l) ? `<a class="btn p" href="${esc(urlWaze(l))}" target="_blank" rel="noopener">🚗 Waze</a>` : ""].filter(Boolean).join("");
    const maps = "";
    const insta = l.instagram ? `<a class="btn" href="${esc(linkInstagram(l.instagram))}" target="_blank" rel="noopener">Instagram ${esc(instaCurto(l.instagram))}</a>` : "";
    const local = [l.cidade, l.pais].filter(Boolean).map(esc).join(" · ");
    abrirFolha(`<h2>${esc(l.nome)}</h2>
      <div class="ficha-sub">${esc(Dados.CATEGORIAS[l.categoria] || "")}${l.culinaria ? " · " + esc(l.culinaria) : ""} · ${esc(Dados.STATUS[l.status] || "")}${l.nota != null ? " · ★ " + String(l.nota).replace(".", ",") : ""}</div>
      ${rota ? `<div class="duas">${rota}</div>` : ""}
      ${linha("Endereço", esc(l.endereco || ""))}${linha("Onde", local)}${linha("Anotações", esc(l.notas || "").replace(/\n/g, "<br>"))}
      ${maps || insta ? `<div class="duas">${maps}${insta}</div>` : ""}
      <div class="duas"><button class="btn" data-acao="fechar">Fechar</button><button class="btn p" data-acao="editar-lugar" data-id="${esc(l.id)}">Editar</button></div>`);
  }
  const linkInstagram = (v) => { v = String(v || "").trim(); if (!v) return ""; return /^https?:/i.test(v) ? v : "https://instagram.com/" + v.replace(/^@/, ""); };
  function formLugar(l) {
    const sel = (mapa, atual) => Object.entries(mapa).map(([k, n]) => `<option value="${k}" ${k === atual ? "selected" : ""}>${n}</option>`).join("");
    const v = l || {};
    const links = [v.link_maps ? `<a class="btn" href="${esc(v.link_maps)}" target="_blank" rel="noopener">Abrir no Maps</a>` : "", v.instagram ? `<a class="btn" href="${esc(linkInstagram(v.instagram))}" target="_blank" rel="noopener">Abrir Instagram</a>` : ""].filter(Boolean).join("");
    abrirFolha(`<h2>${l ? "Ficha do lugar" : "Novo lugar"}</h2>
      ${links ? `<div class="duas">${links}</div>` : ""}
      <label>Nome<input id="lNome" placeholder="Ex.: Maní" value="${esc(v.nome || "")}"></label>
      <div class="duas"><label>Categoria<select id="lCat">${sel(Dados.CATEGORIAS, v.categoria || "restaurante")}</select></label><label>Situação<select id="lSt">${sel(Dados.STATUS, v.status || "quero_conhecer")}</select></label></div>
      <label id="lCulBloco" ${["restaurante", "delivery"].includes(v.categoria || "restaurante") ? "" : "hidden"}>Tipo de culinária<input id="lCul" list="listaCulinarias" placeholder="Japonesa, Italiana…" autocomplete="off" value="${esc(v.culinaria || "")}"></label>
      <datalist id="listaCulinarias">${Dados.culinarias().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <label>Cidade<input id="lCidade" list="listaCidades" placeholder="São Paulo" autocomplete="off" value="${esc(v.cidade || "")}"></label>
      <datalist id="listaCidades">${Dados.cidades().map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <label>País<input id="lPais" placeholder="Brasil" value="${esc(v.pais || "")}"></label>
      <div class="duas"><label>Minha nota (0 a 5)<input id="lNota" inputmode="decimal" placeholder="4,5" value="${v.nota != null ? esc(String(v.nota).replace(".", ",")) : ""}"></label><label>Instagram<input id="lInsta" placeholder="@perfil ou link" value="${esc(v.instagram || "")}"><small class="dica-campo">Pode ser só o @perfil (ex.: @chateauduvalle) ou o link completo.</small></label></div>
      <label>Endereço<input id="lEnd" placeholder="Rua, número, bairro" value="${esc(v.endereco || "")}"></label>
      <label>Link do Google Maps<input id="lMaps" placeholder="https://maps.google.com/…" value="${esc(v.link_maps || "")}"></label>
      <label>Anotações<textarea id="lNotas" rows="3">${esc(v.notas || "")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="salvar-lugar" data-id="${esc(v.id || "")}">Salvar</button></div>
      ${l ? `<button class="link perigo" data-acao="excluir-ficha-lugar" data-id="${esc(v.id)}">Excluir este lugar</button>` : ""}`);
  }

  function adicionarItemMercado() {
    const campo = $("#novoItem"), nome = campo.value.trim().replace(/\s+/g, " "); if (!nome) return;
    const existe = Dados.itens("supermercado").find((i) => !i.comprado && Dados.normalizar(i.nome) === Dados.normalizar(nome));
    if (!existe) Dados.adicionar("supermercado", { nome, quantidade: "", secao: "outros", comprado: false, origem: "" });
    Dados.registrarHabitual(nome);
    campo.value = "";      // senão o desenhar() devolve a palavra antiga pra caixa
    desenhar(); const novo = $("#novoItem"); if (novo) { novo.value = ""; novo.focus(); } sincronizar("supermercado"); sincronizar("mercado_habituais");
  }

  function folhaListaPadrao() {
    const faltando = new Set(Dados.itens("supermercado").filter((i) => !i.comprado).map((i) => Dados.normalizar(i.nome)));
    const lista = Dados.habituais().filter((h) => !faltando.has(Dados.normalizar(h.nome)));
    const linhas = lista.map((h) => `<label class="linha-lugar item-mercado"><input type="checkbox" class="hab" value="${h.id}"><div><b>${esc(h.nome)}</b><small>${h.usos || 1}x</small></div>
        <button class="link perigo" data-acao="tirar-habitual" data-id="${h.id}">Tirar</button></label>`).join("");
    abrirFolha(`<h2>Lista padrão</h2><p class="peq">O que você costuma comprar. Marque e adicione, sem digitar.</p>
      ${linhas || '<p class="vazio">Tudo da lista padrão já está na sua lista (ou ela ainda está vazia).</p>'}
      <div class="duas"><button class="btn" data-acao="fechar">Fechar</button>${lista.length ? '<button class="btn p" data-acao="usar-habituais">Adicionar marcados</button>' : ""}</div>`);
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
    if (aba && aba.dataset.tela === "listas") { atual = "mais"; sub = ultimaLista; desenhar(); return; }          // abre a última lista usada (Tarefas na 1ª vez)
    if (aba) { atual = aba.dataset.tela; sub = "menu"; desenhar(); return; }
    const marco = ev.target.closest(".marco");
    if (marco && atual === "vida" && !ev.target.closest("[data-acao]")) {
      selecionado = Dados.itens("momentos").find((i) => i.id === marco.dataset.id) || null;
      clearTimeout(bravoTimer); bravoTimer = setTimeout(() => { bravoTimer = null; desenhar(); }, 1500); desenhar(); return;
    }
    const el = ev.target.closest("[data-acao]"); if (!el) return;
    const d = el.dataset, acao = d.acao;
    Pessoal.iniciar(ctxPessoal());
    if (Pessoal.acao(acao, d)) return;
    Financas.iniciar(ctxPessoal());
    if (Financas.acao(acao, d)) return;
    GuardaRoupa.iniciar(ctxPessoal());
    if (GuardaRoupa.acao(acao, d)) return;
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
      case "lista-padrao": folhaListaPadrao(); break;
      case "tirar-habitual": Dados.remover("mercado_habituais", d.id); folhaListaPadrao(); sincronizar("mercado_habituais"); break;
      case "usar-habituais": {
        const ids = [...document.querySelectorAll(".hab:checked")].map((c) => c.value);
        if (ids.length) { Dados.adicionarHabituais(ids); sincronizar("supermercado"); sincronizar("mercado_habituais"); }
        fecharFolha(); desenhar(); break;
      }
      case "registrar-compra-mercado": folhaRegistrarCompra(); break;
      case "salvar-compra-mercado": {
        const r = Dados.registrarCompraMercado({ valor: $("#rcValor").value, local: $("#rcLocal").value, data: $("#rcData").value.trim(), tirar: $("#rcTirar").checked });
        if (r.erro) { $("#fErro").textContent = r.erro; return; }
        fecharFolha(); desenhar(); sincronizar("mercado_compras"); sincronizar("supermercado"); break;
      }
      case "gastos-mercado": folhaGastosMercado(); break;
      case "apagar-compra-mercado": if (confirm("Apagar esta compra do histórico?")) { Dados.remover("mercado_compras", d.id); folhaGastosMercado(); desenhar(); sincronizar("mercado_compras"); } break;
      case "filtro-delivery": filtroDelivery = d.k; desenhar(); break;
      case "novo-delivery": formDelivery(null); break;
      case "editar-delivery": formDelivery(Dados.itens("delivery").find((x) => x.id === d.id)); break;
      case "salvar-delivery": {
        const nome = $("#dvNome").value.trim().replace(/\s+/g, " "); if (!nome) { $("#fErro").textContent = "Escreva o nome do delivery."; return; }
        const nota = Dados.numeroBR($("#dvNota").value); if (Number.isNaN(nota) || (nota != null && (nota < 0 || nota > 10))) { $("#fErro").textContent = "A nota vai de 0 a 10."; return; }
        const campos = { nome, tipo: $("#dvTipo").value, situacao: $("#dvSit").value, nota, canal: $("#dvCanal").value, telefone: $("#dvFone").value.trim(),
          pedir: $("#dvPedir").value.trim(), nao_pedir: $("#dvNao").value.trim(), notas: $("#dvNotas").value.trim() };
        if (d.id) Dados.atualizar("delivery", d.id, campos); else Dados.adicionar("delivery", Object.assign({ ordem: 0 }, campos));
        fecharFolha(); desenhar(); sincronizar("delivery"); break;
      }
      case "filtro-nota": filtroNota = d.k; desenhar(); break;
      case "nova-nota": formNota(null); break;
      case "editar-nota": formNota(Dados.itens("notas").find((x) => x.id === d.id)); break;
      case "salvar-nota": {
        const texto = $("#ntTexto").value.replace(/\r\n/g, "\n").replace(/^\s+|\s+$/g, ""); if (!texto) { $("#fErro").textContent = "Escreva a nota."; return; }
        const campos = { texto, tags: Dados.etiquetasDeNota($("#ntTags").value), fixada: $("#ntFixada").checked };
        if (d.id) Dados.atualizar("notas", d.id, campos);
        else Dados.adicionar("notas", Object.assign({ simplenote_key: "", simplenote_versao: 0, simplenote_mod: 0, base_sinc: "" }, campos));
        fecharFolha(); desenhar(); sincronizar("notas"); break;
      }
      case "filtro-guia": filtroGuia = d.k; desenhar(); break;
      case "novo-guia": formGuia(null); break;
      case "editar-guia": formGuia(Dados.itens("guia_compras").find((x) => x.id === d.id)); break;
      case "salvar-guia": {
        const titulo = $("#gdTitulo").value.trim().replace(/\s+/g, " "); if (!titulo) { $("#fErro").textContent = "Escreva o nome do produto ou do que é a medida."; return; }
        const preco = Dados.numeroBR($("#gdPreco").value); if (Number.isNaN(preco)) { $("#fErro").textContent = "O preço precisa ser um número."; return; }
        const campos = { tipo: $("#gdTipo").value, titulo, categoria: $("#gdCat").value, avaliacao: $("#gdAval").value, marca: $("#gdMarca").value.trim(), onde: $("#gdOnde").value.trim(),
          preco, medidas: $("#gdMedidas").value.trim(), nota: $("#gdNota").value.trim() };
        if (d.id) Dados.atualizar("guia_compras", d.id, campos); else Dados.adicionar("guia_compras", Object.assign({ ordem: 0 }, campos));
        fecharFolha(); desenhar(); sincronizar("guia_compras"); break;
      }
      case "ir-tarefas": atual = "mais"; sub = "tarefas"; desenhar(); break;
      case "filtro-receita": filtroReceita = d.k; desenhar(); break;
      case "filtro-filme": filtroFilme = d.k; desenhar(); break;
      case "filtro-bucket": filtroBucket = d.k; desenhar(); break;
      case "filtro-meta": filtroMeta = d.k; desenhar(); break;
      case "add-compra": adicionarCompra(); break;
      case "alternar-compra": Dados.alternarCompra(d.id); desenhar(); sincronizar("compras"); break;
      case "editar-compra": { const i = Dados.itens("compras").find((x) => x.id === d.id); if (i) formCompra(i); break; }
      case "limpar-compras": Dados.limparCompras(listaCompra); desenhar(); sincronizar("compras"); break;
      case "salvar-compra": {
        const nome = $("#cpNome").value.trim().replace(/\s+/g, " "); if (!nome) { $("#fErro").textContent = "Escreva o item."; return; }
        const i = Dados.itens("compras").find((x) => x.id === d.id), lista = $("#cpLista").value, campos = { nome, nota: $("#cpNota").value.trim(), lista };
        if (i && lista !== i.lista) campos.ordem = Dados.itens("compras").filter((x) => x.lista === lista).reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1;   // vai pro fim da outra lista
        Dados.atualizar("compras", d.id, campos); fecharFolha(); desenhar(); sincronizar("compras"); break;
      }
      case "nova-meta": formMeta(null); break;
      case "editar-meta": formMeta(Dados.itens("metas").find((x) => x.id === d.id)); break;
      case "alternar-meta": Dados.alternarMeta(d.id); desenhar(); sincronizar("metas"); break;
      case "salvar-meta": {
        const titulo = $("#mTitulo").value.trim(); if (!titulo) { $("#fErro").textContent = "Escreva a meta."; return; }
        const bruta = $("#mPrazo").value.trim(), iso = bruta ? Dados.brParaISO(bruta) : "";
        if (bruta && !iso) { $("#fErro").textContent = "O prazo precisa estar em DD/MM/AAAA."; return; }
        let status = $("#mSt").value, progresso = Number($("#mProg").value);
        const antes = d.id ? Dados.itens("metas").find((i) => i.id === d.id) : null;
        if (status === "concluida" || progresso === 100) { status = "concluida"; progresso = 100; }                  // 100% = concluída (e vice-versa)
        const concluida = status === "concluida" ? ((antes && antes.concluida_em) || Dados.hojeISO()) : "";
        const campos = { titulo, categoria: $("#mCat").value, status, progresso, prazo: iso, concluida_em: concluida, notas: $("#mNotas").value.trim() };
        if (d.id) Dados.atualizar("metas", d.id, campos); else Dados.adicionar("metas", campos);
        fecharFolha(); desenhar(); sincronizar("metas"); break;
      }
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
        if (carrosNoCirculo.length && palco && palco.ir) {                 // círculo: leva o carro vizinho à frente (dá a volta)
          const n = carrosNoCirculo.length, i = carrosNoCirculo.findIndex((x) => x.id === carroSel);
          const j = i < 0 ? 0 : (i + (acao === "carro-ant" ? -1 : 1) + n) % n; palco.ir(carrosNoCirculo[j].id); break;
        }
        const lista = Dados.carrosOrdenados(filtroCarro), i = lista.findIndex((x) => x.id === carroSel);
        const j = acao === "carro-ant" ? i - 1 : i + 1; if (lista[j]) { carroSel = lista[j].id; desenhar(); } break;
      }
      case "ver-carro": {                                                  // carro da lista "ainda sem modelo 3D"
        const x = Dados.itens("garagem").find((k) => k.id === d.id);
        if (x && carrosNoCirculo.includes(x) && palco && palco.ir) palco.ir(x.id); else atualizarCarro(d.id);
        break;
      }
      case "novo-carro": formCarro(null); break;
      case "editar-carro": formCarro(Dados.itens("garagem").find((x) => x.id === d.id)); break;
      case "salvar-carro": {
        const erro = (t) => { $("#fErro").textContent = t; };
        const marca = $("#gMarca").value.trim(), modelo = $("#gModelo").value.trim(), apelido = $("#gApelido").value.trim();
        if (!marca && !modelo && !apelido) return erro("Informe ao menos a marca, o modelo ou um apelido.");
        const ano = $("#gAno").value.trim(); if (ano && !/^\d{4}$/.test(ano)) return erro("O ano precisa ter 4 dígitos (ex.: 2019).");
        const nums = {}; for (const [campo, id] of [["nota", "#gNota"], ["desempenho", "#gDes"], ["conforto", "#gCon"], ["prazer", "#gPra"]]) {
          const b = $(id).value.trim().replace(",", "."), n = b === "" ? null : Number(b);
          if (n !== null && (!Number.isFinite(n) || n < 0 || n > 10)) return erro("As notas vão de 0 a 10.");
          nums[campo] = n;
        }
        const din = {}; for (const [campo, id, rot] of [["valor_compra", "#gVC", "O valor de compra"], ["valor_venda", "#gVV", "O valor de venda"], ["preco_alvo", "#gPA", "O preço-alvo"]]) {
          din[campo] = lerDinheiro(id); if (Number.isNaN(din[campo])) return erro(`${rot} precisa ser um número.`);
        }
        const kmBruto = $("#gKm").value.trim().replace(/\./g, "").replace(",", "."), km = kmBruto === "" ? null : Number(kmBruto);
        if (km !== null && !Number.isFinite(km)) return erro("O km precisa ser um número.");
        let datas; try { datas = { data_compra: dataCampo("#gDC", "A data de compra"), data_venda: dataCampo("#gDV", "A data de venda") }; } catch (e) { return erro(e.message); }
        if (datas.data_compra && datas.data_venda && datas.data_venda < datas.data_compra) return erro("A venda não pode ser antes da compra.");
        const campos = Object.assign({ marca, modelo, apelido, ano, cor: $("#gCor").value.trim(), situacao: $("#gSit").value, carroceria: $("#gCarr").value, portas: Number($("#gPortas").value),
          motivo_troca: $("#gMotivo").value.trim(), link: $("#gLink").value.trim(), notas: $("#gNotas").value.trim(), km }, nums, din, datas);
        let carro;
        if (d.id) carro = Dados.atualizar("garagem", d.id, campos);
        else { carro = Dados.adicionar("garagem", Object.assign({ momento_id: "", foto: "" }, campos)); carroSel = carro.id; }
        const sincVida = sincronizarMomentoCarro(Dados.itens("garagem").find((x) => x.id === carro.id), $("#gVida").checked);
        fecharFolha(); desenhar(); sincronizar("garagem"); if (sincVida || d.id) sincronizar("momentos"); break;
      }
      case "vida-modo": modoVida = d.k; desenhar(); break;
      case "vida-ir": andarPara(+d.i); break;
      case "vida-passo": andarPara((idxVida || 0) + +d.d); break;
      case "novo-momento": formMomento(null); break;
      case "editar-momento": formMomento(Dados.itens("momentos").find((m) => m.id === d.id)); break;
      case "abrir-vinculo": {                                                // do momento pro item ligado
        if (d.t === "viagem") { const v = Dados.itens("momentos").find((x) => x.id === d.id); if (v) { selecionado = v; atual = "vida"; desenhar(); } break; }
        if (d.t === "carro") { carroSel = d.id; filtroCarro = "tudo"; }
        atual = "mais"; sub = TELA_DO_VINCULO[d.t] || "menu"; desenhar(); break;
      }
      case "novo-lugar": formLugar(null); break;
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
        const vt = $("#fVinTipo").value, vi = $("#fVinItem").value, vSel = $("#fVinItem").selectedOptions[0];
        Object.assign(campos, vt && vi ? { vinculo_tipo: vt, vinculo_id: vi, vinculo_nome: vSel ? vSel.textContent : "" } : { vinculo_tipo: "", vinculo_id: "", vinculo_nome: "" });
        if (d.id) Dados.atualizar("momentos", d.id, campos);
        else Dados.adicionar("momentos", Object.assign({ privado: false, pessoas: [] }, campos));
        fecharFolha(); desenhar(); sincronizar("momentos"); break;
      }
      case "salvar-lugar": {
        const nome = $("#lNome").value.trim(), cidade = Dados.cidadeCanonica($("#lCidade").value);
        if (!nome) { $("#fErro").textContent = "Dê um nome ao lugar."; return; }
        const outro = Dados.lugarDuplicado(nome, cidade);
        if (outro && outro.id !== d.id) { $("#fErro").textContent = "Esse lugar já está cadastrado."; return; }
        const bruto = $("#lNota").value.trim().replace(",", "."), nota = bruto === "" ? null : Number(bruto);
        if (nota !== null && !(nota >= 0 && nota <= 5)) { $("#fErro").textContent = "A nota vai de 0 a 5."; return; }
        const pais = $("#lPais").value.trim() || Dados.paisDaCidade(cidade);
        const campos = { nome, categoria: $("#lCat").value, cidade, pais, status: $("#lSt").value, nota, notas: $("#lNotas").value.trim(), link_maps: $("#lMaps").value.trim(), endereco: $("#lEnd").value.trim().replace(/\s+/g, " "), instagram: $("#lInsta").value.trim(), culinaria: ["restaurante", "delivery"].includes($("#lCat").value) ? $("#lCul").value.trim().replace(/\s+/g, " ") : "" };
        if (d.id) Dados.atualizar("lugares", d.id, campos);
        else Dados.adicionar("lugares", Object.assign({ viagens: [] }, campos));
        fecharFolha(); desenhar(); sincronizar("lugares"); break;
      }
      case "ver-lugar": { const l = Dados.itens("lugares").find((x) => x.id === d.id); if (l) fichaLugar(l); break; }
      case "editar-lugar": { const l = Dados.itens("lugares").find((x) => x.id === d.id); if (l) formLugar(l); break; }
      case "excluir-ficha-lugar": if (confirm("Excluir este lugar?")) { Dados.remover("lugares", d.id); fecharFolha(); desenhar(); sincronizar("lugares"); } break;
      case "excluir": if (confirm("Excluir este item?")) { Dados.remover(d.col, d.id); desenhar(); sincronizar(d.col); } break;
      case "exemplos": Dados.semearExemplos(); desenhar(); sincronizar("momentos"); break;
      case "sub": if (d.s === "menu") { Pessoal.fechar(); GuardaRoupa.fechar(); } sub = d.s; desenhar(); break;
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
      case "salvar-perfil": {
        const nasc = Aniversario.lerNascimento($("#perfilNasc").value), nome = $("#perfilNome").value.trim().replace(/\s+/g, " ");
        if (!nasc) { alert("A data precisa estar como DD/MM/AAAA (ou DD/MM)."); return; }
        if (!nome && !nasc.aniversario) { alert("Informe seu nome ou sua data de nascimento."); return; }
        const campos = { nome, aniversario: nasc.aniversario, ano_nascimento: nasc.ano_nascimento }, atual = Dados.itens("perfil").find((p) => p.id === "eu");
        if (atual) Dados.atualizar("perfil", "eu", campos); else Dados.adicionar("perfil", Object.assign({ id: "eu" }, campos));
        sincronizar("perfil"); alert("Perfil salvo."); desenhar(); break;
      }
      case "testar-aniversario": Aniversario.mostrar(Dados.itens("perfil").find((p) => p.id === "eu") || { nome: ($("#perfilNome") || {}).value || "" }, { teste: true }); break;
      case "salvar-gemini": localStorage.setItem("dudoolife.gemini_chave", $("#chaveGemini").value.trim()); alert($("#chaveGemini").value.trim() ? "Chave do Gemini salva neste aparelho." : "Chave do Gemini removida."); desenhar(); break;
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
    if (ev.target.id === "lCat") { const b = $("#lCulBloco"); if (b) b.hidden = !["restaurante", "delivery"].includes(ev.target.value); return; }
    if (ev.target.id === "selCidadeLugar") { filtroCidade = ev.target.value; desenhar(); return; }
    if (ev.target.id === "soFaltam") { soFaltam = ev.target.checked; desenhar(); return; }
    if (ev.target.id === "soFaltamCompra") { soFaltamCompra = ev.target.checked; desenhar(); return; }
    if (ev.target.id === "fVinTipo") { const alvo = $("#fVinItem"); if (alvo) alvo.innerHTML = opcoesVinculoHtml(ev.target.value, "", ""); return; }
    if (ev.target.id === "selLista") {                               // dropdown de listas: "compras:casa" ou o nome da tela
      const v = ev.target.value; if (v.startsWith("compras:")) { listaCompra = v.slice(8); sub = "compras"; } else sub = v;
      desenhar(); return;
    }
    if (ev.target.id === "aprender") { Dados.definirAprendizado(camadaMem, ev.target.checked); return; }
    if (ev.target.id !== "arquivo" || !ev.target.files[0]) return;
    try { Dados.substituir("momentos", JSON.parse(await ev.target.files[0].text())); atual = "vida"; desenhar(); sincronizar("momentos"); }
    catch (e) { alert("Não consegui ler o arquivo: " + e.message); }
  });
  document.addEventListener("input", (ev) => { if (ev.target.id === "buscaGuia") { buscaGuia = ev.target.value; desenhar(); } if (ev.target.id === "buscaNota") { buscaNota = ev.target.value; desenhar(); } if (ev.target.id === "buscaDelivery") { buscaDelivery = ev.target.value; desenhar(); } });
  document.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.id === "novoItem") { adicionarItemMercado(); return; }
  if (ev.key === "Enter" && ev.target.id === "novaCompra") { adicionarCompra(); return; }
  if (ev.key === "Enter" && ev.target.id === "msg") { const t = ev.target.value; ev.target.value = ""; enviarMensagem(t); } });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sincronizar().then(desenhar); });

  // ---------- altura real da tela (o fundo é pintado no canvas e precisa cobrir a janela inteira) ----------
  function definirAltura() {
    const h = Math.max(innerHeight, Math.min(screen.height || innerHeight, innerHeight + 160));
    document.documentElement.style.setProperty("--H", h + "px");
  }
  definirAltura();
  addEventListener("resize", definirAltura);
  addEventListener("orientationchange", () => setTimeout(definirAltura, 250));

  // ---------- foto do dia (rotaciona entre as fotos de abertura) ----------
  (function fotoDoDia() {
    const n = Math.floor(Date.now() / 86400000) % 4 + 1;
    document.documentElement.style.setProperty("--foto", `url("img/abertura${n}.jpg")`);
  })();

  // ---------- partida ----------
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  estado.textContent = Nuvem.disponivel() ? "Sincronizando…" : "Só neste aparelho";
  desenhar();
  const verificarAniversario = () => { try { Aniversario.verificar(Dados.itens("perfil").find((p) => p.id === "eu")); } catch (e) {} };
  verificarAniversario();
  if (Nuvem.disponivel()) sincronizar().then(() => { desenhar(); verificarAniversario(); });
})();
