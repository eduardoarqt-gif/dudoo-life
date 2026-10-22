// Service worker: guarda a "casca" do app para abrir offline. Os dados não passam por aqui.
const VERSAO = "dudoolife-v34";
const CASCA = ["./", "index.html", "styles.css", "app.js", "dados.js", "sync.js", "github.js", "ferramentas.js", "garagem3d.js", "vendor/three.min.js", "vendor/GLTFLoader.js", "vendor/OrbitControls.js", "img/abertura1.jpg", "img/abertura2.jpg", "img/abertura3.jpg", "img/abertura4.jpg", "assistente.js", "pessoal.js", "guarda_roupa.js", "ordenar.js", "mapa_core.js", "geo_paises.json", "config.js", "mascaras.js", "manifest.webmanifest", "icon.svg", "icon-180.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;   // Graph/Google Fonts: direto da rede
  e.respondWith(
    fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSAO).then((x) => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
