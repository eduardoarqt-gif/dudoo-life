// Pessoas, Contatinhos e Saúde & Shape no iPhone (17/10/2026) — mesmos campos e regras do computador
// (pessoas_service.py, contatinhos_service.py, saude_service.py). Contatinhos e Saúde ficam atrás do Face ID.
// Fotos (contatinhos e saúde) ficam só no computador: aqui entra a inicial no lugar da foto.
const Pessoal = (function () {
  const CIRCULOS = { familia: "Família", proximos: "Amigos próximos", amigos: "Amigos", trabalho: "Trabalho", outros: "Outros" };
  const STATUS_CONT = { interesse: "Interesse", conversando: "Conversando", saimos: "Já saímos", ficando: "Ficando", pausa: "Em pausa", encerrado: "Encerrado" };
  const ATIVOS = ["interesse", "conversando", "saimos", "ficando"];
  const GRANDEZAS = { "Peso": "kg", "Cintura": "cm", "Peito": "cm", "Braço": "cm", "Coxa": "cm", "Quadril": "cm", "% de gordura": "%" };
  const ABAS_SAUDE = [["medidas", "Medidas"], ["treinos", "Treinos"], ["remedios", "Remédios"], ["exames", "Exames"], ["fotos", "Fotos de evolução"]];

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
    return `${x.voltar}<h1>Pessoas</h1><div class="chips">${x.chipsDe([["pessoas", "Pessoas"], ["contatinhos", "Contatinhos 🔒"]], abaPessoas, "aba-pessoas")}</div>`;
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
      const medidas = itens.filter((r) => r.tipo === "medida"), nomes = [...new Map(medidas.map((r) => [Dados.normalizar(r.nome), r.nome])).values()].sort((a, b) => Dados.normalizar(a).localeCompare(Dados.normalizar(b)));
      const cartoes = nomes.map((n) => { const r = resumoMedida(medidas, n, Dados.normalizar), sinal = r.variacao > 0 ? "+" : "";
        return `<div class="linha-lugar"><div><b>${x.esc(r.nome)}: ${String(r.ultima).replace(".", ",")} ${x.esc(r.unidade || "")}</b><small>${br(r.data)} · ${r.pontos} registro(s) · variação ${sinal}${String(r.variacao).replace(".", ",")}</small></div></div>`; }).join("");
      const recentes = medidas.sort((a, b) => (b.data + b.criado_em).localeCompare(a.data + a.criado_em)).slice(0, 30).map((r) =>
        `<div class="linha-lugar" data-acao="editar-saude" data-id="${r.id}"><div><b>${x.esc(r.nome)} · ${String(r.valor).replace(".", ",")} ${x.esc(r.unidade || "")}</b><small>${br(r.data)}${r.notas ? " · " + x.esc(r.notas) : ""}</small></div><span>›</span></div>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Medidas</h2><div>${trancar} <button class="btn p" data-acao="nova-saude" data-t="medida">+ Medida</button></div></div>${cartoes}<h2>Últimos registros</h2>${recentes || '<p class="vazio">Nenhuma medida ainda.</p>'}`;
    }
    if (abaSaude === "treinos") {                           // vêm da Hevy (o computador busca sozinho); só leitura aqui
      const l = itens.filter((r) => r.tipo === "treino").sort((a, b) => (b.data + b.criado_em).localeCompare(a.data + a.criado_em)).slice(0, 80).map((r) =>
        `<details class="card nota"><summary><span class="t"><b>${x.esc(r.nome)}</b><span class="p">${br(r.data)}${r.valor ? " · " + Math.round(r.valor) + " min" : ""}${r.origem === "hevy" ? " · Hevy" : ""}</span></span></summary>
          <div class="nota-texto">${x.esc(r.notas || "")}</div></details>`).join("");
      return `${topo}<div class="linha-titulo"><h2>Treinos</h2><div>${trancar}</div></div><p class="peq">Importados da Hevy pelo Dudoo do computador (a cada 3 h). Toque para ver os exercícios.</p>${l || '<p class="vazio">Nenhum treino ainda. Eles chegam do computador.</p>'}`;
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
  return { iniciar, tela, acao, fechar, TELAS, parseAniversario, formatarAniversario, proximosAniversarios, paraReencontrar, resumoMedida, numeroBR, diasEntre, CIRCULOS, STATUS_CONT };
})();
