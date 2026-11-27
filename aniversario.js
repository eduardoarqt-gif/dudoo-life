// Animação de aniversário (21/10/2026): balões subindo, confete e a mensagem de parabéns por cima do app.
// Mesma regra do computador (app/services/perfil_service.py): aparece 1x por dia, só no dia do aniversário;
// quem nasceu em 29/02 comemora em 28/02 nos anos não bissextos. Só existe enquanto está na tela (sem custo fora disso).
(function () {
  const CORES = ["#D85A30", "#7F77DD", "#1D9E75", "#EF9F27", "#378ADD", "#D4537E"];
  const CHAVE_VISTO = "dudoolife.aniversario_visto";
  const bissexto = (a) => a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
  const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

  /** perfil.aniversario = "MM-DD" */
  function ehAniversario(perfil, hoje) {
    if (!perfil || !perfil.aniversario) return false;
    hoje = hoje || new Date();
    const [m, d] = perfil.aniversario.split("-").map(Number);
    if (m === 2 && d === 29 && !bissexto(hoje.getFullYear())) return hoje.getMonth() === 1 && hoje.getDate() === 28;
    return hoje.getMonth() + 1 === m && hoje.getDate() === d;
  }
  function idade(perfil, hoje) {
    if (!perfil || !/^\d{4}$/.test(String(perfil.ano_nascimento || ""))) return null;
    hoje = hoje || new Date();
    const [m, d] = perfil.aniversario.split("-").map(Number);
    const antes = hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d);
    return hoje.getFullYear() - Number(perfil.ano_nascimento) - (antes && !ehAniversario(perfil, hoje) ? 1 : 0);
  }
  /** "22/10/1988" ou "22/10" → { aniversario: "10-22", ano_nascimento: "1988" } (null se inválido) */
  function lerNascimento(texto) {
    const t = String(texto || "").trim();
    if (!t) return { aniversario: "", ano_nascimento: "" };
    const p = t.replace(/[-.]/g, "/").split("/");
    const dia = Number(p[0]), mes = Number(p[1]), ano = p[2] ? String(p[2]) : "";
    if (!(dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) || (ano && !/^\d{4}$/.test(ano))) return null;
    const teste = new Date(Date.UTC(ano ? Number(ano) : 2000, mes - 1, dia));
    if (teste.getUTCMonth() !== mes - 1 || teste.getUTCDate() !== dia) return null;
    return { aniversario: String(mes).padStart(2, "0") + "-" + String(dia).padStart(2, "0"), ano_nascimento: ano };
  }
  function formatarNascimento(perfil) {
    if (!perfil || !perfil.aniversario) return "";
    const [m, d] = perfil.aniversario.split("-");
    return d + "/" + m + (perfil.ano_nascimento ? "/" + perfil.ano_nascimento : "");
  }
  const jaMostrouHoje = (hoje) => { try { return localStorage.getItem(CHAVE_VISTO) === iso(hoje || new Date()); } catch (e) { return false; } };
  const marcarMostrado = (hoje) => { try { localStorage.setItem(CHAVE_VISTO, iso(hoje || new Date())); } catch (e) {} };

  let aberta = false;
  function mostrar(perfil, opcoes) {
    if (aberta) return;
    aberta = true;
    const teste = !!(opcoes && opcoes.teste);
    const nome = String((perfil && perfil.nome) || "").trim().split(" ")[0];
    const anos = idade(perfil);
    const el = document.createElement("div");
    el.className = "aniv-tela";
    el.innerHTML = '<canvas class="aniv-canvas"></canvas><div class="aniv-msg"><h1>Parabéns' + (nome ? ", " + nome.replace(/[<&>"]/g, "") : "") + '!</h1><p>' +
      (anos ? "Hoje você completa " + anos + " anos" : "Hoje é o seu dia") + '</p><button class="btn p" id="anivOk">Continuar</button></div>';
    document.body.appendChild(el);
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    let W = 0, H = 0, raf = 0, t = 0;
    const ajusta = () => { W = el.clientWidth || window.innerWidth; H = el.clientHeight || window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    ajusta();
    const baloes = Array.from({ length: 22 }, (_, i) => ({ x: Math.random() * W, y: H + 40 + Math.random() * H * 0.9, r: 20 + Math.random() * 16, v: 0.8 + Math.random() * 1.4, f: Math.random() * 6.28, a: 0.5 + Math.random() * 1.2, c: CORES[i % CORES.length] }));
    const confete = Array.from({ length: 80 }, (_, i) => ({ x: Math.random() * W, y: -Math.random() * H, w: 5 + Math.random() * 5, h: 8 + Math.random() * 7, v: 1.4 + Math.random() * 2, r: Math.random() * 6.28, s: (Math.random() - 0.5) * 0.2, c: CORES[i % CORES.length] }));
    function balao(b) {
      const x = b.x + Math.sin(t * 0.07 * b.a + b.f) * 14, y = b.y;
      ctx.strokeStyle = "rgba(200,200,200,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + b.r * 1.2);
      ctx.bezierCurveTo(x - 6, y + b.r * 2, x + 6, y + b.r * 2.6, x, y + b.r * 3.4); ctx.stroke();
      ctx.fillStyle = b.c; ctx.beginPath(); ctx.ellipse(x, y, b.r * 0.82, b.r, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + b.r); ctx.lineTo(x - 4, y + b.r + 6); ctx.lineTo(x + 4, y + b.r + 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(x - b.r * 0.3, y - b.r * 0.35, b.r * 0.16, b.r * 0.28, -0.5, 0, 6.2832); ctx.fill();
    }
    function quadro() {
      t++; ctx.clearRect(0, 0, W, H);
      confete.forEach((c) => { c.y += c.v; c.r += c.s; c.x += Math.sin((t + c.y) * 0.05) * 0.6; if (c.y > H + 20) { c.y = -20; c.x = Math.random() * W; }
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore(); });
      baloes.forEach((b) => { b.y -= b.v; if (b.y < -b.r * 4) { b.y = H + b.r * 2 + Math.random() * 80; b.x = Math.random() * W; } balao(b); });
      raf = requestAnimationFrame(quadro);
    }
    window.addEventListener("resize", ajusta);
    quadro();
    el.querySelector("#anivOk").addEventListener("click", () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize", ajusta); el.remove(); aberta = false;
      if (!teste) marcarMostrado();
    });
  }

  /** Chamar ao abrir o app e depois de cada sincronização (o perfil pode chegar da nuvem). */
  function verificar(perfil) {
    if (ehAniversario(perfil) && !jaMostrouHoje()) mostrar(perfil);
  }

  window.Aniversario = { ehAniversario, idade, lerNascimento, formatarNascimento, mostrar, verificar, jaMostrouHoje, marcarMostrado };
})();
