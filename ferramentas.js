// Ferramentas do assistente no PWA — MESMO contrato do app desktop (app/ia/ferramentas.py):
// nomes, parâmetros e regras iguais. A IA nunca toca nos dados: pede a ferramenta, o app executa.
// Escrita exige confirmação (menos anotar em lista, que grava direto a pedido do Eduardo); não existe ferramenta de exclusão; Cofre/Contatinhos nunca entram.
(function () {
  const POLITICA = { momentos: "livre", memorias: "livre", lugares: "livre", viagens: "livre", listas: "livre", tarefas: "livre", supermercado: "livre", compras: "livre",
    guia_compras: "livre", presentes: "livre", filmes: "livre", bucket: "livre", metas: "livre", delivery: "livre", saude: "sob_demanda", cofre: "nunca", contatinhos: "nunca" };
  const permitido = (m) => POLITICA[m] === "livre";

  // listas do assistente (26/11/2026; mesmas regras de app/ia/listas_ia.py): consultar, anotar e marcar como feito. Nunca apaga.
  const LISTAS = { supermercado: "Supermercado", tarefas: "Tarefas", compras: "Compras", guia_compras: "Guia de compras", presentes: "Presentes", filmes: "Filmes e séries", bucket: "Bucket list", metas: "Metas", delivery: "Delivery" };
  const FEITO = { supermercado: "comprado", tarefas: "concluída", compras: "comprado", filmes: "assistido", bucket: "realizado", metas: "concluída" };
  const MAXIMO_ITENS = 30, DESTINOS = ["casa", "escritorio"];
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
    { nome: "consultar_lista", modulo: "listas", escrita: false,
      descricao: "Mostra os itens de uma lista do app: supermercado (a “lista de compras” ou “lista do mercado”), tarefas, compras (as listas Casa, Escritório, Shopping, Farmácia e as criadas pelo usuário), guia_compras, presentes, filmes (e séries), bucket (bucket list), metas e delivery.",
      parametros: obj({ lista: { type: "string", enum: Object.keys(LISTAS) }, lista_de_compras: { type: "string", description: "Só para lista=compras: nome da lista (ex.: Casa)." }, texto: { type: "string" }, incluir_concluidos: { type: "boolean", description: "Padrão: falso." } }, ["lista"]) },
    { nome: "adicionar_na_lista", modulo: "listas", escrita: true, direta: true,
      descricao: "Anota um ou mais itens numa lista do app. “Lista de compras” sem outro nome = supermercado. Use compras (com lista_de_compras) só quando o usuário citar Casa, Escritório, Shopping, Farmácia ou outra lista dele. Ponha todos os itens do pedido numa única chamada. Grava na hora, sem confirmação: não pergunte se pode, só diga o que anotou.",
      parametros: obj({ lista: { type: "string", enum: Object.keys(LISTAS) }, itens: { type: "array", items: { type: "string" }, description: "Um texto por item, ex.: [\"Pão\", \"Leite\"]." }, lista_de_compras: { type: "string", description: "Obrigatório para lista=compras." }, destino: { type: "string", enum: DESTINOS, description: "Só supermercado; padrão casa." }, prazo: { type: "string", description: "DD/MM/AAAA. Só tarefas, bucket e metas." }, pessoa: { type: "string", description: "Só presentes: para quem é." } }, ["lista", "itens"]) },
    { nome: "marcar_item", modulo: "listas", escrita: true,
      descricao: "Marca um item como feito (comprado, tarefa ou meta concluída, filme assistido, sonho realizado) ou desfaz. Não apaga nada. O usuário precisa confirmar antes de gravar.",
      parametros: obj({ lista: { type: "string", enum: Object.keys(FEITO) }, item: { type: "string" }, feito: { type: "boolean", description: "Padrão: verdadeiro." }, lista_de_compras: { type: "string" }, destino: { type: "string", enum: DESTINOS } }, ["lista", "item"]) },
  ];

  const visiveis = () => Dados.itens("momentos").filter((m) => !m.privado);
  const resumoM = (m) => ({ id: m.id, titulo: m.titulo, tipo: m.tipo, data: Dados.isoParaBR(m.data), local: m.local || "", texto: (m.texto || "").slice(0, 240), futuro: m.data > Dados.hojeISO() });
  const resumoL = (l) => ({ id: l.id, nome: l.nome, categoria: l.categoria, cidade: l.cidade || "", status: l.status, nota: l.nota ?? null, notas: (l.notas || "").slice(0, 200) });

  const limpar = (t) => String(t == null ? "" : t).replace(/\s+/g, " ").trim();
  const norm = (t) => Dados.normalizar(t);
  const rotulo = (lista, compras) => (lista === "compras" && limpar(compras) ? `Compras · ${limpar(compras)}` : LISTAS[lista] || lista || "?");
  const conferir = (lista) => (!LISTAS[lista] ? "Não conheço essa lista." : !permitido(lista) ? "Esta lista não está liberada para o assistente." : "");
  function listaDeCompras(nome) {                         // [id, nome] ou { erro }
    const listas = Dados.listasCompras(), termo = norm(limpar(nome));
    const achada = Object.entries(listas).find(([id, n]) => termo && (termo === norm(n) || termo === norm(id)));
    return achada || { erro: "Diga em qual lista de compras: " + Object.values(listas).join(", ") + "." };
  }
  function pessoaDe(nome) {                               // [id, nome]; "" = presente sem pessoa; ou { erro }
    const termo = norm(limpar(nome)); if (!termo) return ["", ""];
    const todas = Dados.itens("pessoas"); let r = todas.filter((p) => norm(p.nome) === termo);
    if (!r.length) r = todas.filter((p) => norm(p.nome).startsWith(termo + " "));
    if (r.length === 1) return [r[0].id, r[0].nome];
    return { erro: r.length ? "Há mais de uma pessoa com esse nome: " + r.map((p) => p.nome).join(", ") + "." : `Não achei “${limpar(nome)}” em Pessoas. Cadastre lá ou anote o presente sem pessoa.` };
  }
  function itensDaLista(lista, compras) {                 // [{id, nome, feito, detalhe}] na ordem da tela, ou { erro }
    const br = (iso) => (iso ? Dados.isoParaBR(iso) : "");
    const um = (i, nome, feito, ...detalhes) => ({ id: i.id, nome, feito: !!feito, detalhe: detalhes.filter(Boolean).join(" · ") });
    const porTexto = (l, k) => l.slice().sort((a, b) => norm(a[k]).localeCompare(norm(b[k])));
    if (lista === "supermercado") return Dados.itens("supermercado").map((i) => um(i, i.nome, i.comprado, i.quantidade, Dados.DESTINOS_MERCADO[i.destino || "casa"]));
    if (lista === "tarefas") return Dados.tarefasOrdenadas("tudo").map((t) => um(t, t.titulo, t.feita, t.prazo ? "prazo " + br(t.prazo) : ""));
    if (lista === "compras") {
      const nomes = Dados.listasCompras(); let alvos = Object.keys(nomes);
      if (limpar(compras)) { const a = listaDeCompras(compras); if (a.erro) return a; alvos = [a[0]]; }
      return alvos.flatMap((id) => Dados.comprasDaLista(id).map((i) => um(i, i.nome, i.comprado, nomes[id], i.nota)));
    }
    if (lista === "guia_compras") return Dados.guiaOrdenado("tudo").map((i) => um(i, i.titulo, false, i.avaliacao ? Dados.AVALIACOES_GUIA[i.avaliacao] : "", i.marca, i.onde, i.medidas));
    if (lista === "presentes") {
      const pessoas = Object.fromEntries(Dados.itens("pessoas").map((p) => [p.id, p.nome]));
      return Dados.itens("presentes").map((g) => um(g, g.ideia, g.situacao === "dado", pessoas[g.pessoa_id] ? "para " + pessoas[g.pessoa_id] : "", Dados.SITUACOES_PRESENTE[g.situacao]));
    }
    if (lista === "filmes") return porTexto(Dados.itens("filmes"), "titulo").map((f) => um(f, f.titulo, f.status === "assistido", Dados.STATUS_TELA[f.status]));
    if (lista === "bucket") return Dados.bucketOrdenado("tudo").map((b) => um(b, b.titulo, b.status === "realizado", Dados.STATUS_BUCKET[b.status], b.prazo ? "prazo " + br(b.prazo) : ""));
    if (lista === "metas") return Dados.metasOrdenadas("tudo").map((m) => um(m, m.titulo, m.status === "concluida", `${m.progresso || 0}%`, m.prazo ? "prazo " + br(m.prazo) : ""));
    if (lista === "delivery") return Dados.deliveryOrdenado("tudo").map((d) => um(d, d.nome, false, Dados.SITUACOES_DELIVERY[d.situacao], d.pedir));
    return [];
  }
  function anotar(lista, nome, o) {                       // um item novo, com os mesmos campos que as telas gravam
    const novo = (c, campos) => Dados.adicionar(c, Object.assign(campos, { origem: campos.origem !== undefined ? campos.origem : "assistente" }));
    if (lista === "supermercado") { novo("supermercado", { nome, quantidade: "", secao: "outros", comprado: false, origem: "", destino: o.destino }); Dados.registrarHabitual(nome, o.destino); }
    else if (lista === "tarefas") novo("tarefas", { titulo: nome, prazo: o.prazo, prioridade: "media", categoria: "", recorrencia: "nenhuma", feita: false, concluida_em: "", notas: "" });
    else if (lista === "compras") Dados.adicionarCompra(o.compras, nome);
    else if (lista === "guia_compras") Dados.anotarGuia(nome);
    else if (lista === "presentes") Dados.anotarPresente(nome, o.pessoa);
    else if (lista === "filmes") novo("filmes", { titulo: nome, tipo: "filme", status: "quero", nota: null, genero: "", ano: "", streaming: "", assistido_em: "", favorito: false, notas: "" });
    else if (lista === "bucket") novo("bucket", { titulo: nome, categoria: "experiencia", prioridade: "media", status: "desejado", prazo: o.prazo, realizado_em: "", notas: "" });
    else if (lista === "metas") novo("metas", { titulo: nome, categoria: "pessoal", status: "andamento", progresso: 0, prazo: o.prazo, concluida_em: "", notas: "" });
    else if (lista === "delivery") novo("delivery", { nome, tipo: "outro", situacao: "testar", nota: null, canal: "app", telefone: "", pedir: "", nao_pedir: "", notas: "" });
  }

  const IMPL = {
    consultar_lista({ lista, lista_de_compras = "", texto = "", incluir_concluidos = false } = {}) {
      const erro = conferir(lista); if (erro) return { erro };
      const todos = itensDaLista(lista, lista_de_compras); if (todos.erro) return todos;
      const termo = norm(limpar(texto));
      const itens = todos.filter((i) => (incluir_concluidos || !i.feito) && (!termo || norm(`${i.nome} ${i.detalhe}`).includes(termo)));
      return { lista: rotulo(lista, lista_de_compras), total: itens.length, itens: itens.slice(0, 60).map((i) => ({ nome: i.nome, feito: i.feito, detalhe: i.detalhe })) };
    },
    adicionar_na_lista({ lista, itens, lista_de_compras = "", destino = "", prazo = "", pessoa = "" } = {}) {
      const erro = conferir(lista); if (erro) return { erro };
      const nomes = (typeof itens === "string" ? [itens] : itens || []).map(limpar).filter(Boolean);
      if (!nomes.length) return { erro: "Diga o que anotar." };
      if (nomes.length > MAXIMO_ITENS) return { erro: `São muitos de uma vez: no máximo ${MAXIMO_ITENS}.` };
      destino = limpar(destino) || "casa"; if (!DESTINOS.includes(destino)) return { erro: "Escolha casa ou escritório." };
      const o = { destino, prazo: "", compras: "", pessoa: "" }; let titulo = LISTAS[lista], quem = "";
      if (lista === "compras") { const a = listaDeCompras(lista_de_compras); if (a.erro) return a; o.compras = a[0]; titulo = rotulo(lista, a[1]); }
      if (lista === "presentes") { const p = pessoaDe(pessoa); if (p.erro) return p; o.pessoa = p[0]; quem = p[1]; }
      if (["tarefas", "bucket", "metas"].includes(lista) && limpar(prazo)) { o.prazo = Dados.brParaISO(prazo); if (!o.prazo) return { erro: "O prazo precisa estar no formato DD/MM/AAAA." }; }
      const novos = [], repetidos = [];
      nomes.forEach((nome) => {
        const n = norm(nome);
        const existe = lista === "supermercado" ? Dados.itens("supermercado").some((i) => !i.comprado && (i.destino || "casa") === destino && norm(i.nome) === n)
          : lista === "presentes" ? Dados.presenteRepetido(nome, o.pessoa)
          : lista === "guia_compras" ? Dados.guiaRepetido(nome)
          : itensDaLista(lista, lista_de_compras).some((i) => !i.feito && norm(i.nome) === n);
        if (existe) { repetidos.push(nome); return; }
        anotar(lista, nome, o); novos.push(nome);
      });
      if (!novos.length) return { erro: "Já está na lista: " + repetidos.join(", ") + "." };
      if (lista === "supermercado" && destino === "escritorio") titulo += " (escritório)";
      const mensagem = `Feito! Anotei em ${titulo}: ${novos.join(", ")}` + (quem ? ` (para ${quem})` : "") + "." + (repetidos.length ? ` Já estava: ${repetidos.join(", ")}.` : "");
      return { status: "criado", lista: titulo, adicionados: novos, repetidos, mensagem };
    },
    marcar_item({ lista, item, feito = true, lista_de_compras = "", destino = "" } = {}) {
      const erro = conferir(lista); if (erro) return { erro };
      if (!FEITO[lista]) return { erro: "Nessa lista não dá pra marcar como feito." };
      const termo = norm(limpar(item)); if (!termo) return { erro: "Diga qual item." };
      let todos = itensDaLista(lista, lista_de_compras); if (todos.erro) return todos;
      if (lista === "supermercado" && DESTINOS.includes(destino)) todos = todos.filter((i) => i.detalhe.includes(Dados.DESTINOS_MERCADO[destino]));
      let achados = todos.filter((i) => norm(i.nome) === termo); if (!achados.length) achados = todos.filter((i) => norm(i.nome).includes(termo));
      if (!achados.length) return { erro: `Não achei “${limpar(item)}” em ${rotulo(lista, lista_de_compras)}.` };
      const mudar = achados.filter((i) => i.feito !== !!feito), como = FEITO[lista];
      if (!mudar.length) return { erro: `“${achados[0].nome}” já está ${feito ? "como " + como : "em aberto"}.` };
      if (mudar.length > 1) return { erro: `Achei mais de um: ${mudar.slice(0, 5).map((i) => i.nome + (i.detalhe ? ` (${i.detalhe})` : "")).join(", ")}. Diga qual.` };
      const alvo = mudar[0];
      if (lista === "supermercado") Dados.alternarItemMercado(alvo.id);
      else if (lista === "tarefas") Dados.alternarTarefa(alvo.id);
      else if (lista === "compras") Dados.alternarCompra(alvo.id);
      else if (lista === "filmes") Dados.atualizar("filmes", alvo.id, { status: feito ? "assistido" : "quero", assistido_em: feito ? Dados.hojeISO() : "" });
      else if (lista === "bucket") Dados.alternarBucket(alvo.id);
      else if (lista === "metas") Dados.alternarMeta(alvo.id);
      return { status: "atualizado", item: alvo.nome, mensagem: feito ? `Feito! Marquei “${alvo.nome}” como ${como}.` : `Feito! “${alvo.nome}” voltou a ficar em aberto.` };
    },
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
      return { status: "criado", momento: resumoM(m), mensagem: `Feito: “${m.titulo}” entrou na sua linha do tempo.` };
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
      return { status: "criado", lugar: resumoL(l), mensagem: `Feito: “${l.nome}” está nos seus lugares.` };
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
      return { status: "criado", memoria: { id: m.id, camada: m.camada, texto: m.texto }, mensagem: "Feito: guardei na memória." };
    },
  };

  function descrever(nome, a) {
    if (nome === "criar_momento") return `Registrar “${a.titulo || "?"}” (${(Dados.TIPOS[a.tipo] || Dados.TIPOS.experiencia).nome}) em ${a.data || "?"}`;
    if (nome === "salvar_lugar") return `Salvar o lugar “${a.nome || "?"}”${a.cidade ? " em " + a.cidade : ""} (${Dados.STATUS[a.status || "quero_conhecer"]})`;
    if (nome === "guardar_memoria") return `Lembrar: “${a.texto || "?"}”`;
    if (nome === "adicionar_na_lista") {
      const itens = (typeof a.itens === "string" ? [a.itens] : a.itens || []).map(String);
      const onde = rotulo(a.lista, a.lista_de_compras) + (a.destino === "escritorio" ? " (escritório)" : "");
      return `Anotar em ${onde}: ${itens.join(", ") || "?"}` + (a.prazo ? ` (até ${a.prazo})` : "") + (a.pessoa ? ` para ${a.pessoa}` : "");
    }
    if (nome === "marcar_item") return `${a.feito === false ? "Desmarcar" : "Marcar como " + (FEITO[a.lista] || "feito")}: ${a.item || "?"} (${rotulo(a.lista, a.lista_de_compras)})`;
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
      if (f.escrita && !f.direta && !confirmado) return { status: "requer_confirmacao", acao: nome, argumentos: args, resumo: descrever(nome, args) };
      try { return IMPL[nome](args); } catch (e) { return { erro: "Argumentos inválidos: " + e.message }; }
    },
    descrever,
    gravaDireto: (nome) => !!(FERRAMENTAS.find((x) => x.nome === nome) || {}).direta,
  };
  window.Ferramentas = Ferramentas;
})();
