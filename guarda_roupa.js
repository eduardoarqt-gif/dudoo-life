// Guarda-roupa no iPhone (18/10/2026) — mesmas coleções do computador: `roupas` e `looks` (sync via GitHub) e fotos em `dados/roupas_fotos/`.
// A foto da peça tem o fundo recortado no próprio aparelho (canvas): cor do fundo = mediana das bordas, flood-fill a partir das bordas com tolerância.
const GuardaRoupa = (function () {
  const CATEGORIAS = { camisa: "Camisa", camiseta: "Camiseta", polo: "Polo", moletom: "Moletom / tricô", casaco: "Casaco / jaqueta", calca: "Calça", bermuda: "Bermuda", calcado: "Calçado", acessorio: "Acessório", outro: "Outro" };
  const OCASIOES = { trabalho: "Trabalho", social: "Social / jantar", casual: "Casual", academia: "Academia", praia: "Praia", festa: "Festa", viagem: "Viagem" };
  const SLOTS = { camisa: "cima", camiseta: "cima", polo: "cima", moletom: "cima", casaco: "cima", calca: "baixo", bermuda: "baixo", calcado: "calcado" };
  const CLIMAS = { quente: "Quente", ameno: "Ameno", frio: "Frio", misto: "Misto" };
  const LADO_FINAL = 1000, LADO_PREVIA = 500, TOL_PADRAO = 38;
  const AVISO_FUNDO = "Não achei a peça no fundo liso; tente fundo claro e liso (lençol branco).";

  // ------------------------------------------------------------------ funções puras (testadas em testes.js)
  // custo por uso = preço ÷ vezes usada; sem preço ou nunca usada = null
  function custoPorUso(preco, usos) {
    const p = Number(preco), u = Number(usos);
    if (preco === null || preco === undefined || preco === "" || !Number.isFinite(p) || p < 0 || !(u >= 1)) return null;
    return p / u;
  }
  function reais(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "";
    const [i, d] = Math.abs(n).toFixed(2).split(".");
    return "R$ " + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d;
  }
  function numeroBR(txt) {
    const b = String(txt ?? "").trim().replace(/R\$|\s/g, ""); if (!b) return null;
    const n = b.includes(",") ? Number(b.replace(/\./g, "").replace(",", ".")) : /^\d{1,3}(\.\d{3})+$/.test(b) ? Number(b.replace(/\./g, "")) : Number(b);
    return Number.isFinite(n) ? n : NaN;
  }
  const mediana = (v) => { v.sort((a, b) => a - b); return v[v.length >> 1]; };
  // cor de fundo estimada = mediana (por canal) dos pixels das 4 bordas
  function medianaBorda(rgba, w, h) {
    const R = [], G = [], B = [];
    const pega = (px, py) => { const i = (py * w + px) * 4; R.push(rgba[i]); G.push(rgba[i + 1]); B.push(rgba[i + 2]); };
    for (let px = 0; px < w; px++) { pega(px, 0); if (h > 1) pega(px, h - 1); }
    for (let py = 1; py < h - 1; py++) { pega(0, py); if (w > 1) pega(w - 1, py); }
    return [mediana(R), mediana(G), mediana(B)];
  }
  // Recorte: devolve o alfa (Uint8Array w*h): 0 = fundo (alcançado das bordas dentro da tolerância), 255 = peça. BFS iterativa (sem recursão).
  function recortarPixels(rgba, w, h, tol) {
    const bg = medianaBorda(rgba, w, h), lim = tol * tol, alfa = new Uint8Array(w * h).fill(255), visto = new Uint8Array(w * h), fila = new Int32Array(w * h);
    let ini = 0, fim = 0;
    const perto = (p) => { const i = p * 4, dr = rgba[i] - bg[0], dg = rgba[i + 1] - bg[1], db = rgba[i + 2] - bg[2]; return dr * dr + dg * dg + db * db <= lim; };
    const semear = (p) => { if (!visto[p] && perto(p)) { visto[p] = 1; alfa[p] = 0; fila[fim++] = p; } };
    for (let px = 0; px < w; px++) { semear(px); semear((h - 1) * w + px); }
    for (let py = 0; py < h; py++) { semear(py * w); semear(py * w + w - 1); }
    while (ini < fim) {
      const p = fila[ini++], px = p % w, py = (p - px) / w;
      if (px > 0) semear(p - 1);
      if (px < w - 1) semear(p + 1);
      if (py > 0) semear(p - w);
      if (py < h - 1) semear(p + w);
    }
    return alfa;
  }
  // 1 passada de blur 3x3 no alfa (suaviza a borda)
  function suavizarAlfa(alfa, w, h) {
    const saida = new Uint8Array(w * h);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      let soma = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = py + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = px + dx; if (xx < 0 || xx >= w) continue; soma += alfa[yy * w + xx]; n++; } }
      saida[py * w + px] = Math.round(soma / n);
    }
    return saida;
  }
  const fracaoTransparente = (alfa) => { let z = 0; for (let i = 0; i < alfa.length; i++) if (alfa[i] === 0) z++; return alfa.length ? z / alfa.length : 0; };
  // true = recorte plausível (nem >92% nem <3% da imagem tirada)
  const recorteValido = (frac) => frac >= 0.03 && frac <= 0.92;
  // retângulo da peça {x, y, w, h} (alfa > 8) ou null
  function caixaDoAlfa(alfa, w, h, margem = 0) {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) if (alfa[py * w + px] > 8) { if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem); x1 = Math.min(w - 1, x1 + margem); y1 = Math.min(h - 1, y1 + margem);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // melhor custo por uso entre as peças (menor valor)
  function melhorCustoPorUso(roupas) {
    let melhor = null;
    roupas.forEach((r) => { const c = custoPorUso(r.preco, r.usos); if (c !== null && (melhor === null || c < melhor.custo)) melhor = { peca: r, custo: c }; });
    return melhor;
  }

  // ---- ocasiões, provador, sugestão de look e mala (funções puras, testadas em testes.js)
  const slotDe = (cat) => SLOTS[cat] || (cat === "cima" || cat === "baixo" || cat === "calcado" ? cat : null);
  const ocasioesDe = (r) => (Array.isArray(r && r.ocasioes) && r.ocasioes.length ? r.ocasioes : ["casual"]);   // sem ocasiões = casual
  const daOcasiao = (r, oca) => !oca || ocasioesDe(r).includes(oca);
  // posição e tamanho da peça sobre a foto-base ({x,y,w,h} em pixels do quadro da base); null se faltam marcos
  function encaixe(marcos, categoriaSlot, imgW, imgH) {
    const m = marcos || {}, slot = slotDe(categoriaSlot), prop = Number(imgW) > 0 && Number(imgH) > 0 ? imgH / imgW : null;
    if (!slot || !prop) return null;
    const cx = Number(m.centro_x);
    if (slot === "cima") {
      if (!(m.largura_ombro_a_ombro > 0) || !Number.isFinite(cx) || !Number.isFinite(Number(m.ombros_y))) return null;
      const w = m.largura_ombro_a_ombro * 1.45, h = w * prop;
      return { x: cx - w / 2, y: Number(m.ombros_y) - 0.06 * h, w, h };
    }
    if (slot === "baixo") {
      if (!(m.largura_quadril > 0) || !Number.isFinite(cx) || !Number.isFinite(Number(m.cintura_y))) return null;
      const w = m.largura_quadril * 1.30, h = w * prop;
      return { x: cx - w / 2, y: Number(m.cintura_y) - 0.02 * h, w, h };
    }
    if (!(m.largura_quadril > 0) || !Number.isFinite(cx) || !(Number(m.pes_y) > 0)) return null;   // calçado precisa de pes_y
    const w = m.largura_quadril * 1.1, h = w * prop;
    return { x: cx - w / 2, y: Number(m.pes_y) - 0.9 * h, w, h };
  }
  const NEUTROS = ["pret", "branc", "cinz", "beg", "marinho", "jeans", "crem", "caqui"];   // radicais: preto/preta, branco/branca…
  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  // { neutra, chave } da cor escrita ("" = sem cor: não pesa)
  function classeDaCor(cor) {
    const t = semAcento(cor); if (!t) return { neutra: true, chave: "" };
    const n = NEUTROS.find((k) => t.includes(k)); if (n) return { neutra: true, chave: n };
    return { neutra: false, chave: t.split(/[\s\/,-]+/)[0] };
  }
  function diasDesde(iso, hojeISO) {
    const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""), b = /^(\d{4})-(\d{2})-(\d{2})/.exec(hojeISO || ""); if (!a || !b) return null;
    return Math.round((Date.UTC(+b[1], b[2] - 1, +b[3]) - Date.UTC(+a[1], a[2] - 1, +a[3])) / 864e5);
  }
  function notaPeca(r, hojeISO) {                                              // maior = melhor candidata (menos usada, parada há mais tempo, favorita)
    const d = r.ultimo_uso ? diasDesde(r.ultimo_uso, hojeISO) : null;
    return Math.min(90, d === null ? 90 : Math.max(0, d)) * 0.1 - (r.usos || 0) * 0.5 + (r.favorito ? 1.5 : 0);
  }
  function notaCores(cima, baixo, calcado) {
    const todas = [cima, baixo, calcado].filter(Boolean).map((r) => classeDaCor(r.cor)), fortes = todas.filter((c) => !c.neutra);
    let n = 0;
    if (new Set(fortes.map((c) => c.chave)).size > 1) n -= 6;                  // duas cores fortes diferentes
    if (cima && baixo) { const a = classeDaCor(cima.cor), b = classeDaCor(baixo.cor); if (a.chave && a.chave === b.chave) n -= a.neutra ? 2 : 5; }   // mesma cor em cima e embaixo
    return n;
  }
  const FEMININAS = ["camisa", "camiseta", "polo", "calca", "bermuda"];
  function motivoDoLook(pecas, ocasiao, hojeISO) {
    let melhor = null;
    pecas.filter(Boolean).forEach((r) => { const d = r.ultimo_uso ? diasDesde(r.ultimo_uso, hojeISO) : null, v = d === null ? 9999 : d; if (!melhor || v > melhor.v) melhor = { r, d, v }; });
    if (melhor && melhor.d !== 0) {
      const fem = FEMININAS.includes(melhor.r.categoria), nome = String(CATEGORIAS[melhor.r.categoria] || "peça").split(/[\s\/]+/)[0].toLowerCase();
      if (melhor.d === null) return `${fem ? "a" : "o"} ${nome} ainda não foi usad${fem ? "a" : "o"}`;
      if (melhor.d >= 3) return `${fem ? "a" : "o"} ${nome} não é usad${fem ? "a" : "o"} há ${melhor.d} dias`;
    }
    return `combina com ${OCASIOES[ocasiao] ? OCASIOES[ocasiao].toLowerCase() : "a ocasião"}`;
  }
  // Sugere um look: só peças da ocasião; menos usadas / paradas há mais tempo; evita repetir o último look; cores combinando.
  // indice 0 = a melhor; 1, 2… = "outra sugestão". Devolve { cima, baixo, calcado, motivo } (peças inteiras) ou null se não há peça.
  function sugerirLook(roupas, ocasiao, looks, hojeISO, indice = 0) {
    const doSlot = (slot) => (roupas || []).filter((r) => slotDe(r.categoria) === slot && daOcasiao(r, ocasiao)).sort((a, b) => notaPeca(b, hojeISO) - notaPeca(a, hojeISO)).slice(0, 10);
    const cimas = doSlot("cima"), baixos = doSlot("baixo"), calcados = doSlot("calcado");
    if (!cimas.length && !baixos.length) return null;
    const ultimo = (looks || []).slice().sort((a, b) => String(b.criado_em || "").localeCompare(String(a.criado_em || "")))[0], pecasUltimo = new Set(ultimo ? ultimo.pecas || [] : []);
    const pares = [];
    (cimas.length ? cimas : [null]).forEach((c) => (baixos.length ? baixos : [null]).forEach((b) => {
      const ids = [c, b].filter(Boolean).map((r) => r.id), repetidas = ids.filter((id) => pecasUltimo.has(id)).length;
      let n = (c ? notaPeca(c, hojeISO) : 0) + (b ? notaPeca(b, hojeISO) : 0) + notaCores(c, b, null);
      n -= repetidas === pecasUltimo.size && repetidas === ids.length ? 20 : 3 * repetidas;     // mesmo conjunto do último look pesa muito
      pares.push({ c, b, n });
    }));
    pares.sort((p, q) => q.n - p.n);
    const esc = pares[((indice % pares.length) + pares.length) % pares.length];
    const calcado = calcados.length ? calcados.map((r) => ({ r, n: notaPeca(r, hojeISO) + notaCores(esc.c, esc.b, r) })).sort((p, q) => q.n - p.n)[0].r : null;
    return { cima: esc.c, baixo: esc.b, calcado, motivo: motivoDoLook([esc.c, esc.b], ocasiao, hojeISO) };
  }
  // Mala: escolhe as peças pelo tempo da viagem e o clima. Devolve { pecas: [ids], contagem, metas }.
  function sugerirMala(roupas, dias, clima) {
    const d = Math.max(1, Math.floor(Number(dias) || 1)), todas = roupas || [];
    const pega = (cats, n) => todas.filter((r) => cats.includes(r.categoria)).sort((a, b) => ((b.favorito ? 1 : 0) - (a.favorito ? 1 : 0)) || ((a.usos || 0) - (b.usos || 0)) || String(a.ultimo_uso || "").localeCompare(String(b.ultimo_uso || ""))).slice(0, n);
    const metas = { tops: Math.min(8, Math.ceil(d * 0.8)), calcas: Math.max(1, Math.ceil(d / 3)), bermudas: clima === "quente" || clima === "ameno" ? Math.ceil(d / 3) : 0, agasalhos: clima === "frio" ? 2 : clima === "misto" ? 1 : 0, calcados: 2 };
    const g = [pega(["camiseta", "camisa", "polo"], metas.tops), pega(["calca"], metas.calcas), pega(["bermuda"], metas.bermudas), pega(["casaco", "moletom"], metas.agasalhos), pega(["calcado"], metas.calcados), todas.filter((r) => r.categoria === "acessorio" && r.favorito)];
    return { pecas: [].concat(...g).map((r) => r.id), contagem: { tops: g[0].length, calcas: g[1].length, bermudas: g[2].length, agasalhos: g[3].length, calcados: g[4].length, acessorios: g[5].length }, metas };
  }

  // ------------------------------------------------------------------ fotos: aparelho (IndexedDB própria) + fila de envio separada da Saúde
  const CHAVE_PEND = "dudoolife.roupas.pend";
  const FotosDB = (function () {
    let aberto = null;
    const abrir = () => (aberto = aberto || new Promise((ok, falha) => { const r = indexedDB.open("dudoolife-roupas", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }));
    const op = (modo, fn) => abrir().then((db) => new Promise((ok, falha) => { const t = db.transaction("fotos", modo), q = fn(t.objectStore("fotos")); t.oncomplete = () => ok(q && q.result); t.onerror = () => falha(t.error); }));
    return { get: (k) => op("readonly", (st) => st.get(k)), put: (k, blob) => op("readwrite", (st) => st.put(blob, k)) };
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
          const blob = await FotosDB.get(arq); if (!blob) { gravarPend(lerPend().filter((n) => n !== arq)); continue; }
          await Nuvem.enviarArquivo("roupas_fotos/" + arq, await paraBase64(blob), "roupa " + arq);
          gravarPend(lerPend().filter((n) => n !== arq));
        } catch (e) { break; }                                                 // sem internet/token: tenta de novo depois
      }
    } finally { enviando = false; }
  }
  if (typeof window !== "undefined" && window.addEventListener) window.addEventListener("online", enviarPendentes);

  const urls = new Map();                                                      // arquivo -> object URL (não recria a cada desenho)
  async function hidratar() {
    if (typeof document === "undefined" || !document.querySelectorAll) return;
    pintarProvador();
    for (const img of document.querySelectorAll("img[data-roupa]")) {
      const arq = img.dataset.roupa; if (!arq) continue;
      if (urls.has(arq)) { if (img.getAttribute("src") !== urls.get(arq)) img.src = urls.get(arq); continue; }
      try {
        let blob = await FotosDB.get(arq);
        if (!blob && window.Nuvem && Nuvem.disponivel()) { blob = await Nuvem.baixarArquivo("roupas_fotos/" + arq); if (blob) await FotosDB.put(arq, blob); }
        if (blob) { const u = URL.createObjectURL(blob); urls.set(arq, u); img.src = u; } else img.alt = "foto ainda não chegou";
      } catch (e) { img.alt = "sem foto"; }
    }
  }

  // imagem (HTMLImageElement) de uma foto guardada: aparelho primeiro, nuvem se faltar (forcar = baixa de novo da nuvem)
  const imgs = new Map();
  async function imagemDaFoto(arq, forcar) {
    if (!arq) return null;
    if (imgs.has(arq) && !forcar) return imgs.get(arq);
    let blob = forcar ? null : await FotosDB.get(arq);
    if (!blob && window.Nuvem && Nuvem.disponivel()) { blob = await Nuvem.baixarArquivo("roupas_fotos/" + arq); if (blob) await FotosDB.put(arq, blob); }
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
    if (img) imgs.set(arq, img);
    return img;
  }

  // ------------------------------------------------------------------ recorte no canvas
  function carregarImagem(arquivo) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
      img.src = url;
    });
  }
  function reduzirPara(origem, ow, oh, lado) {
    const f = Math.min(1, lado / Math.max(ow, oh)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(ow * f)); c.height = Math.max(1, Math.round(oh * f));
    c.getContext("2d").drawImage(origem, 0, 0, c.width, c.height);
    return c;
  }
  const paraBlob = (canvas, tipo, q) => new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("imagem"))), tipo, q));
  // alfa final (recorte + suavização) de um canvas; { alfa, valido }
  function alfaDoCanvas(canvas, tol) {
    const w = canvas.width, h = canvas.height, dados = canvas.getContext("2d").getImageData(0, 0, w, h).data;
    const alfa = suavizarAlfaSeguro(recortarPixels(dados, w, h, tol), w, h);
    return { alfa, valido: recorteValido(fracaoTransparente(alfa)), dados, w, h };
  }
  const suavizarAlfaSeguro = (alfa, w, h) => suavizarAlfa(alfa, w, h);       // (a fração é medida depois do blur: bordas de 1 px não mudam o veredito)
  function aplicarAlfa(dados, alfa, w, h) {
    const img = new ImageData(new Uint8ClampedArray(dados), w, h);
    for (let i = 0; i < alfa.length; i++) img.data[i * 4 + 3] = alfa[i];
    return img;
  }

  // ------------------------------------------------------------------ telas
  let x = null;
  const iniciar = (ctx) => { x = ctx; };
  let aba = "pecas", filtroCat = "tudo", filtroOca = "tudo", busca = "", desfazer = null;
  const prov = { oca: "casual", sel: { cima: null, baixo: null, calcado: null }, sug: 0, motivo: "", sugerido: false, pintando: 0 };
  let malaAberta = null;
  let foto = null;                                                              // { fonte, previa, tol, sem, aviso } da peça sendo cadastrada
  const hoje = () => Dados.hojeISO();
  const br = (iso) => (iso ? Dados.isoParaBR(iso) : "");
  const campo = (id, rotulo, valor, extra = "") => `<label>${rotulo}<input id="${id}" value="${x.esc(valor ?? "")}" ${extra}></label>`;
  const norm = (t) => Dados.normalizar(t || "");
  const ordemPecas = (a, b) => ((b.favorito ? 1 : 0) - (a.favorito ? 1 : 0)) || norm(a.nome).localeCompare(norm(b.nome));
  const imagem = (r) => `<img data-roupa="${x.esc(r.arquivo || "")}" ${urls.has(r.arquivo) ? `src="${urls.get(r.arquivo)}"` : ""} alt="" loading="lazy">`;
  const miniatura = (r, cls = "") => (r.arquivo ? `<div class="gr-foto ${cls}">${imagem(r)}</div>` : `<div class="gr-foto ${cls} sem">👔</div>`);

  function tela() {
    const roupas = Dados.itens("roupas"), looks = Dados.itens("looks");
    const melhor = melhorCustoPorUso(roupas);
    const resumo = `<p class="peq">${roupas.length} peça(s) · ${looks.length} look(s)${melhor ? ` · melhor custo por uso: ${x.esc(melhor.peca.nome)} (${reais(melhor.custo)})` : ""}</p>`;
    const barra = desfazer ? `<div class="gr-desfazer"><span>${x.esc(desfazer.texto)}</span><button class="link" data-acao="gr-desfazer">Desfazer</button></div>` : "";
    return `${x.voltar}<h1>Guarda-roupa</h1>${resumo}<div class="chips">${x.chipsDe([["pecas", "Peças"], ["looks", "Looks"], ["provador", "Provador"], ["mala", "Mala"]], aba, "gr-aba")}</div>${barra}${aba === "looks" ? corpoLooks(roupas, looks) : aba === "provador" ? corpoProvador(roupas) : aba === "mala" ? corpoMala(roupas) : corpoPecas(roupas)}`;
  }

  function corpoPecas(roupas) {
    const cats = x.chipsDe([["tudo", "Todas"]].concat(Object.entries(CATEGORIAS)), filtroCat, "gr-cat");
    const ocas = x.chipsDe([["tudo", "Qualquer ocasião"]].concat(Object.entries(OCASIOES)), filtroOca, "gr-filtro-oca");
    const lista = roupas.filter((r) => (filtroCat === "tudo" || r.categoria === filtroCat) && (filtroOca === "tudo" || ocasioesDe(r).includes(filtroOca))).sort(ordemPecas);
    const termo = norm(busca);
    const cards = lista.map((r) => {
      const c = custoPorUso(r.preco, r.usos), txt = norm([r.nome, CATEGORIAS[r.categoria], r.cor, r.marca].join(" "));
      return `<div class="gr-card" data-txt="${x.esc(txt)}" ${termo && !txt.includes(termo) ? "hidden" : ""}>
        <div data-acao="gr-editar" data-id="${r.id}">${miniatura(r)}${r.favorito ? '<span class="gr-fav">★</span>' : ""}
          <div class="gr-info"><b>${x.esc(r.nome)}</b><small>${x.esc([CATEGORIAS[r.categoria], r.cor].filter(Boolean).join(" · "))}</small>
          <small>usada ${r.usos || 0}×${c !== null ? " · " + reais(c) + "/uso" : ""}</small></div></div>
        <button class="btn" data-acao="gr-usei" data-id="${r.id}">Usei hoje</button></div>`;
    }).join("");
    return `<div class="linha-titulo"><h2>Peças</h2><button class="btn p" data-acao="gr-nova">+ Peça</button></div>
      <div class="chips">${cats}</div><div class="chips">${ocas}</div>
      <input id="grBusca" type="search" placeholder="Buscar por nome, cor ou marca" value="${x.esc(busca)}" autocomplete="off" style="width:100%;margin:2px 0 10px">
      ${cards ? `<div class="gr-grade" id="grGrade">${cards}</div>` : '<p class="vazio">Nenhuma peça por aqui. Toque em + Peça.</p>'}`;
  }

  function corpoLooks(roupas, looks) {
    const porId = new Map(roupas.map((r) => [r.id, r]));
    const cards = looks.slice().sort((a, b) => norm(a.nome).localeCompare(norm(b.nome))).map((l) => {
      const pecas = (l.pecas || []).map((id) => porId.get(id)).filter(Boolean);
      const faixa = pecas.map((r) => miniatura(r, "peq")).join("");
      return `<div class="gr-look"><div data-acao="gr-editar-look" data-id="${l.id}"><b>${x.esc(l.nome)}</b>
        <div class="gr-faixa">${faixa || '<small class="vazio">Sem peças</small>'}</div><small>${pecas.length} peça(s)${l.notas ? " · " + x.esc(l.notas) : ""}</small></div>
        <button class="btn" data-acao="gr-usei-look" data-id="${l.id}">Usei este look hoje</button></div>`;
    }).join("");
    return `<div class="linha-titulo"><h2>Looks</h2><button class="btn p" data-acao="gr-novo-look">+ Look</button></div>${cards || '<p class="vazio">Nenhum look ainda. Monte combinando suas peças.</p>'}`;
  }

  // ---- formulário da peça
  function formPeca(r) {
    foto = null;
    const preco = r && r.preco != null ? (window.MascarasDudoo ? MascarasDudoo.dinheiroBR(String(r.preco).replace(".", ",")) : String(r.preco).replace(".", ",")) : "";
    x.abrirFolha(`<h2>${r ? "Editar peça" : "Nova peça"}</h2>
      ${r ? miniatura(r, "grande") : `<label>Foto<input id="rArq" type="file" accept="image/*"></label>
      <p class="peq">Foto de cima, peça aberta sobre lençol branco liso, luz uniforme, sem pés ou outras coisas no quadro.</p>
      <div id="rPrevBox" hidden><canvas id="rPrev" class="gr-prev"></canvas><p id="rAviso" class="erro"></p>
        <label>Tolerância do recorte: <span id="rTolV">${TOL_PADRAO}</span><input id="rTol" type="range" min="10" max="90" value="${TOL_PADRAO}"></label>
        <button class="btn" id="rSem" data-acao="gr-sem-recorte">Sem recorte</button></div>`}
      ${campo("rNome", "Nome", r && r.nome)}
      <div class="duas"><label>Categoria<select id="rCat">${x.opcoesDe(CATEGORIAS, r ? r.categoria : "camiseta")}</select></label>${campo("rCor", "Cor", r && r.cor)}</div>
      <div class="duas">${campo("rMarca", "Marca", r && r.marca)}${campo("rTam", "Tamanho", r && r.tamanho)}</div>
      <div class="duas">${campo("rPreco", "Preço", preco, 'inputmode="decimal" data-mascara="dinheiro" placeholder="0,00"')}${campo("rData", "Data da compra", r && br(r.data_compra), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}</div>
      <p class="peq">Ocasiões (sem marcar = casual):</p><div class="gr-ocs">${Object.entries(OCASIOES).map(([k, n]) => `<label class="gr-oc"><input type="checkbox" name="rOca" value="${k}" ${r && Array.isArray(r.ocasioes) && r.ocasioes.includes(k) ? "checked" : ""}><span>${n}</span></label>`).join("")}</div>
      <label>Notas<textarea id="rNotas" rows="2">${x.esc(r ? r.notas : "")}</textarea></label>
      ${r ? `<label class="op"><input type="checkbox" id="rFav" ${r.favorito ? "checked" : ""}> Favorita ★</label><p class="peq">Usada ${r.usos || 0}×${r.ultimo_uso ? " · última vez em " + br(r.ultimo_uso) : ""}</p>` : ""}
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" id="rSalvar" data-acao="gr-salvar" data-id="${r ? r.id : ""}">Salvar</button></div>
      ${r ? `<button class="link perigo" data-acao="gr-excluir" data-id="${r.id}">Excluir</button>` : ""}`);
    if (r) return;
    const entrada = x.$("#rArq");
    entrada.addEventListener("change", async () => {
      const arq = entrada.files && entrada.files[0]; if (!arq) return;
      x.$("#rAviso").textContent = "Preparando a foto…"; x.$("#rPrevBox").hidden = false;
      try {
        const img = await carregarImagem(arq), w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        foto = { fonte: reduzirPara(img, w, h, LADO_FINAL), previa: null, tol: TOL_PADRAO, sem: false };
        foto.previa = reduzirPara(foto.fonte, foto.fonte.width, foto.fonte.height, LADO_PREVIA);
        x.$("#rTol").value = TOL_PADRAO; x.$("#rTolV").textContent = TOL_PADRAO; atualizarPrevia();
      } catch (e) { foto = null; x.$("#rAviso").textContent = "Não consegui ler essa imagem."; }
    });
    let quadro = 0;
    x.$("#rTol").addEventListener("input", (ev) => {
      if (!foto) return; foto.tol = Number(ev.target.value); foto.sem = false; x.$("#rTolV").textContent = foto.tol;
      cancelAnimationFrame(quadro); quadro = requestAnimationFrame(atualizarPrevia);
    });
  }
  function atualizarPrevia() {
    const tela = x.$("#rPrev"); if (!foto || !tela) return;
    const p = foto.previa, ctx = tela.getContext("2d"); tela.width = p.width; tela.height = p.height;
    const aviso = x.$("#rAviso");
    if (foto.sem) { ctx.drawImage(p, 0, 0); aviso.textContent = "Sem recorte: a foto fica como está."; return; }
    const r = alfaDoCanvas(p, foto.tol);
    foto.valido = r.valido;
    if (!r.valido) { ctx.drawImage(p, 0, 0); aviso.textContent = AVISO_FUNDO; return; }
    ctx.putImageData(aplicarAlfa(r.dados, r.alfa, r.w, r.h), 0, 0); aviso.textContent = "";
  }
  async function gerarBlob() {                                                  // PNG recortado (ou JPEG sem recorte); null se não há foto
    if (!foto) return null;
    if (!foto.sem) {
      const r = alfaDoCanvas(foto.fonte, foto.tol);
      if (r.valido) {
        const caixa = caixaDoAlfa(r.alfa, r.w, r.h, 6);
        if (caixa) {
          const cheio = document.createElement("canvas"); cheio.width = r.w; cheio.height = r.h;
          cheio.getContext("2d").putImageData(aplicarAlfa(r.dados, r.alfa, r.w, r.h), 0, 0);
          const c = document.createElement("canvas"); c.width = caixa.w; c.height = caixa.h;
          c.getContext("2d").drawImage(cheio, caixa.x, caixa.y, caixa.w, caixa.h, 0, 0, caixa.w, caixa.h);
          return { blob: await paraBlob(c, "image/png"), ext: "png" };
        }
      }
    }
    return { blob: await paraBlob(foto.fonte, "image/jpeg", 0.85), ext: "jpg" };
  }

  async function salvarPeca(id) {
    const err = (m) => { x.$("#fErro").textContent = m; return false; };
    const nome = x.$("#rNome").value.trim().replace(/\s+/g, " "); if (!nome) return err("Dê um nome à peça.");
    const precoBruto = x.$("#rPreco").value.trim(), preco = precoBruto ? numeroBR(precoBruto) : null; if (precoBruto && (preco === null || Number.isNaN(preco) || preco < 0)) return err("O preço precisa ser um valor, ex.: 129,90.");
    const dataBruta = x.$("#rData").value.trim(), data = dataBruta ? Dados.brParaISO(dataBruta) : ""; if (dataBruta && !data) return err("A data da compra precisa estar em DD/MM/AAAA.");
    const campos = { nome, categoria: x.$("#rCat").value, cor: x.$("#rCor").value.trim(), marca: x.$("#rMarca").value.trim(), tamanho: x.$("#rTam").value.trim(), preco, data_compra: data, notas: x.$("#rNotas").value.trim(), ocasioes: [...document.querySelectorAll("input[name=rOca]:checked")].map((e) => e.value) };
    if (id) {
      campos.favorito = x.$("#rFav").checked;
      Dados.atualizar("roupas", id, campos);
    } else {
      const novoId = Dados.uid(); let arquivo = "";
      if (foto) {
        x.$("#rSalvar").disabled = true; x.$("#fErro").textContent = "Salvando a foto…";
        try {
          const g = await gerarBlob(); arquivo = `${novoId}.${g.ext}`;
          await FotosDB.put(arquivo, g.blob);
        } catch (e) { x.$("#rSalvar").disabled = false; return err("Não consegui guardar a foto neste aparelho."); }
        gravarPend(lerPend().concat(arquivo));
      }
      Dados.adicionar("roupas", Object.assign({ id: novoId, usos: 0, ultimo_uso: "", favorito: false, arquivo }, campos));
    }
    foto = null; x.fecharFolha(); x.desenhar(); x.sincronizar("roupas"); enviarPendentes();
    return true;
  }

  // ---- usar / desfazer
  function registrarUso(ids, texto) {
    const antes = {};
    ids.forEach((id) => { const r = Dados.itens("roupas").find((i) => i.id === id); if (!r) return; antes[id] = { usos: r.usos || 0, ultimo_uso: r.ultimo_uso || "" };
      Dados.atualizar("roupas", id, { usos: (r.usos || 0) + 1, ultimo_uso: hoje() }); });
    desfazer = { antes, texto }; x.desenhar(); x.sincronizar("roupas");
  }
  function desfazerUso() {
    if (!desfazer) return;
    Object.entries(desfazer.antes).forEach(([id, v]) => Dados.atualizar("roupas", id, v));
    desfazer = null; x.desenhar(); x.sincronizar("roupas");
  }

  // ---- looks
  function formLook(l) {
    const roupas = Dados.itens("roupas").sort(ordemPecas), marcadas = new Set(l ? l.pecas : []);
    const grade = roupas.map((r) => `<label class="gr-pick">${miniatura(r, "peq")}<input type="checkbox" name="lkPeca" value="${r.id}" ${marcadas.has(r.id) ? "checked" : ""}><span>${x.esc(r.nome)}</span></label>`).join("");
    x.abrirFolha(`<h2>${l ? "Editar look" : "Novo look"}</h2>${campo("lNome", "Nome do look", l && l.nome)}
      <p class="peq">Marque as peças:</p>${grade ? `<div class="gr-grade tres">${grade}</div>` : '<p class="vazio">Cadastre peças primeiro.</p>'}
      <label>Notas<textarea id="lNotas" rows="2">${x.esc(l ? l.notas : "")}</textarea></label>
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="gr-salvar-look" data-id="${l ? l.id : ""}">Salvar</button></div>
      ${l ? `<button class="link perigo" data-acao="gr-excluir-look" data-id="${l.id}">Excluir</button>` : ""}`);
    hidratar();
  }
  function salvarLook(id) {
    const nome = x.$("#lNome").value.trim().replace(/\s+/g, " "); if (!nome) { x.$("#fErro").textContent = "Dê um nome ao look."; return false; }
    const pecas = [...document.querySelectorAll("input[name=lkPeca]:checked")].map((e) => e.value);
    if (!pecas.length) { x.$("#fErro").textContent = "Marque pelo menos uma peça."; return false; }
    const campos = { nome, pecas, notas: x.$("#lNotas").value.trim() };
    if (id) Dados.atualizar("looks", id, campos); else Dados.adicionar("looks", campos);
    return true;
  }

  // ---- provador (a foto-base vem do computador; aqui só lê)
  const baseDoProvador = () => Dados.itens("provador").find((p) => p.id === "base" && p.arquivo && p.marcos && Array.isArray(p.quadro)) || null;
  const doSlot = (roupas, slot) => roupas.filter((r) => slotDe(r.categoria) === slot && r.arquivo && daOcasiao(r, prov.oca)).sort(ordemPecas);
  const SLOT_NOME = { cima: "Cima", baixo: "Baixo", calcado: "Calçado" };
  function carrossel(roupas, slot) {
    const r = roupas.find((i) => i.id === prov.sel[slot]);
    return `<div class="gr-col"><small>${SLOT_NOME[slot]}</small>${r ? miniatura(r, "peq") : '<div class="gr-foto peq sem">∅</div>'}
      <small class="gr-nome">${r ? x.esc(r.nome) : "sem peça"}</small>
      <div class="gr-setas"><button class="btn" data-acao="gr-pv-nav" data-slot="${slot}" data-k="-1" aria-label="Anterior">‹</button><button class="btn" data-acao="gr-pv-nav" data-slot="${slot}" data-k="1" aria-label="Próxima">›</button></div></div>`;
  }
  function corpoProvador(roupas) {
    const base = baseDoProvador();
    if (!base) return '<p class="vazio">Defina a foto-base no computador (Guarda-roupa → Provador).</p>';
    const ocas = x.chipsDe(Object.entries(OCASIOES).map(([k, n]) => [k, n]), prov.oca, "gr-pv-oca");
    const temPes = Number(base.marcos.pes_y) > 0, sel = prov.sel;
    const temSel = !!(sel.cima || sel.baixo || sel.calcado);
    return `<div class="chips">${ocas}</div>
      <div class="gr-prov">${carrossel(roupas, "cima")}<div class="gr-palco"><canvas id="grPalco"></canvas></div>${carrossel(roupas, "baixo")}</div>
      ${temPes ? `<div class="gr-prov-pe">${carrossel(roupas, "calcado")}</div>` : '<p class="peq">A foto-base corta na canela, não dá pra provar calçado.</p>'}
      ${prov.motivo ? `<p class="peq gr-motivo">${x.esc(prov.motivo)}</p>` : ""}
      <div class="duas"><button class="btn p" data-acao="gr-pv-sugerir">${prov.sugerido ? "Outra sugestão" : "Sugerir look"}</button><button class="btn" data-acao="gr-pv-salvar" ${temSel ? "" : "disabled"}>Salvar look</button></div>
      <button class="btn" data-acao="gr-pv-usei" ${temSel ? "" : "disabled"} style="width:100%;margin-top:8px">Usei hoje</button>`;
  }
  let tokenPintura = 0;
  async function pintarProvador() {
    if (typeof document === "undefined" || !document.getElementById) return;
    const tela = document.getElementById("grPalco"), base = tela && baseDoProvador(); if (!tela || !base) return;
    const eu = ++tokenPintura, [qw, qh] = base.quadro, dpr = Math.min(2, window.devicePixelRatio || 1);
    const largura = Math.max(120, Math.round(tela.parentElement.clientWidth || 200)), esc = largura / qw;
    tela.style.width = largura + "px"; tela.style.height = Math.round(qh * esc) + "px";
    tela.width = Math.round(largura * dpr); tela.height = Math.round(qh * esc * dpr);
    const roupas = Dados.itens("roupas"), forcar = (() => { try { return localStorage.getItem("dudoolife.provador.base_em") !== String(base.atualizado_em || ""); } catch (e) { return false; } })();
    try {
      let imgBase = await imagemDaFoto(base.arquivo, forcar && !!(window.Nuvem && Nuvem.disponivel()));
      if (imgBase && forcar) { try { localStorage.setItem("dudoolife.provador.base_em", String(base.atualizado_em || "")); } catch (e) {} }
      const itens = [];
      for (const slot of ["calcado", "baixo", "cima"]) {                       // calçado primeiro, depois baixo, cima por cima
        const r = roupas.find((i) => i.id === prov.sel[slot]); if (!r || !r.arquivo) continue;
        const img = await imagemDaFoto(r.arquivo); if (!img) continue;
        const e = encaixe(base.marcos, slot, img.naturalWidth || img.width, img.naturalHeight || img.height); if (e) itens.push({ img, e });
      }
      if (eu !== tokenPintura) return;
      const c = tela.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, tela.width, tela.height); c.setTransform(dpr * esc, 0, 0, dpr * esc, 0, 0);
      if (imgBase) c.drawImage(imgBase, 0, 0, qw, qh); else { c.fillStyle = "rgba(128,128,128,.15)"; c.fillRect(0, 0, qw, qh); }
      itens.forEach(({ img, e }) => c.drawImage(img, e.x, e.y, e.w, e.h));
    } catch (e) { /* sem foto: fica o quadro vazio */ }
  }
  function navegar(slot, k) {
    const lista = doSlot(Dados.itens("roupas"), slot).map((r) => r.id), ciclo = [null].concat(lista);
    const i = ciclo.indexOf(prov.sel[slot]), n = ((i < 0 ? 0 : i) + k + ciclo.length) % ciclo.length;
    prov.sel[slot] = ciclo[n]; prov.sugerido = false; prov.motivo = ""; x.desenhar();
  }
  function sugerir() {
    const roupas = Dados.itens("roupas"), indice = prov.sugerido ? prov.sug + 1 : 0;
    const s = sugerirLook(roupas.filter((r) => r.arquivo), prov.oca, Dados.itens("looks"), hoje(), indice);
    if (!s) { prov.motivo = "Nenhuma peça com foto para essa ocasião."; prov.sugerido = false; x.desenhar(); return; }
    prov.sug = indice; prov.sugerido = true;
    prov.sel.cima = s.cima ? s.cima.id : null; prov.sel.baixo = s.baixo ? s.baixo.id : null;
    prov.sel.calcado = s.calcado && baseDoProvador() && Number(baseDoProvador().marcos.pes_y) > 0 ? s.calcado.id : null;
    prov.motivo = "Sugestão: " + s.motivo + "."; x.desenhar();
  }
  const idsEscolhidos = () => ["cima", "baixo", "calcado"].map((s) => prov.sel[s]).filter(Boolean);
  function formSalvarLookProvador() {
    x.abrirFolha(`<h2>Salvar look</h2>${campo("lNome", "Nome do look", `${OCASIOES[prov.oca]} ${br(hoje()).slice(0, 5)}`)}
      <p id="fErro" class="erro"></p><div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="gr-pv-salvar-ok">Salvar</button></div>`);
  }

  // ---- mala de viagem
  const pecasDaMala = (m, roupas) => (m.pecas || []).map((id) => roupas.find((r) => r.id === id)).filter(Boolean);
  const resumoMala = (m, roupas) => { const ps = pecasDaMala(m, roupas), lev = new Set(m.levadas || []); return { total: ps.length, ok: ps.filter((r) => lev.has(r.id)).length }; };
  function corpoMala(roupas) {
    const m = malaAberta && Dados.itens("malas").find((i) => i.id === malaAberta);
    if (!m) {
      malaAberta = null;
      const cards = Dados.itens("malas").map((g) => { const r = resumoMala(g, roupas);
        return `<div class="gr-look" data-acao="gr-mala-abrir" data-id="${g.id}"><b>${x.esc(g.nome || "Mala")}</b><small>${x.esc([g.destino, g.dias ? g.dias + " dia(s)" : "", CLIMAS[g.clima]].filter(Boolean).join(" · "))}</small><small>${r.ok} de ${r.total} arrumadas</small></div>`; }).join("");
      return `<div class="linha-titulo"><h2>Malas</h2><button class="btn p" data-acao="gr-mala-nova">+ Mala</button></div>${cards || '<p class="vazio">Nenhuma mala ainda. Toque em + Mala.</p>'}`;
    }
    const ps = pecasDaMala(m, roupas), lev = new Set(m.levadas || []), r = resumoMala(m, roupas);
    const linhas = ps.map((p) => `<label class="gr-arruma">${miniatura(p, "peq")}<span><b>${x.esc(p.nome)}</b><small>${x.esc(CATEGORIAS[p.categoria] || "")}</small></span><input type="checkbox" data-acao="gr-mala-levar" data-id="${p.id}" ${lev.has(p.id) ? "checked" : ""}></label>`).join("");
    const extras = (m.extras || []).map((t, i) => `<div class="gr-extra"><input data-i="${i}" class="gr-ex" value="${x.esc(t)}" placeholder="Ex.: carregador"><button class="link perigo" data-acao="gr-mala-tirar" data-i="${i}">Tirar</button></div>`).join("");
    return `<div class="linha-titulo"><button class="link" data-acao="gr-mala-voltar">‹ Malas</button><button class="btn" data-acao="gr-mala-editar" data-id="${m.id}">Editar</button></div>
      <h2>${x.esc(m.nome || "Mala")}</h2><p class="peq">${x.esc([m.destino, m.dias ? m.dias + " dia(s)" : "", CLIMAS[m.clima]].filter(Boolean).join(" · "))}</p>
      <p><b>${r.ok} de ${r.total} arrumadas</b></p>
      <div class="duas"><button class="btn p" data-acao="gr-mala-sugerir">Sugerir peças</button><button class="btn" data-acao="gr-mala-escolher">Escolher peças</button></div>
      ${linhas ? `<div class="gr-lista">${linhas}</div>` : '<p class="vazio">Nenhuma peça na mala. Toque em Sugerir peças.</p>'}
      <h2>Extras</h2>${extras}<button class="btn" data-acao="gr-mala-extra">+ Item</button>`;
  }
  function formMala(m) {
    const viagens = Dados.opcoesVinculo ? Dados.opcoesVinculo("viagem") : [];
    x.abrirFolha(`<h2>${m ? "Editar mala" : "Nova mala"}</h2>${campo("mNome", "Nome", m && m.nome)}${campo("mDestino", "Destino", m && m.destino)}
      <label>Viagem<select id="mViagem"><option value="">—</option>${viagens.map(([id, n]) => `<option value="${x.esc(id)}" ${m && m.viagem_id === id ? "selected" : ""}>${x.esc(n)}</option>`).join("")}</select></label>
      <div class="duas">${campo("mDias", "Dias", m && m.dias ? m.dias : "", 'inputmode="numeric"')}<label>Clima<select id="mClima">${x.opcoesDe(CLIMAS, m ? m.clima : "ameno")}</select></label></div>
      <label>Notas<textarea id="mNotas" rows="2">${x.esc(m ? m.notas : "")}</textarea></label><p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="gr-mala-salvar" data-id="${m ? m.id : ""}">Salvar</button></div>
      ${m ? `<button class="link perigo" data-acao="gr-mala-excluir" data-id="${m.id}">Excluir mala</button>` : ""}`);
  }
  function salvarMala(id) {
    const nome = x.$("#mNome").value.trim().replace(/\s+/g, " "), dias = parseInt(x.$("#mDias").value, 10);
    if (!nome) { x.$("#fErro").textContent = "Dê um nome à mala."; return false; }
    if (!(dias >= 1)) { x.$("#fErro").textContent = "Quantos dias? Use um número, ex.: 5."; return false; }
    const campos = { nome, destino: x.$("#mDestino").value.trim(), viagem_id: x.$("#mViagem").value, dias, clima: x.$("#mClima").value, notas: x.$("#mNotas").value.trim() };
    if (id) Dados.atualizar("malas", id, campos); else malaAberta = Dados.adicionar("malas", Object.assign({ pecas: [], levadas: [], extras: [] }, campos)).id;
    return true;
  }
  const mexerMala = (fn) => { const m = Dados.itens("malas").find((i) => i.id === malaAberta); if (!m) return; Dados.atualizar("malas", m.id, fn(m)); x.desenhar(); x.sincronizar("malas"); };
  function escolherPecasMala() {
    const m = Dados.itens("malas").find((i) => i.id === malaAberta); if (!m) return;
    const marcadas = new Set(m.pecas || []);
    const grade = Dados.itens("roupas").sort(ordemPecas).map((r) => `<label class="gr-pick">${miniatura(r, "peq")}<input type="checkbox" name="mkPeca" value="${r.id}" ${marcadas.has(r.id) ? "checked" : ""}><span>${x.esc(r.nome)}</span></label>`).join("");
    x.abrirFolha(`<h2>Peças da mala</h2>${grade ? `<div class="gr-grade tres">${grade}</div>` : '<p class="vazio">Cadastre peças primeiro.</p>'}
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="gr-mala-pecas-ok">Salvar</button></div>`);
    hidratar();
  }

  // campos de extras da mala: grava ao sair do campo (sem redesenhar enquanto digita)
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("change", (ev) => {
    const el = ev.target; if (!el || !el.classList || !el.classList.contains("gr-ex") || !malaAberta || !x) return;
    const m = Dados.itens("malas").find((i) => i.id === malaAberta); if (!m) return;
    const extras = (m.extras || []).slice(); extras[Number(el.dataset.i)] = el.value.trim();
    Dados.atualizar("malas", m.id, { extras }); x.sincronizar("malas");
  });

  // busca ao vivo sem redesenhar (redesenhar tiraria o foco do campo)
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("input", (ev) => {
    const el = ev.target; if (!el || el.id !== "grBusca") return;
    busca = el.value; const termo = norm(busca);
    document.querySelectorAll("#grGrade .gr-card").forEach((c) => { c.hidden = !!termo && !(c.dataset.txt || "").includes(termo); });
  });

  // ------------------------------------------------------------------ ações (devolve true se tratou)
  function acao(a, d) {
    if (!a.startsWith("gr-")) return false;
    if (!["gr-usei", "gr-usei-look", "gr-desfazer", "gr-pv-usei"].includes(a)) desfazer = null;
    switch (a) {
      case "gr-aba": aba = d.k; if (aba !== "mala") limparExtrasVazios(); x.desenhar(); return true;
      case "gr-filtro-oca": filtroOca = d.k; x.desenhar(); return true;
      case "gr-pv-oca": prov.oca = d.k; ["cima", "baixo", "calcado"].forEach((sl) => { const r = Dados.itens("roupas").find((i) => i.id === prov.sel[sl]); if (r && !daOcasiao(r, prov.oca)) prov.sel[sl] = null; }); prov.sugerido = false; prov.motivo = ""; x.desenhar(); return true;
      case "gr-pv-nav": navegar(d.slot, Number(d.k)); return true;
      case "gr-pv-sugerir": sugerir(); return true;
      case "gr-pv-salvar": if (idsEscolhidos().length) formSalvarLookProvador(); return true;
      case "gr-pv-salvar-ok": {
        const nome = x.$("#lNome").value.trim().replace(/\s+/g, " "); if (!nome) { x.$("#fErro").textContent = "Dê um nome ao look."; return true; }
        Dados.adicionar("looks", { nome, pecas: idsEscolhidos(), notas: "Ocasião: " + OCASIOES[prov.oca] }); x.fecharFolha(); prov.motivo = "Look salvo."; x.desenhar(); x.sincronizar("looks"); return true;
      }
      case "gr-pv-usei": if (idsEscolhidos().length) registrarUso(idsEscolhidos(), "Registrei o uso das peças escolhidas."); return true;
      case "gr-mala-nova": formMala(null); return true;
      case "gr-mala-abrir": malaAberta = d.id; x.desenhar(); return true;
      case "gr-mala-voltar": limparExtrasVazios(); malaAberta = null; x.desenhar(); return true;
      case "gr-mala-editar": formMala(Dados.itens("malas").find((m) => m.id === d.id)); return true;
      case "gr-mala-salvar": if (salvarMala(d.id)) { x.fecharFolha(); x.desenhar(); x.sincronizar("malas"); } return true;
      case "gr-mala-excluir": if (confirm("Excluir esta mala?")) { Dados.remover("malas", d.id); malaAberta = null; x.fecharFolha(); x.desenhar(); x.sincronizar("malas"); } return true;
      case "gr-mala-sugerir": mexerMala((m) => { const s = sugerirMala(Dados.itens("roupas"), m.dias, m.clima); return { pecas: Array.from(new Set((m.pecas || []).concat(s.pecas))) }; }); return true;
      case "gr-mala-escolher": escolherPecasMala(); return true;
      case "gr-mala-pecas-ok": { const ids = [...document.querySelectorAll("input[name=mkPeca]:checked")].map((e) => e.value); x.fecharFolha(); mexerMala((m) => ({ pecas: ids, levadas: (m.levadas || []).filter((id) => ids.includes(id)) })); return true; }
      case "gr-mala-levar": mexerMala((m) => { const l = new Set(m.levadas || []); if (l.has(d.id)) l.delete(d.id); else l.add(d.id); return { levadas: Array.from(l) }; }); return true;
      case "gr-mala-extra": mexerMala((m) => ({ extras: (m.extras || []).concat("") })); setTimeout(() => { const el = [...document.querySelectorAll(".gr-ex")].pop(); if (el) el.focus(); }, 30); return true;
      case "gr-mala-tirar": mexerMala((m) => ({ extras: (m.extras || []).filter((_, i) => i !== Number(d.i)) })); return true;
      case "gr-cat": filtroCat = d.k; x.desenhar(); return true;
      case "gr-nova": formPeca(null); return true;
      case "gr-editar": formPeca(Dados.itens("roupas").find((r) => r.id === d.id)); hidratar(); return true;
      case "gr-sem-recorte": if (foto) { foto.sem = !foto.sem; x.$("#rSem").textContent = foto.sem ? "Usar recorte" : "Sem recorte"; atualizarPrevia(); } return true;
      case "gr-salvar": salvarPeca(d.id); return true;
      case "gr-excluir": if (confirm("Excluir esta peça?")) { Dados.remover("roupas", d.id); x.fecharFolha(); x.desenhar(); x.sincronizar("roupas"); } return true;
      case "gr-usei": { const r = Dados.itens("roupas").find((i) => i.id === d.id); if (r) registrarUso([d.id], `Usou "${r.nome}" hoje.`); return true; }
      case "gr-usei-look": { const l = Dados.itens("looks").find((i) => i.id === d.id); if (l) registrarUso(l.pecas || [], `Usou o look "${l.nome}" hoje.`); return true; }
      case "gr-desfazer": desfazerUso(); return true;
      case "gr-novo-look": formLook(null); return true;
      case "gr-editar-look": formLook(Dados.itens("looks").find((l) => l.id === d.id)); return true;
      case "gr-salvar-look": if (salvarLook(d.id)) { x.fecharFolha(); x.desenhar(); x.sincronizar("looks"); } return true;
      case "gr-excluir-look": if (confirm("Excluir este look?")) { Dados.remover("looks", d.id); x.fecharFolha(); x.desenhar(); x.sincronizar("looks"); } return true;
    }
    return false;
  }
  const TELAS = ["guarda_roupa"];
  function limparExtrasVazios() {
    const m = malaAberta && Dados.itens("malas").find((i) => i.id === malaAberta);
    if (m && (m.extras || []).some((t) => !t)) { Dados.atualizar("malas", m.id, { extras: m.extras.filter(Boolean) }); if (x) x.sincronizar("malas"); }
  }
  const fechar = () => { limparExtrasVazios(); aba = "pecas"; desfazer = null; foto = null; malaAberta = null; };

  return { iniciar, tela, acao, fechar, hidratar, enviarPendentes, TELAS, CATEGORIAS, OCASIOES, encaixe, sugerirLook, sugerirMala, slotDe, custoPorUso, reais, numeroBR, medianaBorda, recortarPixels, suavizarAlfa, fracaoTransparente, recorteValido, caixaDoAlfa, melhorCustoPorUso };
})();
