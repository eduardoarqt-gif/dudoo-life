// Mapa-múndi do Dudoo Life — o MESMO desenho no computador (janela embutida) e no iPhone.
// Os pontos vêm prontos: [{nome, cidade, pais, status, lat, lon, aprox}]. Só o mosaico do mapa vem da internet;
// os seus lugares nunca saem do aparelho (os marcadores são desenhados aqui).
(function (global) {
  "use strict";
  var LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
  var pronto = null;

  function carregar() {
    if (global.L) return Promise.resolve(global.L);
    if (pronto) return pronto;
    pronto = new Promise(function (ok, erro) {
      var css = document.createElement("link");
      css.rel = "stylesheet"; css.href = LEAFLET + "leaflet.min.css";
      document.head.appendChild(css);
      var js = document.createElement("script");
      js.src = LEAFLET + "leaflet.min.js";
      js.onload = function () { ok(global.L); };
      js.onerror = function () { pronto = null; erro(new Error("sem internet")); };
      document.head.appendChild(js);
    });
    return pronto;
  }

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // Junta lugares sem coordenada própria no centro do país (um marcador por país, com a contagem).
  function pontosDe(lugares, geo) {
    var norm = function (t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); };
    var saida = [], porPais = {};
    (lugares || []).forEach(function (l) {
      if (l.excluido_em) return;
      var lat = l.lat, lon = l.lon;
      if (typeof lat === "number" && typeof lon === "number") {
        saida.push({ nome: l.nome, cidade: l.cidade || "", pais: l.pais || "", status: l.status, lat: lat, lon: lon, aprox: false });
        return;
      }
      var c = geo[norm(l.pais)];
      if (!c) return;
      var g = porPais[norm(l.pais)] || (porPais[norm(l.pais)] = { nome: l.pais, lat: c[0], lon: c[1], visitados: 0, total: 0 });
      g.total += 1;
      if (l.status === "visitado" || l.status === "favorito") g.visitados += 1;
    });
    Object.keys(porPais).forEach(function (k) {
      var g = porPais[k];
      saida.push({ nome: g.nome + " (" + g.total + " lugar" + (g.total > 1 ? "es" : "") + ")", cidade: "", pais: g.nome,
        status: g.visitados ? "visitado" : "quero_conhecer", lat: g.lat, lon: g.lon, aprox: true });
    });
    return saida;
  }

  function desenhar(el, pontos, opcoes) {
    opcoes = opcoes || {};
    el.innerHTML = '<p class="mapa-aviso">Carregando o mapa…</p>';
    return carregar().then(function (L) {
      el.innerHTML = "";
      var mapa = L.map(el, { worldCopyJump: true, minZoom: 1, zoomControl: true, attributionControl: true }).setView([20, 0], 2);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 16,
        attribution: "Tiles &copy; Esri"
      }).addTo(mapa);
      var limites = [];
      pontos.forEach(function (p) {
        var visitado = p.status === "visitado" || p.status === "favorito";
        var m = L.circleMarker([p.lat, p.lon], {
          radius: p.aprox ? 9 : 6, weight: 2, color: visitado ? "#ff8a3d" : "#e8d9c4",
          fillColor: visitado ? "#ff8a3d" : "#1d1b19", fillOpacity: visitado ? 0.85 : 0.5
        }).addTo(mapa);
        m.bindPopup("<b>" + esc(p.nome) + "</b><br>" + esc([p.cidade, p.pais].filter(Boolean).join(" · ")) +
          "<br><small>" + (visitado ? "Visitado" : "Quero conhecer") + (p.aprox ? " · posição aproximada (centro do país)" : "") + "</small>");
        limites.push([p.lat, p.lon]);
      });
      if (limites.length) mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 5 });
      setTimeout(function () { mapa.invalidateSize(); }, 200);
      if (opcoes.aoPronto) opcoes.aoPronto(mapa);
      return mapa;
    }).catch(function () {
      el.innerHTML = '<p class="mapa-aviso">Sem internet para carregar o mapa. Os lugares continuam na lista.</p>';
    });
  }

  global.DudooMapa = { desenhar: desenhar, pontosDe: pontosDe };
})(window);
