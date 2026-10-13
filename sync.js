// Sincronização com um "driver" de armazenamento remoto (OneDrive/Graph em produção; falso nos testes).
// driver: { disponivel(), baixar(nome) -> {doc, etag}, enviar(nome, doc, etag) -> novoEtag  (lança {conflito:true} em 412) }
(function () {
  function criar(driver, aoEstado) {
    const etags = {};
    const estado = (t, ok) => { if (aoEstado) aoEstado(t, ok); };

    async function sincronizarColecao(c) {
      const { doc, etag } = await driver.baixar(c);
      etags[c] = etag;
      const antes = JSON.stringify(doc.itens || []);
      const mesclado = Dados.mesclar(c, doc);
      // só envia quando o resultado difere do que já está no remoto
      if (JSON.stringify(mesclado.itens) !== antes) {
        try {
          etags[c] = await driver.enviar(c, mesclado, etags[c]);
        } catch (e) {
          if (!e.conflito) throw e;
          // alguém gravou no meio: baixa de novo, mescla e tenta uma vez mais
          const r = await driver.baixar(c);
          const m2 = Dados.mesclar(c, r.doc);
          etags[c] = await driver.enviar(c, m2, r.etag);
        }
      }
    }

    return {
      etags,
      async tudo() {
        if (!driver.disponivel()) return false;
        estado("Sincronizando…");
        try {
          for (const c of Dados.COLECOES) await sincronizarColecao(c);
          estado("OneDrive ✓", true);
          return true;
        } catch (e) { estado("Sem conexão", false); return false; }
      },
      async colecao(c) {
        if (!driver.disponivel()) return false;
        try { await sincronizarColecao(c); estado("OneDrive ✓", true); return true; }
        catch (e) { estado("Falha ao enviar", false); return false; }
      },
    };
  }
  window.SyncDudoo = { criar };
})();
