// Só o dono usa o app (27/11/2026). O app é publicado num endereço aberto; ele só abre no aparelho cujo token do GitHub lê o repositório
// PRIVADO dos dados. Conferido uma vez, passa a abrir também sem internet; token recusado volta a trancar. Os dados do aparelho não são apagados.
(function () {
  const CHAVE = "dudoolife.dono";
  const marcado = () => { try { return localStorage.getItem(CHAVE) === "1"; } catch (e) { return false; } };
  const marcar = (sim) => { try { if (sim) localStorage.setItem(CHAVE, "1"); else localStorage.removeItem(CHAVE); } catch (e) {} };

  // true = é o dono · false = o token não abre · null = não deu para conferir (sem internet, GitHub fora do ar ou no limite)
  async function conferir() {
    if (!Nuvem.token()) return false;
    try {
      const r = await Nuvem.fetchFn("https://api.github.com/repos/" + Nuvem.repo(), { cache: "no-store", headers: Nuvem._cab() });
      if (r.ok) return (await r.json()).private === true;
      return r.status === 401 || r.status === 404 ? false : null;
    } catch (e) { return null; }
  }
  const AVISO = { false: "Esse token não abre este app.", null: "Não consegui conferir agora. Verifique a internet e tente de novo." };

  let tela = null;
  function esconderApp(sim) { const app = document.getElementById("app"); if (app) { app.style.visibility = sim ? "hidden" : ""; app.inert = sim; } }
  function abrir() { if (tela) tela.remove(); tela = null; esconderApp(false); }
  function trancar(aviso) {
    esconderApp(true);
    if (!tela) {
      tela = document.createElement("div"); tela.className = "trava";
      tela.innerHTML = '<form><h1>Dudoo<i>Life</i></h1><p>Aplicativo particular. Para entrar neste aparelho, cole o token.</p>' +
        '<input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Token" aria-label="Token">' +
        '<button type="submit" class="btn p">Entrar</button><small role="status"></small></form>';
      document.body.appendChild(tela);
      tela.querySelector("form").addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const campo = tela.querySelector("input"), texto = campo.value.trim(), estado = tela.querySelector("small");
        if (texto && !Tokens.aplicar(texto)) Nuvem.definirToken(texto);
        estado.textContent = "Conferindo…";
        const dono = await conferir();
        if (dono) { marcar(true); location.reload(); } else if (tela) estado.textContent = AVISO[dono];
      });
    }
    tela.querySelector("small").textContent = aviso || "";
  }

  async function iniciar() {
    const liberado = marcado() && !!Nuvem.token();
    if (!liberado) trancar(Nuvem.token() ? "Conferindo…" : "");
    if (!Nuvem.token()) { marcar(false); return; }
    const dono = await conferir();
    if (dono) { marcar(true); abrir(); }
    else if (dono === false) { marcar(false); trancar(AVISO.false); }
    else if (!liberado) trancar(AVISO.null);
  }

  window.Trava = { conferir, iniciar };
  iniciar();
})();
