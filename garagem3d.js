// Palco 3D da Garagem: carro girando sobre um disco, com luz de estúdio.
// Usa o modelo .glb do carro (se existir em modelos/) e, sem ele, um carro simples desenhado por código.
// Three.js fica em vendor/ (funciona offline, sem CDN).
(function () {
  // "marca modelo" normalizado → arquivo .glb em modelos/ (lido de modelos/modelos.json, compartilhado com carro3d.html)
  let MODELOS = {};
  const carregado = fetch("modelos/modelos.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : {})).then((j) => { MODELOS = j || {}; }).catch(() => {});
  const CORES = [
    ["prata", 0xc9ccd4], ["cinza", 0x7c8088], ["grafite", 0x3d4047], ["preto", 0x16171a], ["branco", 0xf1f1ee],
    ["vermelho", 0xb3201f], ["azul", 0x2a4f9a], ["verde", 0x2f6b4a], ["amarelo", 0xe3b92e], ["laranja", 0xd8702a],
    ["bege", 0xcdbb96], ["marrom", 0x6b4630], ["vinho", 0x6a1f2e], ["dourado", 0xb8963e],
  ];
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

  function corDoCarro(texto) {
    const t = norm(texto);
    const achou = CORES.find(([nome]) => t.includes(nome));
    return achou ? achou[1] : 0xc9ccd4;
  }
  function arquivoDoModelo(carro) {
    const arq = MODELOS[norm([carro.marca, carro.modelo].filter(Boolean).join(" "))];
    return arq ? "modelos/" + arq : "";
  }

  // carro de reserva: silhueta de hatch extrudada + vidros + 4 rodas
  function carroSimples(cor) {
    const T = window.THREE, g = new T.Group();
    const tinta = new T.MeshStandardMaterial({ color: cor, metalness: 0.6, roughness: 0.3 });
    const vidro = new T.MeshStandardMaterial({ color: 0x141b26, metalness: 0.3, roughness: 0.06 });
    const preto = new T.MeshStandardMaterial({ color: 0x101012, roughness: 0.75 });
    const extrudar = (pts, prof, mat, bisel) => {
      const forma = new T.Shape(); pts.forEach(([x, y], i) => (i ? forma.lineTo(x, y) : forma.moveTo(x, y)));
      const geo = new T.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: bisel > 0, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 3, curveSegments: 8 });
      geo.translate(0, 0, -prof / 2);
      return new T.Mesh(geo, mat);
    };
    g.add(extrudar([[-2.0, 0.32], [-2.06, 0.86], [-1.6, 1.16], [-0.8, 1.56], [0.55, 1.56], [1.25, 1.14], [1.95, 0.96], [2.08, 0.62], [2.0, 0.32]], 1.55, tinta, 0.09));
    g.add(extrudar([[-1.5, 1.16], [-0.75, 1.5], [0.5, 1.5], [1.1, 1.16]], 1.78, vidro, 0.0));
    [[1.3, 0.8], [-1.3, 0.8], [1.3, -0.8], [-1.3, -0.8]].forEach(([x, z]) => {
      const r = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.3, 28), preto);
      r.rotation.x = Math.PI / 2; r.position.set(x, 0.4, z); g.add(r);
      const aro = new T.Mesh(new T.CylinderGeometry(0.23, 0.23, 0.32, 20), new T.MeshStandardMaterial({ color: 0xd2d3d8, metalness: 0.9, roughness: 0.25 }));
      aro.rotation.x = Math.PI / 2; aro.position.set(x, 0.4, z); g.add(aro);
    });
    return g;
  }

  function montar(el, carro, aoEstado) {
    let desfazer = { destruir() {} };
    carregado.then(() => { desfazer = montarAgora(el, carro, aoEstado); });
    return { destruir() { desfazer.destruir(); } };
  }

  function montarAgora(el, carro, aoEstado) {
    const T = window.THREE;
    if (!T || !el) { if (aoEstado) aoEstado("sem3d"); return { destruir() {} }; }
    const largura = () => el.clientWidth || 320, altura = () => el.clientHeight || 260;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(largura(), altura());
    if (T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
    el.innerHTML = ""; el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";

    const cena = new T.Scene();
    const camera = new T.PerspectiveCamera(32, largura() / altura(), 0.1, 100);
    camera.position.set(6.4, 2.6, 6.4);
    cena.add(new T.HemisphereLight(0xffffff, 0x445066, 0.85));
    const sol = new T.DirectionalLight(0xfff1dc, 1.25); sol.position.set(5, 8, 4); cena.add(sol);
    const contra = new T.DirectionalLight(0x9ec3ff, 0.6); contra.position.set(-6, 3, -5); cena.add(contra);

    const disco = new T.Mesh(new T.CylinderGeometry(3.3, 3.3, 0.08, 64),
      new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, metalness: 0.3, roughness: 0.4 }));
    disco.position.y = -0.04; cena.add(disco);
    const anel = new T.Mesh(new T.TorusGeometry(3.3, 0.035, 12, 96), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    anel.rotation.x = Math.PI / 2; cena.add(anel);

    const grupo = new T.Group(); cena.add(grupo);
    const encaixar = (obj) => {
      const caixa = new T.Box3().setFromObject(obj), tam = caixa.getSize(new T.Vector3()), c = caixa.getCenter(new T.Vector3());
      const maior = Math.max(tam.x, tam.z) || 1, k = 4.4 / maior;
      obj.scale.multiplyScalar(k);
      const cx = new T.Box3().setFromObject(obj), cc = cx.getCenter(new T.Vector3());
      obj.position.x -= cc.x; obj.position.z -= cc.z; obj.position.y -= cx.min.y;
      grupo.add(obj);
    };
    const cor = corDoCarro(carro && carro.cor);
    let cancelado = false;
    const arquivo = carro ? arquivoDoModelo(carro) : "";
    if (arquivo && T.GLTFLoader) {
      new T.GLTFLoader().load(arquivo, (gltf) => { if (cancelado) return; 
        gltf.scene.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (!m) return; m.side = T.DoubleSide; if ("metalness" in m) { m.metalness = Math.min(m.metalness, 0.25); m.roughness = Math.max(m.roughness, 0.45); } }); });
        encaixar(gltf.scene); if (aoEstado) aoEstado("modelo"); },
        undefined, () => { if (cancelado) return; encaixar(carroSimples(cor)); if (aoEstado) aoEstado("simples"); });
    } else { encaixar(carroSimples(cor)); if (aoEstado) aoEstado("simples"); }

    let controles = null;
    if (T.OrbitControls) {
      controles = new T.OrbitControls(camera, renderer.domElement);
      controles.enableZoom = false; controles.enablePan = false; controles.enableDamping = true;
      controles.autoRotate = true; controles.autoRotateSpeed = 1.6;
      controles.minPolarAngle = Math.PI * 0.28; controles.maxPolarAngle = Math.PI * 0.49;
      controles.target.set(0, 0.7, 0);
    } else { camera.lookAt(0, 0.7, 0); }

    let quadro = 0;
    const laco = () => {
      quadro = requestAnimationFrame(laco);
      if (controles) controles.update(); else grupo.rotation.y += 0.008;
      renderer.render(cena, camera);
    };
    laco();
    const aoRedimensionar = () => { renderer.setSize(largura(), altura()); camera.aspect = largura() / altura(); camera.updateProjectionMatrix(); };
    window.addEventListener("resize", aoRedimensionar);

    return {
      destruir() {
        cancelado = true; cancelAnimationFrame(quadro); window.removeEventListener("resize", aoRedimensionar);
        if (controles) controles.dispose();
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
    };
  }

  // ---------------------------------------------------------------------------------------------------------------------------
  // CÍRCULO DA GARAGEM (17/10/2026, pedido do Eduardo): todos os carros COM modelo 3D real estacionados lado a lado num círculo; arrastar
  // gira o círculo (orbitando), solta e ele para no carro mais perto da frente; toque num carro traz ele pra frente. Carro sem modelo
  // 3D não entra (ele ainda vai ser adicionado). `aoSelecionar(id)` avisa quando o carro da frente muda; `ir(id)` leva um carro à frente.
  function temModelo(carro) { return !!arquivoDoModelo(carro); }

  function montarCirculo(el, carros, selecionadoId, aoSelecionar, aoEstado) {
    let interno = { destruir() {}, ir() {} };
    carregado.then(() => { interno = montarCirculoAgora(el, carros, selecionadoId, aoSelecionar, aoEstado); });
    return { destruir() { interno.destruir(); }, ir(id) { interno.ir(id); } };
  }

  function montarCirculoAgora(el, carros, selecionadoId, aoSelecionar, aoEstado) {
    const T = window.THREE;
    const lista = (carros || []).filter(temModelo);
    if (!T || !el || !lista.length || !T.GLTFLoader) { if (aoEstado) aoEstado({ erro: true }); return { destruir() {}, ir() {} }; }
    const largura = () => el.clientWidth || 340, altura = () => el.clientHeight || 300;
    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(largura(), altura());
    if (T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
    el.innerHTML = ""; el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    renderer.domElement.style.cursor = "grab";

    const n = lista.length, passo = (Math.PI * 2) / n, R = Math.max(3.6, (n * 2.9) / (Math.PI * 2));
    const cena = new T.Scene();
    const camera = new T.PerspectiveCamera(36, largura() / altura(), 0.1, 120);
    camera.position.set(0, 3.2, R + 9.4); camera.lookAt(0, 0.7, R * 0.6);
    cena.add(new T.HemisphereLight(0xffffff, 0x445066, 0.9));
    const sol = new T.DirectionalLight(0xfff1dc, 1.2); sol.position.set(5, 9, R + 6); cena.add(sol);
    const contra = new T.DirectionalLight(0x9ec3ff, 0.55); contra.position.set(-6, 4, -R); cena.add(contra);

    const grupo = new T.Group(); cena.add(grupo);                       // o que gira: disco + carros
    const disco = new T.Mesh(new T.CylinderGeometry(R + 3.1, R + 3.1, 0.08, 96),
      new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, metalness: 0.3, roughness: 0.4 }));
    disco.position.y = -0.04; grupo.add(disco);
    const anel = new T.Mesh(new T.TorusGeometry(R + 3.1, 0.035, 12, 128), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
    anel.rotation.x = Math.PI / 2; grupo.add(anel);
    const marca = new T.Mesh(new T.TorusGeometry(2.7, 0.03, 10, 64), new T.MeshBasicMaterial({ color: 0xf4a15c, transparent: true, opacity: 0.85 }));
    marca.rotation.x = Math.PI / 2; marca.position.set(0, 0.03, R); cena.add(marca);   // fixa: o lugar de "carro da frente"

    const cache = {};                                                   // arquivo → promessa do glb (modelos repetidos não baixam duas vezes)
    const carregar = (arq) => (cache[arq] = cache[arq] || new Promise((ok, falha) => new T.GLTFLoader().load(arq, ok, undefined, falha)));
    let carregados = 0, cancelado = false;
    lista.forEach((carro, i) => {
      carregar(arquivoDoModelo(carro)).then((gltf) => {
        if (cancelado) return;
        const obj = gltf.scene.clone(true);
        obj.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (!m) return; m.side = T.DoubleSide; if ("metalness" in m) { m.metalness = Math.min(m.metalness, 0.25); m.roughness = Math.max(m.roughness, 0.45); } }); });
        const caixa = new T.Box3().setFromObject(obj), tam = caixa.getSize(new T.Vector3());
        const comprimentoNoX = tam.x >= tam.z, k = 4.4 / (Math.max(tam.x, tam.z) || 1);
        obj.scale.multiplyScalar(k);
        const cx = new T.Box3().setFromObject(obj), cc = cx.getCenter(new T.Vector3());
        obj.position.x -= cc.x; obj.position.z -= cc.z; obj.position.y -= cx.min.y;
        const teta = i * passo, pivo = new T.Group();
        pivo.position.set(R * Math.sin(teta), 0, R * Math.cos(teta));
        pivo.rotation.y = comprimentoNoX ? teta : teta + Math.PI / 2;   // comprimento do carro na direção da tangente: lado a lado
        pivo.userData.id = carro.id; pivo.add(obj); grupo.add(pivo);
      }).catch(() => {}).then(() => { carregados++; if (aoEstado) aoEstado({ carregados, total: n }); });
    });

    const inicio = Math.max(0, lista.findIndex((c) => c.id === selecionadoId));
    let phi = -inicio * passo, alvo = phi, vel = 0, arrastando = false, ultimoX = 0, moveu = 0, indo = false, atual = inicio;
    const indiceDaFrente = () => ((Math.round(-phi / passo) % n) + n) % n;
    const anunciar = () => { const i = indiceDaFrente(); if (i !== atual) { atual = i; if (aoSelecionar) aoSelecionar(lista[i].id); } };
    const alvoMaisPerto = () => -Math.round(-phi / passo) * passo;

    const canvas = renderer.domElement, raio = new T.Raycaster(), ponteiro = new T.Vector2();
    const aoBaixar = (e) => { arrastando = true; indo = false; ultimoX = e.clientX; moveu = 0; vel = 0; canvas.style.cursor = "grabbing"; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} };
    const aoMover = (e) => { if (!arrastando) return; const dx = e.clientX - ultimoX; ultimoX = e.clientX; moveu += Math.abs(dx); phi += dx * 0.009; vel = dx * 0.009; };
    const aoSoltar = (e) => {
      if (!arrastando) return; arrastando = false; canvas.style.cursor = "grab";
      if (moveu < 7) {                                                   // toque: o carro tocado vai pra frente
        const r = canvas.getBoundingClientRect(); ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        raio.setFromCamera(ponteiro, camera);
        const hit = raio.intersectObjects(grupo.children, true).map((h) => { let o = h.object; while (o && !(o.userData && o.userData.id)) o = o.parent; return o; }).find(Boolean);
        if (hit) irPara(hit.userData.id);
      }
    };
    canvas.addEventListener("pointerdown", aoBaixar); canvas.addEventListener("pointermove", aoMover);
    canvas.addEventListener("pointerup", aoSoltar); canvas.addEventListener("pointercancel", () => { arrastando = false; });

    function irPara(id) {
      const i = lista.findIndex((c) => c.id === id); if (i < 0) return;
      const volta = Math.PI * 2; let t = -i * passo;                      // o caminho mais curto até o carro
      while (t - phi > Math.PI) t -= volta; while (phi - t > Math.PI) t += volta;
      alvo = t; indo = true; vel = 0;
    }

    let quadro = 0;
    const laco = () => {
      quadro = requestAnimationFrame(laco);
      if (!arrastando) {
        if (indo) { phi += (alvo - phi) * 0.14; if (Math.abs(alvo - phi) < 0.0015) { phi = alvo; indo = false; } }
        else if (Math.abs(vel) > 0.0009) { phi += vel; vel *= 0.93; }
        else { vel = 0; const t = alvoMaisPerto(); phi += (t - phi) * 0.14; }
      }
      grupo.rotation.y = phi; anunciar();
      renderer.render(cena, camera);
    };
    laco();
    const aoRedimensionar = () => { renderer.setSize(largura(), altura()); camera.aspect = largura() / altura(); camera.updateProjectionMatrix(); };
    window.addEventListener("resize", aoRedimensionar);
    return {
      ir: irPara,
      destruir() {
        cancelado = true; cancelAnimationFrame(quadro); window.removeEventListener("resize", aoRedimensionar);
        renderer.dispose(); if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      },
    };
  }

  window.Garagem3D = { montar, montarCirculo, temModelo, corDoCarro, arquivoDoModelo, MODELOS };
})();
