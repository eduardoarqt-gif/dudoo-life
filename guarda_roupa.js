// Guarda-roupa no iPhone (18/10/2026) — mesmas coleções do computador: `roupas` e `looks` (sync via GitHub) e fotos em `dados/roupas_fotos/`.
// A foto da peça tem o fundo recortado no próprio aparelho (canvas): cor do fundo = mediana das bordas, flood-fill a partir das bordas com tolerância.
const GuardaRoupa = (function () {
  const CATEGORIAS = { camisa: "Camisa", camiseta: "Camiseta", polo: "Polo", moletom: "Moletom / tricô", casaco: "Casaco / jaqueta", calca: "Calça", bermuda: "Bermuda", calcado: "Calçado", acessorio: "Acessório", outro: "Outro" };
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
  let aba = "pecas", filtroCat = "tudo", busca = "", desfazer = null;
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
    return `${x.voltar}<h1>Guarda-roupa</h1>${resumo}<div class="chips">${x.chipsDe([["pecas", "Peças"], ["looks", "Looks"]], aba, "gr-aba")}</div>${barra}${aba === "looks" ? corpoLooks(roupas, looks) : corpoPecas(roupas)}`;
  }

  function corpoPecas(roupas) {
    const cats = x.chipsDe([["tudo", "Todas"]].concat(Object.entries(CATEGORIAS)), filtroCat, "gr-cat");
    const lista = roupas.filter((r) => filtroCat === "tudo" || r.categoria === filtroCat).sort(ordemPecas);
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
      <div class="chips">${cats}</div>
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
    const campos = { nome, categoria: x.$("#rCat").value, cor: x.$("#rCor").value.trim(), marca: x.$("#rMarca").value.trim(), tamanho: x.$("#rTam").value.trim(), preco, data_compra: data, notas: x.$("#rNotas").value.trim() };
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

  // busca ao vivo sem redesenhar (redesenhar tiraria o foco do campo)
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("input", (ev) => {
    const el = ev.target; if (!el || el.id !== "grBusca") return;
    busca = el.value; const termo = norm(busca);
    document.querySelectorAll("#grGrade .gr-card").forEach((c) => { c.hidden = !!termo && !(c.dataset.txt || "").includes(termo); });
  });

  // ------------------------------------------------------------------ ações (devolve true se tratou)
  function acao(a, d) {
    if (!a.startsWith("gr-")) return false;
    if (a !== "gr-usei" && a !== "gr-usei-look" && a !== "gr-desfazer") desfazer = null;
    switch (a) {
      case "gr-aba": aba = d.k; x.desenhar(); return true;
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
  const fechar = () => { aba = "pecas"; desfazer = null; foto = null; };

  return { iniciar, tela, acao, fechar, hidratar, enviarPendentes, TELAS, CATEGORIAS, custoPorUso, reais, numeroBR, medianaBorda, recortarPixels, suavizarAlfa, fracaoTransparente, recorteValido, caixaDoAlfa, melhorCustoPorUso };
})();
