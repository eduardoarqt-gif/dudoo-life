// Assistente no PWA: laço de ferramentas (Responses API) através do proxy seguro.
// A chave da OpenAI NUNCA fica no navegador: o proxy a guarda e só repassa a chamada.
(function () {
  const MAX_VOLTAS = 5;
  const INSTRUCOES =
    "Você é o assistente do Dudoo Life, o app pessoal do Eduardo. Fale em português do Brasil, de forma descontraída, direta e curta. " +
    "Responda usando as ferramentas para consultar os registros dele — nunca invente fatos pessoais. Se não achar nada, diga que não encontrou. " +
    "Para registrar algo novo, use a ferramenta correspondente; o app pede a confirmação do usuário antes de gravar. " +
    "Você não tem acesso a dados bancários, documentos nem a contatinhos, e não deve pedir esses dados. " +
    "Quando uma memória abaixo estiver marcada como inferida, trate como hipótese, não como fato.";

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
        if (r.status === 401 || r.status === 403) throw new Error("O token do assistente foi recusado. Confira em Mais → Dados (é o mesmo token do Dudoo Web).");
        if (!r.ok) {
          let j = {}; try { j = await r.json(); } catch (e) {}
          if (r.status === 429 || j.status_openai === 429) throw new Error("Limite de uso da OpenAI atingido (ou sem crédito). Tente de novo em instantes.");
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
    falar(texto) {
      if (!("speechSynthesis" in window) || !texto) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto); u.lang = "pt-BR"; u.rate = 1.02;
      window.speechSynthesis.speak(u);
    },
    parar() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); },
  };

  window.AssistenteDudoo = { criar, Voz, INSTRUCOES };
})();
