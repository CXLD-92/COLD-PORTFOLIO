/**
 * scene.js
 * ---------------------------------------------------------------
 * Scène hero en arrière-plan :
 *   - charge assets/models/flame.glb (le logo COLD PRODUCTION)
 *   - lui applique un matériau chrome / argenté
 *   - laisse l'utilisateur la faire tourner au glisser (souris / tactile)
 *   - ajoute une légère rotation automatique quand on n'y touche pas
 *   - anime un nuage de particules de fumée derrière la flamme
 *
 * Tout est local (aucune dépendance CDN) : voir assets/vendor/three/.
 * ---------------------------------------------------------------
 */

import * as THREE from "three";
import { GLTFLoader } from "./assets/vendor/three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "./assets/vendor/three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("flame-canvas");
if (canvas) {
  initHeroScene(canvas);
}

function initHeroScene(canvas) {
  const stage = canvas.closest(".hero__canvas-wrap");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // ---------- Scene & camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  // Le modèle est un profil assez fin (proche d'une plaque découpée) : vu
  // pile de face, son relief se voit à peine. On part donc sur un angle
  // 3/4 (un peu de côté, un peu au-dessus) plutôt que sur l'axe pur — ça
  // donne tout de suite du volume, avant même que la rotation démarre.
  const initialAzimuth = THREE.MathUtils.degToRad(11);
  const initialElevation = THREE.MathUtils.degToRad(7);
  camera.position.set(
    Math.sin(initialAzimuth) * Math.cos(initialElevation),
    Math.sin(initialElevation),
    Math.cos(initialAzimuth) * Math.cos(initialElevation)
  ).multiplyScalar(6.2);
  camera.lookAt(0, 0, 0);

  // ---------- Lights : setup studio "chrome" très lumineux (blanc éclatant) ----------
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(4, 5, 4.5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xd0d5da, 1.6);
  rim.position.set(-4.5, 1.5, -3.5);
  scene.add(rim);

  const rimLow = new THREE.DirectionalLight(0xa8adb4, 0.9);
  rimLow.position.set(2, -4, -2);
  scene.add(rimLow);

  const fill = new THREE.DirectionalLight(0x8c9096, 0.4);
  fill.position.set(-2, -2, 4);
  scene.add(fill);

  // Plancher ambiant discret : le vrai modelé vient maintenant de
  // l'environnement réfléchi, pas d'un éclairage plat.
  const hemi = new THREE.HemisphereLight(0xc7cbd0, 0x222327, 0.35);
  scene.add(hemi);

  // Environnement procédural (studio neutre) pour des reflets chrome crédibles,
  // sans dépendre d'un fichier HDRI externe.
  scene.environment = buildStudioEnvironment(renderer);

  // ---------- Groupe flamme ----------
  const flameGroup = new THREE.Group();
  scene.add(flameGroup);

  const chromeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf2f3f5,
    metalness: 1,
    roughness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.7,
  });

  const loader = new GLTFLoader();

  // ---------- Contrôles : rotation libre au glisser, pas de zoom / pan ----------
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.minPolarAngle = Math.PI / 2 - 0.6;
  controls.maxPolarAngle = Math.PI / 2 + 0.6;
  controls.autoRotate = !prefersReducedMotion;
  controls.autoRotateSpeed = 1.15;

  // Rayon (monde) de la sphère englobant la flamme, calculé au chargement.
  // Recalculé à chaque resize pour retrouver la distance caméra qui fait
  // tenir l'objet en entier, quel que soit le nouveau ratio largeur/hauteur.
  let flameRadius = 1.4;

  loader.load(
    "assets/models/flame.glb",
    (gltf) => {
      const model = gltf.scene;

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = chromeMaterial;
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      // 1) Met le modèle à une taille de référence stable (2.6 unités sur
      // sa plus grande dimension), à partir de sa boîte englobante brute.
      const rawBox = new THREE.Box3().setFromObject(model);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
      const targetSize = 2.34; // 2.6 réduit de 10%
      model.scale.setScalar(targetSize / maxDim);

      // 2) Recentre le modèle sur le centre de sa boîte englobante — son
      // vrai centre géométrique/visuel (min/max sur chaque axe), pas une
      // moyenne de sommets qui peut être tirée d'un côté si le maillage a
      // plus de détail (donc plus de sommets) à un endroit qu'à un autre.
      // La caméra regardant TOUJOURS pile son pivot (controls.target,
      // resté à l'origine), ce point projette par construction en plein
      // centre de l'écran — donc si ce pivot est le vrai centre visuel de
      // la forme, la flamme reste visuellement centrée à tous les angles,
      // sans le moindre calcul à chaque frame.
      const box = new THREE.Box3().setFromObject(model);
      const boxCenter = new THREE.Vector3();
      box.getCenter(boxCenter);
      model.position.sub(boxCenter);

      flameGroup.add(model);

      // 3) Rayon englobant final, mesuré depuis l'origine (0,0,0) — qui est
      // exactement le centre ci-dessus. On prend la distance au sommet le
      // plus éloigné plutôt que la sphère englobante de la boîte (laquelle
      // est centrée sur le milieu de la boîte, pas forcément l'origine si
      // jamais il y avait un écart) : ça garantit que le cadrage caméra
      // reste cohérent avec le point sur lequel l'objet tourne réellement.
      flameRadius = computeMaxRadiusFromOrigin(flameGroup);

      fitCameraToFlame();
      controls.update();
      resize();
    },
    undefined,
    (err) => {
      console.error("Impossible de charger assets/models/flame.glb :", err);
    }
  );

  /**
   * Place la caméra à la distance minimale garantissant que la sphère
   * englobante de la flamme tient entièrement dans le cadre — en tenant
   * compte à la fois du champ de vision vertical ET horizontal (le second
   * étant plus restrictif sur un écran portrait), pour ne jamais couper
   * l'objet sur les bords gauche/droite.
   */
  function fitCameraToFlame() {
    const margin = 1.22; // marge autour de la flamme
    const vFov = (camera.fov * Math.PI) / 180;
    const distV = flameRadius / Math.sin(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const distH = flameRadius / Math.sin(hFov / 2);
    const distance = Math.max(distV, distH) * margin;

    // Conserve l'angle de vue actuel (utile si on refait le cadrage après
    // une rotation manuelle) : on ne fait que rallonger/raccourcir la
    // distance caméra le long de sa direction actuelle vers la cible.
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(distance);
    camera.position.copy(controls.target).add(dir);
    camera.updateProjectionMatrix();
  }

  let idleTimer = null;
  const resumeDelay = 2200;
  const pauseAutoRotate = () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controls.autoRotate = !prefersReducedMotion;
    }, resumeDelay);
  };
  canvas.addEventListener("pointerdown", pauseAutoRotate);

  // ---------- Fumée : deux couches procédurales, immersives, en boucle infinie ----------
  // Attachées à la caméra (pas à la scène) : elles restent donc plein cadre
  // en permanence, quel que soit l'angle sous lequel on regarde la flamme.
  //   - "backdrop" : la couche dense derrière la flamme (déjà en place).
  //   - "foreground" : un voile très léger devant la flamme, entre elle et
  //     le texte, pour plus d'immersion (comme si on regardait la flamme
  //     à travers un peu de fumée).
  const smokeNoiseTex = buildNoiseTexture();
  const smokeBack = buildSmoke({ distance: 18, scale: 46, density: 0.62, speed: 1.0, noiseTex: smokeNoiseTex });
  const smokeFront = buildSmoke({ distance: 3.4, scale: 9, density: 0.272, speed: 1.35, noiseTex: smokeNoiseTex });
  camera.add(smokeBack.mesh);
  camera.add(smokeFront.mesh);
  scene.add(camera); // une caméra doit être dans la scène pour que ses enfants soient rendus
  const smokeLayers = [smokeBack, smokeFront];

  // ---------- Redimensionnement ----------
  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    fitCameraToFlame();
    camera.clearViewOffset();
    camera.updateProjectionMatrix();

    // Le pivot de la flamme (controls.target, à l'origine) est maintenant
    // le centre de sa boîte englobante (voir plus haut) — et la caméra
    // regardant TOUJOURS pile ce point, il projette par construction en
    // plein centre du cadre (w/2, h/2), à N'IMPORTE QUEL angle de
    // rotation. Donc pas de décalage horizontal à calculer : elle est
    // structurellement centrée. Il ne reste qu'à décaler VERTICALEMENT
    // pour caler ce centre dans l'espace vide entre la nav (haut) et le
    // bloc "PORTFOLIO" (bas), avec le même espace au-dessus et en dessous.
    const navEl = document.querySelector(".nav");
    const textEl = document.querySelector(".hero__text");
    let shiftY = 0;
    if (navEl && textEl) {
      const navBottom = navEl.getBoundingClientRect().bottom;
      const textTop = textEl.getBoundingClientRect().top;
      const gapCenter = (navBottom + textTop) / 2 - rect.top;
      shiftY = h / 2 - gapCenter;
    }

    camera.setViewOffset(w, h, 0, shiftY, w, h);
    camera.updateProjectionMatrix();

    const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    for (const layer of smokeLayers) {
      layer.mesh.material.uniforms.uAspect.value = camera.aspect;
      layer.mesh.material.uniforms.uResolution.value.set(drawSize.x, drawSize.y);
    }
  }
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(resize);
  }

  // ---------- Boucle d'animation ----------
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    controls.update();
    for (const layer of smokeLayers) layer.update(t);

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

/**
 * Distance maximale entre l'origine (0,0,0) et n'importe quel sommet de
 * l'objet — utilisée pour le cadrage caméra. Volontairement mesurée depuis
 * l'origine plutôt que via une boîte englobante générique, car l'origine
 * est ici exactement le centroïde/pivot de rotation : ça garantit que la
 * sphère de cadrage est bien centrée sur le même point que la rotation.
 */
function computeMaxRadiusFromOrigin(object) {
  const v = new THREE.Vector3();
  let maxDistSq = 0;

  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const position = child.geometry.attributes.position;
    if (!position) return;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      const distSq = v.lengthSq();
      if (distSq > maxDistSq) maxDistSq = distSq;
    }
  });

  return Math.sqrt(maxDistSq) || 1.4;
}

/**
 * Construit une texture d'environnement riche et détaillée — beaucoup de
 * zones claires et sombres, de tailles et positions variées — plutôt qu'un
 * simple dégradé. C'est ce qui fait la différence entre "gris qui brille"
 * et un vrai effet chromé/miroir : un miroir ne fait que refléter ce qu'on
 * lui montre, donc s'il n'y a rien de détaillé à refléter (juste un
 * dégradé lisse), le rendu reste plat quels que soient les réglages du
 * matériau. On simule ici un studio complexe (plusieurs softbox, zones
 * sombres, bandes lumineuses nettes) pour obtenir des reflets qui bougent
 * et se recomposent vraiment quand la flamme tourne — sans dépendre d'un
 * fichier HDRI externe.
 */
function buildStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // Base : gris moyen-sombre, ni blanc ni noir — le "vide" entre les
  // sources lumineuses, comme dans un vrai studio photo.
  ctx.fillStyle = "#2a2b2e";
  ctx.fillRect(0, 0, w, h);

  // Plusieurs "softbox" de tailles et intensités variées, positionnées à
  // la main pour un résultat riche mais maîtrisé (pas du bruit aléatoire).
  const blobs = [
    { x: 0.12, y: 0.22, r: 0.16, c: "255,255,255", a: 1 },
    { x: 0.42, y: 0.08, r: 0.1, c: "230,232,235", a: 0.95 },
    { x: 0.72, y: 0.22, r: 0.2, c: "255,255,255", a: 1 },
    { x: 0.95, y: 0.55, r: 0.14, c: "210,213,217", a: 0.85 },
    { x: 0.08, y: 0.72, r: 0.18, c: "245,246,248", a: 0.9 },
    { x: 0.38, y: 0.85, r: 0.13, c: "200,203,207", a: 0.8 },
    { x: 0.66, y: 0.78, r: 0.16, c: "255,255,255", a: 0.9 },
    { x: 0.92, y: 0.92, r: 0.12, c: "225,227,230", a: 0.85 },
    // poches sombres, pour du vrai contraste (pas juste des tons clairs)
    { x: 0.28, y: 0.42, r: 0.11, c: "8,8,9", a: 1 },
    { x: 0.58, y: 0.38, r: 0.09, c: "5,5,6", a: 1 },
    { x: 0.82, y: 0.4, r: 0.1, c: "12,12,14", a: 0.95 },
    { x: 0.18, y: 0.58, r: 0.08, c: "10,10,11", a: 0.9 },
  ];

  blobs.forEach(({ x, y, r, c, a }) => {
    const cx = x * w;
    const cy = y * h;
    const radius = r * w;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${c},${a})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  });

  // Couche fine, à haute fréquence : beaucoup de petites taches contrastées
  // (façon feuille de métal froissée) par-dessus les grandes softbox — sans
  // ça, l'environnement reste "trop lisse" et les reflets sur la flamme
  // n'ont pas le grain fin/complexe d'un vrai chrome (cf. référence).
  // Positions pseudo-aléatoires mais déterministes (même résultat à chaque
  // chargement).
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 70; i++) {
    const cx = rand() * w;
    const cy = rand() * h;
    const radius = (0.03 + rand() * 0.05) * w;
    const bright = rand() > 0.5;
    const tone = bright ? 225 + rand() * 25 : 20 + rand() * 25;
    const alpha = 0.35 + rand() * 0.3;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${tone},${tone},${tone},${alpha})`);
    grad.addColorStop(1, `rgba(${tone},${tone},${tone},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // Bandes lumineuses, mais adoucies (dégradé, pas un bord dur) : un bord
  // net crée une ligne de coupure très visible sur une surface aussi
  // réfléchissante — un vrai studio a des transitions douces, pas des
  // arêtes vives.
  const bands = [
    { y: 0.16, spread: 0.05, c: "255,255,255", a: 0.8 },
    { y: 0.34, spread: 0.045, c: "5,5,6", a: 0.7 },
    { y: 0.5, spread: 0.07, c: "255,255,255", a: 0.55 },
    { y: 0.63, spread: 0.04, c: "5,5,6", a: 0.6 },
    { y: 0.78, spread: 0.05, c: "232,233,235", a: 0.55 },
  ];
  bands.forEach(({ y, spread, c, a }) => {
    const cy = y * h;
    const grad = ctx.createLinearGradient(0, cy - spread * h, 0, cy + spread * h);
    grad.addColorStop(0, `rgba(${c},0)`);
    grad.addColorStop(0.5, `rgba(${c},${a})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, cy - spread * h, w, spread * 2 * h);
  });

  // Bandes verticales, également adoucies, pour que la rotation révèle des
  // reflets différents sans jamais de bord tranché.
  const vBands = [0.06, 0.24, 0.46, 0.63, 0.81, 0.94];
  vBands.forEach((pos, i) => {
    const cx = pos * w;
    const spread = 0.035 * w;
    const c = i % 2 === 0 ? "255,255,255" : "6,6,7";
    const a = i % 2 === 0 ? 0.3 : 0.4;
    const grad = ctx.createLinearGradient(cx - spread, 0, cx + spread, 0);
    grad.addColorStop(0, `rgba(${c},0)`);
    grad.addColorStop(0.5, `rgba(${c},${a})`);
    grad.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - spread, 0, spread * 2, h);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const envMap = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return envMap;
}

/**
 * Fond de fumée procédural (shader), immersif, en boucle infinie.
 *
 * Plutôt que des sprites épars, c'est un unique plan couvrant tout le
 * cadre, texturé par du bruit fbm ("fractal brownian motion") animé et
 * "domain-warpé" pour un rendu organique proche d'une vraie fumée
 * volumétrique — entièrement calculé en GLSL, sans image ni vidéo.
 *
 * Le plan est ajouté comme enfant de la caméra (voir appelant) : il reste
 * donc plein cadre en permanence, quel que soit l'angle de la flamme.
 * Le défilement est un simple décalage de coordonnées dans le temps — la
 * boucle est donc parfaite et infinie, sans le moindre raccord visible
 * (contrairement à une vidéo qui boucle sur un nombre de secondes fixe).
 *
 * @param {number} distance  distance devant la caméra (unités monde). Une
 *                            couche "premier plan" (devant la flamme) utilise
 *                            une petite valeur ; le fond, une grande valeur.
 * @param {number} scale      taille du plan (toujours largement surdimensionné
 *                            pour couvrir l'écran à tout ratio).
 * @param {number} density    multiplicateur d'opacité global (0–1).
 * @param {number} speed      multiplicateur de vitesse de défilement.
 */
/**
 * Texture de bruit (valeurs aléatoires en niveaux de gris, 256×256, bouclée
 * — RepeatWrapping) utilisée par le shader de fumée ci-dessous à la place
 * d'un hash mathématique.
 *
 * L'ancienne version calculait le bruit avec `fract(p * 123.34)` et
 * consorts : ces grands multiplicateurs, une fois combinés à la profondeur
 * du domain-warping (5 octaves imbriquées), poussent les valeurs
 * intermédiaires bien au-delà de ce qu'un flottant `mediump` peut encoder
 * avec assez de précision pour que `fract()` reste fiable — beaucoup de GPU
 * Android n'offrent en réalité que `mediump` en fragment shader, quoi qu'on
 * déclare en tête de shader. Résultat : le bruit dégénère en blocs plats
 * plutôt qu'en volutes fines (le bug visible sur Android).
 *
 * En passant par une texture, l'interpolation (l'équivalent du lissage
 * qu'on codait à la main) est faite par le matériel de filtrage bilinéaire
 * du GPU, indépendamment de la précision flottante des calculs du shader —
 * donc fiable sur tous les appareils. Comme pour l'environnement chromé
 * plus haut, le bruit est généré avec un PRNG à graine fixe (même rendu à
 * chaque chargement), pas un `Math.random()`.
 */
function buildNoiseTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(size, size);

  let seed = 9731;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = Math.floor(rand() * 256);
    imgData.data[i] = v;
    imgData.data[i + 1] = v;
    imgData.data[i + 2] = v;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  // C'est une texture de données (valeurs brutes lues dans le shader), pas
  // une couleur à afficher : on désactive la conversion sRGB pour ne pas
  // fausser les valeurs — selon la version de three.js chargée.
  if (typeof THREE.NoColorSpace !== "undefined") {
    tex.colorSpace = THREE.NoColorSpace;
  } else if (typeof THREE.LinearEncoding !== "undefined") {
    tex.encoding = THREE.LinearEncoding;
  }
  return tex;
}

function buildSmoke({ distance = 18, scale = 46, density = 1, speed = 1, noiseTex } = {}) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDensity: { value: density },
      uSpeed: { value: speed },
      uNoiseTex: { value: noiseTex },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uAspect;
      uniform vec2 uResolution;
      uniform float uDensity;
      uniform float uSpeed;
      uniform sampler2D uNoiseTex;

      // Bruit "valeur" lu dans une texture pré-générée (256x256, bouclée)
      // plutôt que calculé par un hash algébrique — voir buildNoiseTexture()
      // plus haut dans le fichier pour le pourquoi (précision flottante des
      // GPU Android). Le filtrage bilinéaire de la texture fait tout le
      // travail de lissage entre "cellules" à la place de nos anciens mix().
      float noise(vec2 p) {
        return texture2D(uNoiseTex, p / 256.0).r;
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.02;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vec2(vUv.x * uAspect, vUv.y);

        // Défilement continu vers la droite (décalage pur : boucle infinie,
        // aucune couture possible, contrairement à une texture/vidéo finie).
        float drift = uTime * 0.045 * uSpeed;
        vec2 p = uv * vec2(1.7, 2.1) + vec2(-drift, uTime * 0.01 * uSpeed);

        // "Domain warping" : on déforme l'espace d'échantillonnage par du
        // bruit lui-même animé, ce qui donne ces volutes organiques plutôt
        // qu'un bruit figé et répétitif.
        vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
        vec2 r = vec2(
          fbm(p + 1.6 * q + vec2(1.7, 9.2) + drift * 0.4),
          fbm(p + 1.6 * q + vec2(8.3, 2.8) - drift * 0.3)
        );
        float n = fbm(p + 2.2 * r);

        // Masque vertical basé sur la position RÉELLE à l'écran (et non les
        // UV du plan, qui est volontairement surdimensionné pour couvrir
        // l'écran à tout ratio — donc bien plus grand que ce qui est
        // visible, seule une tranche centrale et étroite de ses UV
        // apparaît jamais à l'écran). gl_FragCoord.y = 0 en bas de l'écran,
        // croissant vers le haut (convention WebGL).
        // Dégradé d'opacité demandé : 0% tout en haut, 100% tout en bas.
        float screenY = gl_FragCoord.y / uResolution.y;
        float vMask = 1.0 - smoothstep(0.0, 1.0, screenY);

        float density = smoothstep(0.08, 0.68, n + r.x * 0.25) * vMask;
        density = clamp(density * uDensity, 0.0, 1.0);

        vec3 dark = vec3(0.05, 0.05, 0.06);
        vec3 light = vec3(0.93, 0.94, 0.96);
        vec3 color = mix(dark, light, clamp(n * 1.15 + 0.15, 0.0, 1.0));

        gl_FragColor = vec4(color, density);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Enfant de la caméra, à une distance fixe devant elle : couvre tout le
  // champ de vision (taille généreuse et fixe — pas besoin de la recalculer
  // au resize).
  mesh.position.set(0, 0, -distance);
  mesh.scale.set(scale, scale, 1);
  mesh.renderOrder = -1;

  function update(t) {
    material.uniforms.uTime.value = t;
  }

  return { mesh, update };
}
