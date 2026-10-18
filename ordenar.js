// Lista reordenável por "segurar e arrastar" (18/10/2026): segure uma linha ~0,3 s (ou pegue na alça ⠿) e arraste; as outras abrem espaço,
// a tela rola sozinha perto das bordas e, ao soltar, `aoSoltar(ids)` recebe os ids na ordem nova. Rolar a tela com o dedo continua normal
// (mexeu antes de 0,3 s = é rolagem, não arrasto).
(function () {
  let ativo = null;                                       // {el, lista, y0, ultimoY, seletor, aoSoltar, rolagem, laco}
  const PASSO = 14, BORDA = 80;

  const rolagemDe = (el) => el.closest("main") || document.scrollingElement || document.documentElement;

  function mover(y) {
    const a = ativo; if (!a) return;
    a.ultimoY = y;
    a.el.style.transform = `translateY(${y - a.y0}px)`;
    // troca de lugar quando o centro da linha passa do meio da vizinha
    for (let k = 0; k < 4; k++) {
      const r = a.el.getBoundingClientRect(), centro = r.top + r.height / 2, prox = a.el.nextElementSibling, ant = a.el.previousElementSibling;
      if (prox && prox.matches(a.seletor) && centro > prox.getBoundingClientRect().top + prox.offsetHeight / 2) {
        a.lista.insertBefore(prox, a.el); a.y0 += prox.offsetHeight; a.el.style.transform = `translateY(${y - a.y0}px)`;
      } else if (ant && ant.matches(a.seletor) && centro < ant.getBoundingClientRect().top + ant.offsetHeight / 2) {
        a.lista.insertBefore(a.el, ant); a.y0 -= ant.offsetHeight; a.el.style.transform = `translateY(${y - a.y0}px)`;
      } else break;
    }
  }

  function iniciar(el, lista, seletor, aoSoltar, y, pointerId) {
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    const rolagem = rolagemDe(el);
    ativo = { el, lista, seletor, aoSoltar, y0: y, ultimoY: y, rolagem, laco: 0 };
    el.classList.add("arrastando");
    try { el.setPointerCapture(pointerId); } catch (e) {}
    ativo.laco = setInterval(() => {                       // rola sozinho perto da borda de cima/baixo da tela
      const a = ativo; if (!a) return;
      const altura = window.innerHeight;
      const dir = a.ultimoY < BORDA ? -PASSO : a.ultimoY > altura - BORDA - 70 ? PASSO : 0;
      if (!dir) return;
      const antes = a.rolagem.scrollTop; a.rolagem.scrollTop += dir;
      const real = a.rolagem.scrollTop - antes;
      if (real) { a.y0 -= real; mover(a.ultimoY); }
    }, 16);
  }

  function soltar() {
    const a = ativo; if (!a) return;
    clearInterval(a.laco); ativo = null;
    a.el.style.transform = ""; a.el.classList.remove("arrastando");
    const ids = [...a.lista.querySelectorAll(a.seletor)].map((e) => e.dataset.id);
    a.aoSoltar(ids);
  }

  // o iOS só deixa parar a rolagem se o touchmove for cancelado — e só enquanto estamos arrastando
  document.addEventListener("touchmove", (e) => { if (ativo) e.preventDefault(); }, { passive: false });
  document.addEventListener("contextmenu", (e) => { if (ativo) e.preventDefault(); });

  function ligar(lista, seletor, aoSoltar) {
    if (!lista || lista.__ordenavel) return;
    lista.__ordenavel = true;
    let espera = null, toque = null;
    lista.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(seletor);
      if (!el || e.target.closest("input,button,a,select,textarea,label")) return;
      if (e.target.closest(".alca")) { iniciar(el, lista, seletor, aoSoltar, e.clientY, e.pointerId); return; }   // a alça arrasta na hora
      toque = { el, x: e.clientX, y: e.clientY, id: e.pointerId };
      clearTimeout(espera);
      espera = setTimeout(() => { if (toque) { iniciar(toque.el, lista, seletor, aoSoltar, toque.y, toque.id); toque = null; } }, 320);
    });
    lista.addEventListener("pointermove", (e) => {
      if (ativo) { mover(e.clientY); return; }
      if (toque && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 8) { clearTimeout(espera); toque = null; }   // é rolagem
    });
    const fim = () => { clearTimeout(espera); toque = null; if (ativo) soltar(); };
    lista.addEventListener("pointerup", fim);
    lista.addEventListener("pointercancel", fim);
  }

  window.Ordenavel = { ligar };
})();
