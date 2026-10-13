// Ferramentas do assistente no PWA — MESMO contrato do app desktop (app/ia/ferramentas.py):
// nomes, parâmetros e regras iguais. A IA nunca toca nos dados: pede a ferramenta, o app executa.
// Escrita exige confirmação; não existe ferramenta de exclusão; Cofre/Contatinhos nunca entram.
(function () {
  const POLITICA = { momentos: "livre", memorias: "livre", lugares: "livre", viagens: "livre", saude: "sob_demanda", cofre: "nunca", contatinhos: "nunca" };
  const permitido = (m) => POLITICA[m] === "livre";

  const T = Object.keys(Dados.TIPOS);
  const obj = (propriedades, obrigatorios) => Object.assign({ type: "object", properties: propriedades, additionalProperties: false }, obrigatorios ? { required: obrigatorios } : {});

  const FERRAMENTAS = [
    { nome: "buscar_momentos", modulo: "momentos", escrita: false,
      descricao: "Busca momentos da linha do tempo pessoal (viagens, carros, conquistas, mudanças, experiências, saúde). Use para responder perguntas sobre o passado ou o futuro do usuário.",
      parametros: obj({ texto: { type: "string", description: "Trecho do título, texto ou local." }, tipo: { type: "string", enum: T }, ano: { type: "integer" }, incluir_futuros: { type: "boolean", description: "Padrão: verdadeiro." } }) },
    { nome: "proximos_marcos", modulo: "momentos", escrita: false,
      descricao: "Lista os próximos marcos já planejados (datas futuras), do mais próximo ao mais distante.",
      parametros: obj({ limite: { type: "integer" } }) },
    { nome: "resumo_do_ano", modulo: "momentos", escrita: false,
      descricao: "Resume um ano da vida do usuário: quantidade por tipo e os títulos dos momentos.",
      parametros: obj({ ano: { type: "integer" } }, ["ano"]) },
    { nome: "criar_momento", modulo: "momentos", escrita: true,
      descricao: "Registra um novo momento na linha do tempo. O usuário precisa confirmar antes de gravar.",
      parametros: obj({ titulo: { type: "string" }, tipo: { type: "string", enum: T }, data: { type: "string", description: "DD/MM/AAAA" }, texto: { type: "string" }, local: { type: "string" } }, ["titulo", "tipo", "data"]) },
    { nome: "buscar_lugares", modulo: "lugares", escrita: false,
      descricao: "Busca lugares salvos (restaurantes, bares, cafés, hotéis, atrações) por nome, cidade, status ou categoria.",
      parametros: obj({ texto: { type: "string" }, cidade: { type: "string" }, status: { type: "string", enum: Object.keys(Dados.STATUS) }, categoria: { type: "string", enum: Object.keys(Dados.CATEGORIAS) } }) },
    { nome: "salvar_lugar", modulo: "lugares", escrita: true,
      descricao: "Salva um lugar novo (ex.: um restaurante para conhecer). O usuário precisa confirmar antes de gravar.",
      parametros: obj({ nome: { type: "string" }, categoria: { type: "string", enum: Object.keys(Dados.CATEGORIAS) }, cidade: { type: "string" }, status: { type: "string", enum: Object.keys(Dados.STATUS) }, notas: { type: "string" } }, ["nome"]) },
    { nome: "buscar_memorias", modulo: "memorias", escrita: false,
      descricao: "Consulta o que já foi guardado sobre o usuário (fatos, preferências, padrões).",
      parametros: obj({ texto: { type: "string" }, camada: { type: "string", enum: Object.keys(Dados.CAMADAS) } }) },
    { nome: "guardar_memoria", modulo: "memorias", escrita: true,
      descricao: "Guarda algo que vale lembrar sobre o usuário (um fato ou uma preferência). Só use quando ele pedir para lembrar ou disser algo claramente duradouro. O usuário confirma antes de gravar.",
      parametros: obj({ texto: { type: "string" }, camada: { type: "string", enum: ["fato", "preferencia"] } }, ["texto"]) },
  ];

  const visiveis = () => Dados.itens("momentos").filter((m) => !m.privado);
  const resumoM = (m) => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, data: Dados.isoParaBR(m.data), local: m.local || "", texto: (m.texto || "").slice(0, 240), futuro: m.data > Dados.hojeISO() });
  const resumoL = (l) => ({ id: l.id, nome: l.nome, categoria: l.categoria, cidade: l.cidade || "", status: l.status, nota: l.nota ?? null, notas: (l.notas || "").slice(0, 200) });

  const IMPL = {
    buscar_momentos({ texto = "", tipo, ano, incluir_futuros = true } = {}) {
      const b = Dados.normalizar(texto);
      const r = visiveis().filter((m) =>
        (!tipo || m.tipo === tipo) && (!ano || +m.data.slice(0, 4) === +ano) && (incluir_futuros || m.data <= Dados.hojeISO()) &&
        (!b || Dados.normalizar(`${m.titulo} ${m.texto || ""} ${m.local || ""}`).includes(b)));
      return { total: r.length, momentos: r.slice(0, 25).map(resumoM) };
    },
    proximos_marcos({ limite = 5 } = {}) {
      const r = visiveis().filter((m) => m.data > Dados.hojeISO()).slice(0, Math.max(1, Math.min(+limite, 20)));
      return { momentos: r.map((m) => Object.assign(resumoM(m), { dias_restantes: Dados.diasAte(m.data) })) };
    },
    resumo_do_ano({ ano }) {
      const r = visiveis().filter((m) => +m.data.slice(0, 4) === +ano), por = {};
      r.forEach((m) => { por[m.tipo] = (por[m.tipo] || 0) + 1; });
      return { ano: +ano, total: r.length, por_tipo: por, titulos: r.map((m) => m.titulo) };
    },
    criar_momento({ titulo, tipo, data, texto = "", local = "" }) {
      const iso = Dados.brParaISO(data);
      if (!iso) return { erro: "A data precisa estar em DD/MM/AAAA." };
      if (!String(titulo || "").trim()) return { erro: "Dê um título ao momento." };
      if (!Dados.TIPOS[tipo]) return { erro: "Tipo de momento inválido." };
      const m = Dados.adicionar("momentos", { titulo: titulo.trim(), tipo, data: iso, texto: texto.trim(), local: local.trim(), privado: false, pessoas: [], origem: "assistente" });
      return { status: "criado", momento: resumoM(m) };
    },
    buscar_lugares({ texto = "", cidade = "", status, categoria } = {}) {
      const b = Dados.normalizar(texto), c = Dados.normalizar(cidade);
      const r = Dados.itens("lugares").filter((l) => (!status || l.status === status) && (!categoria || l.categoria === categoria) &&
        (!c || Dados.normalizar(l.cidade).includes(c)) && (!b || Dados.normalizar(`${l.nome} ${l.cidade} ${l.notas || ""}`).includes(b)));
      return { total: r.length, lugares: r.slice(0, 25).map(resumoL) };
    },
    salvar_lugar({ nome, categoria = "outro", cidade = "", status = "quero_conhecer", notas = "" }) {
      if (!String(nome || "").trim()) return { erro: "Dê um nome ao lugar." };
      if (Dados.lugarDuplicado(nome, cidade)) return { erro: `“${nome}” já está cadastrado.` };
      const l = Dados.adicionar("lugares", { nome: nome.trim(), categoria, cidade: cidade.trim(), pais: "", status, nota: null, notas: notas.trim(), link_maps: "", viagens: [], origem: "assistente" });
      return { status: "criado", lugar: resumoL(l) };
    },
    buscar_memorias({ texto = "", camada } = {}) {
      const r = texto.trim() ? Dados.memoriasRelevantes(texto, 12).filter((m) => !camada || m.camada === camada)
                             : Dados.itens("memorias").filter((m) => m.ativa !== false && (!camada || m.camada === camada)).slice(0, 12);
      return { total: r.length, memorias: r.map((m) => ({ id: m.id, camada: m.camada, texto: m.texto, confianca: m.confianca })) };
    },
    guardar_memoria({ texto, camada = "fato" }) {
      const t = String(texto || "").trim().replace(/\s+/g, " ");
      if (!t) return { erro: "Escreva o que deve ser lembrado." };
      if (!Dados.aprendizadoLigado(camada)) return { erro: `O aprendizado de “${Dados.CAMADAS[camada]}” está desligado.` };
      if (Dados.itens("memorias").some((m) => Dados.normalizar(m.texto) === Dados.normalizar(t))) return { erro: "Isso já está na memória." };
      const m = Dados.adicionar("memorias", { camada, texto: t, origem: "assistente", confianca: "confirmada", ativa: true });
      return { status: "criado", memoria: { id: m.id, camada: m.camada, texto: m.texto } };
    },
  };

  function descrever(nome, a) {
    if (nome === "criar_momento") return `Registrar “${a.titulo || "?"}” (${(Dados.TIPOS[a.tipo] || Dados.TIPOS.experiencia).nome}) em ${a.data || "?"}`;
    if (nome === "salvar_lugar") return `Salvar o lugar “${a.nome || "?"}”${a.cidade ? " em " + a.cidade : ""} (${Dados.STATUS[a.status || "quero_conhecer"]})`;
    if (nome === "guardar_memoria") return `Lembrar: “${a.texto || "?"}”`;
    return nome;
  }

  const Ferramentas = {
    especificacoes() {
      return FERRAMENTAS.filter((f) => permitido(f.modulo)).map((f) => ({ type: "function", name: f.nome, description: f.descricao, parameters: f.parametros }));
    },
    executar(nome, args, confirmado = false) {
      const f = FERRAMENTAS.find((x) => x.nome === nome);
      if (!f || !IMPL[nome]) return { erro: "Ferramenta desconhecida: " + nome };
      if (!permitido(f.modulo)) return { erro: "Este módulo não está liberado para o assistente." };
      args = args || {};
      if (f.escrita && !confirmado) return { status: "requer_confirmacao", acao: nome, argumentos: args, resumo: descrever(nome, args) };
      try { return IMPL[nome](args); } catch (e) { return { erro: "Argumentos inválidos: " + e.message }; }
    },
    descrever,
  };
  window.Ferramentas = Ferramentas;
})();
