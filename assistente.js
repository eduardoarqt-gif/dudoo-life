// Assistente no PWA: laço de ferramentas (Responses API) através do proxy seguro.
// A chave da IA (Claude, da Anthropic, desde 20/11/2026) NUNCA fica no navegador: o proxy do Wix a guarda e só repassa a chamada.
(function () {
  const MAX_VOLTAS = 5;
  const INSTRUCOES =
    "Você é o assistente do Dudoo Life, o app pessoal do Eduardo. Fale em português do Brasil, de forma descontraída, direta e curta. " +
    "Responda usando as ferramentas para consultar os registros dele — nunca invente fatos pessoais. Se não achar nada, diga que não encontrou. " +
    "Você também consulta, anota e marca itens nas listas dele (supermercado, tarefas, compras, presentes, filmes, bucket list, metas, delivery e guia de compras). " +
    "Para registrar algo novo, use a ferramenta correspondente. Anotar em lista grava na hora (não pergunte se pode; diga o que anotou); nos outros registros o app pede a confirmação do usuário antes de gravar. " +
    "Você não tem acesso a dados bancários, documentos nem a contatinhos, e não deve pedir esses dados. " +
    "Quando uma memória abaixo estiver marcada como inferida, trate como hipótese, não como fato." +
    " Escreva em texto simples, sem markdown (nada de **, # ou tabelas); para listas use uma linha por item começando com hífen. Use emojis com muita moderação.";

  // a IA precisa saber a data pra entender "amanhã", "sexta"… (mesmo texto do computador)
  function hojeExtenso(d = new Date()) {
    const dias = ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"], meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const p = (n) => String(n).padStart(2, "0");
    return `${dias[(d.getDay() + 6) % 7]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()} (${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()})`;
  }

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
    return fetch(cfg.proxyIA, { method: "POST", headers: { "Content-Type": "application/json", "X-Dudoo-Token": token }, body: JSON.stringify(Object.assign({ origem: "iphone", versao: cfg.versao || "" }, corpo)) })      // origem/versão vão para a medição do servidor
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

  // Uso do mês MEDIDO NO SERVIDOR (Wix; todos os aparelhos). Devolve o JSON do servidor ou lança Error com mensagem clara.
  function usoDoServidor() {
    const cfg = window.DUDOO_CONFIG || {}, token = localStorage.getItem("dudoolife.tokenIA") || "";
    if (!cfg.proxyIA) return Promise.reject(new Error("Servidor não configurado."));
    if (!token) return Promise.reject(new Error("Falta o token do assistente."));
    return fetch(cfg.proxyIA.replace("dudoo_life_ia", "dudoo_life_uso"), { headers: { "X-Dudoo-Token": token } }).then(async (r) => {
      if (r.status === 401 || r.status === 403) throw new Error("O token do assistente foi recusado.");
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.erro || ("O servidor respondeu com erro " + r.status + "."));
      return j;
    }, () => { throw new Error("Sem conexão com o servidor."); });
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
        const instrucoes = INSTRUCOES + `\n\nHoje é ${hojeExtenso()}.` + (contexto ? "\n\nO que já foi guardado sobre o Eduardo (relevante para esta pergunta):\n" + contexto : "");
        const pendencias = [], usadas = [], gravados = [];          // gravados: o que já entrou direto (nunca some, mesmo se a IA falhar depois)
        let final = "";
        for (let v = 0; v < MAX_VOLTAS; v++) {
          let bruto;
          try { bruto = await chamar({ entrada, ferramentas, instrucoes }); }
          catch (e) { if (!gravados.length) throw e; final = gravados.join(" "); break; }
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
            else if (Ferramentas.gravaDireto(c.name) && res.mensagem) gravados.push(res.mensagem);
            entrada.push({ type: "function_call_output", call_id: c.call_id, output: JSON.stringify(res) });
          }
          if (v === MAX_VOLTAS - 1) final = gravados.join(" ") || "Não consegui concluir isso agora. Pode reformular?";
        }
        if (!final && gravados.length) final = gravados.join(" ");
        if (!final && pendencias.length) final = "Posso fazer isso — é só confirmar.";
        historico.push({ role: "user", content: texto }, { role: "assistant", content: final });
        return { texto: final, pendencias, ferramentas_usadas: usadas, gravou: gravados.length > 0 };
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
  try { if ("speechSynthesis" in window) window.speechSynthesis.getVoices(); } catch (e) {}         // o iPhone só carrega a lista depois do 1º pedido
  // um som curto em WAV (hz = 0: silêncio). Um <audio> tocando põe o iPhone em modo "mídia", em que o som sai mesmo no silencioso.
  function wav(hz, segundos) {
    const taxa = 8000, n = Math.round(taxa * segundos), b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const letras = (p, s) => { for (let i = 0; i < s.length; i++) b[p + i] = s.charCodeAt(i); };
    letras(0, "RIFF"); v.setUint32(4, 36 + n, true); letras(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, taxa, true); v.setUint32(28, taxa, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); letras(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b[44 + i] = 128 + (hz ? Math.round(70 * Math.sin((2 * Math.PI * hz * i) / taxa)) : 0);
    let s = ""; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return "data:audio/wav;base64," + btoa(s);
  }
  const Voz = {
    ditadoDisponivel: !!SR,
    falaDisponivel: "speechSynthesis" in window,
    ditar(aoTexto, aoFim, aoErro) {
      if (!SR) { if (aoErro) aoErro(new Error("Este navegador não tem ditado por voz.")); return null; }
      const r = new SR(); r.lang = "pt-BR"; r.interimResults = false; r.maxAlternatives = 1;
      let entregou = false;
      // 26/11/2026: o iPhone continua com o microfone aberto depois do resultado, e com ele aberto a voz não sai. Fecha na hora.
      r.onresult = (e) => { if (entregou) return; entregou = true; const t = e.results[0][0].transcript; this.soltarMicrofone(); aoTexto(t); };
      r.onerror = (e) => { if (entregou || e.error === "aborted") return; if (aoErro) aoErro(new Error(e.error === "not-allowed" ? "Permita o microfone nos ajustes do Safari." : "Não consegui ouvir.")); };
      r.onend = () => { if (this._ouvindo === r) this._ouvindo = null; if (aoFim) aoFim(); };
      this.calar(); this._sessaoDeAudio("auto");
      this._ouvindo = r; r.start(); return r;
    },
    soltarMicrofone() { const r = this._ouvindo; this._ouvindo = null; if (r) { try { r.abort(); } catch (e) {} } },
    // Safari 16.4+: diz ao iPhone se o app vai tocar som (alto-falante) ou usar o microfone
    _sessaoDeAudio(tipo) { try { if (navigator.audioSession) navigator.audioSession.type = tipo; } catch (e) {} },
    // a voz em português mais natural que o aparelho tiver: Premium, depois Aprimorada (baixadas nos Ajustes do iPhone), depois a Luciana;
    // as vozes "de personagem" (Eddy, Flo…) são robóticas e às vezes nem tocam
    escolherVoz(vozes) {
      const nota = (v) => { const t = `${v.name} ${v.voiceURI || ""}`;
        if (/eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley/i.test(t)) return 0;
        return 1 + (/premium/i.test(t) ? 40 : /enhanced|aprimorad|natural|neural/i.test(t) ? 20 : 0) + (/luciana/i.test(t) ? 5 : 0); };
      const pt = (vozes || []).filter((v) => /^pt[-_]BR$/i.test(v.lang) && nota(v) > 0);
      return pt.sort((a, b) => nota(b) - nota(a))[0] || null;
    },
    // o iOS só deixa falar depois que um toque "liberou" a voz: chamado em todo toque do assistente (enviar, microfone, caixa de leitura)
    wav,
    _midia(hz) {
      try {
        const a = this._audio || (this._audio = new Audio()); a.setAttribute("playsinline", ""); a.src = wav(hz || 0, hz ? 0.35 : 0.2);
        return Promise.resolve(a.play());
      } catch (e) { return Promise.reject(e); }
    },
    bip() { return this._midia(880); },
    // `paraOuvir`: o toque foi no microfone — não toca nada agora (atrapalharia o ditado), só prepara o <audio>
    liberar(paraOuvir) {
      try {
        if (paraOuvir) { const a = this._audio || (this._audio = new Audio()); a.src = wav(0, 0.2); a.load(); }
        else this._midia(0).catch(() => {});
        const ss = window.speechSynthesis; if (!ss || this._falas || ss.speaking || ss.pending) return;
        this._sessaoDeAudio("playback");
        const u = new SpeechSynthesisUtterance("."); u.lang = "pt-BR"; u.volume = 0; this._destrava = u; ss.speak(u);     // só espaço em branco não conta
      } catch (e) {}
    },
    // interrompe só uma leitura em andamento: cancelar à toa mataria a liberação feita no mesmo toque (era o que o microfone fazia)
    calar() { if (this._falas) this.parar(); },
    // `aoFalhar(motivo)`: chamado se o iPhone não começar a tocar (pra avisar na tela em vez de ficar mudo); `aoComecar(nomeDaVoz)`
    falar(texto, aoFalhar, aoComecar) {
      const limpo = Texto.falar(texto);
      if (!("speechSynthesis" in window) || !limpo) return;
      const ss = window.speechSynthesis, tinhaMicrofone = !!this._ouvindo;
      this.soltarMicrofone(); this._sessaoDeAudio("playback"); this._midia(0).catch(() => {});
      let espera = tinhaMicrofone ? 350 : 0;               // dá tempo do iPhone largar o microfone
      if (ss.speaking || ss.pending) { ss.cancel(); espera = Math.max(espera, 120); }      // cancelar e falar no mesmo instante: o Safari engole
      const vez = (this._vez = (this._vez || 0) + 1);
      let comecou = false, motivo = "";
      const dizer = () => {
        if (vez !== this._vez) return;
        const voz = this.escolherVoz(ss.getVoices());
        this._falas = Texto.partes(limpo).map((p) => {      // frases curtas (o Safari corta falas longas); guardadas para não serem descartadas no meio
          const u = new SpeechSynthesisUtterance(p); u.lang = "pt-BR"; u.rate = 1.02; if (voz) u.voice = voz;
          u.onstart = () => { if (!comecou && aoComecar) aoComecar(voz ? voz.name : ""); comecou = true; };
          u.onerror = (e) => { motivo = (e && e.error) || "erro"; }; return u;
        });
        const ultima = this._falas[this._falas.length - 1], acabou = () => { if (vez === this._vez) this._falas = null; };
        if (ultima) { ultima.onend = acabou; const erro = ultima.onerror; ultima.onerror = (e) => { erro(e); acabou(); }; }
        ss.resume(); this._falas.forEach((u) => ss.speak(u));
        if (aoFalhar) setTimeout(() => { if (!comecou && vez === this._vez && !/interrupted|canceled/.test(motivo)) aoFalhar(motivo || "sem resposta"); }, 3000);
      };
      if (espera) setTimeout(dizer, espera); else dizer();
    },
    parar() { this._vez = (this._vez || 0) + 1; this._falas = null; if ("speechSynthesis" in window) window.speechSynthesis.cancel(); },
  };

  window.AssistenteDudoo = { criar, Voz, Texto, INSTRUCOES, usoDoServidor };
})();
