/**
 * preload.js
 * ---------------------------------------------------------------
 * Écran de chargement plein écran (fond noir, la flamme en blanc
 * (SVG) au-dessus d'une fine barre de progression blanche, le tout
 * centré à l'écran), affiché tant que les assets du hero ne sont pas
 * prêts :
 *   - le modèle 3D principal (assets/models/flame.glb), chargé par
 *     scene.js — on écoute THREE.DefaultLoadingManager, que
 *     GLTFLoader utilise par défaut quand on ne lui passe pas de
 *     manager explicite (voir scene.js), donc pas de 2e téléchargement.
 *   - les polices custom (Edition / Pressio)
 *   - les images déjà présentes dans le DOM au chargement (cartes
 *     "Work", logos "Trusted by"…)
 *
 * Une durée d'affichage minimale (MIN_DISPLAY) est ajoutée en plus du
 * temps de chargement réel — un tout petit peu plus long qu'un simple
 * "flash", le temps que la flamme se voie vraiment. Un filet de
 * sécurité (MAX_WAIT) force la disparition si un asset traîne ou
 * échoue, pour ne jamais bloquer l'accès au site.
 *
 * Ce script doit être chargé AVANT scene.js dans index.html : les
 * scripts `type="module"` s'exécutent dans l'ordre du document, donc
 * les écouteurs posés ici sur THREE.DefaultLoadingManager sont bien
 * en place avant que scene.js ne lance son chargement du .glb.
 * ---------------------------------------------------------------
 */

import * as THREE from "three";

const preloader = document.getElementById("preloader");
if (preloader) {
  runPreloader(preloader);
}

function runPreloader(preloader) {
  const barFill = document.getElementById("preloader-bar-fill");

  document.documentElement.classList.add("is-loading");

  // ---------- Durée d'affichage minimale ----------
  // Un tout petit peu plus long qu'un simple flash : même si tout est
  // prêt instantanément, l'écran reste visible au moins MIN_DISPLAY ms.
  // Volontairement très court (abaissé de 1600 à 500 puis 300ms) :
  // au-delà de ce minimum, chaque ms passée ici s'ajoute directement
  // au temps de chargement perçu, surtout sensible sur mobile/réseau
  // lent — l'objectif est un visiteur qui n'a jamais l'impression
  // d'attendre.
  const MIN_DISPLAY = 300;
  const startTime = performance.now();

  // ---------- Progrès pondéré : GLB + polices + images ----------
  // Le modèle 3D compte pour plus de la moitié de la barre : c'est
  // historiquement l'asset le plus lourd et le plus long à charger.
  const weights = { glb: 0.55, fonts: 0.15, images: 0.3 };
  const progress = { glb: 0, fonts: 0, images: 0 };
  const done = { glb: false, fonts: false, images: false };

  function updateBar() {
    const total =
      progress.glb * weights.glb +
      progress.fonts * weights.fonts +
      progress.images * weights.images;
    if (barFill) barFill.style.width = `${Math.min(100, Math.round(total * 100))}%`;
  }

  function markDone(key) {
    if (done[key]) return;
    progress[key] = 1;
    done[key] = true;
    updateBar();
    if (done.glb && done.fonts && done.images) scheduleHide();
  }

  // ---- GLB (chargé par scene.js) ----
  // scene.js instancie `new GLTFLoader()` sans manager explicite, donc
  // il utilise THREE.DefaultLoadingManager — on écoute celui-ci plutôt
  // que de télécharger le modèle une 2e fois pour suivre sa progression.
  THREE.DefaultLoadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
    progress.glb = itemsTotal ? itemsLoaded / itemsTotal : 1;
    updateBar();
  };
  THREE.DefaultLoadingManager.onLoad = () => markDone("glb");
  // Un modèle qui échoue à charger ne doit pas condamner l'écran de
  // chargement à rester affiché indéfiniment : scene.js log déjà
  // l'erreur de son côté (voir sa fonction onError).
  THREE.DefaultLoadingManager.onError = () => markDone("glb");

  // ---- Polices custom (Edition / Pressio) ----
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => markDone("fonts"));
  } else {
    markDone("fonts");
  }

  // ---- Images déjà présentes dans le markup ----
  const images = Array.from(document.images);
  if (images.length) {
    let loaded = 0;
    images.forEach((img) => {
      const onOne = () => {
        loaded += 1;
        progress.images = loaded / images.length;
        if (loaded === images.length) markDone("images");
        else updateBar();
      };
      if (img.complete) onOne();
      else {
        img.addEventListener("load", onOne, { once: true });
        img.addEventListener("error", onOne, { once: true });
      }
    });
  } else {
    markDone("images");
  }

  // ---- Filet de sécurité ----
  // Si un asset traîne ou échoue silencieusement, on ne laisse jamais
  // l'écran de chargement bloquer l'accès au site. Abaissé de 6000 à
  // 4000 puis 3000ms : sur mobile, mieux vaut révéler le site (quitte
  // à ce que le modèle 3D finisse de se charger discrètement derrière)
  // que de faire poireauter la personne sur l'écran de chargement.
  const MAX_WAIT = 3000;
  const safety = setTimeout(() => {
    markDone("glb");
    markDone("fonts");
    markDone("images");
  }, MAX_WAIT);

  let hidden = false;
  let hideTimer = null;

  // Tout est prêt, mais on respecte quand même la durée minimale
  // d'affichage — évite un flash trop bref sur bonne connexion.
  function scheduleHide() {
    if (hideTimer || hidden) return;
    const elapsed = performance.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY - elapsed);
    hideTimer = setTimeout(hidePreloader, remaining);
  }

  function hidePreloader() {
    if (hidden) return;
    hidden = true;
    clearTimeout(safety);
    preloader.classList.add("is-hidden");
    document.documentElement.classList.remove("is-loading");
    preloader.setAttribute("aria-hidden", "true");
    // On attend la fin du fondu (voir transition CSS) avant de retirer
    // l'écran du DOM.
    setTimeout(() => preloader.remove(), 450);
  }
}
