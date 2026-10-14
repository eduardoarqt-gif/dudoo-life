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

  window.Garagem3D = { montar, corDoCarro, arquivoDoModelo, MODELOS };
})();
