// Armazenamento remoto pelo GitHub (mesmo esquema do Planejador de Viagens):
// cada coleção é um arquivo `dados/<nome>.json` num repositório PRIVADO, lido e gravado pela API de
// conteúdo, com um token restrito a esse repositório guardado só neste aparelho.
// O "sha" do arquivo faz o papel de ETag: gravar com sha antigo dá 409/422 → o Sync mescla e tenta de novo.
(function () {
  const CFG = window.DUDOO_CONFIG || {};
  const CHAVE_TOKEN = "dudoolife.githubToken";

  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(String(b64).replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  const b64encode = (txt) => { let bin = ""; new TextEncoder().encode(txt).forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };

  const Nuvem = {
    token() { try { return localStorage.getItem(CHAVE_TOKEN) || ""; } catch (e) { return ""; } },
    definirToken(t) { localStorage.setItem(CHAVE_TOKEN, String(t || "").trim()); },
    repo() { return CFG.repo || "eduardoarqt-gif/dudoolife-dados"; },
    pasta() { return CFG.pastaRepo || "dados"; },
    // `fetchFn` é injetável (testes)
    fetchFn: (...a) => fetch(...a),

    disponivel() { return !!this.token(); },
    _url(nome) { return `https://api.github.com/repos/${this.repo()}/contents/${this.pasta()}/${nome}.json`; },
    _cab(extra) { return Object.assign({ Authorization: `Bearer ${this.token()}`, Accept: "application/vnd.github+json" }, extra || {}); },

    async baixar(nome) {
      const r = await this.fetchFn(`${this._url(nome)}?t=${Date.now()}`, { cache: "no-store", headers: this._cab() });
      if (r.status === 404) return { doc: { versao: 1, itens: [] }, etag: null };
      if (r.status === 401 || r.status === 403) throw new Error("O token do GitHub foi recusado. Confira em Mais → Dados.");
      if (!r.ok) throw new Error("GitHub respondeu " + r.status);
      const j = await r.json();
      let doc = { versao: 1, itens: [] };
      try { doc = JSON.parse(b64decode(j.content)); } catch (e) { /* arquivo vazio */ }
      if (!doc || !Array.isArray(doc.itens)) doc = { versao: 1, itens: [] };
      return { doc, etag: j.sha };
    },

    async enviar(nome, doc, sha) {
      const corpo = { message: `sync ${nome}`, content: b64encode(JSON.stringify({ versao: 1, itens: doc.itens }, null, 2)) };
      if (sha) corpo.sha = sha;
      const r = await this.fetchFn(this._url(nome), { method: "PUT", headers: this._cab({ "Content-Type": "application/json" }), body: JSON.stringify(corpo) });
      if (r.status === 409 || r.status === 422) { const e = new Error("conflito"); e.conflito = true; throw e; }
      if (r.status === 401 || r.status === 403) throw new Error("O token do GitHub foi recusado (ou sem permissão de escrita).");
      if (!r.ok) throw new Error("GitHub respondeu " + r.status);
      return (await r.json()).content.sha;
    },
  };
  window.Nuvem = Nuvem;
})();
