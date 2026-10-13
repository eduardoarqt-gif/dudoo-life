// Camada de dados do PWA — mesmo formato e mesmas regras do app desktop:
// { versao: 1, itens: [...] }; cada item tem id, criado_em, atualizado_em e (se excluído) excluido_em.
(function () {
  const COLECOES = ["momentos", "lugares", "memorias", "uso_ia"];
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
  const CAMADAS = { fato: "Fatos", preferencia: "Preferências", padrao: "Padrões", contexto: "Contexto" };

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
    const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(String(txt || "").trim());
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
    COLECOES, TIPOS, CATEGORIAS, STATUS, CAMADAS, uid, agora, hojeISO, brParaISO, isoParaBR, normalizar, mesclarItens,

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
