// Camada de dados do PWA — mesmo formato e mesmas regras do app desktop:
// { versao: 1, itens: [...] }; cada item tem id, criado_em, atualizado_em e (se excluído) excluido_em.
(function () {
  const COLECOES = ["momentos", "lugares", "memorias", "uso_ia", "destinos", "tarefas", "supermercado", "receitas", "filmes", "bucket", "garagem", "mercado_habituais", "pessoas", "contatinhos", "saude", "metas", "compras"];
  const chave = (c) => "dudoolife." + c + ".v2";

  const TIPOS = {
    viagem: { nome: "Viagem", icone: "✈", cor: "#5BA3C7" },
    carro: { nome: "Carro", icone: "◉", cor: "#D9805F" },
    conquista: { nome: "Conquista", icone: "★", cor: "#7DB070" },
    mudanca: { nome: "Mudança", icone: "⌂", cor: "#D2A64A" },
    experiencia: { nome: "Experiência", icone: "✦", cor: "#A78BC9" },
    saude: { nome: "Saúde", icone: "♥", cor: "#D98BAE" },
  };
  const CATEGORIAS = { restaurante: "Restaurante", bar: "Bar", cafe: "Café", delivery: "Delivery", hotel: "Hotel", atracao: "Atração", outro: "Outro" };
  const STATUS = { quero_conhecer: "Quero conhecer", visitado: "Visitado", favorito: "Favorito" };
  // Tarefas e supermercado (mesmos campos e regras de app/services/listas_service.py)
  const PRIORIDADES = { alta: "Alta", media: "Média", baixa: "Baixa" };
  const RECORRENCIAS = { nenhuma: "Não repete", diaria: "Todo dia", semanal: "Toda semana", mensal: "Todo mês", anual: "Todo ano" };
  const SECOES = { hortifruti: "Hortifrúti", acougue: "Açougue e peixes", padaria: "Padaria", laticinios: "Laticínios e frios",
    mercearia: "Mercearia", bebidas: "Bebidas", limpeza: "Limpeza", higiene: "Higiene", outros: "Outros" };
  // Receitas, filmes e bucket list (mesmos campos e regras de listas_service.py)
  const CATEGORIAS_RECEITA = { prato: "Prato principal", massa: "Massas", carne: "Carnes", peixe: "Peixes e frutos do mar", salada: "Saladas",
    sopa: "Sopas", sobremesa: "Sobremesas", lanche: "Lanches", bebida: "Bebidas", outro: "Outras" };
  const TIPOS_TELA = { filme: "Filme", serie: "Série", documentario: "Documentário" };
  const STATUS_TELA = { quero: "Quero assistir", assistindo: "Assistindo", assistido: "Assistido", abandonado: "Abandonado" };
  const CATEGORIAS_BUCKET = { viagem: "Viagem", experiencia: "Experiência", aprender: "Aprender", saude: "Saúde e esporte",
    carreira: "Carreira", gastronomia: "Gastronomia", conquista: "Conquista", outro: "Outro" };
  const STATUS_BUCKET = { desejado: "Desejado", planejado: "Planejado", realizado: "Realizado" };
  // Vínculo de um momento com outra coisa do app (18/10/2026): mesmas regras de vinculos_service.py
  const VINCULOS = { carro: "Carro", viagem: "Viagem", lugar: "Lugar", destino: "Destino", pessoa: "Pessoa", meta: "Meta", sonho: "Sonho (bucket list)" };
  // Compras separadas (18/10/2026): mesmas regras de listas_service.ComprasService
  const LISTAS_COMPRAS = { casa: "Casa", escritorio: "Escritório", shopping: "Shopping" };
  // Metas (18/10/2026): mesmos campos e regras de listas_service.MetasService
  const CATEGORIAS_META = { saude: "Saúde e corpo", carreira: "Carreira", financas: "Finanças", estudos: "Estudos", familia: "Família", casa: "Casa", pessoal: "Pessoal", outro: "Outro" };
  const STATUS_META = { andamento: "Em andamento", pausada: "Pausada", concluida: "Concluída" };
  const SITUACOES_CARRO = { atual: "Na garagem", teve: "Já tive", quero: "Wishlist" };
  const CAMADAS = { fato: "Fatos", preferencia: "Preferências", padrao: "Padrões", contexto: "Contexto" };

  // Perfil do destino → memórias "Preferências" (mesmos textos do app do computador: destinos_service.py)
  const REPETIRIA = { "": "Ainda não sei", sim: "Repetiria", talvez: "Talvez", nao: "Não repetiria" };
  const ASSUNTOS = {
    gostei: "Em {nome}, o que gostei: {valor}.",
    nao_gostei: "Em {nome}, o que não gostei: {valor}.",
    dicas: "Dicas para {nome}: {valor}.",
    melhor_epoca: "Melhor época para ir a {nome}: {valor}.",
    hotel_favorito: "Hotel favorito em {nome}: {valor}.",
    comida_favorita: "Onde comer em {nome} (favoritos): {valor}.",
    evitar: "Em {nome}, evitar: {valor}.",
  };
  const FRASE_REPETIRIA = { sim: "Repetiria viajar para {nome}.", nao: "Não repetiria viajar para {nome}.", talvez: "Talvez repetisse viajar para {nome}." };

  const EXEMPLOS = [
    ["Meu primeiro carro", "carro", "2009-03-14", "Honda Civic Si. Passei mais tempo lavando do que dirigindo."],
    ["Formei em Arquitetura", "conquista", "2010-12-10", "Diploma na mão e zero ideia do que vinha. Perfeito."],
    ["Nova York", "viagem", "2015-10-08", "Andei tanto que furei o tênis. Valeu cada quarteirão."],
    ["Abri o meu escritório", "conquista", "2019-02-04", "Mesa emprestada, um notebook e muita coragem."],
    ["Buenos Aires", "viagem", "2023-06-12", "Voltaria amanhã. A empanada virou lenda."],
    ["Tóquio e Quioto", "viagem", "2025-03-10", "Omakase às 7 da manhã. Não pergunte."],
    ["Mudei para os Jardins", "mudanca", "2025-04-18", "Faltavam cadeiras, sobrou gente."],
    ["Lisboa e Alentejo", "viagem", "2026-11-23", "Voos emitidos. Falta o hotel e a mala."],
  ];

  const pad = (n) => String(n).padStart(2, "0");
  function agora() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
  function hojeISO() { return agora().slice(0, 10); }
  function uid() {
    const r = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16) + Math.random().toString(16).slice(2));
    return r.slice(0, 12);
  }
  function brParaISO(txt) {
    let m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(String(txt || "").trim());
    if (!m && window.MascarasDudoo) {            // só números (21052021): mesmo ajuste que a máscara faz ao sair do campo
      const ajustado = window.MascarasDudoo.dataBR(txt, "DD/MM/AAAA");
      m = ajustado ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ajustado) : null;
    }
    if (!m) return null;
    const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    if (d.getUTCMonth() !== +m[2] - 1) return null;
    return d.toISOString().slice(0, 10);
  }
  function isoParaBR(iso) { const [a, m, d] = String(iso).slice(0, 10).split("-"); return `${d}/${m}/${a}`; }
  function normalizar(t) {
    return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }
  const versao = (i) => String(i.atualizado_em || i.criado_em || "");

  // união por id; para o mesmo id vence o mais recente (exclusão também é um item mais novo)
  function mesclarItens(base, outros) {
    const porId = new Map();
    base.forEach((i) => { if (i && i.id && !porId.has(i.id)) porId.set(i.id, i); });
    (outros || []).forEach((o) => {
      if (!o || !o.id) return;
      const a = porId.get(o.id);
      if (!a || versao(o) > versao(a)) porId.set(o.id, o);
    });
    return Array.from(porId.values());
  }

  const Dados = {
    COLECOES, TIPOS, CATEGORIAS, STATUS, CAMADAS, PRIORIDADES, RECORRENCIAS, SECOES, SITUACOES_CARRO, CATEGORIAS_RECEITA, TIPOS_TELA, STATUS_TELA, CATEGORIAS_BUCKET, STATUS_BUCKET, CATEGORIAS_META, STATUS_META, LISTAS_COMPRAS, VINCULOS, REPETIRIA, ASSUNTOS, uid, agora, hojeISO, brParaISO, isoParaBR, normalizar, mesclarItens,

    ler(c = "momentos") {
      try { const t = JSON.parse(localStorage.getItem(chave(c)) || "null"); if (t && Array.isArray(t.itens)) return t; } catch (e) {}
      return { versao: 1, itens: [] };
    },
    gravar(c, doc) { try { localStorage.setItem(chave(c), JSON.stringify({ versao: 1, itens: doc.itens })); } catch (e) {} },
    itens(c = "momentos") {
      const vivos = this.ler(c).itens.filter((i) => !i.excluido_em);
      if (c === "momentos") return vivos.sort((a, b) => (a.data + a.criado_em).localeCompare(b.data + b.criado_em));
      return vivos.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    },

    adicionar(c, campos) {
      const doc = this.ler(c), t = this.agora();
      const item = Object.assign({ id: uid(), origem: "iphone", criado_em: t, atualizado_em: t }, campos);
      doc.itens.push(item); this.gravar(c, doc); return item;
    },
    atualizar(c, id, mudancas) {
      const doc = this.ler(c); let achou = null;
      doc.itens = doc.itens.map((i) => (i.id === id && !i.excluido_em ? (achou = Object.assign({}, i, mudancas, { atualizado_em: this.agora() })) : i));
      if (achou) this.gravar(c, doc); return achou;
    },
    remover(c, id) {
      const doc = this.ler(c); let ok = false; const t = this.agora();
      doc.itens.forEach((i) => { if (i.id === id && !i.excluido_em) { i.excluido_em = t; i.atualizado_em = t; ok = true; } });
      if (ok) this.gravar(c, doc); return ok;
    },
    mesclar(c, remoto) {
      const doc = { versao: 1, itens: mesclarItens(this.ler(c).itens, (remoto && remoto.itens) || []) };
      this.gravar(c, doc); return doc;
    },
    substituir(c, doc) {
      if (!doc || !Array.isArray(doc.itens)) throw new Error("Arquivo inválido: falta a lista de itens.");
      this.gravar(c, doc);
    },
    exportarTexto(c = "momentos") { return JSON.stringify(this.ler(c), null, 2); },

    semearExemplos() {
      const doc = this.ler("momentos"), tem = new Set(doc.itens.filter((i) => !i.excluido_em).map((i) => i.titulo + i.data));
      EXEMPLOS.forEach(([titulo, tipo, data, texto]) => {
        if (!tem.has(titulo + data)) {
          const t = this.agora();
          doc.itens.push({ id: uid(), titulo, tipo, data, texto, local: "", origem: "exemplo", privado: false, pessoas: [], criado_em: t, atualizado_em: t });
        }
      });
      this.gravar("momentos", doc);
    },

    // --- destinos
    textosDoDestino(d) {
      const t = {};
      for (const [k, modelo] of Object.entries(ASSUNTOS)) {
        const v = String(d[k] || "").trim().replace(/\.+$/, "");
        if (v) t[k] = modelo.replace("{nome}", d.nome).replace("{valor}", v);
      }
      if (FRASE_REPETIRIA[d.repetiria]) t.repetiria = FRASE_REPETIRIA[d.repetiria].replace("{nome}", d.nome);
      if (d.nota != null && d.nota !== "") t.nota = `Minha nota para ${d.nome}: ${String(Number(d.nota)).replace(".", ",")} de 10.`;
      return t;
    },
    sincronizarMemoriaDestino(id) {
      const d = this.itens("destinos").find((x) => x.id === id); if (!d) return { criadas: 0, atualizadas: 0, removidas: 0 };
      const rel = { criadas: 0, atualizadas: 0, removidas: 0 }, textos = this.textosDoDestino(d), memorias = Object.assign({}, d.memorias || {});
      const existentes = new Map(this.itens("memorias").filter((m) => m.camada === "preferencia").map((m) => [m.id, m]));
      for (const assunto of Object.keys(memorias)) {
        if (!(assunto in textos)) { if (this.remover("memorias", memorias[assunto])) rel.removidas++; delete memorias[assunto]; }
      }
      for (const [assunto, texto] of Object.entries(textos)) {
        const mid = memorias[assunto];
        if (mid && existentes.has(mid)) {
          if (existentes.get(mid).texto !== texto) { this.atualizar("memorias", mid, { texto }); rel.atualizadas++; }
          continue;
        }
        const igual = this.itens("memorias").find((m) => normalizar(m.texto) === normalizar(texto));
        if (igual) { memorias[assunto] = igual.id; continue; }
        memorias[assunto] = this.adicionar("memorias", { camada: "preferencia", texto, origem: "usuario", confianca: "confirmada", ativa: true }).id;
        rel.criadas++;
      }
      if (JSON.stringify(memorias) !== JSON.stringify(d.memorias || {})) this.atualizar("destinos", id, { memorias });
      return rel;
    },

    // --- uso da IA (estimativa por tokens; mesmos campos e preços do app do computador)
    PRECOS_IA: { "gpt-4.1-mini": [0.40, 0.10, 1.60], "gpt-4.1": [2.00, 0.50, 8.00], "gpt-4.1-nano": [0.10, 0.025, 0.40], "gpt-4o-mini": [0.15, 0.075, 0.60], "gpt-4o": [2.50, 1.25, 10.00] },
    precoIA(modelo) {
      const m = String(modelo || ""), nomes = Object.keys(this.PRECOS_IA).sort((a, b) => b.length - a.length);
      const achado = nomes.find((n) => m === n || m.startsWith(n + "-"));
      return achado ? { preco: this.PRECOS_IA[achado], exato: true } : { preco: this.PRECOS_IA["gpt-4.1-mini"], exato: false };
    },
    registrarUsoIA(funcao, modelo, usage, ferramentas) {
      const u = usage || {}, ent = +u.input_tokens || 0, sai = +u.output_tokens || 0;
      const cache = Math.min(+((u.input_tokens_details || {}).cached_tokens) || 0, ent);
      const { preco, exato } = this.precoIA(modelo);
      const custo = ((ent - cache) * preco[0] + cache * preco[1] + sai * preco[2]) / 1e6;
      return this.adicionar("uso_ia", { quando: this.agora(), origem: "iphone", funcao, modelo: String(modelo || ""), tokens_entrada: ent,
        tokens_cache: cache, tokens_saida: sai, custo_usd: Math.round(custo * 1e6) / 1e6, ferramentas: Array.from(new Set(ferramentas || [])).sort(), preco_estimado: !exato });
    },
    resumoUsoIA() {
      const mes = hojeISO().slice(0, 7), r = { custo: 0, chamadas: 0, hoje: 0, porFuncao: {}, porOrigem: {} };
      this.itens("uso_ia").forEach((i) => {
        const dia = String(i.quando || "").slice(0, 10);
        if (dia.slice(0, 7) !== mes) return;
        r.custo += i.custo_usd || 0; r.chamadas++;
        if (dia === hojeISO()) r.hoje += i.custo_usd || 0;
        const f = r.porFuncao[i.funcao] || (r.porFuncao[i.funcao] = { chamadas: 0, custo: 0, entrada: 0, saida: 0 });
        f.chamadas++; f.custo += i.custo_usd || 0; f.entrada += i.tokens_entrada || 0; f.saida += i.tokens_saida || 0;
        r.porOrigem[i.origem] = (r.porOrigem[i.origem] || 0) + (i.custo_usd || 0);
      });
      return r;
    },

    // --- momentos
    estatisticas() {
      const hoje = hojeISO(), todos = this.itens("momentos");
      const passados = todos.filter((m) => m.data <= hoje), futuros = todos.filter((m) => m.data > hoje);
      return {
        total: passados.length,
        viagens: passados.filter((m) => m.tipo === "viagem").length,
        carros: passados.filter((m) => m.tipo === "carro").length,
        conquistas: passados.filter((m) => m.tipo === "conquista" || m.tipo === "saude").length,
        proximo: futuros[0] || null,
        ultimos: passados.slice(-4).reverse(),
      };
    },
    diasAte(iso) { return Math.round((new Date(iso + "T00:00:00") - new Date(hojeISO() + "T00:00:00")) / 86400000); },

    // --- tarefas
    proximoPrazo(prazo, recorrencia, referencia) {
      const ref = referencia || hojeISO();
      const paraData = (iso) => { const [a, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d)); };
      let at = paraData(/^\d{4}-\d{2}-\d{2}$/.test(prazo || "") ? prazo : ref);
      const limite = paraData(ref).getTime();
      for (let n = 0; n < 4000; n++) {
        if (recorrencia === "diaria") at = new Date(at.getTime() + 86400000);
        else if (recorrencia === "semanal") at = new Date(at.getTime() + 7 * 86400000);
        else if (recorrencia === "mensal") {
          const m = at.getUTCMonth() + 1, a = at.getUTCFullYear() + (m === 12 ? 1 : 0), nm = m % 12;
          const ultimo = new Date(Date.UTC(a, nm + 1, 0)).getUTCDate();
          at = new Date(Date.UTC(a, nm, Math.min(at.getUTCDate(), ultimo)));
        } else if (recorrencia === "anual") {
          const ultimo = new Date(Date.UTC(at.getUTCFullYear() + 1, at.getUTCMonth() + 1, 0)).getUTCDate();
          at = new Date(Date.UTC(at.getUTCFullYear() + 1, at.getUTCMonth(), Math.min(at.getUTCDate(), ultimo)));
        } else return at.toISOString().slice(0, 10);
        if (at.getTime() > limite) return at.toISOString().slice(0, 10);
      }
      return ref;
    },
    alternarTarefa(id) {
      const t = this.itens("tarefas").find((x) => x.id === id); if (!t) return null;
      if (t.feita) return this.atualizar("tarefas", id, { feita: false, concluida_em: "" });
      if (t.recorrencia && t.recorrencia !== "nenhuma")
        return this.atualizar("tarefas", id, { prazo: this.proximoPrazo(t.prazo, t.recorrencia), feita: false, concluida_em: this.agora() });
      return this.atualizar("tarefas", id, { feita: true, concluida_em: this.agora() });
    },
    tarefasOrdenadas(filtro = "abertas") {
      const hoje = hojeISO(), peso = { alta: 0, media: 1, baixa: 2 };
      return this.itens("tarefas").filter((t) => filtro === "tudo" || (filtro === "feitas" ? t.feita
        : filtro === "hoje" ? !t.feita && t.prazo && t.prazo <= hoje : !t.feita))
        .sort((a, b) => (a.feita - b.feita) || String(a.prazo || "9999").localeCompare(String(b.prazo || "9999"))
          || ((peso[a.prioridade] ?? 1) - (peso[b.prioridade] ?? 1)) || normalizar(a.titulo).localeCompare(normalizar(b.titulo)));
    },
    resumoTarefas() {
      const hoje = hojeISO(), abertas = this.itens("tarefas").filter((t) => !t.feita);
      return { abertas: abertas.length, hoje: abertas.filter((t) => t.prazo === hoje).length, atrasadas: abertas.filter((t) => t.prazo && t.prazo < hoje).length };
    },

    // --- supermercado
    mercadoPorSecao(soFaltam) {
      const grupos = {};
      this.itens("supermercado").filter((i) => !(soFaltam && i.comprado)).forEach((i) => {
        const s = SECOES[i.secao] ? i.secao : "outros"; (grupos[s] = grupos[s] || []).push(i);
      });
      return Object.keys(SECOES).filter((s) => grupos[s]).map((s) => [s, grupos[s].sort((a, b) => (a.comprado - b.comprado) || normalizar(a.nome).localeCompare(normalizar(b.nome)))]);
    },
    // Lista padrão (17/10/2026): o que você costuma comprar fica guardado e volta com um toque. Cada item adicionado entra aqui sozinho.
    registrarHabitual(nome) {
      const limpo = String(nome || "").replace(/\s+/g, " ").trim(); if (!limpo) return null;
      const achado = this.itens("mercado_habituais").find((h) => normalizar(h.nome) === normalizar(limpo));
      if (achado) return this.atualizar("mercado_habituais", achado.id, { usos: (achado.usos || 0) + 1, ultimo: this.agora() });
      return this.adicionar("mercado_habituais", { nome: limpo, usos: 1, ultimo: this.agora() });
    },
    habituais() {
      if (!this.itens("mercado_habituais").length) this.itens("supermercado").forEach((i) => this.registrarHabitual(i.nome));   // 1ª vez: parte do que já está na lista
      return this.itens("mercado_habituais").sort((a, b) => ((b.usos || 0) - (a.usos || 0)) || String(b.ultimo || "").localeCompare(String(a.ultimo || "")) || normalizar(a.nome).localeCompare(normalizar(b.nome)));
    },
    adicionarHabituais(ids) {
      const pendentes = new Set(this.itens("supermercado").filter((i) => !i.comprado).map((i) => normalizar(i.nome)));
      let novos = 0;
      this.itens("mercado_habituais").filter((h) => ids.includes(h.id)).forEach((h) => {
        if (pendentes.has(normalizar(h.nome))) return;
        this.adicionar("supermercado", { nome: h.nome, quantidade: "", secao: "outros", comprado: false, origem: "" });
        this.atualizar("mercado_habituais", h.id, { usos: (h.usos || 0) + 1, ultimo: this.agora() }); novos++;
      });
      return novos;
    },
    alternarItemMercado(id) {
      const i = this.itens("supermercado").find((x) => x.id === id); return i ? this.atualizar("supermercado", id, { comprado: !i.comprado }) : null;
    },
    limparComprados() {
      const comprados = this.itens("supermercado").filter((i) => i.comprado);
      comprados.forEach((i) => this.remover("supermercado", i.id)); return comprados.length;
    },

    // --- receitas
    ingredientesDaReceita(r) {
      return String(r.ingredientes || "").split("\n").map((l) => l.replace(/^[\s\-•]+/, "").trim()).filter(Boolean);
    },
    receitasOrdenadas(filtro = "tudo") {
      return this.itens("receitas").filter((r) => filtro === "tudo" || (filtro === "favoritas" ? r.favorita : r.categoria === filtro))
        .sort((a, b) => ((b.favorita ? 1 : 0) - (a.favorita ? 1 : 0)) || normalizar(a.nome).localeCompare(normalizar(b.nome)));
    },
    enviarReceitaAoMercado(id) {
      const r = this.itens("receitas").find((x) => x.id === id); if (!r) return { erro: "Receita não encontrada." };
      const ing = this.ingredientesDaReceita(r); if (!ing.length) return { erro: "Esta receita ainda não tem ingredientes." };
      const existentes = new Set(this.itens("supermercado").filter((i) => !i.comprado).map((i) => normalizar(i.nome)));
      let novos = 0, repetidos = 0;
      ing.forEach((nome) => {
        const k = normalizar(nome.replace(/\s+/g, " "));
        if (existentes.has(k)) { repetidos++; return; }
        this.adicionar("supermercado", { nome: nome.replace(/\s+/g, " "), quantidade: "", secao: "outros", comprado: false, origem: r.nome });
        existentes.add(k); novos++;
      });
      return { novos, repetidos };
    },

    // --- filmes e séries
    filmesOrdenados(filtro = "quero") {
      const lista = this.itens("filmes").filter((t) => filtro === "tudo" || (filtro === "favoritos" ? t.favorito : t.status === filtro));
      if (filtro === "assistido") return lista.sort((a, b) => String(b.assistido_em || "").localeCompare(String(a.assistido_em || "")) || normalizar(a.titulo).localeCompare(normalizar(b.titulo)));
      return lista.sort((a, b) => normalizar(a.titulo).localeCompare(normalizar(b.titulo)));
    },

    // --- vínculo de momento ↔ item do app
    opcoesVinculo(tipo) {
      const f = {
        carro: () => this.itens("garagem").map((c) => [c.id, this.nomeCarro(c)]),
        viagem: () => this.itens("momentos").filter((m) => m.tipo === "viagem").map((m) => [m.id, `${m.titulo} (${String(m.data).slice(0, 4)})`]),
        lugar: () => this.itens("lugares").map((l) => [l.id, l.nome]), destino: () => this.itens("destinos").map((d) => [d.id, d.nome]),
        pessoa: () => this.itens("pessoas").map((p) => [p.id, p.nome]), meta: () => this.itens("metas").map((m) => [m.id, m.titulo]),
        sonho: () => this.itens("bucket").map((s) => [s.id, s.titulo]),
      }[tipo];
      return f ? f().sort((a, b) => normalizar(a[1]).localeCompare(normalizar(b[1]))) : [];
    },
    nomeDoVinculo(tipo, id, reserva = "") { const o = this.opcoesVinculo(tipo).find((x) => String(x[0]) === String(id)); return o ? o[1] : reserva; },

    // --- compras (Casa · Escritório · Shopping): cada lista na ORDEM em que os itens entraram, reordenável por arraste
    comprasDaLista(lista, esconderComprados = false) {
      return this.itens("compras").filter((i) => i.lista === lista && !(esconderComprados && i.comprado))
        .sort((a, b) => ((a.ordem || 0) - (b.ordem || 0)) || String(a.criado_em).localeCompare(String(b.criado_em)));
    },
    adicionarCompra(lista, nome, nota = "") {
      const limpo = String(nome || "").replace(/\s+/g, " ").trim(); if (!limpo || !LISTAS_COMPRAS[lista]) return null;
      const fim = this.itens("compras").filter((i) => i.lista === lista).reduce((m, i) => Math.max(m, i.ordem || 0), 0) + 1;       // entra no FIM
      return this.adicionar("compras", { lista, nome: limpo, nota: String(nota || "").trim(), comprado: false, ordem: fim });
    },
    reordenarCompras(lista, idsVisiveis) {                // itens escondidos (comprados) ficam onde estavam
      const todos = this.comprasDaLista(lista), visiveis = new Set(idsVisiveis), fila = idsVisiveis.filter((id) => todos.some((t) => t.id === id));
      let k = 0; const nova = todos.map((t) => (visiveis.has(t.id) ? fila[k++] : t.id)), porId = Object.fromEntries(todos.map((t) => [t.id, t]));
      let mudou = 0; nova.forEach((id, pos) => { if (porId[id].ordem !== pos + 1) { this.atualizar("compras", id, { ordem: pos + 1 }); mudou++; } });
      return mudou;
    },
    alternarCompra(id) { const i = this.itens("compras").find((x) => x.id === id); return i ? this.atualizar("compras", id, { comprado: !i.comprado }) : null; },
    limparCompras(lista) {
      const feitos = this.itens("compras").filter((i) => i.lista === lista && i.comprado); feitos.forEach((i) => this.remover("compras", i.id)); return feitos.length;
    },

    // --- metas
    metasOrdenadas(filtro = "andamento") {
      return this.itens("metas").filter((m) => filtro === "tudo" || m.status === filtro)
        .sort((a, b) => ((a.status === "concluida") - (b.status === "concluida")) || String(a.prazo || "9999").localeCompare(String(b.prazo || "9999")) || normalizar(a.titulo).localeCompare(normalizar(b.titulo)));
    },
    alternarMeta(id) {
      const m = this.itens("metas").find((i) => i.id === id); if (!m) return null;
      return m.status === "concluida" ? this.atualizar("metas", id, { status: "andamento", progresso: 99, concluida_em: "" })
        : this.atualizar("metas", id, { status: "concluida", progresso: 100, concluida_em: hojeISO() });
    },
    resumoMetas() {
      const todas = this.itens("metas"), abertas = todas.filter((m) => m.status !== "concluida");
      return { total: todas.length, concluidas: todas.length - abertas.length, medio: abertas.length ? Math.round(abertas.reduce((t, m) => t + (m.progresso || 0), 0) / abertas.length) : 0 };
    },

    // --- bucket list
    bucketOrdenado(filtro = "abertos") {
      const peso = { alta: 0, media: 1, baixa: 2 };
      return this.itens("bucket").filter((x) => filtro === "tudo" || (filtro === "abertos" ? x.status !== "realizado" : x.status === filtro))
        .sort((a, b) => ((a.status === "realizado") - (b.status === "realizado")) || ((peso[a.prioridade] ?? 1) - (peso[b.prioridade] ?? 1))
          || String(a.prazo || "9999").localeCompare(String(b.prazo || "9999")) || normalizar(a.titulo).localeCompare(normalizar(b.titulo)));
    },
    alternarBucket(id) {
      const x = this.itens("bucket").find((i) => i.id === id); if (!x) return null;
      return x.status === "realizado" ? this.atualizar("bucket", id, { status: "desejado", realizado_em: "" })
        : this.atualizar("bucket", id, { status: "realizado", realizado_em: hojeISO() });
    },

    // --- garagem
    carrosOrdenados(situacao = "tudo") {
      const ordem = { atual: 0, teve: 1, quero: 2 };
      return this.itens("garagem").filter((c) => situacao === "tudo" || c.situacao === situacao)
        .sort((a, b) => ((ordem[a.situacao] ?? 1) - (ordem[b.situacao] ?? 1)) || String(b.data_compra || b.ano || "").localeCompare(String(a.data_compra || a.ano || "")));
    },
    nomeCarro(c) { return [c.marca, c.modelo].filter(Boolean).join(" ") || c.apelido || "Carro sem nome"; },
    tempoDePosse(c) {
      if (!c.data_compra) return "";
      const ini = new Date(c.data_compra + "T00:00:00"), fim = c.data_venda ? new Date(c.data_venda + "T00:00:00") : new Date();
      const meses = Math.max(0, (fim.getFullYear() - ini.getFullYear()) * 12 + fim.getMonth() - ini.getMonth());
      if (meses < 12) return meses + (meses === 1 ? " mês" : " meses");
      const a = Math.floor(meses / 12); return a + (a === 1 ? " ano" : " anos");
    },

    // --- caminho da vida (estrada em S, 3 marcos por linha; o bonequinho anda por comprimento de arco)
    geoCaminho(n) {
      const xs = [62, 180, 298], margemE = 24, margemD = 336, topo = 70, alt = 128;
      const pts = [], rota = [], dist = [];
      let acum = 0, ult = null;
      const push = (x, y) => { if (ult) acum += Math.hypot(x - ult[0], y - ult[1]); rota.push([x, y]); ult = [x, y]; };
      for (let k = 0; k < n; k++) {
        const r = Math.floor(k / 3), c = k % 3, x = r % 2 === 0 ? xs[c] : xs[2 - c], y = topo + r * alt;
        if (k > 0 && c === 0) { const borda = (r - 1) % 2 === 0 ? margemD : margemE; push(borda, topo + (r - 1) * alt); push(borda, y); }
        push(x, y); pts.push([x, y]); dist.push(acum);
      }
      return { W: 360, H: topo + Math.floor(Math.max(0, n - 1) / 3) * alt + 58, pts, rota, dist, total: acum };
    },
    pontoNoCaminho(geo, s) {
      let acum = 0;
      for (let i = 1; i < geo.rota.length; i++) {
        const [x0, y0] = geo.rota[i - 1], [x1, y1] = geo.rota[i], l = Math.hypot(x1 - x0, y1 - y0);
        if (s <= acum + l || i === geo.rota.length - 1) {
          const t = l ? Math.min(1, Math.max(0, (s - acum) / l)) : 0;
          return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, dx: x1 - x0 };
        }
        acum += l;
      }
      const p = geo.rota[0] || [0, 0];
      return { x: p[0], y: p[1], dx: 1 };
    },

    // --- lugares
    lugarDuplicado(nome, cidade) {
      const k = normalizar(nome) + "|" + normalizar(cidade);
      return this.itens("lugares").find((l) => normalizar(l.nome) + "|" + normalizar(l.cidade) === k) || null;
    },
    // --- memórias
    aprendizadoLigado(camada) {
      try { const a = JSON.parse(localStorage.getItem("dudoolife.aprendizado") || "{}"); return a[camada] !== false; } catch (e) { return true; }
    },
    definirAprendizado(camada, ligado) {
      let a = {}; try { a = JSON.parse(localStorage.getItem("dudoolife.aprendizado") || "{}"); } catch (e) {}
      a[camada] = !!ligado; localStorage.setItem("dudoolife.aprendizado", JSON.stringify(a));
    },
    memoriasRelevantes(texto, limite = 8) {
      const pal = new Set((normalizar(texto).match(/\w+/g) || []).filter((p) => p.length > 3));
      const pont = [];
      this.itens("memorias").filter((m) => m.ativa !== false).forEach((m) => {
        const alvo = new Set(normalizar(m.texto).match(/\w+/g) || []);
        let p = 0; pal.forEach((w) => { if (alvo.has(w)) p++; });
        if (p > 0) pont.push([p + (m.camada === "fato" ? 0.5 : 0), m]);
      });
      return pont.sort((a, b) => b[0] - a[0]).slice(0, limite).map((x) => x[1]);
    },
    contextoMemoria(texto) {
      return this.memoriasRelevantes(texto).map((m) =>
        `- [${CAMADAS[m.camada] || m.camada}] ${m.texto}${m.confianca === "confirmada" ? "" : " (inferido, não confirmado)"}`).join("\n");
    },
  };
  window.Dados = Dados;
})();
