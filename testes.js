// Testes do PWA (rodam no navegador: abra testes.html). Resultado em window.__resultado.
(async function () {
  const resultados = [];
  function afirmar(c, msg) { if (!c) throw new Error(msg || "falhou"); }
  function igual(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "diferente") + `: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); }
  async function teste(nome, fn) {
    try { limpar(); await fn(); resultados.push({ nome, ok: true }); }
    catch (e) { resultados.push({ nome, ok: false, erro: e.message }); }
  }
  function limpar() { Object.keys(localStorage).filter((k) => k.startsWith("dudoolife.")).forEach((k) => localStorage.removeItem(k)); }

  const T = (t) => `2026-01-0${t}T10:00:00`;

  await teste("mesclar: mais recente vence e exclusão não ressuscita", () => {
    const m = Dados.mesclarItens(
      [{ id: "1", titulo: "A", atualizado_em: T(1) }, { id: "2", titulo: "B", atualizado_em: T(1) }],
      [{ id: "1", titulo: "A2", atualizado_em: T(5) }, { id: "2", titulo: "B", atualizado_em: T(6), excluido_em: T(6) }, { id: "3", titulo: "C", atualizado_em: T(2) }]);
    const p = Object.fromEntries(m.map((i) => [i.id, i]));
    igual(p["1"].titulo, "A2"); afirmar(p["2"].excluido_em); afirmar(p["3"]);
  });

  await teste("lugares: cidades sem duplicar (grafia única, país da cidade)", () => {
    Dados.adicionar("lugares", { nome: "Mani", categoria: "restaurante", cidade: "São Paulo", pais: "Brasil", status: "quero_conhecer" });
    Dados.adicionar("lugares", { nome: "Arante", categoria: "bar", cidade: "Florianópolis", pais: "Brasil", status: "favorito" });
    igual(Dados.cidades(), ["Florianópolis", "São Paulo"]);
    igual(Dados.cidadeCanonica("sao paulo"), "São Paulo");
    igual(Dados.cidadeCanonica("Cidade Nova"), "Cidade Nova");
    igual(Dados.paisDaCidade("florianopolis"), "Brasil");
  });

  await teste("aniversário: dia certo, 29/02, idade e leitura da data", () => {
    const p = { nome: "Eduardo", aniversario: "10-22", ano_nascimento: "1988" };
    afirmar(Aniversario.ehAniversario(p, new Date(2026, 9, 22)) && !Aniversario.ehAniversario(p, new Date(2026, 9, 21)));
    igual(Aniversario.idade(p, new Date(2026, 9, 22)), 38); igual(Aniversario.idade(p, new Date(2026, 9, 21)), 37);
    igual(Aniversario.idade({ aniversario: "10-22" }, new Date(2026, 9, 22)), null);
    const b = { aniversario: "02-29", ano_nascimento: "2000" };
    afirmar(Aniversario.ehAniversario(b, new Date(2028, 1, 29)) && Aniversario.ehAniversario(b, new Date(2027, 1, 28)) && !Aniversario.ehAniversario(b, new Date(2027, 2, 1)));
    igual(Aniversario.lerNascimento("22/10/1988"), { aniversario: "10-22", ano_nascimento: "1988" });
    igual(Aniversario.lerNascimento("22/10"), { aniversario: "10-22", ano_nascimento: "" });
    igual(Aniversario.lerNascimento("31/02/1999"), null); igual(Aniversario.lerNascimento("22/10/88"), null);
    igual(Aniversario.formatarNascimento(p), "22/10/1988");
  });

  await teste("exclusão é lógica e some da lista", () => {
    const m = Dados.adicionar("momentos", { titulo: "X", tipo: "viagem", data: "2020-01-01" });
    afirmar(Dados.itens("momentos").length === 1);
    Dados.remover("momentos", m.id);
    igual(Dados.itens("momentos").length, 0);
    igual(Dados.ler("momentos").itens.length, 1);
  });

  await teste("data brasileira", () => {
    igual(Dados.brParaISO("13/10/2026"), "2026-10-13"); igual(Dados.brParaISO("31/02/2026"), null); igual(Dados.isoParaBR("2026-10-13"), "13/10/2026");
  });

  await teste("ferramentas: contrato igual ao do desktop", () => {
    const nomes = Ferramentas.especificacoes().map((f) => f.name).sort();
    igual(nomes, ["buscar_lugares", "buscar_memorias", "buscar_momentos", "criar_momento", "guardar_memoria", "proximos_marcos", "resumo_do_ano", "salvar_lugar"]);
    afirmar(Ferramentas.especificacoes().every((f) => f.type === "function" && f.parameters));
    afirmar(!nomes.some((n) => /excluir|remover|apagar|cofre|contatinho/.test(n)), "não pode haver ferramenta de exclusão/cofre");
  });

  await teste("ferramentas: busca não expõe momento privado", () => {
    Dados.adicionar("momentos", { titulo: "Diário íntimo", tipo: "experiencia", data: "2025-04-01", texto: "segredo", privado: true });
    Dados.adicionar("momentos", { titulo: "Tóquio", tipo: "viagem", data: "2025-03-10", texto: "", privado: false });
    igual(Ferramentas.executar("buscar_momentos", { texto: "segredo" }).total, 0);
    igual(Ferramentas.executar("buscar_momentos", { tipo: "viagem" }).total, 1);
  });

  await teste("ferramentas: escrita pede confirmação e só grava confirmada", () => {
    const a = { titulo: "Show", tipo: "experiencia", data: "20/12/2026" };
    const r = Ferramentas.executar("criar_momento", a);
    igual(r.status, "requer_confirmacao"); igual(Dados.itens("momentos").length, 0);
    igual(Ferramentas.executar("criar_momento", a, true).status, "criado"); igual(Dados.itens("momentos").length, 1);
    afirmar(Ferramentas.executar("criar_momento", { titulo: "X", tipo: "viagem", data: "2026-01-01" }, true).erro, "data inválida deve dar erro");
    afirmar(Ferramentas.executar("remover_momento", { id: "x" }).erro);
  });

  await teste("memória: respeita aprendizado desligado e duplicado", () => {
    igual(Ferramentas.executar("guardar_memoria", { texto: "Prefere vinho branco", camada: "preferencia" }, true).status, "criado");
    afirmar(Ferramentas.executar("guardar_memoria", { texto: "PREFERE vinho branco", camada: "preferencia" }, true).erro, "duplicado");
    Dados.definirAprendizado("fato", false);
    afirmar(Ferramentas.executar("guardar_memoria", { texto: "Alérgico a camarão", camada: "fato" }, true).erro, "aprendizado desligado");
  });

  await teste("memória: contexto traz só o relevante e marca inferido", () => {
    Dados.adicionar("memorias", { camada: "preferencia", texto: "Prefere voo de manhã", origem: "usuario", confianca: "confirmada", ativa: true });
    Dados.adicionar("memorias", { camada: "preferencia", texto: "Gosta de restaurante japonês", origem: "inferido", confianca: "inferida", ativa: true });
    Dados.adicionar("memorias", { camada: "fato", texto: "Carro atual é um Audi A4", origem: "usuario", confianca: "confirmada", ativa: true });
    const c = Dados.contextoMemoria("Que restaurante japonês você sugere?");
    afirmar(c.includes("japonês") && c.includes("inferido") && !c.includes("Audi"), c);
  });

  await teste("assistente: laço de ferramenta, contexto e histórico só texto", async () => {
    Dados.adicionar("momentos", { titulo: "Lisboa", tipo: "viagem", data: "2099-11-23" });
    Dados.adicionar("memorias", { camada: "fato", texto: "Mora em São Paulo", origem: "usuario", confianca: "confirmada", ativa: true });
    const corpos = [];
    const respostas = [
      { output: [{ type: "function_call", name: "proximos_marcos", arguments: "{}", call_id: "c1" }] },
      { output: [{ type: "message", content: [{ type: "output_text", text: "Lisboa é o próximo." }] }] },
    ];
    const a = AssistenteDudoo.criar(async (corpo) => { corpos.push(JSON.parse(JSON.stringify(corpo))); return respostas.shift(); });
    const r = await a.enviar("Qual é o próximo marco de São Paulo?");
    igual(r.texto, "Lisboa é o próximo."); igual(r.ferramentas_usadas, ["proximos_marcos"]);
    const saida = corpos[1].entrada.find((i) => i.type === "function_call_output");
    afirmar(JSON.parse(saida.output).momentos[0].titulo === "Lisboa");
    afirmar(corpos[0].instrucoes.includes("Mora em São Paulo"), "memória relevante nas instruções");
    igual(a.historico.map((m) => m.role), ["user", "assistant"]);
  });

  await teste("assistente: ação que grava vira pendência e só executa ao confirmar", async () => {
    const respostas = [
      { output: [{ type: "function_call", name: "salvar_lugar", arguments: JSON.stringify({ nome: "Zena", cidade: "Florianópolis", categoria: "restaurante" }), call_id: "c9" }] },
      { output: [{ type: "message", content: [{ type: "output_text", text: "Posso salvar o Zena. Confirma?" }] }] },
    ];
    const a = AssistenteDudoo.criar(async () => respostas.shift());
    const r = await a.enviar("Salva o Zena de Floripa");
    igual(r.pendencias.length, 1); igual(Dados.itens("lugares").length, 0);
    igual(a.confirmar(r.pendencias[0]).status, "criado"); igual(Dados.itens("lugares").length, 1);
  });

  // ---- sincronização com driver falso (semântica de ETag do Graph)
  function driverFalso(inicial = {}) {
    const arq = {}; Object.keys(inicial).forEach((k) => { arq[k] = { doc: inicial[k], v: 1 }; });
    let falharProximoEnvio = false;
    return {
      arq, enviosRealizados: 0,
      conflitarNoProximo() { falharProximoEnvio = true; },
      disponivel: () => true,
      async baixar(nome) { const a = arq[nome]; return a ? { doc: JSON.parse(JSON.stringify(a.doc)), etag: String(a.v) } : { doc: { versao: 1, itens: [] }, etag: null }; },
      async enviar(nome, doc, etag) {
        const a = arq[nome];
        if (falharProximoEnvio) { falharProximoEnvio = false; // outro aparelho gravou antes
          arq[nome] = { doc: { versao: 1, itens: [{ id: "outro", titulo: "Do outro aparelho", tipo: "viagem", data: "2020-01-01", criado_em: T(3), atualizado_em: T(3) }].concat(a ? a.doc.itens : []) }, v: (a ? a.v : 0) + 1 };
          const e = new Error("412"); e.conflito = true; throw e; }
        if (a && etag && String(a.v) !== etag) { const e = new Error("412"); e.conflito = true; throw e; }
        this.enviosRealizados++; arq[nome] = { doc: JSON.parse(JSON.stringify(doc)), v: (a ? a.v : 0) + 1 }; return String(arq[nome].v);
      },
    };
  }

  await teste("sync: mescla remoto + local e envia o resultado", async () => {
    Dados.adicionar("momentos", { titulo: "Só no iPhone", tipo: "carro", data: "2021-01-01" });
    const d = driverFalso({ momentos: { versao: 1, itens: [{ id: "r1", titulo: "Do computador", tipo: "viagem", data: "2019-01-01", criado_em: T(1), atualizado_em: T(1) }] } });
    const s = SyncDudoo.criar(d);
    afirmar(await s.tudo());
    const titulos = Dados.itens("momentos").map((m) => m.titulo).sort();
    igual(titulos, ["Do computador", "Só no iPhone"]);
    igual(d.arq.momentos.doc.itens.length, 2);
  });

  await teste("sync: conflito 412 é resolvido com nova mesclagem", async () => {
    Dados.adicionar("momentos", { titulo: "Local novo", tipo: "viagem", data: "2022-02-02" });
    const d = driverFalso({ momentos: { versao: 1, itens: [] } });
    d.conflitarNoProximo();
    const s = SyncDudoo.criar(d);
    afirmar(await s.colecao("momentos"));
    const t = d.arq.momentos.doc.itens.map((i) => i.titulo).sort();
    igual(t, ["Do outro aparelho", "Local novo"]);
    igual(Dados.itens("momentos").length, 2);
  });

  await teste("sync: exclusão feita no iPhone chega ao remoto e não ressuscita", async () => {
    const item = { id: "k1", titulo: "Apagar", tipo: "viagem", data: "2018-01-01", criado_em: T(1), atualizado_em: T(1) };
    Dados.gravar("momentos", { itens: [item] });
    Dados.remover("momentos", "k1");
    const d = driverFalso({ momentos: { versao: 1, itens: [item] } });
    await SyncDudoo.criar(d).colecao("momentos");
    afirmar(d.arq.momentos.doc.itens[0].excluido_em, "tombstone enviado");
    igual(Dados.itens("momentos").length, 0);
  });

  await teste("sync: sem alteração não reenvia o arquivo", async () => {
    const item = { id: "a1", titulo: "Igual", tipo: "viagem", data: "2018-01-01", criado_em: T(1), atualizado_em: T(1) };
    Dados.gravar("momentos", { itens: [item] });
    const d = driverFalso({ momentos: { versao: 1, itens: [item] } });
    await SyncDudoo.criar(d).colecao("momentos");
    igual(d.enviosRealizados, 0);
  });


  // ---- driver do GitHub com fetch falso (formato da Contents API)
  function fetchFalso(roteiro) {
    const chamadas = [];
    const f = async (url, init = {}) => {
      chamadas.push({ url, init });
      const r = roteiro.shift();
      return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.corpo };
    };
    f.chamadas = chamadas; return f;
  }
  const b64 = (txt) => { let bin = ""; new TextEncoder().encode(txt).forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };

  await teste("github: arquivo inexistente vira lista vazia; lê JSON com acentos e devolve o sha", async () => {
    Nuvem.definirToken("ghp_teste");
    Nuvem.fetchFn = fetchFalso([{ status: 404 }]);
    const vazio = await Nuvem.baixar("momentos");
    igual(vazio.doc.itens.length, 0); igual(vazio.etag, null);
    Nuvem.fetchFn = fetchFalso([{ status: 200, corpo: { sha: "abc123", content: b64(JSON.stringify({ versao: 1, itens: [{ id: "1", titulo: "São Paulo ✈" }] })) } }]);
    const r = await Nuvem.baixar("momentos");
    igual(r.etag, "abc123"); igual(r.doc.itens[0].titulo, "São Paulo ✈");
    const f = Nuvem.fetchFn; afirmar(f.chamadas[0].url.includes("/repos/eduardoarqt-gif/dudoolife-dados/contents/dados/momentos.json"));
    igual(f.chamadas[0].init.headers.Authorization, "Bearer ghp_teste");
  });

  await teste("github: envia com sha, conteúdo base64 e trata 409 como conflito", async () => {
    Nuvem.definirToken("ghp_teste");
    Nuvem.fetchFn = fetchFalso([{ status: 200, corpo: { content: { sha: "novo456" } } }]);
    const sha = await Nuvem.enviar("lugares", { itens: [{ id: "x", nome: "Maní" }] }, "velho");
    igual(sha, "novo456");
    const corpo = JSON.parse(Nuvem.fetchFn.chamadas[0].init.body);
    igual(corpo.sha, "velho"); afirmar(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(corpo.content), (c) => c.charCodeAt(0)))).itens[0].nome === "Maní");
    Nuvem.fetchFn = fetchFalso([{ status: 409 }]);
    let conflito = false; try { await Nuvem.enviar("lugares", { itens: [] }, "velho"); } catch (e) { conflito = !!e.conflito; }
    afirmar(conflito, "409 deve virar conflito");
  });

  await teste("github: token recusado dá mensagem clara; sem token não sincroniza", async () => {
    Nuvem.definirToken("ruim");
    Nuvem.fetchFn = fetchFalso([{ status: 401 }]);
    let msg = ""; try { await Nuvem.baixar("momentos"); } catch (e) { msg = e.message; }
    afirmar(/token/i.test(msg), msg);
    Nuvem.definirToken("");
    afirmar(!Nuvem.disponivel());
  });

  await teste("uso da IA: custo com cache, modelo com sufixo e resumo por função", () => {
    Dados.registrarUsoIA("assistente", "gpt-4.1-mini-2025-04-14", { input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 400 } }, ["a", "a"]);
    Dados.registrarUsoIA("classificar_peca", "modelo-novo", { input_tokens: 2000, output_tokens: 100 });
    const r = Dados.resumoUsoIA();
    afirmar(Math.abs(Dados.itens("uso_ia").find((i) => i.funcao === "assistente").custo_usd - (600 * 0.4 + 400 * 0.1 + 200 * 1.6) / 1e6) < 1e-9);
    igual(r.chamadas, 2); igual(r.porFuncao.assistente.chamadas, 1);
    igual(Dados.itens("uso_ia").find((i) => i.funcao === "assistente").ferramentas, ["a"]);
    afirmar(Dados.itens("uso_ia").find((i) => i.funcao === "classificar_peca").preco_estimado === true);
    afirmar(Dados.COLECOES.includes("uso_ia"));
  });

  await teste("assistente registra o uso de cada chamada sem guardar o conteúdo", async () => {
    const a = AssistenteDudoo.criar(async () => ({ model: "gpt-4.1-mini", usage: { input_tokens: 500, output_tokens: 50 }, output: [{ type: "message", content: [{ type: "output_text", text: "oi" }] }] }));
    await a.enviar("segredo qualquer");
    const regs = Dados.itens("uso_ia");
    igual(regs.length, 1); igual(regs[0].funcao, "assistente"); igual(regs[0].origem, "iphone");
    afirmar(!JSON.stringify(regs).includes("segredo"));
  });

  await teste("destino: perfil vira memórias (mesmos textos do computador), atualiza e remove sem duplicar", () => {
    const d = Dados.adicionar("destinos", { nome: "Singapura", tipo: "pais", pais: "", nota: 9.5, repetiria: "sim", gostei: "Limpeza e comida.", nao_gostei: "", hotel_favorito: "M Hotel", memorias: {} });
    const r = Dados.sincronizarMemoriaDestino(d.id);
    igual(r.criadas, 4);
    const textos = Dados.itens("memorias").map((m) => m.texto).sort();
    igual(textos, ["Em Singapura, o que gostei: Limpeza e comida.", "Hotel favorito em Singapura: M Hotel.", "Minha nota para Singapura: 9,5 de 10.", "Repetiria viajar para Singapura."].sort());
    igual(Dados.sincronizarMemoriaDestino(d.id), { criadas: 0, atualizadas: 0, removidas: 0 });
    Dados.atualizar("destinos", d.id, { repetiria: "nao", hotel_favorito: "" });
    const r2 = Dados.sincronizarMemoriaDestino(d.id);
    igual([r2.atualizadas, r2.removidas], [1, 1]);
    afirmar(Dados.itens("memorias").some((m) => m.texto === "Não repetiria viajar para Singapura."));
    afirmar(!Dados.itens("memorias").some((m) => /Hotel favorito/.test(m.texto)));
    afirmar(Dados.COLECOES.includes("destinos"));
  });

  await teste("tarefas: concluir, reabrir e repetir avançam como no computador", () => {
    const t = Dados.adicionar("tarefas", { titulo: "Ligar", prazo: "", prioridade: "media", recorrencia: "nenhuma", categoria: "", feita: false, concluida_em: "", notas: "" });
    afirmar(Dados.alternarTarefa(t.id).feita);
    afirmar(!Dados.alternarTarefa(t.id).feita);
    const r = Dados.adicionar("tarefas", { titulo: "Condomínio", prazo: "2026-01-10", prioridade: "alta", recorrencia: "mensal", feita: false });
    const depois = Dados.alternarTarefa(r.id);
    afirmar(!depois.feita && depois.prazo > Dados.hojeISO(), "recorrente deve ir para o futuro");
    igual(Dados.proximoPrazo("2026-01-31", "mensal", "2026-01-31"), "2026-02-28");
    igual(Dados.proximoPrazo("2024-02-29", "anual", "2024-02-29"), "2025-02-28");
    igual(Dados.proximoPrazo("2026-03-01", "semanal", "2026-03-01"), "2026-03-08");
    afirmar(Dados.COLECOES.includes("tarefas") && Dados.COLECOES.includes("supermercado"));
  });

  await teste("tarefas: atrasadas e filtro de hoje", () => {
    Dados.adicionar("tarefas", { titulo: "velha", prazo: "2020-01-01", prioridade: "media", recorrencia: "nenhuma", feita: false });
    Dados.adicionar("tarefas", { titulo: "futura", prazo: "2099-01-01", prioridade: "media", recorrencia: "nenhuma", feita: false });
    igual(Dados.resumoTarefas().atrasadas, 1);
    igual(Dados.tarefasOrdenadas("hoje").map((t) => t.titulo), ["velha"]);
  });

  await teste("supermercado: seções, comprado e limpar", () => {
    const a = Dados.adicionar("supermercado", { nome: "Leite", quantidade: "", secao: "laticinios", comprado: false, origem: "" });
    Dados.adicionar("supermercado", { nome: "Maçã", quantidade: "", secao: "hortifruti", comprado: false, origem: "" });
    igual(Dados.mercadoPorSecao(false).map((g) => g[0]), ["hortifruti", "laticinios"]);
    afirmar(Dados.alternarItemMercado(a.id).comprado);
    igual(Dados.mercadoPorSecao(true).length, 1);
    igual(Dados.limparComprados(), 1);
    igual(Dados.itens("supermercado").length, 1);
  });

  await teste("supermercado: lista padrão guarda o que foi adicionado e volta com um toque", () => {
    Dados.registrarHabitual("Café"); Dados.registrarHabitual("café "); Dados.registrarHabitual("Leite");
    igual(Dados.itens("mercado_habituais").length, 2);
    igual(Dados.habituais()[0].nome, "Café");                       // mais usado primeiro
    afirmar(Dados.COLECOES.includes("mercado_habituais"));
    const cafe = Dados.habituais()[0];
    igual(Dados.adicionarHabituais([cafe.id]), 1);
    igual(Dados.adicionarHabituais([cafe.id]), 0);                  // já está por comprar: não duplica
    afirmar(Dados.itens("supermercado").some((i) => i.nome === "Café"));
  });

  await teste("pessoas: aniversário, próximos aniversários e quem reencontrar (mesmas regras do computador)", () => {
    igual(Pessoal.parseAniversario("29/02"), { md: "02-29", ano: "" });
    igual(Pessoal.parseAniversario("05-11-1990"), { md: "11-05", ano: "1990" });
    igual(Pessoal.parseAniversario(""), null);
    igual(Pessoal.parseAniversario("31/04"), undefined);
    igual(Pessoal.parseAniversario("10/10/90"), undefined);
    const ana = { nome: "Ana", aniversario: "10-20", ano_nascimento: "1990", frequencia_dias: 30, ultimo_contato: "2026-08-01" };
    const bia = { nome: "Bia", aniversario: "10-10", frequencia_dias: 0 };
    const cris = { nome: "Cris", aniversario: "02-29", frequencia_dias: 10 };
    igual(Pessoal.formatarAniversario(ana), "20/10/1990");
    igual(Pessoal.proximosAniversarios([ana, bia, cris], "2026-10-17", 30).map(([p, f]) => [p.nome, f]), [["Ana", 3]]);   // Bia já passou; Cris (28/02) está longe
    igual(Pessoal.proximosAniversarios([cris], "2027-02-20", 30).map(([p, f]) => f), [8]);                             // 29/02 vira 28/02
    igual(Pessoal.paraReencontrar([ana, bia, cris], "2026-10-17").map(([p, d]) => [p.nome, d]), [["Cris", null], ["Ana", 77]]);
  });

  await teste("saúde: resumo de medida e número brasileiro", () => {
    igual(Pessoal.numeroBR("1.234,56"), 1234.56); igual(Pessoal.numeroBR("7,5"), 7.5); igual(Pessoal.numeroBR("18.000"), 18000); igual(Pessoal.numeroBR(""), null);
    const m = [{ nome: "Peso", valor: 80, unidade: "kg", data: "2026-01-01", criado_em: "a" }, { nome: "peso", valor: 78.5, unidade: "kg", data: "2026-03-01", criado_em: "b" }, { nome: "Cintura", valor: 90, data: "2026-01-01", criado_em: "c" }];
    igual(Pessoal.resumoMedida(m, "Peso", Dados.normalizar), { nome: "peso", unidade: "kg", ultima: 78.5, data: "2026-03-01", variacao: -1.5, pontos: 2 });
  });

  await teste("pessoas, contatinhos e saúde sincronizam e seguem fora da IA", () => {
    ["pessoas", "contatinhos", "saude"].forEach((c) => afirmar(Dados.COLECOES.includes(c)));
    afirmar(!/contatinh|saude|pessoas/i.test(JSON.stringify((typeof Ferramentas !== "undefined" && Ferramentas.contrato ? Ferramentas.contrato() : []))));
  });

  await teste("contatinhos: categorias editáveis e pessoa em mais de uma (mesma regra do computador)", () => {
    afirmar(Dados.COLECOES.includes("categorias_contatinhos"));
    const cats = Pessoal.categoriasCont();
    igual(cats.map((c) => c.id), ["interesse", "conversando", "saimos", "ficando", "pausa", "encerrado"]);
    const amigos = Dados.adicionar("categorias_contatinhos", { nome: "Amigos", ativa: false, ordem: 7 });
    const a = Dados.adicionar("contatinhos", { apelido: "Ana", status: "ficando", categorias: ["ficando", amigos.id] });
    Dados.adicionar("contatinhos", { apelido: "Bia", status: "pausa" });
    const todas = Pessoal.categoriasCont(), itens = Dados.itens("contatinhos");
    igual(Pessoal.filtrarContatinhos(itens, todas, "ficando").map((c) => c.apelido), ["Ana"]);
    igual(Pessoal.filtrarContatinhos(itens, todas, amigos.id).map((c) => c.apelido), ["Ana"]);
    igual(Pessoal.filtrarContatinhos(itens, todas, "ativos").map((c) => c.apelido), ["Ana"]);
    igual(Pessoal.filtrarContatinhos(itens, todas, "tudo").length, 2);
    igual(Pessoal.apagarCategoriaCont(amigos.id), 1);
    igual(Pessoal.categoriasDe(Dados.itens("contatinhos").find((c) => c.id === a.id)), ["ficando"]);
    afirmar(!Pessoal.categoriasCont().some((c) => c.id === amigos.id));
  });

  await teste("metas: ordem, concluir/reabrir e resumo (mesma regra do computador)", () => {
    afirmar(Dados.COLECOES.includes("metas"));
    const a = Dados.adicionar("metas", { titulo: "Sem prazo", categoria: "pessoal", status: "andamento", progresso: 0, prazo: "", concluida_em: "", notas: "" });
    Dados.adicionar("metas", { titulo: "Com prazo", categoria: "saude", status: "andamento", progresso: 50, prazo: "2026-11-01", concluida_em: "", notas: "" });
    Dados.adicionar("metas", { titulo: "Parada", categoria: "outro", status: "pausada", progresso: 0, prazo: "", concluida_em: "", notas: "" });
    igual(Dados.metasOrdenadas("andamento").map((m) => m.titulo), ["Com prazo", "Sem prazo"]);
    igual(Dados.metasOrdenadas("pausada").map((m) => m.titulo), ["Parada"]);
    const feita = Dados.alternarMeta(a.id);
    igual([feita.status, feita.progresso], ["concluida", 100]); afirmar(feita.concluida_em);
    igual(Dados.metasOrdenadas("tudo").map((m) => m.titulo), ["Com prazo", "Parada", "Sem prazo"]);      // concluída vai pro fim
    const reaberta = Dados.alternarMeta(a.id);
    igual([reaberta.status, reaberta.progresso, reaberta.concluida_em], ["andamento", 99, ""]);
    igual(Dados.resumoMetas(), { total: 3, concluidas: 0, medio: 50 });                                  // (99 + 50 + 0) / 3
  });

  await teste("compras: ordem de chegada, arrastar regrava a ordem e comprados escondidos não perdem o lugar", () => {
    afirmar(Dados.COLECOES.includes("compras"));
    ["Lâmpada", "Pilha", "Fita"].forEach((n) => Dados.adicionarCompra("casa", n));
    Dados.adicionarCompra("shopping", "Camisa branca", "tam M"); Dados.adicionarCompra("escritorio", "Papel A4");
    igual(Dados.comprasDaLista("casa").map((i) => i.nome), ["Lâmpada", "Pilha", "Fita"]);
    igual(Dados.comprasDaLista("casa").map((i) => i.ordem), [1, 2, 3]);
    afirmar(Dados.adicionarCompra("casa", "   ") === null && Dados.adicionarCompra("garagem", "x") === null);
    const [a1, b1, c1] = Dados.comprasDaLista("casa");
    igual(Dados.reordenarCompras("casa", [c1.id, a1.id, b1.id]), 3);
    igual(Dados.comprasDaLista("casa").map((i) => i.nome), ["Fita", "Lâmpada", "Pilha"]);
    igual(Dados.reordenarCompras("casa", [c1.id, a1.id, b1.id]), 0);
    Dados.adicionarCompra("casa", "Cola");
    igual(Dados.comprasDaLista("casa").map((i) => i.nome), ["Fita", "Lâmpada", "Pilha", "Cola"]);        // item novo vai pro fim
    Dados.alternarCompra(a1.id);                                                                         // Lâmpada comprada (escondida)
    const visiveis = Dados.comprasDaLista("casa", true).map((i) => i.id);
    igual(visiveis.length, 3);
    Dados.reordenarCompras("casa", visiveis.slice().reverse());                                          // inverte só os visíveis
    igual(Dados.comprasDaLista("casa").map((i) => i.nome), ["Cola", "Lâmpada", "Pilha", "Fita"]);         // a comprada segue na 2ª posição
    igual(Dados.limparCompras("casa"), 1);
    igual(Dados.comprasDaLista("shopping").map((i) => i.nome), ["Camisa branca"]);                       // outras listas intactas
  });

  await teste("vínculo do momento: opções por tipo, nome atual e viagem sem se ligar a si mesma", () => {
    Dados.adicionar("garagem", { marca: "BYD", modelo: "Song Plus", situacao: "atual" });
    const v1 = Dados.adicionar("momentos", { titulo: "Orlando", tipo: "viagem", data: "2022-07-01" });
    Dados.adicionar("momentos", { titulo: "Dia do carro", tipo: "carro", data: "2025-10-01" });
    Dados.adicionar("metas", { titulo: "Correr 10 km", status: "andamento", progresso: 0 });
    const carros = Dados.opcoesVinculo("carro"); igual(carros.map((c) => c[1]), ["BYD Song Plus"]);
    igual(Dados.opcoesVinculo("viagem").map((c) => c[1]), ["Orlando (2022)"]);
    igual(Dados.opcoesVinculo("meta").map((c) => c[1]), ["Correr 10 km"]);
    igual(Dados.opcoesVinculo("inventado"), []);
    igual(Dados.nomeDoVinculo("carro", carros[0][0]), "BYD Song Plus");
    igual(Dados.nomeDoVinculo("carro", "apagado", "Carro vendido"), "Carro vendido");
    igual(Object.keys(Dados.VINCULOS), ["carro", "viagem", "lugar", "destino", "pessoa", "meta", "sonho"]);
    afirmar(v1.id);
  });

  await teste("receitas: ingredientes vão ao mercado sem duplicar", () => {
    Dados.adicionar("supermercado", { nome: "Cebola", quantidade: "", secao: "outros", comprado: false, origem: "" });
    const r = Dados.adicionar("receitas", { nome: "Risoto", categoria: "prato", ingredientes: "- arroz arbóreo\n- cebola\n\n• queijo", favorita: true });
    igual(Dados.ingredientesDaReceita(r), ["arroz arbóreo", "cebola", "queijo"]);
    igual(Dados.enviarReceitaAoMercado(r.id), { novos: 2, repetidos: 1 });
    igual(Dados.enviarReceitaAoMercado(r.id), { novos: 0, repetidos: 3 });
    afirmar(Dados.itens("supermercado").some((i) => i.origem === "Risoto"));
    afirmar(Dados.enviarReceitaAoMercado(Dados.adicionar("receitas", { nome: "Ovo", ingredientes: "" }).id).erro);
  });

  await teste("filmes e bucket: filtros e realizado preenche a data", () => {
    Dados.adicionar("filmes", { titulo: "A", tipo: "filme", status: "quero", favorito: false });
    Dados.adicionar("filmes", { titulo: "B", tipo: "filme", status: "assistido", favorito: true, nota: 5 });
    igual(Dados.filmesOrdenados("quero").map((t) => t.titulo), ["A"]);
    igual(Dados.filmesOrdenados("favoritos").map((t) => t.titulo), ["B"]);
    const x = Dados.adicionar("bucket", { titulo: "Aurora", categoria: "viagem", prioridade: "alta", status: "desejado", prazo: "", realizado_em: "" });
    const y = Dados.alternarBucket(x.id);
    igual([y.status, y.realizado_em], ["realizado", Dados.hojeISO()]);
    igual(Dados.bucketOrdenado("abertos").length, 0);
    igual(Dados.alternarBucket(x.id).status, "desejado");
    afirmar(["receitas", "filmes", "bucket"].every((c) => Dados.COLECOES.includes(c)));
  });

  await teste("garagem: ordem, nome e tempo de posse", () => {
    Dados.adicionar("garagem", { marca: "Peugeot", modelo: "206", ano: "2004", situacao: "teve", data_compra: "2012-03-01", data_venda: "2014-03-01" });
    Dados.adicionar("garagem", { marca: "Audi", modelo: "A4", ano: "2023", situacao: "atual", data_compra: "2023-09-15" });
    Dados.adicionar("garagem", { marca: "Porsche", modelo: "911", situacao: "quero" });
    igual(Dados.carrosOrdenados("tudo").map((c) => c.situacao), ["atual", "teve", "quero"]);
    const c = Dados.carrosOrdenados("teve")[0];
    igual([Dados.nomeCarro(c), Dados.tempoDePosse(c)], ["Peugeot 206", "2 anos"]);
    igual(Dados.nomeCarro({ apelido: "Fusca do vô" }), "Fusca do vô");
    afirmar(Dados.COLECOES.includes("garagem"));
  });

  await teste("caminho da vida: marcos em S e o bonequinho anda por comprimento de arco", () => {
    const g = Dados.geoCaminho(7);
    igual(g.pts.length, 7);
    igual(g.pts[0][1], g.pts[2][1]);                 // 3 marcos por linha
    afirmar(g.pts[3][1] > g.pts[2][1], "a 4ª marca está na linha de baixo");
    afirmar(g.pts[3][0] > g.pts[4][0], "a linha de baixo anda ao contrário (S)");
    afirmar(g.dist.every((d, i) => i === 0 || d > g.dist[i - 1]), "distâncias crescem");
    const p0 = Dados.pontoNoCaminho(g, 0), pf = Dados.pontoNoCaminho(g, g.total + 50);
    igual([p0.x, p0.y], g.pts[0]); igual([pf.x, pf.y], g.pts[6]);
    const meio = Dados.pontoNoCaminho(g, (g.dist[0] + g.dist[1]) / 2);
    afirmar(meio.x > g.pts[0][0] && meio.x < g.pts[1][0] && meio.dx > 0);
    igual(Dados.geoCaminho(1).total, 0);
  });

  await teste("guarda-roupa: custo por uso", () => {
    igual(GuardaRoupa.custoPorUso(200, 4), 50); igual(GuardaRoupa.custoPorUso(90, 0), null); igual(GuardaRoupa.custoPorUso(null, 5), null);
    igual(GuardaRoupa.reais(1234.5), "R$ 1.234,50"); igual(GuardaRoupa.numeroBR("129,90"), 129.9);
    const m = GuardaRoupa.melhorCustoPorUso([{ nome: "A", preco: 100, usos: 2 }, { nome: "B", preco: 100, usos: 10 }, { nome: "C", preco: null, usos: 9 }]);
    igual(m.peca.nome, "B"); igual(m.custo, 10);
  });

  await teste("guarda-roupa: recorte de fundo liso (branco com retângulo vermelho)", () => {
    const w = 40, h = 40, px = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { const X = i % w, Y = (i - X) / w, dentro = X >= 10 && X < 30 && Y >= 10 && Y < 30; px.set(dentro ? [220, 20, 20, 255] : [255, 255, 255, 255], i * 4); }
    igual(Array.from(GuardaRoupa.medianaBorda(px, w, h)), [255, 255, 255]);
    const a = GuardaRoupa.recortarPixels(px, w, h, 38);
    igual(a[0], 0); igual(a[5 * w + 35], 0); igual(a[20 * w + 20], 255); igual(a[10 * w + 10], 255);
    afirmar(GuardaRoupa.recorteValido(GuardaRoupa.fracaoTransparente(a)), "400/1600 de peça é válido");
    const c = GuardaRoupa.caixaDoAlfa(a, w, h); igual([c.x, c.y, c.w, c.h], [10, 10, 20, 20]);
    const s = GuardaRoupa.suavizarAlfa(a, w, h); igual(s[0], 0); igual(s[20 * w + 20], 255); afirmar(s[10 * w + 9] > 0 && s[10 * w + 9] < 255, "borda suavizada");
    // peça igual ao fundo (imagem toda lisa) → quase tudo some → inválido
    const lisa = new Uint8ClampedArray(w * h * 4).fill(255);
    afirmar(!GuardaRoupa.recorteValido(GuardaRoupa.fracaoTransparente(GuardaRoupa.recortarPixels(lisa, w, h, 38))), "imagem lisa não é recorte válido");
  });

  await teste("guarda-roupa: coleções malas e provador sincronizam", () => { afirmar(Dados.COLECOES.includes("malas") && Dados.COLECOES.includes("provador")); });

  await teste("guarda-roupa: encaixe no provador", () => {
    const m = { centro_x: 500, ombros_y: 300, cintura_y: 600, largura_ombro_a_ombro: 200, largura_quadril: 220, pes_y: 1500 };
    const c = GuardaRoupa.encaixe(m, "camiseta", 100, 120);      // largura 290, altura 348
    igual(c.w, 290); igual(Math.round(c.h), 348); igual(c.x, 355); igual(Math.round(c.y), Math.round(300 - 0.06 * 348));
    const b = GuardaRoupa.encaixe(m, "baixo", 100, 200);          // largura 286, altura 572
    igual(b.w, 286); igual(b.h, 572); igual(b.x, 357); igual(Math.round(b.y * 10), Math.round((600 - 0.02 * 572) * 10));
    afirmar(GuardaRoupa.encaixe(m, "calcado", 100, 50) !== null, "calçado com pes_y encaixa");
    igual(GuardaRoupa.encaixe({ centro_x: 5, ombros_y: 1, cintura_y: 2, largura_ombro_a_ombro: 9, largura_quadril: 9 }, "calcado", 10, 10), null);
    igual(GuardaRoupa.encaixe(m, "acessorio", 10, 10), null); igual(GuardaRoupa.encaixe(null, "cima", 10, 10), null);
  });

  await teste("guarda-roupa: sugerir look por ocasião", () => {
    const R = (id, categoria, cor, extra) => Object.assign({ id, nome: id, categoria, cor, usos: 0, ultimo_uso: "" }, extra);
    const roupas = [
      R("c1", "camisa", "Branca", { ocasioes: ["trabalho"], usos: 9, ultimo_uso: "2026-10-17" }), R("c2", "camisa", "Azul", { ocasioes: ["trabalho"], usos: 1, ultimo_uso: "2026-10-06" }),
      R("c3", "camiseta", "Vermelha", { ocasioes: ["trabalho"], usos: 4, ultimo_uso: "2026-10-16" }),
      R("b1", "calca", "Jeans", { ocasioes: ["trabalho"] }), R("b2", "calca", "Verde", { ocasioes: ["trabalho"] }),
      R("p1", "camiseta", "Preta", {}), R("p2", "bermuda", "Bege", { ocasioes: ["praia"] }),
    ];
    const s = GuardaRoupa.sugerirLook(roupas, "trabalho", [], "2026-10-18");
    afirmar(["c1", "c2", "c3"].includes(s.cima.id) && ["b1", "b2"].includes(s.baixo.id), "só peças da ocasião");
    igual(s.cima.id, "c2"); igual(s.baixo.id, "b1");                // menos usada, parada há mais tempo; jeans é neutro
    afirmar(/não é usad|ainda não/.test(s.motivo), "motivo em português: " + s.motivo);
    // duas cores fortes diferentes juntas perdem para neutra + forte
    igual(GuardaRoupa.sugerirLook([R("x", "camiseta", "Vermelha", {}), R("y", "camiseta", "Preta", {}), R("z", "calca", "Verde", {})], "casual", [], "2026-10-18").cima.id, "y");
    // peça sem ocasião conta como casual; ocasião sem peças = null
    igual(GuardaRoupa.sugerirLook(roupas, "casual", [], "2026-10-18").cima.id, "p1"); igual(GuardaRoupa.sugerirLook(roupas, "festa", [], "2026-10-18"), null);
    // evita repetir o último look salvo; "outra sugestão" muda
    const s2 = GuardaRoupa.sugerirLook(roupas, "trabalho", [{ id: "L", criado_em: "2026-10-17", pecas: [s.cima.id, s.baixo.id] }], "2026-10-18");
    afirmar(!(s2.cima.id === s.cima.id && s2.baixo.id === s.baixo.id), "não repete o último look");
    const o1 = GuardaRoupa.sugerirLook(roupas, "trabalho", [], "2026-10-18", 1);
    afirmar(o1.cima.id !== s.cima.id || o1.baixo.id !== s.baixo.id, "outra sugestão difere");
    // mesma cor em cima e embaixo é evitada
    igual(GuardaRoupa.sugerirLook([R("a", "camiseta", "Azul", {}), R("b", "calca", "Azul", {}), R("c", "calca", "Preta", {})], "casual", [], "2026-10-18").baixo.id, "c");
  });

  await teste("guarda-roupa: sugerir mala por dias e clima", () => {
    const roupas = [];
    for (let i = 0; i < 10; i++) roupas.push({ id: "t" + i, categoria: "camiseta", usos: i }, { id: "k" + i, categoria: "calca", usos: i }, { id: "s" + i, categoria: "calcado", usos: i });
    roupas.push({ id: "b1", categoria: "bermuda", usos: 0 }, { id: "b2", categoria: "bermuda", usos: 1 }, { id: "j1", categoria: "casaco", usos: 0 }, { id: "j2", categoria: "moletom", usos: 0 }, { id: "j3", categoria: "casaco", usos: 3 }, { id: "ac", categoria: "acessorio", favorito: true }, { id: "ad", categoria: "acessorio", favorito: false });
    const cat = (r, c) => r.pecas.filter((id) => roupas.find((p) => p.id === id).categoria === c).length;
    const q = GuardaRoupa.sugerirMala(roupas, 5, "quente");           // 4 camisetas, 2 calças, 2 bermudas, 0 agasalho, 2 calçados, 1 acessório
    igual([cat(q, "camiseta"), cat(q, "calca"), cat(q, "bermuda"), cat(q, "casaco") + cat(q, "moletom"), cat(q, "calcado"), cat(q, "acessorio")], [4, 2, 2, 0, 2, 1]);
    afirmar(q.pecas.includes("t0") && !q.pecas.includes("t9"), "prefere as menos usadas");
    const f = GuardaRoupa.sugerirMala(roupas, 20, "frio");             // máx 8 camisetas, 7 calças, sem bermuda, 2 agasalhos
    igual([cat(f, "camiseta"), cat(f, "calca"), cat(f, "bermuda"), cat(f, "casaco") + cat(f, "moletom")], [8, 7, 0, 2]);
    const mi = GuardaRoupa.sugerirMala(roupas, 1, "misto");
    igual(cat(mi, "calca"), 1); igual(cat(mi, "casaco") + cat(mi, "moletom"), 1); igual(cat(GuardaRoupa.sugerirMala(roupas, 3, "ameno"), "bermuda"), 1);
  });

  await teste("ordem manual: arrastar regrava a ordem nas listas e o que está escondido não perde o lugar", () => {
    const t = ["A", "B", "C", "D"].map((n) => Dados.adicionar("tarefas", { titulo: n, prazo: "", prioridade: "media", recorrencia: "nenhuma", feita: false }));
    const nomes = () => Dados.comOrdem(Dados.tarefasOrdenadas("tudo")).map((x) => x.titulo);
    const antes = nomes();
    Dados.alternarTarefa(t[1].id);                                                          // B concluída: escondida no filtro "abertas"
    const visiveis = Dados.tarefasOrdenadas("abertas").map((x) => x.id);
    igual(visiveis.length, 3);
    afirmar(Dados.reordenarVisiveis("tarefas", visiveis.slice().reverse()) > 0);
    igual(Dados.comOrdem(Dados.tarefasOrdenadas("abertas")).map((x) => x.id), visiveis.slice().reverse());
    igual(Dados.reordenarVisiveis("tarefas", visiveis.slice().reverse()), 0);              // soltar no mesmo lugar não muda nada
    igual(antes.length, 4);
    // item novo (sem ordem) vai para depois dos que já têm posição
    const nova = Dados.adicionar("tarefas", { titulo: "Nova", prazo: "", prioridade: "media", recorrencia: "nenhuma", feita: false });
    igual(Dados.comOrdem(Dados.tarefasOrdenadas("abertas")).pop().id, nova.id);
    afirmar(Dados.COLECOES.includes("guia_compras") && Dados.COLECOES.includes("mercado_compras"));
  });

  await teste("supermercado: registrar compra guarda o valor, tira o carrinho e soma por mês", () => {
    const a = Dados.adicionar("supermercado", { nome: "Leite", quantidade: "", secao: "outros", comprado: false, origem: "" });
    Dados.adicionar("supermercado", { nome: "Café", quantidade: "", secao: "outros", comprado: false, origem: "" });
    Dados.alternarItemMercado(a.id);
    afirmar(Dados.registrarCompraMercado({ valor: "0" }).erro && Dados.registrarCompraMercado({ valor: "abc" }).erro);
    afirmar(Dados.registrarCompraMercado({ valor: "10", data: "31/02/2026" }).erro, "data inválida");
    igual(Dados.itens("mercado_compras").length, 0);
    const r = Dados.registrarCompraMercado({ valor: "1.152,90", local: "Atacadão", data: "05/10/2026" });
    igual([r.compra.valor, r.compra.data, r.compra.itens, r.compra.nomes], [1152.9, "2026-10-05", 1, "Leite"]);
    igual(Dados.itens("supermercado").map((i) => i.nome), ["Café"]);                          // só o carrinho saiu
    Dados.registrarCompraMercado({ valor: "50,5", data: "20/10/2026", tirar: false });
    Dados.registrarCompraMercado({ valor: "200", data: "15/09/2026" });
    const meses = Dados.gastoMercadoPorMes();
    igual(meses.map((m) => m.mes), ["2026-10", "2026-09"]);
    igual([meses[0].total, meses[0].compras, meses[0].media], [1203.4, 2, 601.7]);
    igual(Dados.gastoMercadoDoMes("2026-01").total, 0);
    igual(Dados.mesPorExtenso("2026-10"), "Outubro de 2026");
    igual(Dados.limiteMercado(), 0);                                                              // sem resumo do Dudoo: sem teto
    Dados.adicionar("financas_resumo", { dados: { meses: [], orcamentos: [{ categoria: "Gasolina", limite_mensal: 700 }, { categoria: "Mercado", limite_mensal: 1300 }] } });
    igual(Dados.limiteMercado(), 1300);
    igual([Dados.numeroBR("18.000"), Dados.numeroBR("7,5"), Dados.numeroBR(""), Number.isNaN(Dados.numeroBR("x"))], [18000, 7.5, null, true]);
  });

  await teste("guia de compras: filtros, busca e resumo", () => {
    Dados.adicionar("guia_compras", { tipo: "produto", titulo: "Airfryer", categoria: "casa", avaliacao: "vale", preco: 399.9, nota: "Faz tudo.\nFácil de lavar." });
    Dados.adicionar("guia_compras", { tipo: "produto", titulo: "Tênis barato", categoria: "calcado", avaliacao: "nao_vale", onde: "Shopping" });
    Dados.adicionar("guia_compras", { tipo: "medida", titulo: "Camisa social", categoria: "roupa", medidas: "M · pescoço 39" });
    igual(Dados.guiaOrdenado("tudo").map((i) => i.titulo), ["Camisa social", "Tênis barato", "Airfryer"]);       // categorias na ordem do guia
    igual(Dados.guiaOrdenado("vale").map((i) => i.titulo), ["Airfryer"]);
    igual(Dados.guiaOrdenado("nao_vale").map((i) => i.titulo), ["Tênis barato"]);
    igual(Dados.guiaOrdenado("medida").map((i) => i.titulo), ["Camisa social"]);
    igual(Dados.guiaOrdenado("tudo", "LAVAR").map((i) => i.titulo), ["Airfryer"]);
    igual(Dados.resumoGuia(), { total: 3, vale: 1, nao_vale: 1, medidas: 1 });
  });

  await teste("notas: ordem (fixadas primeiro), busca, título e etiquetas", () => {
    afirmar(Dados.COLECOES.includes("notas"));
    const a = Dados.adicionar("notas", { texto: "\n Banana\nfruta", tags: ["casa"], fixada: false, simplenote_key: "", simplenote_versao: 0, simplenote_mod: 0, base_sinc: "" });
    const b = Dados.adicionar("notas", { texto: "Laranja", tags: [], fixada: true, simplenote_key: "", simplenote_versao: 0, simplenote_mod: 0, base_sinc: "" });
    igual(Dados.notasOrdenadas().map((n) => n.id), [b.id, a.id]);
    igual(Dados.notasOrdenadas("fixadas").map((n) => n.id), [b.id]);
    igual(Dados.notasOrdenadas("tudo", "FRUTA").map((n) => n.id), [a.id]);
    igual(Dados.notasOrdenadas("tudo", "casa").map((n) => n.id), [a.id]);
    igual(Dados.tituloDaNota(a.texto), "Banana");
    igual(Dados.tituloDaNota(""), "Nota vazia");
    igual(Dados.etiquetasDeNota("casa, casa, dudoo-life,  ideias "), ["casa", "ideias"]);
    Dados.atualizar("notas", a.id, { texto: "Banana 2" });
    igual(Dados.itens("notas").find((n) => n.id === a.id).simplenote_key, "");           // os campos do Simplenote não se perdem ao editar
  });

  await teste("finanças: decisão (palpite × sua marca), assinaturas, economia e planejamento cortando", () => {
    afirmar(Dados.COLECOES.includes("financas_resumo") && Dados.COLECOES.includes("financas_marcas"));
    const meses = ["2026-10", "2026-11", "2026-12"].map((m, i) => ({ mes: m, entradas: 1000, saidas: 800 + i * 100, saldo: 200 - i * 100, parcelas: 0 }));
    const dados = { mes_atual: "2026-10", meses, recorrentes: [
      { base: "netflix", nome: "Netflix", grupo: "cartoes", origem: "Cartão", meses: 4, media: 50, minimo: 50, maximo: 50, futuros: 2, essencial_padrao: false, assinatura: true, presentes: ["2026-10", "2026-11"] },
      { base: "luz", nome: "Luz", grupo: "despesas", origem: "Luz", meses: 4, media: 200, minimo: 150, maximo: 250, futuros: 2, essencial_padrao: true, assinatura: false, presentes: ["2026-10", "2026-11", "2026-12"] },
      { base: "academia", nome: "Academia", grupo: "cartoes", origem: "Cartão", meses: 5, media: 120, minimo: 120, maximo: 120, futuros: 2, essencial_padrao: false, assinatura: true, presentes: ["2026-11", "2026-12"] }] };
    igual(Financas.recorrentes(dados, {}).map((r) => r.decisao), ["", "essencial", ""]);                      // luz é essencial por palpite
    igual(Financas.assinaturas(dados, {}).map((r) => r.base), ["netflix", "academia"]);
    igual(Financas.economia(dados, {}), { itens: [], por_mes: 0, por_ano: 0 });
    const mk = { netflix: "cortar", luz: "cortar" };                                                       // a sua decisão vale mais que o palpite
    igual(Financas.recorrentes(dados, mk).map((r) => r.decisao), ["cortar", "cortar", ""]);
    igual(Financas.assinaturas(dados, mk).map((r) => r.base), ["netflix", "academia"]);
    const eco = Financas.economia(dados, mk);
    igual([eco.por_mes, eco.por_ano], [250, 3000]);
    const plano = Financas.planejamento(dados, mk, 12);
    igual(plano.map((p) => [p.mes, p.economia_cortando, p.saldo_cortando]), [["2026-10", 250, 450], ["2026-11", 250, 350], ["2026-12", 200, 200]]);   // só soma onde o gasto aparece
    igual(Financas.planejamento(dados, {}, 2).length, 2);
  });

  await teste("delivery: favoritos primeiro, filtros, busca e resumo", () => {
    afirmar(Dados.COLECOES.includes("delivery"));
    const A = (o) => Dados.adicionar("delivery", Object.assign({ tipo: "pizza", canal: "app", telefone: "", pedir: "", nao_pedir: "", notas: "", ordem: 0, nota: null }, o));
    A({ nome: "Zermatt", situacao: "pedi", nota: 7, nao_pedir: "portuguesa (só cebola)" }); A({ nome: "Cheiro Verde", situacao: "favorito", nota: 10, pedir: "calabresa" });
    A({ nome: "Duos Pizza", situacao: "testar" }); A({ nome: "Di Roma", situacao: "evitar", nota: 0 });
    igual(Dados.deliveryOrdenado().map((d) => d.nome), ["Cheiro Verde", "Zermatt", "Duos Pizza", "Di Roma"]);
    igual(Dados.deliveryOrdenado("testar").map((d) => d.nome), ["Duos Pizza"]);
    igual(Dados.deliveryOrdenado("tudo", "CEBOLA").map((d) => d.nome), ["Zermatt"]);
    igual(Dados.resumoDelivery(), { total: 4, testar: 1, favorito: 1, pedi: 1, evitar: 1 });
  });

  await teste("escritório: só as tarefas com prazo de hoje até 3 dias, na ordem do prazo e do horário", () => {
    afirmar(Dados.COLECOES.includes("escritorio_tarefas"));
    const dia = (n) => { const d = new Date(Dados.hojeISO() + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    Dados.adicionar("escritorio_tarefas", { dados: { tarefas: [
      { titulo: "Longe", prazo: dia(10), horario: "", detalhe: "" }, { titulo: "Ontem", prazo: dia(-1), horario: "", detalhe: "" },
      { titulo: "Tarde", prazo: dia(2), horario: "15:00", detalhe: "015-26" }, { titulo: "Cedo", prazo: dia(2), horario: "09:00", detalhe: "" },
      { titulo: "Hoje", prazo: dia(0), horario: "", detalhe: "" }, { titulo: "Limite", prazo: dia(3), horario: "", detalhe: "" }] }, assinatura: "x", gerado_em: "" });
    igual(Dados.escritorioProximas(3).map((t) => t.titulo), ["Hoje", "Cedo", "Tarde", "Limite"]);
    igual(Dados.escritorioProximas(0).map((t) => t.titulo), ["Hoje"]);
    igual([0, 1, 5].map((n) => Dados.fraseDoPrazo(n)), ["hoje", "amanhã", "em 5 dias"]);
  });

  await teste("supermercado: casa e escritório separados, voltam da lista padrão e a compra pode ser só de uma lista", () => {
    afirmar(Dados.moverItemMercado("x", "lua") === null);
    const A = (nome, destino) => Dados.adicionar("supermercado", { nome, quantidade: "", secao: "outros", comprado: false, origem: "", destino });
    const leite = A("Leite", "casa"), papel = A("Papel A4", "escritorio"), cafe = A("Café", "casa"), antigo = Dados.adicionar("supermercado", { nome: "Sem destino", comprado: false });
    Dados.registrarHabitual("Papel A4", "escritorio");
    igual(Dados.mercadoPorDestino(false).map(([d, itens]) => [d, itens.map((i) => i.nome)]), [["casa", ["Café", "Leite", "Sem destino"]], ["escritorio", ["Papel A4"]]]);   // item antigo (sem destino) é de casa
    Dados.alternarItemMercado(cafe.id);
    igual(Dados.mercadoPorDestino(false)[0][1].map((i) => i.nome), ["Leite", "Sem destino", "Café"]);                           // comprado vai por último
    igual(Dados.mercadoPorDestino(true)[0][1].map((i) => i.nome), ["Leite", "Sem destino"]);
    Dados.moverItemMercado(leite.id, "escritorio");
    igual(Dados.mercadoPorDestino(true).map((g) => g[0]), ["casa", "escritorio"]);
    Dados.remover("supermercado", papel.id); Dados.alternarItemMercado(leite.id);                                              // comprados: Café (casa) e Leite (escritório)
    const so = Dados.registrarCompraMercado({ valor: "50", destino: "escritorio" });
    igual([so.compra.destino, so.compra.itens, so.compra.nomes], ["escritorio", 1, "Leite"]);
    igual(Dados.itens("supermercado").filter((i) => i.comprado).map((i) => i.nome), ["Café"]);                                 // o comprado de casa ficou
    Dados.remover("mercado_habituais", Dados.itens("mercado_habituais").find((h) => h.nome === "Papel A4").id);
    Dados.registrarHabitual("Papel A4", "escritorio");
    const h = Dados.habituais().find((x) => x.nome === "Papel A4");
    igual(Dados.adicionarHabituais([h.id]), 1);
    igual(Dados.itens("supermercado").find((i) => i.nome === "Papel A4" && !i.excluido_em).destino, "escritorio");              // volta para o escritório
  });

  await teste("lugares: status 'Quero repetir' existe e conta como já visitado no mapa", () => {
    igual(Dados.STATUS.quero_repetir, "Quero repetir");
    const r = DudooMapa.resumo([{ nome: "A", cidade: "Cidade R", pais: "Brasil", status: "quero_repetir" }, { nome: "B", cidade: "Cidade R", pais: "Brasil", status: "quero_conhecer" }], []);
    igual(r.visitados, 1); igual(r.desejos, 1);
  });

  await teste("presentes: gerais primeiro, pessoas por nome, ideia antes de já dei; pessoa excluída vira geral", () => {
    afirmar(Dados.COLECOES.includes("presentes"));
    const ana = Dados.adicionar("pessoas", { nome: "Ana" }), bia = Dados.adicionar("pessoas", { nome: "Bia" });
    const G = (o) => Dados.adicionar("presentes", Object.assign({ pessoa_id: "", situacao: "ideia", preco: null, onde: "", ocasiao: "", notas: "" }, o));
    G({ ideia: "Perfume", pessoa_id: bia.id }); G({ ideia: "Kit de vinho" }); G({ ideia: "Bolsa", pessoa_id: ana.id, situacao: "dado" }); G({ ideia: "Echarpe", pessoa_id: ana.id });
    const ver = (f, b) => Dados.presentesAgrupados(f, b).map(([p, l]) => [p ? p.nome : null, l.map((g) => g.ideia)]);
    igual(ver(), [[null, ["Kit de vinho"]], ["Ana", ["Echarpe", "Bolsa"]], ["Bia", ["Perfume"]]]);
    igual(ver("dado"), [["Ana", ["Bolsa"]]]);
    igual(ver("tudo", "BIA"), [["Bia", ["Perfume"]]]);
    igual(Dados.resumoPresentes(), { total: 4, gerais: 1, ideia: 3, comprado: 0, dado: 1 });
    Dados.remover("pessoas", bia.id);
    igual(ver().map((g) => g[0]), [null, "Ana"]);
  });

  await teste("cidades avulsas: entram na lista, não duplicam e deixam de ser vazias quando ganham um lugar", () => {
    afirmar(Dados.COLECOES.includes("cidades_lugares"));
    igual(Dados.adicionarCidade("  gramado ", "Brasil"), "");
    igual(Dados.cidades(), ["gramado"]);
    igual(Dados.paisDaCidade("Gramado"), "Brasil");
    afirmar(Dados.adicionarCidade("GRAMADO").includes("já está"));
    afirmar(Dados.adicionarCidade("  ") !== "");
    igual(Dados.cidadesSemLugar().length, 1);
    Dados.adicionar("lugares", { nome: "Café Colonial", categoria: "cafe", cidade: Dados.cidadeCanonica("gramado"), pais: "", status: "quero_conhecer" });
    igual(Dados.cidadesSemLugar().length, 0);
    igual(Dados.cidades(), ["gramado"]);
    afirmar(Dados.adicionarCidade("Gramado").includes("já está"));
  });

  await teste("país das cidades: lista as que faltam e define só os lugares sem país", () => {
    Dados.adicionar("lugares", { nome: "A", categoria: "outro", cidade: "Urubici", pais: "", status: "quero_conhecer" });
    Dados.adicionar("lugares", { nome: "B", categoria: "outro", cidade: "urubici", pais: "", status: "quero_conhecer" });
    Dados.adicionar("lugares", { nome: "C", categoria: "outro", cidade: "Lisboa", pais: "Portugal", status: "visitado" });
    igual(Dados.cidadesSemPais(), ["Urubici"]);
    igual(Dados.definirPaisDaCidade("URUBICI", " Brasil "), 2);
    igual(Dados.cidadesSemPais(), []);
    igual(Dados.definirPaisDaCidade("Lisboa", "Espanha"), 0);
  });

  await teste("cidade avulsa com coordenadas vira ponto no mapa; com lugar, deixa de ser ponto", () => {
    Dados.adicionarCidade("Bento", "Brasil");
    const c = Dados.cidadesSemLugar()[0];
    Dados.atualizar("cidades_lugares", c.id, { lat: -29.17, lon: -51.5 });
    const pts = DudooMapa.pontosDe([], {}, [], Dados.cidadesSemLugar());
    igual(pts.map((p) => [p.nome, p.lat, p.aprox]), [["Bento", -29.17, false]]);
    Dados.adicionar("lugares", { nome: "Vinícola", categoria: "outro", cidade: "Bento", pais: "", status: "quero_conhecer" });
    igual(DudooMapa.pontosDe([], {}, [], Dados.cidadesSemLugar()).length, 0);
  });

  limpar();
  const ok = resultados.filter((r) => r.ok).length;
  window.__resultado = { total: resultados.length, ok, falhas: resultados.filter((r) => !r.ok) };
  document.getElementById("saida").innerHTML = resultados.map((r) => `<div class="${r.ok ? "ok" : "f"}">${r.ok ? "✓" : "✗"} ${r.nome}${r.ok ? "" : "<pre>" + r.erro + "</pre>"}</div>`).join("") +
    `<h2>${ok}/${resultados.length} passaram</h2>`;
})();
