// Assistente no PWA: laço de ferramentas (Responses API) através do proxy seguro.
// A chave da IA (Claude, da Anthropic, desde 20/11/2026) NUNCA fica no navegador: o proxy do Wix a guarda e só repassa a chamada.
(function () {
  const MAX_VOLTAS = 5;
  const INSTRUCOES =
    "Você é o assistente do Dudoo Life, o app pessoal do Eduardo. Fale em português do Brasil, de forma descontraída, direta e curta. " +
    "Responda usando as ferramentas para consultar os registros dele — nunca invente fatos pessoais. Se não achar nada, diga que não encontrou. " +
    "Para registrar algo novo, use a ferramenta correspondente; o app pede a confirmação do usuário antes de gravar. " +
    "Você não tem acesso a dados bancários, documentos nem a contatinhos, e não deve pedir esses dados. " +
    "Quando uma memória abaixo estiver marcada como inferida, trate como hipótese, não como fato." +
    " Escreva em texto simples, sem markdown (nada de **, # ou tabelas); para listas use uma linha por item começando com hífen. Use emojis com muita moderação.";

  function textoDaSaida(saida) {
    const partes = [];
    (saida || []).forEach((i) => { if (i.type === "message") (i.content || []).forEach((b) => { if ((b.type === "output_text" || b.type === "text") && b.text) partes.push(b.text); }); });
    return partes.join("\n").trim();
  }

  // `chamar(corpo) -> Promise<resposta da OpenAI>` é injetável (nos testes entra um falso).
  function chamarProxy(corpo) {
    const cfg = window.DUDOO_CONFIG || {};
    if (!cfg.proxyIA) return Promise.reject(new Error("O servidor do assistente ainda não foi configurado."));
    const token = localStorage.getItem("dudoolife.tokenIA") || "";
    return fetch(cfg.proxyIA, { method: "POST", headers: { "Content-Type": "application/json", "X-Dudoo-Token": token }, body: JSON.stringify(corpo) })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) throw new Error(token
          ? "O token do assistente foi recusado. Confira em Mais → Dados → Assistente (tem que ser igual ao token do Dudoo Web)."
          : "Falta o token do assistente. Cole em Mais → Dados → Assistente (uma vez só; é o mesmo token do Dudoo Web).");
        if (!r.ok) {
          let j = {}; try { j = await r.json(); } catch (e) {}
          if (r.status === 429 || j.status_openai === 429) throw new Error("Limite de uso da IA atingido (ou sem crédito). Tente de novo em instantes.");
          throw new Error(j.erro || ("O assistente respondeu com erro " + r.status + "."));
        }
        return r.json();
      }, () => { throw new Error("Sem conexão com o assistente."); });
  }

  function criar(chamar = chamarProxy) {
    const historico = [];
    return {
      historico,
      limpar() { historico.length = 0; },
      async enviar(texto) {
        let entrada = historico.concat([{ role: "user", content: texto }]);
        const ferramentas = Ferramentas.especificacoes();
        const contexto = Dados.contextoMemoria(texto);
        const instrucoes = INSTRUCOES + (contexto ? "\n\nO que já foi guardado sobre o Eduardo (relevante para esta pergunta):\n" + contexto : "");
        const pendencias = [], usadas = [];
        let final = "";
        for (let v = 0; v < MAX_VOLTAS; v++) {
          const bruto = await chamar({ entrada, ferramentas, instrucoes });
          const saida = bruto.output || [];
          try {   // gasto: só tokens e nomes de ferramentas, nunca o conteúdo da conversa
            Dados.registrarUsoIA("assistente", bruto.model || "", bruto.usage, saida.filter((i) => i.type === "function_call").map((i) => i.name));
          } catch (e) {}
          entrada = entrada.concat(saida);
          const chamadas = saida.filter((i) => i.type === "function_call");
          if (!chamadas.length) { final = textoDaSaida(saida); break; }
          for (const c of chamadas) {
            let args = {}; try { args = JSON.parse(c.arguments || "{}"); } catch (e) {}
            let res = Ferramentas.executar(c.name, args);
            usadas.push(c.name);
            if (res.status === "requer_confirmacao") { pendencias.push({ acao: c.name, argumentos: args, resumo: res.resumo }); res = { status: "aguardando_confirmacao_do_usuario" }; }
            entrada.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(res) });
          }
          if (v === MAX_VOLTAS - 1) final = "Não consegui concluir isso agora. Pode reformular?";
        }
        if (!final && pendencias.length) final = "Posso fazer isso — é só confirmar.";
        historico.push({ role: "user", content: texto }, { role: "assistant", content: final });
        return { texto: final, pendencias, ferramentas_usadas: usadas };
      },
      confirmar(p) {
        const r = Ferramentas.executar(p.acao, p.argumentos, true);
        historico.push({ role: "user", content: `[Confirmei no app e foi executado: ${p.resumo}]` });
        return r;
      },
    };
  }

  // --- texto da resposta (21/11/2026): o Claude às vezes manda markdown (**negrito**, # título) e emojis. Na tela some a marcação; na fala
  // também somem os emojis e os hífens de lista (senão o iPhone lê "asterisco asterisco"). Mesmas regras de app/ia/texto.py.
  const EMOJIS = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;
  const Texto = {
    exibir(t) {
      return String(t == null ? "" : t).replace(/\r/g, "").replace(/\*\*(.+?)\*\*/gs, "$1").replace(/__(.+?)__/gs, "$1").replace(/`+/g, "")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/^(\s*)\*\s+/gm, "$1- ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    },
    falar(t) {
      return this.exibir(t).replace(EMOJIS, "").replace(/^\s*[-•]\s+/gm, "").replace(/\s*\n+\s*/g, ". ").replace(/\.\s*\./g, ".").replace(/:\./g, ":").replace(/[ \t]{2,}/g, " ").trim();
    },
    partes(t) { return String(t).match(/[^.!?]+[.!?]*\s*/g) || [String(t)]; },
  };

  // --- voz (Web Speech API; funciona no Safari do iPhone)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const Voz = {
    ditadoDisponivel: !!SR,
    falaDisponivel: "speechSynthesis" in window,
    ditar(aoTexto, aoFim, aoErro) {
      if (!SR) { if (aoErro) aoErro(new Error("Este navegador não tem ditado por voz.")); return null; }
      const r = new SR(); r.lang = "pt-BR"; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => aoTexto(e.results[0][0].transcript);
      r.onerror = (e) => { if (aoErro) aoErro(new Error(e.error === "not-allowed" ? "Permita o microfone nos ajustes do Safari." : "Não consegui ouvir.")); };
      r.onend = () => { if (aoFim) aoFim(); };
      r.start(); return r;
    },
    // o iOS só deixa falar depois que um toque "liberou" a voz: chamado em todo toque do assistente (enviar, microfone, caixa de leitura)
    liberar() {
      try { if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } } catch (e) {}
    },
    falar(texto) {
      const limpo = Texto.falar(texto);
      if (!("speechSynthesis" in window) || !limpo) return;
      const ss = window.speechSynthesis, vozes = ss.getVoices();
      const voz = vozes.find((v) => /^pt[-_]BR$/i.test(v.lang)) || vozes.find((v) => /^pt/i.test(v.lang));
      ss.cancel();
      Texto.partes(limpo).forEach((p) => {                  // frases curtas: o Safari corta falas longas no meio
        const u = new SpeechSynthesisUtterance(p); u.lang = "pt-BR"; u.rate = 1.02; if (voz) u.voice = voz; ss.speak(u);
      });
    },
    parar() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); },
  };

  window.AssistenteDudoo = { criar, Voz, Texto, INSTRUCOES };
})();
