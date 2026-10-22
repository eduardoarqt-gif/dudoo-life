// Pessoas, Contatinhos e Saúde & Shape no iPhone (17/10/2026) — mesmos campos e regras do computador
// (pessoas_service.py, contatinhos_service.py, saude_service.py). Contatinhos e Saúde ficam atrás do Face ID.
// Fotos (contatinhos e saúde) ficam só no computador: aqui entra a inicial no lugar da foto.
const Pessoal = (function () {
  const CIRCULOS = { familia: "Família", proximos: "Amigos próximos", amigos: "Amigos", trabalho: "Trabalho", outros: "Outros" };
  const STATUS_CONT = { interesse: "Interesse", conversando: "Conversando", saimos: "Já saímos", ficando: "Ficando", pausa: "Em pausa", encerrado: "Encerrado" };
  const ATIVOS = ["interesse", "conversando", "saimos", "ficando"];
  const GRANDEZAS = { "Peso": "kg", "Cintura": "cm", "Peito": "cm", "Braço": "cm", "Coxa": "cm", "Quadril": "cm", "% de gordura": "%" };
  const ABAS_SAUDE = [["medidas", "Medidas"], ["treinos", "Treinos"], ["fotos", "Fotos"], ["remedios", "Remédios"], ["exames", "Exames"]];

  // ------------------------------------------------------------------ funções puras (testadas em testes.js)
  const dia = (iso) => { const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number); return Date.UTC(a, m - 1, d) / 86400000; };
  function diasEntre(deISO, ateISO) { return Math.round(dia(ateISO) - dia(deISO)); }

  // "DD/MM" ou "DD/MM/AAAA" → { md: "MM-DD", ano } | null (vazio) | undefined (inválido)
  function parseAniversario(txt) {
    const bruto = String(txt || "").trim().replace(/[-.]/g, "/"); if (!bruto) return null;
    const p = bruto.split("/"), d = Number(p[0]), m = Number(p[1]), ano = p[2] || "";
    if (!Number.isInteger(d) || !Number.isInteger(m) || (ano && !/^\d{4}$/.test(ano))) return undefined;
    const t = new Date(Date.UTC(ano ? Number(ano) : 2000, m - 1, d));
    if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return undefined;
    return { md: `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, ano };
  }
  function formatarAniversario(p) {
    if (!p.aniversario) return "";
    const [m, d] = p.aniversario.split("-"); return `${d}/${m}` + (p.ano_nascimento ? "/" + p.ano_nascimento : "");
  }
  function proximosAniversarios(pessoas, hojeISO, dias = 30) {
    const ano = Number(hojeISO.slice(0, 4)), saida = [];
    pessoas.forEach((p) => {
      if (!p.aniversario) return;
      let [m, d] = p.aniversario.split("-").map(Number);
      const data = (a) => { const t = new Date(Date.UTC(a, m - 1, d)); return t.getUTCMonth() === m - 1 ? t : new Date(Date.UTC(a, 1, 28)); };   // 29/02 → 28/02
      let prox = data(ano).toISOString().slice(0, 10);
      if (prox < hojeISO) prox = data(ano + 1).toISOString().slice(0, 10);
      const falta = diasEntre(hojeISO, prox);
      if (falta <= dias) saida.push([p, falta]);
    });
    return saida.sort((a, b) => a[1] - b[1]);
  }
  function paraReencontrar(pessoas, hojeISO) {
    const saida = [];
    pessoas.forEach((p) => {
      if (!(p.frequencia_dias > 0)) return;
      const dias = p.ultimo_contato ? diasEntre(p.ultimo_contato, hojeISO) : null;
      if (dias === null || dias > p.frequencia_dias) saida.push([p, dias]);
    });
    return saida.sort((a, b) => (b[1] === null ? 1e6 : b[1]) - (a[1] === null ? 1e6 : a[1]));
  }
  function numeroBR(txt) {
    const b = String(txt ?? "").trim().replace(/R\$|\s/g, ""); if (!b) return null;
    const n = b.includes(",") ? Number(b.replace(/\./g, "").replace(",", ".")) : /^\d{1,3}(\.\d{3})+$/.test(b) ? Number(b.replace(/\./g, "")) : Number(b);
    return Number.isFinite(n) ? n : NaN;
  }
  function resumoMedida(medidas, nome, normalizar) {
    const serie = medidas.filter((r) => normalizar(r.nome) === normalizar(nome)).sort((a, b) => (a.data + a.criado_em).localeCompare(b.data + b.criado_em));
    if (!serie.length) return null;
    const p = serie[0], u = serie[serie.length - 1];
    return { nome: u.nome, unidade: u.unidade, ultima: u.valor, data: u.data, variacao: Math.round((u.valor - p.valor) * 100) / 100, pontos: serie.length };
  }

  // Gráfico de linha da evolução (SVG): grade com valores, linha, pontos, último valor em destaque e datas do começo/meio/fim
  function graficoLinha(pontos, unidade) {
    if (!pontos.length) return '<p class="vazio">Sem registros neste período.</p>';
    const W = 340, H = 210, esq = 40, dir = 14, topo = 16, base = H - 28, fmt = (v) => String(Math.round(v * 10) / 10).replace(".", ",");
    const valores = pontos.map((p) => p[1]);
    let menor = Math.min(...valores), maior = Math.max(...valores); const folga = (maior - menor) * 0.12 || Math.max(Math.abs(maior) * 0.02, 0.5);
    menor -= folga; maior += folga;
    const ey = (v) => base - ((v - menor) / (maior - menor)) * (base - topo);
    const dia = (iso) => Date.parse(iso + "T12:00:00") / 86400000, d0 = dia(pontos[0][0]), d1 = dia(pontos[pontos.length - 1][0]);
    const ex = (iso) => (d1 === d0 ? (esq + W - dir) / 2 : esq + ((dia(iso) - d0) / (d1 - d0)) * (W - dir - esq));
    let grade = "";
    for (let i = 0; i < 4; i++) { const v = menor + ((maior - menor) * i) / 3, y = ey(v);
      grade += `<line x1="${esq}" y1="${y}" x2="${W - dir}" y2="${y}" stroke="currentColor" stroke-opacity=".16"/><text x="${esq - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity=".6">${fmt(v)}</text>`; }
    const xs = pontos.map((p) => ex(p[0])), ys = valores.map(ey);
    const linha = pontos.length > 1 ? `<polyline points="${xs.map((x0, k) => x0.toFixed(1) + "," + ys[k].toFixed(1)).join(" ")}" fill="none" stroke="var(--acc2)" stroke-width="2" stroke-linejoin="round"/>` : "";
    const bolas = xs.map((x0, k) => `<circle cx="${x0.toFixed(1)}" cy="${ys[k].toFixed(1)}" r="${k === xs.length - 1 ? 5 : 3}" fill="${k === xs.length - 1 ? "var(--acc)" : "var(--acc2)"}"/>`).join("");
    const ult = pontos.length - 1, rot = `${fmt(valores[ult])} ${unidade || ""}`.trim(), direita = xs[ult] > W / 2;
    const textoUlt = `<text x="${Math.min(xs[ult], W - dir - 2)}" y="${Math.max(ys[ult] - 10, 12)}" text-anchor="${direita ? "end" : "start"}" font-size="12" font-weight="600" fill="currentColor" style="paint-order:stroke;stroke:var(--bg);stroke-width:3px">${String(rot).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</text>`;
    const curta = (iso) => { const [a0, m0, d2] = iso.split("-"); return `${d2}/${m0}/${a0.slice(2)}`; }, meio = new Date(((d0 + d1) / 2) * 86400000).toISOString().slice(0, 10);      // data do meio DO TEMPO (não do meio da lista)
    const datas = `<text x="${esq}" y="${base + 18}" font-size="10" fill="currentColor" fill-opacity=".6">${curta(pontos[0][0])}</text>
      <text x="${ex(meio)}" y="${base + 18}" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity=".6">${curta(meio)}</text>
      <text x="${W - dir}" y="${base + 18}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity=".6">${curta(pontos[ult][0])}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="grafico-linha" role="img" aria-label="Evolução">${grade}${linha}${bolas}${textoUlt}${datas}</svg>`;
  }

  // ------------------------------------------------------------------ Fotos de evolução (antes/depois), direto pelo app (18/10/2026)
  // A foto é reduzida (1280 px, JPEG) e guardada neste aparelho (IndexedDB); o envio pro repositório privado (`dados/saude_fotos/`) acontece
  // em seguida (e é refeito quando houver internet). O computador baixa de lá. Foto de outro aparelho é baixada na 1ª vez que aparece.
  const ROTULOS_FOTO = ["Antes", "Depois", "Progresso"], CHAVE_PEND = "dudoolife.fotos.pend";
  const FotosDB = (function () {
    let aberto = null;
    const abrir = () => (aberto = aberto || new Promise((ok, falha) => { const r = indexedDB.open("dudoolife-fotos", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("fotos"); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }));
    const op = (modo, fn) => abrir().then((db) => new Promise((ok, falha) => { const t = db.transaction("fotos", modo), q = fn(t.objectStore("fotos")); t.oncomplete = () => ok(q && q.result); t.onerror = () => falha(t.error); }));
    return { get: (k) => op("readonly", (st) => st.get(k)), put: (k, blob) => op("readwrite", (st) => st.put(blob, k)) };
  })();
  const lerPend = () => { try { return JSON.parse(localStorage.getItem(CHAVE_PEND) || "[]"); } catch (e) { return []; } };
  const gravarPend = (l) => { try { localStorage.setItem(CHAVE_PEND, JSON.stringify(l)); } catch (e) {} };
  const paraBase64 = (blob) => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = falha; r.readAsDataURL(blob); });

  let enviandoFotos = false;
  async function enviarPendentes() {
    if (enviandoFotos || !window.Nuvem || !Nuvem.disponivel() || !lerPend().length) return;
    enviandoFotos = true;
    try { await enviarPendentesAgora(); } finally { enviandoFotos = false; }
  }
  async function enviarPendentesAgora() {
    for (const arq of lerPend()) {
      try {
        const blob = await FotosDB.get(arq); if (!blob) { gravarPend(lerPend().filter((n) => n !== arq)); continue; }
        await Nuvem.enviarArquivo("saude_fotos/" + arq, await paraBase64(blob), "foto " + arq);
        gravarPend(lerPend().filter((n) => n !== arq));
      } catch (e) { break; }                                                       // sem internet/token: tenta de novo depois
    }
  }
  window.addEventListener("online", enviarPendentes);

  // reduz a foto: maior lado 1280 px, JPEG ~0,78 (celular de 12 MP vira ~200 KB)
  function reduzirFoto(arquivo) {
    return new Promise((ok, falha) => {
      const url = URL.createObjectURL(arquivo), img = new Image();
      img.onload = () => {
        const f = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * f)); c.height = Math.max(1, Math.round(img.height * f));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob((b) => (b ? ok(b) : falha(new Error("imagem"))), "image/jpeg", 0.78);
      };
      img.onerror = () => { URL.revokeObjectURL(url); falha(new Error("imagem")); };
      img.src = url;
    });
  }

  // preenche as miniaturas depois que a tela é desenhada (app.js chama `hidratar()`): do aparelho; se não tem, baixa da nuvem
  async function hidratar() {
    for (const img of document.querySelectorAll("img[data-arq]")) {
      const arq = img.dataset.arq;
      try {
        let blob = await FotosDB.get(arq);
        if (!blob && window.Nuvem && Nuvem.disponivel()) { blob = await Nuvem.baixarArquivo("saude_fotos/" + arq); if (blob) await FotosDB.put(arq, blob); }
        if (blob) img.src = URL.createObjectURL(blob); else img.alt = "foto ainda não chegou";
      } catch (e) { img.alt = "sem foto"; }
    }
  }

  // ------------------------------------------------------------------ Face ID (WebAuthn, só neste aparelho)
  const CHAVE_CRED = "dudoolife.faceid", MINUTOS = 5;
  let liberadoAte = 0;
  const bioDisponivel = () => !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const aleatorio = () => crypto.getRandomValues(new Uint8Array(32));
  const liberado = () => Date.now() < liberadoAte;
  function trancar() { liberadoAte = 0; }
  async function desbloquear() {
    let cred = null; try { cred = localStorage.getItem(CHAVE_CRED); } catch (e) {}
    if (!cred) {
      const novo = await navigator.credentials.create({ publicKey: { challenge: aleatorio(), rp: { name: "Dudoo Life", id: location.hostname },
        user: { id: aleatorio(), name: "eduardo", displayName: "Eduardo" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" }, timeout: 60000 } });
      cred = b64(novo.rawId); try { localStorage.setItem(CHAVE_CRED, cred); } catch (e) {}
    } else {
      await navigator.credentials.get({ publicKey: { challenge: aleatorio(), allowCredentials: [{ type: "public-key", id: deB64(cred) }], userVerification: "required", timeout: 60000 } });
    }
    liberadoAte = Date.now() + MINUTOS * 60000;
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) trancar(); });

  // ------------------------------------------------------------------ telas
  let x = null;                                   // contexto do app (esc, $, abrirFolha…), entregue em iniciar()
  let medidaSel = "Peso", periodoMed = "tudo";
  let abaPessoas = "pessoas", filtroPessoa = "tudo", statusCont = "ativos", abaSaude = "medidas", erroBio = "";
  const iniciar = (ctx) => { x = ctx; };
  const hoje = () => Dados.hojeISO();
  const br = (iso) => (iso ? Dados.isoParaBR(iso) : "");
  const campo = (id, rotulo, valor, extra = "") => `<label>${rotulo}<input id="${id}" value="${x.esc(valor ?? "")}" ${extra}></label>`;
  const area = (id, rotulo, valor) => `<label>${rotulo}<textarea id="${id}" rows="2">${x.esc(valor ?? "")}</textarea></label>`;
  const rodapeForm = (salvar, id, colecao) => `<p id="fErro" class="erro"></p>
    <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" data-acao="${salvar}" data-id="${id || ""}">Salvar</button></div>
    ${id ? `<button class="link perigo" data-acao="excluir" data-col="${colecao}" data-id="${id}">Excluir</button>` : ""}`;
  const inicial = (nome) => `<span class="avatar">${x.esc((String(nome || "?").trim()[0] || "?").toUpperCase())}</span>`;

  function telaTrancada(titulo, sub) {
    const tem = (() => { try { return !!localStorage.getItem(CHAVE_CRED); } catch (e) { return false; } })();
    const corpo = !bioDisponivel() ? '<p class="vazio">Este aparelho não oferece Face ID para o app. Veja no computador.</p>'
      : `<p class="peq">${tem ? "Protegido com Face ID." : "Primeiro acesso: o app vai pedir o Face ID uma vez para guardar a proteção neste aparelho."}</p>
         <button class="btn p" data-acao="bio-desbloquear" data-s="${sub}">${tem ? "Desbloquear com Face ID" : "Ativar Face ID"}</button>`;
    return `${titulo ? `${x.voltar}<h1>${titulo}</h1>` : ""}${corpo}${erroBio ? `<p class="erro">${x.esc(erroBio)}</p>` : ""}`;
  }

  // ---- Pessoas
  // Contatinhos mora DENTRO de Pessoas (como no computador): abas Pessoas | Contatinhos; os dados da aba ficam atrás do Face ID.
  function abasPessoas() {
    return `${x.voltar}<h1>Pessoas</h1><div class="chips">${x.chipsDe([["pessoas", "Pessoas"], ["contatinhos", "🔒"]], abaPessoas, "aba-pessoas")}</div>`;
  }
  function telaPessoas() {
    if (abaPessoas === "contatinhos") return abasPessoas() + (liberado() ? corpoContatinhos() : telaTrancada("", "contatinhos"));
    const todas = Dados.itens("pessoas"), h = hoje();
    const filtradas = todas.filter((p) => filtroPessoa === "tudo" || p.circulo === filtroPessoa).sort((a, b) => Dados.normalizar(a.nome).localeCompare(Dados.normalizar(b.nome)));
    const chips = x.chipsDe([["tudo", "Todas"]].concat(Object.entries(CIRCULOS)), filtroPessoa, "filtro-pessoa");
    const aniv = proximosAniversarios(todas, h, 30).map(([p, f]) => `<div class="linha-lugar" data-acao="editar-pessoa" data-id="${p.id}"><div><b>${x.esc(p.nome)}</b><small>${f === 0 ? "hoje! 🎂" : f === 1 ? "amanhã" : "em " + f + " dias"} · ${formatarAniversario(p)}</small></div><span>›</span></div>`).join("");
    const reenc = paraReencontrar(todas, h).slice(0, 5).map(([p, d]) => `<div class="linha-lugar"><div data-acao="editar-pessoa" data-id="${p.id}"><b>${x.esc(p.nome)}</b><small>${d === null ? "ainda sem contato registrado" : "sem falar há " + d + " dias"}</small></div><button class="link" data-acao="pessoa-falei" data-id="${p.id}">Falei hoje</button></div>`).join("");
    const linhas = filtradas.map((p) => {
      const dias = p.ultimo_contato ? diasEntre(p.ultimo_contato, h) : null;
      const partes = [CIRCULOS[p.circulo] || "", p.aniversario ? "🎂 " + formatarAniversario(p) : "", dias === null ? "" : dias === 0 ? "falamos hoje" : "falamos há " + dias + " dias", p.afinidade ? "★".repeat(p.afinidade) : ""].filter(Boolean);
      return `<div class="linha-lugar" data-acao="editar-pessoa" data-id="${p.id}"><div><b>${x.esc(p.nome)}</b><small>${x.esc(partes.join(" · "))}</small></div><span>›</span></div>`;
    }).join("");
    return `${abasPessoas()}<div class="linha-titulo"><h2>Círculo de amizades</h2><button class="btn p" data-acao="nova-pessoa">+ Pessoa</button></div>
      <div class="chips">${chips}</div>
      ${aniv ? `<h2>Aniversários nos próximos 30 dias</h2>${aniv}` : ""}${reenc ? `<h2>Para reencontrar</h2>${reenc}` : ""}
      <h2>${filtroPessoa === "tudo" ? "Todas" : CIRCULOS[filtroPessoa]} · ${filtradas.length}</h2>
      ${linhas || '<p class="vazio">Ninguém por aqui ainda.</p>'}`;
  }
  function formPessoa(p) {
    x.abrirFolha(`<h2>${p ? "Editar pessoa" : "Nova pessoa"}</h2>
      ${campo("pNome", "Nome", p && p.nome)}
      <div class="duas"><label>Círculo<select id="pCirc">${x.opcoesDe(CIRCULOS, p ? p.circulo : "amigos")}</select></label>${campo("pAniv", "Aniversário", p && formatarAniversario(p), 'inputmode="numeric" placeholder="DD/MM"')}</div>
      <div class="duas">${campo("pUlt", "Último contato", p && br(p.ultimo_contato), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}${campo("pFreq", "Falar a cada (dias)", p && p.frequencia_dias ? p.frequencia_dias : "", 'inputmode="numeric" placeholder="0 = sem meta"')}</div>
      <div class="duas">${campo("pConheci", "Onde conheci", p && p.conheci_em)}<label>Afinidade<select id="pAfin">${x.opcoesNota(p && p.afinidade)}</select></label></div>
      ${campo("pInt", "Interesses", p && p.interesses)}${area("pNotas", "Anotações", p && p.notas)}${rodapeForm("salvar-pessoa", p && p.id, "pessoas")}`);
  }
  function salvarPessoa(id) {
    const nome = x.$("#pNome").value.trim().replace(/\s+/g, " "), err = (t) => { x.$("#fErro").textContent = t; return false; };
    if (!nome) return err("Dê um nome à pessoa.");
    const aniv = parseAniversario(x.$("#pAniv").value); if (aniv === undefined) return err("O aniversário precisa estar como DD/MM ou DD/MM/AAAA.");
    const ultBruto = x.$("#pUlt").value.trim(), ult = ultBruto ? Dados.brParaISO(ultBruto) : ""; if (ultBruto && !ult) return err("O último contato precisa estar em DD/MM/AAAA.");
    const freq = Math.max(0, parseInt(x.$("#pFreq").value, 10) || 0);
    const campos = { nome, circulo: x.$("#pCirc").value, aniversario: aniv ? aniv.md : "", ano_nascimento: aniv ? aniv.ano : "", conheci_em: x.$("#pConheci").value.trim(),
      ultimo_contato: ult, frequencia_dias: freq, afinidade: x.lerNota("#pAfin"), interesses: x.$("#pInt").value.trim(), notas: x.$("#pNotas").value.trim() };
    if (id) Dados.atualizar("pessoas", id, campos); else Dados.adicionar("pessoas", campos);
    return true;
  }

  // ---- Contatinhos (privado)
  function corpoContatinhos() {
    const h = hoje();
    const chips = x.chipsDe([["ativos", "Ativos"], ["tudo", "Todos"]].concat(Object.entries(STATUS_CONT)), statusCont, "filtro-contatinho");
    const lista = Dados.itens("contatinhos").filter((c) => statusCont === "tudo" || (statusCont === "ativos" ? ATIVOS.includes(c.status) : c.status === statusCont))
      .sort((a, b) => ((a.proximo_encontro || "9999").localeCompare(b.proximo_encontro || "9999")) || Dados.normalizar(a.apelido).localeCompare(Dados.normalizar(b.apelido)));
    const linhas = lista.map((c) => {
      const partes = [STATUS_CONT[c.status] || "", c.proximo_encontro ? (c.proximo_encontro >= h ? "encontro " : "último plano ") + br(c.proximo_encontro) : "", c.ultima_conversa ? "falamos " + br(c.ultima_conversa) : "", c.instagram ? "@" + c.instagram : ""].filter(Boolean);
      return `<div class="linha-lugar" data-acao="editar-contatinho" data-id="${c.id}">${inicial(c.apelido)}<div style="flex:1"><b>${x.esc(c.apelido)} <span class="est">${"★".repeat(c.nota || 0)}</span></b><small>${x.esc(partes.join(" · "))}</small></div><span>›</span></div>`;
    }).join("");
    return `<div class="linha-titulo"><h2>Só seu</h2><div><button class="link" data-acao="bio-trancar">Trancar</button> <button class="btn p" data-acao="novo-contatinho">+ Novo</button></div></div>
      <div class="chips">${chips}</div>${linhas || '<p class="vazio">Ninguém por aqui.</p>'}`;
  }
  function formContatinho(c) {
    x.abrirFolha(`<h2>${c ? "Editar contatinho" : "Novo contatinho"}</h2>
      ${campo("cApelido", "Apelido", c && c.apelido)}
      <div class="duas">${campo("cOnde", "Onde conheci", c && c.onde_conheci)}<label>Status<select id="cStatus">${x.opcoesDe(STATUS_CONT, c ? c.status : "conversando")}</select></label></div>
      <div class="duas"><label>Nota<select id="cNota">${x.opcoesNota(c && c.nota)}</select></label>${campo("cInsta", "Instagram (@)", c && c.instagram, 'autocapitalize="none"')}</div>
      <div class="duas">${campo("cUlt", "Última conversa", c && br(c.ultima_conversa), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}${campo("cProx", "Próximo encontro", c && br(c.proximo_encontro), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}</div>
      ${area("cPos", "Pontos positivos", c && c.positivos)}${area("cAt", "Pontos de atenção (red flags)", c && c.atencao)}${area("cNotas", "Anotações", c && c.notas)}
      ${rodapeForm("salvar-contatinho", c && c.id, "contatinhos")}`);
  }
  function salvarContatinho(id) {
    const err = (t) => { x.$("#fErro").textContent = t; return false; };
    const apelido = x.$("#cApelido").value.trim().replace(/\s+/g, " "); if (!apelido) return err("Dê um apelido (não precisa ser o nome verdadeiro).");
    let insta = x.$("#cInsta").value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^\/+|\/+$/g, "").replace(/^@/, "").trim();
    if (insta && !/^[A-Za-z0-9._]{1,30}$/.test(insta)) return err("O @ do Instagram aceita só letras, números, ponto e sublinhado (até 30).");
    const datas = {}; for (const [k, i, r] of [["ultima_conversa", "#cUlt", "A última conversa"], ["proximo_encontro", "#cProx", "O encontro"]]) {
      const b = x.$(i).value.trim(); datas[k] = b ? Dados.brParaISO(b) : ""; if (b && !datas[k]) return err(`${r} precisa estar em DD/MM/AAAA.`);
    }
    const campos = Object.assign({ apelido, onde_conheci: x.$("#cOnde").value.trim(), status: x.$("#cStatus").value, nota: x.lerNota("#cNota"), instagram: insta,
      positivos: x.$("#cPos").value.trim(), atencao: x.$("#cAt").value.trim(), notas: x.$("#cNotas").value.trim() }, datas);
    if (id) Dados.atualizar("contatinhos", id, campos); else Dados.adicionar("contatinhos", Object.assign({ foto: "" }, campos));
    return true;
  }

  // ---- Saúde & Shape (privado)
  function telaSaude() {
    if (!liberado()) return telaTrancada("Saúde & Shape", "saude");
    const itens = Dados.itens("saude"), chips = x.chipsDe(ABAS_SAUDE, abaSaude, "aba-saude");
    const topo = `${x.voltar}<h1>Saúde &amp; Shape</h1><div class="chips">${chips}</div>`;
    const trancar = '<button class="link" data-acao="bio-trancar">Trancar</button>';
    if (abaSaude === "medidas") {
      const medidas = itens.filter((r) => r.tipo === "medida");
      const ordem = { peso: 0, "% de gordura": 1 };                                  // Peso e % de gordura primeiro (vêm da Hevy), depois as outras
      const nomes = [...new Map(medidas.map((r) => [Dados.normalizar(r.nome), r.nome])).values()]
        .sort((a, b) => ((ordem[Dados.normalizar(a)] ?? 9) - (ordem[Dados.normalizar(b)] ?? 9)) || Dados.normalizar(a).localeCompare(Dados.normalizar(b)));
      const novo = `<button class="btn p" data-acao="nova-saude" data-t="medida">+ Medida</button>`;
      if (!nomes.length) return `${topo}<div class="linha-titulo"><h2>Medidas</h2><div>${trancar} ${novo}</div></div><p class="vazio">Nenhuma medida ainda. O peso e o % de gordura chegam da Hevy pelo computador.</p>`;
      if (!nomes.some((n) => Dados.normalizar(n) === Dados.normalizar(medidaSel))) medidaSel = nomes[0];
      const subabas = x.chipsDe(nomes.map((n) => [n, n]), medidaSel, "medida-sel");
      const r = resumoMedida(medidas, medidaSel, Dados.normalizar), sinal = r.variacao > 0 ? "+" : "";
      const serie = medidas.filter((m) => Dados.normalizar(m.nome) === Dados.normalizar(medidaSel)).sort((a, b) => (a.data + a.criado_em).localeCompare(b.data + b.criado_em));
      const dias = { "3m": 92, "6m": 183, "1a": 365, tudo: 0 }[periodoMed] || 0, corte = dias ? new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10) : "";
      const filtrada = serie.filter((m) => !corte || m.data >= corte).map((m) => [m.data, m.valor]);
      const periodos = x.chipsDe([["3m", "3 meses"], ["6m", "6 meses"], ["1a", "1 ano"], ["tudo", "Tudo"]], periodoMed, "periodo-med");
      const registros = serie.slice().reverse().map((m) => `<div class="linha-lugar" data-acao="editar-saude" data-id="${m.id}"><div><b>${String(m.valor).replace(".", ",")} ${x.esc(m.unidade || "")}</b>
        <small>${br(m.data)}${m.origem === "hevy" ? " · Hevy" : ""}${m.notas ? " · " + x.esc(m.notas) : ""}</small></div><span>›</span></div>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Medidas</h2><div>${trancar} ${novo}</div></div><div class="chips">${subabas}</div>
        <div class="linha-lugar" style="border:0"><div><b style="font-size:30px;font-weight:400">${String(r.ultima).replace(".", ",")} ${x.esc(r.unidade || "")}</b>
          <small>${sinal}${String(r.variacao).replace(".", ",")} ${x.esc(r.unidade || "")} desde ${br(serie[0].data)} · ${r.pontos} registro(s)</small></div></div>
        <div class="chips">${periodos}</div>${graficoLinha(filtrada, r.unidade)}<h2>Registros</h2>${registros}`;
    }
    if (abaSaude === "treinos") {                           // vêm da Hevy (o computador busca sozinho); só leitura aqui
      const l = itens.filter((r) => r.tipo === "treino").sort((a, b) => (b.data + b.criado_em).localeCompare(a.data + a.criado_em)).slice(0, 80).map((r) =>
        `<details class="card nota"><summary><span class="t"><b>${x.esc(r.nome)}</b><span class="p">${br(r.data)}${r.valor ? " · " + Math.round(r.valor) + " min" : ""}${r.origem === "hevy" ? " · Hevy" : ""}</span></span></summary>
          <div class="nota-texto">${x.esc(r.notas || "")}</div></details>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Treinos</h2><div>${trancar}</div></div><p class="peq">Importados da Hevy pelo Dudoo do computador (a cada 3 h). Toque para ver os exercícios.</p>${l || '<p class="vazio">Nenhum treino ainda. Eles chegam do computador.</p>'}`;
    }
    if (abaSaude === "fotos") {
      const fotos = itens.filter((r) => r.tipo === "foto").sort((a, b) => (b.data + b.criado_em).localeCompare(a.data + a.criado_em));
      const tiles = fotos.map((f) => `<div class="foto-tile" data-acao="foto-ver" data-id="${f.id}"><img data-arq="${x.esc(f.arquivo)}" alt=""><span>${x.esc(f.nome || "Foto")} · ${br(f.data).slice(0, 5)}</span></div>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Fotos de evolução</h2><div>${trancar} <button class="btn p" data-acao="nova-foto">+ Foto</button></div></div>
        ${fotos.length >= 2 ? '<button class="btn" data-acao="foto-comparar">Comparar antes × depois</button>' : ""}
        <p class="peq">Tire a foto aqui mesmo (ou escolha da galeria). Sempre na mesma luz e posição fica melhor para comparar.</p>
        ${tiles ? `<div class="fotos-grade">${tiles}</div>` : '<p class="vazio">Nenhuma foto ainda. Toque em + Foto.</p>'}`;
    }
    if (abaSaude === "remedios") {
      const l = itens.filter((r) => r.tipo === "remedio").sort((a, b) => (b.ativo - a.ativo) || Dados.normalizar(a.nome).localeCompare(Dados.normalizar(b.nome))).map((r) =>
        `<div class="linha-lugar ${r.ativo ? "" : "off"}" data-acao="editar-saude" data-id="${r.id}"><div><b>${x.esc(r.nome)}</b><small>${x.esc([r.dose, r.horarios, r.ativo ? "" : "parado"].filter(Boolean).join(" · "))}</small></div><span>›</span></div>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Remédios</h2><div>${trancar} <button class="btn p" data-acao="nova-saude" data-t="remedio">+ Remédio</button></div></div>${l || '<p class="vazio">Nenhum remédio.</p>'}`;
    }
    if (abaSaude === "exames") {
      const l = itens.filter((r) => r.tipo === "exame").sort((a, b) => b.data.localeCompare(a.data)).map((r) =>
        `<div class="linha-lugar" data-acao="editar-saude" data-id="${r.id}"><div><b>${x.esc(r.nome)}</b><small>${br(r.data)}${r.notas ? " · " + x.esc(r.notas) : ""}</small></div><span>›</span></div>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Exames</h2><div>${trancar} <button class="btn p" data-acao="nova-saude" data-t="exame">+ Exame</button></div></div>${l || '<p class="vazio">Nenhum exame.</p>'}`;
    }
    const f = itens.filter((r) => r.tipo === "foto").sort((a, b) => b.data.localeCompare(a.data)).map((r) => `<div class="linha-lugar"><div><b>${br(r.data)}</b><small>${x.esc(r.notas || "foto no computador")}</small></div></div>`).join("");
    return `${topo}<p class="peq">As fotos de evolução ficam só no computador (aqui aparece o registro).</p>${trancar}${f || '<p class="vazio">Nenhuma foto registrada.</p>'}`;
  }
  function formSaude(tipo, r) {
    const t = r ? r.tipo : tipo, titulo = { medida: "medida", remedio: "remédio", exame: "exame" }[t] || "registro";
    let corpo = "";
    if (t === "medida") corpo = `<datalist id="grand">${Object.keys(GRANDEZAS).map((g) => `<option value="${g}">`).join("")}</datalist>
      <label>Medida<input id="sNome" list="grand" value="${x.esc(r ? r.nome : "")}" placeholder="Peso, Cintura…"></label>
      <div class="duas">${campo("sValor", "Valor", r && r.valor != null ? String(r.valor).replace(".", ",") : "", 'inputmode="decimal"')}${campo("sUn", "Unidade", r && r.unidade)}</div>
      ${campo("sData", "Data", br(r ? r.data : hoje()), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}`;
    else if (t === "remedio") corpo = `${campo("sNome", "Remédio", r && r.nome)}<div class="duas">${campo("sDose", "Dose", r && r.dose)}${campo("sHor", "Horários", r && r.horarios)}</div>
      <label class="op"><input type="checkbox" id="sAtivo" ${!r || r.ativo ? "checked" : ""}> Em uso</label>`;
    else corpo = `${campo("sNome", "Exame", r && r.nome)}${campo("sData", "Data", br(r ? r.data : hoje()), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}`;
    x.abrirFolha(`<h2>${r ? "Editar" : "Novo"} ${titulo}</h2>${corpo}${area("sNotas", "Anotações", r && r.notas)}${rodapeForm("salvar-saude", r && r.id, "saude").replace('data-id="', `data-t="${t}" data-id="`)}`);
  }
  function salvarSaude(id, tipo) {
    const err = (m) => { x.$("#fErro").textContent = m; return false; };
    const nome = x.$("#sNome").value.trim().replace(/\s+/g, " "); if (!nome) return err({ medida: "Escolha ou digite a medida.", remedio: "Dê o nome do remédio.", exame: "Dê o nome do exame." }[tipo]);
    const c = { tipo, nome, notas: x.$("#sNotas").value.trim() };
    if (tipo !== "remedio") { const b = x.$("#sData").value.trim(), iso = b ? Dados.brParaISO(b) : ""; if (!iso) return err("Informe a data (DD/MM/AAAA)."); c.data = iso; }
    if (tipo === "medida") {
      const v = numeroBR(x.$("#sValor").value); if (v === null || Number.isNaN(v)) return err("Informe o valor da medida.");
      c.valor = v; c.unidade = x.$("#sUn").value.trim() || GRANDEZAS[Object.keys(GRANDEZAS).find((g) => Dados.normalizar(g) === Dados.normalizar(nome))] || "";
    }
    if (tipo === "remedio") { c.dose = x.$("#sDose").value.trim(); c.horarios = x.$("#sHor").value.trim(); c.ativo = x.$("#sAtivo").checked; }
    if (id) Dados.atualizar("saude", id, c); else Dados.adicionar("saude", Object.assign({ valor: null, unidade: "", dose: "", horarios: "", ativo: true, arquivo: "", data: "" }, c));
    return true;
  }

  let fotoEscolhida = null;
  function formFoto() {
    fotoEscolhida = null;
    x.abrirFolha(`<h2>Nova foto de evolução</h2>
      <label>Foto<input id="fArq" type="file" accept="image/*"></label>
      <div id="fPrev" class="peq">Toque em "Escolher arquivo": o iPhone oferece tirar a foto agora ou usar a galeria.</div>
      <div class="duas"><label>Tipo<select id="fRot">${ROTULOS_FOTO.map((r) => `<option>${r}</option>`).join("")}</select></label>
        ${campo("fData", "Data", br(hoje()), 'inputmode="numeric" placeholder="DD/MM/AAAA"')}</div>
      ${campo("fObs", "Observação", "", 'placeholder="Peso, fase do treino…"')}
      <p id="fErro" class="erro"></p>
      <div class="duas"><button class="btn" data-acao="fechar">Cancelar</button><button class="btn p" id="fSalvar" data-acao="salvar-foto">Salvar</button></div>`);
    const entrada = x.$("#fArq");
    entrada.addEventListener("change", async () => {
      const arq = entrada.files && entrada.files[0]; if (!arq) return;
      x.$("#fPrev").textContent = "Preparando a foto…";
      try {
        fotoEscolhida = await reduzirFoto(arq);
        x.$("#fPrev").innerHTML = `<img src="${URL.createObjectURL(fotoEscolhida)}" style="max-width:100%;max-height:220px;border-radius:10px;display:block;margin:4px auto"> ${Math.round(fotoEscolhida.size / 1024)} KB`;
      } catch (e) { x.$("#fPrev").textContent = "Não consegui ler essa imagem."; }
    });
  }
  async function salvarFoto() {
    const err = (m) => { x.$("#fErro").textContent = m; };
    if (!fotoEscolhida) return err("Escolha ou tire a foto primeiro.");
    const bruta = x.$("#fData").value.trim(), iso = bruta ? Dados.brParaISO(bruta) : hoje(); if (!iso) return err("A data precisa estar em DD/MM/AAAA.");
    const arquivo = `${Dados.uid()}.jpg`;
    try { await FotosDB.put(arquivo, fotoEscolhida); } catch (e) { return err("Não consegui guardar a foto neste aparelho."); }
    Dados.adicionar("saude", { tipo: "foto", data: iso, nome: x.$("#fRot").value, notas: x.$("#fObs").value.trim(), arquivo, valor: null, unidade: "", dose: "", horarios: "", ativo: true, externo_id: "" });
    gravarPend(lerPend().concat(arquivo)); fotoEscolhida = null;
    x.fecharFolha(); x.desenhar(); x.sincronizar("saude"); enviarPendentes();
  }
  function verFoto(id) {
    const f = Dados.itens("saude").find((r) => r.id === id); if (!f) return;
    x.abrirFolha(`<h2>${x.esc(f.nome || "Foto")} · ${br(f.data)}</h2><img data-arq="${x.esc(f.arquivo)}" alt="" style="width:100%;border-radius:12px;display:block">
      ${f.notas ? `<p class="peq">${x.esc(f.notas)}</p>` : ""}<div class="duas"><button class="btn" data-acao="fechar">Fechar</button><button class="btn" data-acao="excluir" data-col="saude" data-id="${f.id}">Excluir</button></div>`);
    hidratar();
  }
  // Antes × depois: a foto "Antes" mais antiga e a "Depois" mais recente (sem esses rótulos: a primeira e a última), com o peso mais próximo
  function compararFotos() {
    const fotos = Dados.itens("saude").filter((r) => r.tipo === "foto").sort((a, b) => a.data.localeCompare(b.data) || a.criado_em.localeCompare(b.criado_em));
    if (fotos.length < 2) return;
    const antes = fotos.find((f) => f.nome === "Antes") || fotos[0], depois = fotos.slice().reverse().find((f) => f.nome === "Depois" && f !== antes) || fotos[fotos.length - 1];
    const pesos = Dados.itens("saude").filter((r) => r.tipo === "medida" && Dados.normalizar(r.nome) === "peso");
    const peso = (data) => { const p = pesos.slice().sort((a, b) => Math.abs(dia(a.data) - dia(data)) - Math.abs(dia(b.data) - dia(data)))[0]; return p ? `${String(p.valor).replace(".", ",")} kg` : ""; };
    const lado = (f, t) => `<div><b>${t}</b><small style="display:block;color:var(--ter)">${br(f.data)}${peso(f.data) ? " · " + peso(f.data) : ""}</small><img data-arq="${x.esc(f.arquivo)}" alt="" style="width:100%;border-radius:10px;margin-top:4px"></div>`;
    const dias = diasEntre(antes.data, depois.data);
    x.abrirFolha(`<h2>Antes × depois</h2><p class="peq">${dias} dias entre as duas fotos</p><div class="duas">${lado(antes, "Antes")}${lado(depois, "Depois")}</div><button class="btn" data-acao="fechar" style="margin-top:12px">Fechar</button>`);
    hidratar();
  }

  // ------------------------------------------------------------------ ações (devolve true se tratou)
  function acao(a, d) {
    switch (a) {
      case "filtro-pessoa": filtroPessoa = d.k; x.desenhar(); return true;
      case "aba-pessoas": abaPessoas = d.k; x.desenhar(); return true;
      case "nova-pessoa": formPessoa(null); return true;
      case "editar-pessoa": formPessoa(Dados.itens("pessoas").find((p) => p.id === d.id)); return true;
      case "pessoa-falei": Dados.atualizar("pessoas", d.id, { ultimo_contato: hoje() }); x.desenhar(); x.sincronizar("pessoas"); return true;
      case "salvar-pessoa": if (salvarPessoa(d.id)) { x.fecharFolha(); x.desenhar(); x.sincronizar("pessoas"); } return true;
      case "filtro-contatinho": statusCont = d.k; x.desenhar(); return true;
      case "novo-contatinho": formContatinho(null); return true;
      case "editar-contatinho": formContatinho(Dados.itens("contatinhos").find((c) => c.id === d.id)); return true;
      case "salvar-contatinho": if (salvarContatinho(d.id)) { x.fecharFolha(); x.desenhar(); x.sincronizar("contatinhos"); } return true;
      case "aba-saude": abaSaude = d.k; x.desenhar(); return true;
      case "nova-foto": formFoto(); return true;
      case "salvar-foto": salvarFoto(); return true;
      case "foto-ver": verFoto(d.id); return true;
      case "foto-comparar": compararFotos(); return true;
      case "medida-sel": medidaSel = d.k; x.desenhar(); return true;
      case "periodo-med": periodoMed = d.k; x.desenhar(); return true;
      case "nova-saude": formSaude(d.t, null); return true;
      case "editar-saude": formSaude(null, Dados.itens("saude").find((r) => r.id === d.id)); return true;
      case "salvar-saude": if (salvarSaude(d.id, d.t)) { x.fecharFolha(); x.desenhar(); x.sincronizar("saude"); } return true;
      case "bio-trancar": trancar(); x.desenhar(); return true;
      case "bio-desbloquear":
        erroBio = ""; desbloquear().catch((e) => { erroBio = "Não consegui confirmar o Face ID" + (e && e.name === "NotAllowedError" ? " (cancelado)." : "."); }).finally(() => x.desenhar()); return true;
    }
    return false;
  }
  const tela = (qual) => (qual === "pessoas" ? telaPessoas() : telaSaude());
  const TELAS = ["pessoas", "saude"];

  const fechar = () => { abaPessoas = "pessoas"; trancar(); };          // saiu pro menu: volta pra aba Pessoas e tranca
  return { iniciar, tela, acao, fechar, graficoLinha, hidratar, enviarPendentes, TELAS, parseAniversario, formatarAniversario, proximosAniversarios, paraReencontrar, resumoMedida, numeroBR, diasEntre, CIRCULOS, STATUS_CONT };
})();
