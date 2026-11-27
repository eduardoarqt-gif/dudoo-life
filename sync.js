// Sincronização com um "driver" de armazenamento remoto (OneDrive/Graph em produção; falso nos testes).
// driver: { disponivel(), baixar(nome) -> {doc, etag}, enviar(nome, doc, etag) -> novoEtag  (lança {conflito:true} em 412) }
(function () {
  function criar(driver, aoEstado) {
    const etags = {};
    const estado = (t, ok) => { if (aoEstado) aoEstado(t, ok); };

    // 26/11/2026: uma sincronização por vez POR ARQUIVO. Duas ao mesmo tempo (ex.: vários itens adicionados em sequência) gravavam por
    // cima uma da outra, o GitHub recusava e o app mostrava "Falha ao enviar".
    const filas = {};
    function naFila(c) {
      const nova = (filas[c] || Promise.resolve()).catch(() => {}).then(() => sincronizarColecao(c));
      filas[c] = nova;
      return nova;
    }
    const TENTATIVAS = 4;

    async function sincronizarColecao(c) {
      const { doc, etag } = await driver.baixar(c);
      etags[c] = etag;
      const antes = JSON.stringify(doc.itens || []);
      const mesclado = Dados.mesclar(c, doc);
      // só envia quando o resultado difere do que já está no remoto
      if (JSON.stringify(mesclado.itens) !== antes) {
        let paraEnviar = mesclado, marca = etags[c];
        for (let n = 1; ; n++) {
          try {
            etags[c] = await driver.enviar(c, paraEnviar, marca);
            break;
          } catch (e) {
            if (!e.conflito || n >= TENTATIVAS) throw e;
            // alguém gravou no meio: espera um instante, baixa de novo, mescla e tenta outra vez
            await new Promise((r) => setTimeout(r, 250 * n));
            const r = await driver.baixar(c);
            paraEnviar = Dados.mesclar(c, r.doc);
            marca = r.etag;
          }
        }
      }
    }

    return {
      etags,
      async tudo() {
        if (!driver.disponivel()) return false;
        estado("Sincronizando…");
        try {
          for (const c of Dados.COLECOES) await naFila(c);
          estado("OneDrive ✓", true);
          return true;
        } catch (e) { estado("Sem conexão", false); return false; }
      },
      async colecao(c) {
        if (!driver.disponivel()) return false;
        try { await naFila(c); estado("OneDrive ✓", true); return true; }
        catch (e) { estado("Falha ao enviar", false); return false; }
      },
    };
  }
  window.SyncDudoo = { criar };
})();
