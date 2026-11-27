// Fotos de fundo (20/11/2026): adicionar, remover, mudar a posição (▲▼), escolher quais giram por dia, fixar uma e enquadrar.
// Mesmo módulo do computador (`fundos`, ver Dados.fundo* e app/services/fundos_service.py). As 4 fotos de sempre vêm no app; as do Eduardo são
// reduzidas (1600 px, JPEG), guardadas neste aparelho (IndexedDB) e enviadas ao repositório privado (`dados/fundos_fotos/`); foto de outro aparelho
// é baixada na 1ª vez que aparece. O iPhone corta nos lados: usa o foco horizontal (foco_x); o computador corta na vertical.
const Fundos = (function () {
  let x = null;
  const TELAS = ["fundos"];
  const iniciar = (ctx) => { x = ctx; };
  const CHAVE_PEND = "dudoolife.fundos.pend", LADO = 1600;

  const DB = (function () {
    let aberto = null;
    const abrir = () => (aberto = aberto || new Promise((ok, falha) => { const r = indexedDB.open("dudoolife-fundos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }));
    const op = (modo, fn) => abrir().then((db) => new Promise((ok, falha) => { const t = db.transaction("fotos", modo), q = fn(t.objectStore("fotos")); t.oncomplete = () => ok(q && q.result); t.onerror = () => falha(t.error); }));
    return { get: (k) => op("readonly", (st) => st.get(k)), put: (k, blob) => op("readwrite", (st) => st.put(blob, k)), del: (k) => op("readwrite", (st) => st.delete(k)) };
  })();
  const lerPend = () => { try { return JSON.parse(localStorage.getItem(CHAVE_PEND) || "[]"); } catch (e) { return []; } };
  const gravarPend = (l) => { try { localStorage.setItem(CHAVE_PEND, JSON.stringify(l)); } catch (e) {} };
  const paraBase64 = (blob) => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = falha; r.readAsDataURL(blob); });

  let enviando = false;
  async function enviarPendentes() {
    if (enviando || !window.Nuvem || !Nuvem.disponivel() || !lerPend().length) return;
    enviando = true;
    try {
      for (const arq of lerPend()) {
        try {
          const blob = await DB.get(arq); if (!blob) { gravarPend(lerPend().filter((n) => n !== arq)); continue; }
          await Nuvem.enviarArquivo("fundos_fotos/" + arq, await paraBase64(blob), "fundo " + arq);
          gravarPend(lerPend().filter((n) => n !== arq));
        } catch (e) { break; }                                                     // sem internet/token: tenta de novo depois
      }
    } finally { enviando = false; }
  }
  window.addEventListener("online", enviarPendentes);

  // reduz a foto: maior lado 1600 px, JPEG 0,85 (respeita a rotação do celular: o navegador já aplica o EXIF ao desenhar)
  function reduzir(arquivo) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = () => {
        const f = Math.min(1, LADO / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.naturalWidth * f)); c.height = Math.max(1, Math.round(img.naturalHeight * f));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob((b) => (b ? ok(b) : falha(new Error("imagem"))), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
      img.src = url;
    });
  }

  // Embutidas 1 e 3 são fotos pessoais: o que vai publicado é uma foto neutra; a original fica só no repositório privado (27/11/2026).
  const PESSOAIS = { 1: "abertura1.jpg", 3: "abertura3.jpg" };

  // o arquivo da foto: deste aparelho; se não tem, baixa da nuvem (e guarda)
  async function blobDe(f) {
    const arquivo = f ? f.arquivo || PESSOAIS[f.embutida] : "";
    if (!arquivo) return null;
    let blob = await DB.get(arquivo);
    if (!blob && window.Nuvem && Nuvem.disponivel()) { try { blob = await Nuvem.baixarArquivo("fundos_fotos/" + arquivo); if (blob) await DB.put(arquivo, blob); } catch (e) { blob = null; } }
    return blob || null;
  }
  let urlAtual = "";
  async function urlDe(f) {
    if (!f) return "";
    const blob = await blobDe(f).catch(() => null); if (!blob) return f.embutida ? `img/abertura${f.embutida}.jpg` : "";
    if (urlAtual) URL.revokeObjectURL(urlAtual);
    return (urlAtual = URL.createObjectURL(blob));
  }

  // ---- cores das bordas. 26/11/2026, causa da faixa embaixo do menu: o ícone era criado com a barra de status "black-translucent", e aí o
  // iPhone sobe a janela para baixo da barra sem aumentar a altura (sobra uma faixa no fim da tela). Agora é "default", como nos outros apps
  // Dudoo: a página começa abaixo da barra, que ganha a cor do TOPO da foto (theme-color). Ícone criado antes ainda está no modo antigo
  // (reconhecido pelo recuo no topo): nele a faixa continua e é pintada com a cor da parte de BAIXO da foto.
  const CHAVE_COR = "dudoolife.corbase", NAVY = [10, 15, 30];
  let corFoto = null;                                                              // { topo: [r,g,b], baixo: [r,g,b] }
  const mistura = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  function coresDaFoto(src) {
    return new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = 24, h = 24, c = document.createElement("canvas"); c.width = w; c.height = h;
          const g = c.getContext("2d");
          const media = (inicio) => {
            g.drawImage(img, 0, img.naturalHeight * inicio, img.naturalWidth, img.naturalHeight * 0.08, 0, 0, w, h);
            const d = g.getImageData(0, 0, w, h).data; let r = 0, gr = 0, b = 0, n = 0;
            for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
            return [r / n, gr / n, b / n];
          };
          ok({ topo: media(0), baixo: media(0.85) });
        } catch (e) { ok(null); }
      };
      img.onerror = () => ok(null); img.src = src;
    });
  }
  function corBorda(onde, interna) {
    const cor = corFoto[onde];
    if (interna) return mistura(cor.map((v) => v * 0.62), NAVY, 0.34);                     // telas internas: foto desfocada, escurecida e com véu
    if (onde === "topo") return mistura(cor, NAVY, 0.38);                                  // início: o véu do alto da foto
    const H = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--H")) || innerHeight, frac = Math.min(1, (screen.height || innerHeight) / H);
    return mistura(cor, NAVY, 0.62 * Math.max(0, Math.min(1, (frac - 0.56) / 0.44)));      // início: o véu do rodapé da foto (0 em 56% → 0,62 em 100%)
  }
  function paginaSobABarra() {
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top)";
    document.body.appendChild(p);
    const recuo = parseFloat(getComputedStyle(p).paddingTop) || 0;
    p.remove();
    return recuo > 0;
  }
  function pintarCorBase() {
    if (!corFoto) return;
    const interna = document.body.classList.contains("interna"), borda = paginaSobABarra() ? "baixo" : "topo";
    const rgb = (onde, i) => "rgb(" + corBorda(onde, i).join(",") + ")";
    document.documentElement.style.backgroundColor = rgb(borda, interna);
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", rgb("topo", interna));
    try { localStorage.setItem(CHAVE_COR, JSON.stringify({ dia: rgb(borda, false), topo: rgb("topo", false) })); } catch (e) {}
  }

  // pinta o fundo do dia (e o enquadramento). Foto do Eduardo que ainda não chegou: usa uma das 4 de sempre até chegar.
  let aplicada = "";
  async function aplicar() {
    const f = Dados.fundoDoDia(), raiz = document.documentElement.style, chave = f ? [f.id, f.arquivo, f.foco_x, f.foco_y].join("|") : "";
    if (chave && chave === aplicada) return;                                      // já está pintada (evita piscar a cada sincronização)
    let url = ""; try { url = await urlDe(f); } catch (e) { url = ""; }
    aplicada = url ? chave : "";
    const usada = url ? f : null;
    if (!url) url = `img/abertura${(Dados.diaNumero() % 4) + 1}.jpg`;
    raiz.setProperty("--foto", `url("${url}")`);
    raiz.setProperty("--fx", String(usada ? Number(usada.foco_x) : 0.5)); raiz.setProperty("--fy", String(usada ? Number(usada.foco_y) : 0.5));
    corFoto = await coresDaFoto(url); pintarCorBase();
  }
  // primeira pintura, sem esperar o IndexedDB: embutida do dia (a do Eduardo entra logo depois)
  function pintarRapido() {
    const f = Dados.fundoDoDia(), raiz = document.documentElement.style, n = f && f.embutida ? f.embutida : (Dados.diaNumero() % 4) + 1;
    raiz.setProperty("--foto", `url("img/abertura${n}.jpg")`);
    raiz.setProperty("--fx", String(f && f.embutida ? Number(f.foco_x) : 0.5)); raiz.setProperty("--fy", String(f && f.embutida ? Number(f.foco_y) : 0.5));
  }

  // ---- tela (Configurações › Fotos de fundo)
  function tela() {
    const todos = Dados.fundosTodos(), esc = x.esc;
    const linhas = todos.map((f, n) => {
      const estado = f.fixa ? "FIXA: aparece sempre" : f.ativa ? "na rotação do dia" : "fora da rotação";
      return `<div class="fundo-item">
        <img class="fundo-mini" data-fundo="${esc(f.id)}" alt="" ${f.embutida && !PESSOAIS[f.embutida] ? `src="img/abertura${f.embutida}.jpg"` : ""}>
        <div class="fundo-info"><b>${esc(f.nome || "Foto")}</b><small>${estado}${f.embutida ? " · já vem no app" : ""}</small>
          <div class="fundo-acoes">
            <button class="btn" data-acao="fundo-mover" data-id="${esc(f.id)}" data-d="-1" ${n === 0 ? "disabled" : ""} aria-label="Subir">▲</button>
            <button class="btn" data-acao="fundo-mover" data-id="${esc(f.id)}" data-d="1" ${n === todos.length - 1 ? "disabled" : ""} aria-label="Descer">▼</button>
            <button class="chip ${f.ativa ? "on" : ""}" data-acao="fundo-ativa" data-id="${esc(f.id)}" aria-pressed="${f.ativa}">Na rotação</button>
            <button class="chip ${f.fixa ? "on" : ""}" data-acao="fundo-fixa" data-id="${esc(f.id)}" aria-pressed="${f.fixa}">Fixar</button>
            <button class="btn" data-acao="fundo-enquadrar" data-id="${esc(f.id)}">Enquadrar</button>
            <button class="link perigo" data-acao="fundo-remover" data-id="${esc(f.id)}">Remover</button>
          </div></div></div>`;
    }).join("");
    return `${x.voltar}<h1>Configurações</h1>${x.abasConfig("fundos")}
      <p class="peq">As fotos que aparecem de fundo (no iPhone e no computador). O app mostra uma por dia, entre as “na rotação”, na ordem daqui; ou você fixa uma só. “Enquadrar” diz qual parte da foto não pode ficar de fora.</p>
      <div class="linha-titulo"><h2>Fotos de fundo</h2><button class="btn p" data-acao="fundo-add">+ Foto</button></div>
      <input type="file" id="fundoArq" accept="image/*" multiple hidden>
      ${linhas || '<p class="vazio">Nenhuma foto. Use “+ Foto”: sem fotos o app usa as 4 que já vêm com ele.</p>'}`;
  }
  // preenche as miniaturas das fotos do Eduardo depois que a tela é desenhada (app.js chama `hidratar()`)
  async function hidratar() {
    for (const img of document.querySelectorAll("img[data-fundo]")) {
      if (img.getAttribute("src")) continue;
      const f = Dados.itens("fundos").find((k) => k.id === img.dataset.fundo); if (!f) continue;
      try { const blob = await blobDe(f); if (blob) img.src = URL.createObjectURL(blob); else if (f.embutida) img.src = `img/abertura${f.embutida}.jpg`; else img.alt = "foto ainda não chegou"; } catch (e) { img.alt = "sem foto"; }
    }
  }

  // ---- ações
  async function adicionarArquivos(arquivos) {
    let n = 0, erro = "";
    for (const arq of arquivos) {
      try {
        const blob = await reduzir(arq), f = Dados.fundoAdicionar(String(arq.name || "Foto").replace(/\.[^.]+$/, ""));
        await DB.put(f.arquivo, blob); gravarPend(lerPend().concat(f.arquivo)); n++;
      } catch (e) { erro = "Não consegui abrir uma das imagens."; }
    }
    if (n) { x.desenhar(); x.sincronizar("fundos"); enviarPendentes(); aplicar(); }
    if (erro) alert(erro);
  }
  document.addEventListener("change", (ev) => { if (ev.target && ev.target.id === "fundoArq") { const l = Array.from(ev.target.files || []); ev.target.value = ""; if (l.length) adicionarArquivos(l); } });

  let enq = null;
  function folhaEnquadrar(id) {
    const f = Dados.itens("fundos").find((k) => k.id === id); if (!f) return;
    enq = { id, x: Number(f.foco_x), y: Number(f.foco_y) };
    x.abrirFolha(`<h2>${x.esc(f.nome || "Foto")}</h2><p class="peq">Toque no ponto da foto que não pode ficar de fora. No iPhone o corte é nos lados; no computador, em cima e embaixo.</p>
      <div class="enq" id="enqCaixa"><img id="enqImg" alt=""><i id="enqMarca"></i></div>
      <div class="duas"><button class="btn" data-acao="fundo-centro">Centralizar</button><button class="btn p" data-acao="fundo-salvar-enq">Salvar</button></div>
      <button class="link" data-acao="fechar" type="button">Cancelar</button>`);
    const img = x.$("#enqImg"), caixa = x.$("#enqCaixa");
    blobDe(f).then((b) => (b ? URL.createObjectURL(b) : f.embutida ? `img/abertura${f.embutida}.jpg` : "")).then((u) => { if (u) img.src = u; }).catch(() => {});
    const marcar = () => { const m = x.$("#enqMarca"); if (m && enq) { m.style.left = enq.x * 100 + "%"; m.style.top = enq.y * 100 + "%"; } };
    const tocar = (e) => { const r = img.getBoundingClientRect(); if (!r.width || !r.height) return; enq.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); enq.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); marcar(); };
    caixa.addEventListener("pointerdown", (e) => { tocar(e); caixa.setPointerCapture && caixa.setPointerCapture(e.pointerId); caixa._arrasta = true; });
    caixa.addEventListener("pointermove", (e) => { if (caixa._arrasta) tocar(e); });
    caixa.addEventListener("pointerup", () => { caixa._arrasta = false; });
    img.addEventListener("load", marcar); marcar();
  }

  function acao(a, d) {
    switch (a) {
      case "fundo-add": { const i = x.$("#fundoArq"); if (i) i.click(); return true; }
      case "fundo-mover": Dados.fundoMover(d.id, Number(d.d)); x.desenhar(); x.sincronizar("fundos"); aplicar(); return true;
      case "fundo-ativa": { const f = Dados.itens("fundos").find((k) => k.id === d.id); if (f) { Dados.fundoAtivar(d.id, !f.ativa); x.desenhar(); x.sincronizar("fundos"); aplicar(); } return true; }
      case "fundo-fixa": { const f = Dados.itens("fundos").find((k) => k.id === d.id); if (f) { Dados.fundoFixar(d.id, !f.fixa); x.desenhar(); x.sincronizar("fundos"); aplicar(); } return true; }
      case "fundo-enquadrar": folhaEnquadrar(d.id); return true;
      case "fundo-centro": if (enq) { enq.x = 0.5; enq.y = 0.5; const m = x.$("#enqMarca"); if (m) { m.style.left = "50%"; m.style.top = "50%"; } } return true;
      case "fundo-salvar-enq": if (enq) { Dados.fundoEnquadrar(enq.id, enq.x, enq.y); enq = null; x.fecharFolha(); x.desenhar(); x.sincronizar("fundos"); aplicar(); } return true;
      case "fundo-remover": {
        const f = Dados.itens("fundos").find((k) => k.id === d.id);
        if (f && confirm(`Tirar “${f.nome || "esta foto"}” da lista?` + (f.embutida ? "\nAs fotos que já vêm no app podem ser removidas, mas não voltam sozinhas." : ""))) {
          Dados.fundoRemover(d.id); if (f.arquivo) DB.del(f.arquivo).catch(() => {}); x.desenhar(); x.sincronizar("fundos"); aplicar();
        }
        return true;
      }
    }
    return false;
  }
  return { iniciar, tela, acao, aplicar, pintarRapido, pintarCorBase, hidratar, enviarPendentes, TELAS, reduzir };
})();
