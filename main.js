/**
 * main.js — interactions générales du site (hors scène 3D) :
 *   - année dynamique dans le footer
 *   - menu burger (mobile)
 *   - switch de langue FR / EN (visuel pour l'instant)
 *   - animations d'apparition au scroll
 *   - envoi du formulaire de contact
 */

// ---------- Hauteur de viewport fiable (--vh) ----------
// `100dvh` en CSS pur devrait suivre en direct la barre d'outils de Safari
// iOS, mais dans les faits ce n'est pas toujours fiable (bug connu) : la
// hauteur ne se recalcule pas toujours correctement, ce qui laisse voir un
// bout du bandeau qui défile sous le hero. On mesure donc la vraie hauteur
// visible en JS et on la réinjecte comme variable CSS.
//
// `window.innerHeight` seul ne suffit pas : au tout premier rendu sur iOS
// Safari, la barre d'outils est encore en train de se rétracter et
// `innerHeight` peut être capturé *avant* la fin de cette animation — le
// hero se calcule alors un peu trop court, laissant apparaître le haut du
// bandeau en dessous. `window.visualViewport` est l'API pensée pour ce cas
// précis : elle reflète la hauteur réellement visible et émet ses propres
// événements `resize`/`scroll` quand la barre d'outils bouge, donc on
// l'utilise en priorité (avec repli sur `innerHeight` si absente).
function setViewportHeightVar() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
}
setViewportHeightVar();
window.addEventListener("resize", setViewportHeightVar);
window.addEventListener("orientationchange", setViewportHeightVar);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", setViewportHeightVar);
  window.visualViewport.addEventListener("scroll", setViewportHeightVar);
}
// Filet de sécurité : sur certains iPhone, l'animation de la barre d'outils
// se termine légèrement après les événements ci-dessus. Un recalcul différé
// juste après le chargement rattrape ce dernier cas.
window.addEventListener("load", () => setTimeout(setViewportHeightVar, 300));

// ---------- Titres pleine largeur ("PORTFOLIO", "GRAPHIC DESIGNER") ----------
// La police Edition a des métriques particulières (glyphes assez étroits) :
// plutôt que de deviner une taille en CSS, on mesure le texte réellement
// rendu (Canvas 2D) et on calcule la taille exacte qui le fait occuper
// 100% de la largeur disponible, quelle que soit la police chargée.
function fitTextToWidth(el, { fontFamily = 'Edition, Oswald, "Arial Narrow", sans-serif', fontWeight = 400, scale = 1, widthRef = null, maxSize = Infinity } = {}) {
  if (!el) return null;
  // La largeur cible est celle de l'élément lui-même (il est en `width:
  // 100%` dans son conteneur) — pas `container.clientWidth`, qui inclurait
  // à tort le padding horizontal du conteneur quand celui-ci en a un
  // (c'est le cas de `.about`). Si l'élément à dimensionner ne peut plus
  // servir de référence de largeur (ex : un item flex comme `.about__title`
  // qui se rétrécit à son contenu), on mesure un autre élément stable via
  // `widthRef` (ici la ligne `.about__title-row` toute entière).
  const measureEl = widthRef || el;
  const targetWidth = measureEl.getBoundingClientRect().width * scale;
  if (!targetWidth) return null;

  const text = el.textContent.trim().toUpperCase();
  const probeSize = 100;
  const canvas = fitTextToWidth._canvas || (fitTextToWidth._canvas = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontWeight} ${probeSize}px ${fontFamily}`;
  const measured = ctx.measureText(text).width;
  if (!measured) return null;

  // Plafond de sécurité : si la police réellement chargée (Edition) a des
  // glyphes plus étroits que prévu au moment du calcul — polices encore en
  // cours de chargement, métriques différentes d'un système à l'autre,
  // etc. — viser 100% de la largeur peut réclamer une taille de police
  // démesurée, puisque le calcul ne fait aucune hypothèse sur la hauteur
  // que ça donnera. `maxSize` (calibré par appelant, voir plus bas) borne
  // toujours la hauteur finale, quelle que soit la largeur du conteneur ou
  // les métriques réelles de la police à ce moment précis.
  const finalSize = Math.min((targetWidth / measured) * probeSize, maxSize);
  el.style.fontSize = `${finalSize}px`;
  return targetWidth;
}

function fitFullWidthText() {
  fitTextToWidth(document.querySelector(".hero__title"), { maxSize: 175 });
  // "About" reste collé à gauche mais on veut qu'il s'étende jusqu'au
  // centre de la page (donc 50% de la largeur du conteneur), pas toute
  // la largeur — d'où scale: 0.5. Comme le titre est maintenant un item
  // flex (rétréci à son contenu), on mesure la largeur cible sur toute
  // la ligne (.about__title-row) plutôt que sur le titre lui-même.
  const aboutTitle = document.querySelector(".about__title");
  fitTextToWidth(aboutTitle, {
    scale: 0.5,
    widthRef: document.querySelector(".about__title-row"),
    maxSize: 190,
  });
  sizeAboutShape();

  // "Work" reprend la taille d'"About", légèrement réduite (0.72x) : à
  // l'identique ça faisait un peu trop massif au-dessus des cartes.
  // `align-items: center` sur .work__head garde le titre bien centré
  // verticalement avec le bouton "See more", peu importe sa taille.
  const workTitle = document.querySelector(".work__title");
  if (workTitle && aboutTitle && aboutTitle.style.fontSize) {
    const aboutSizePx = parseFloat(aboutTitle.style.fontSize);
    if (aboutSizePx) workTitle.style.fontSize = `${aboutSizePx * 0.72}px`;
  }

  // Sur desktop (voir style.css → .work__head, top:100%), le bloc
  // titre/texte/bouton n'est plus superposé aux cartes mais placé
  // juste en dessous, en dehors du flux normal (toujours position:
  // absolute, pour ne pas fausser le centrage vertical des flèches sur
  // les cartes — voir le commentaire détaillé dans style.css). Comme il
  // est hors du flux, la section .work ne réserve pas d'espace pour lui
  // automatiquement : sans mesure réelle, une valeur fixe en CSS finit
  // toujours par être soit trop courte (chevauchement avec la section
  // suivante, "Trusted"), soit trop longue (vide inutile), puisque la
  // taille de "Work" dépend elle-même de celle d'"About" (voir
  // ci-dessus) et varie donc avec chaque largeur d'écran. On mesure
  // donc sa hauteur réellement rendue et on la republie en variable
  // CSS, consommée uniquement par le padding-bottom desktop de .work.
  const workHead = document.querySelector(".work__head");
  if (workHead) {
    const workHeadHeight = workHead.getBoundingClientRect().height;
    if (workHeadHeight) {
      document.querySelector(".work")?.style.setProperty("--work-head-h", `${workHeadHeight}px`);
    }
  }

  // "Contact" occupe toute la largeur disponible dans la carte, comme
  // "PORTFOLIO" dans le hero — légère marge (scale: 0.94) pour ne pas
  // toucher les bords de la carte.
  fitTextToWidth(document.querySelector(".contact__title"), { scale: 0.94, maxSize: 210 });
}

// La forme (flèche/éclair) est un item flex juste à côté du mot "About" —
// `align-items: center` sur .about__title-row les centre automatiquement
// sur le même axe horizontal, quelle que soit la hauteur de chacun. Il ne
// reste donc qu'à fixer la hauteur de la forme, proportionnelle à celle
// du titre (avec un léger débordement au-dessus/en dessous).
function sizeAboutShape() {
  const shape = document.querySelector(".about__shape");
  const title = document.querySelector(".about__title");
  if (!shape || !title) return;

  const overflowFactor = 0.975; // hauteur de la forme = 0.975x la hauteur du titre
  const titleHeight = title.getBoundingClientRect().height;
  if (!titleHeight) return;

  shape.style.height = `${titleHeight * overflowFactor}px`;
  // Correction optique : les majuscules du titre ne remplissent pas
  // exactement leur boîte de ligne (marge résiduelle en bas liée aux
  // métriques de la police), donc `align-items: center` seul laisse un
  // léger décalage visuel — on compense en descendant un peu la forme.
  shape.style.transform = `translateY(${titleHeight * 0.035}px)`;
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(fitFullWidthText);
}
window.addEventListener("load", fitFullWidthText);
fitFullWidthText();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(fitFullWidthText, 120);
});

// ---------- Bandeau "services" (marquee) : attendre les polices ----------
// La police Pressio charge en `font-display: swap` : si le bandeau démarre
// son défilement avant qu'elle soit prête, le texte change de largeur en
// cours d'animation (police de repli → Pressio) et le calcul en `-50%` ne
// correspond plus à la largeur réelle — ça fait sauter/disparaître du texte
// au moment du bouclage. On met donc l'animation en pause tant que les
// polices ne sont pas chargées, et on ne la lance qu'une fois la largeur
// définitive connue.
const marqueeTrack = document.querySelector(".marquee__track");
if (marqueeTrack) {
  marqueeTrack.style.animationPlayState = "paused";
  const startMarquee = () => {
    marqueeTrack.style.animationPlayState = "running";
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startMarquee);
  } else {
    startMarquee();
  }
  // Filet de sécurité si `fonts.ready` ne se résout pas (cas rare) : on
  // démarre quand même après un court délai plutôt que de laisser le
  // bandeau figé.
  setTimeout(startMarquee, 1500);
}

// ---------- Bandeau "Trusted by" (logos) : attendre le chargement des images ----------
// Même piège que le bandeau de services : les SVG des logos n'ont pas de
// width/height fixes (juste un viewBox), donc leur taille réelle n'est
// connue qu'une fois chargés. Si l'animation démarre avant, la largeur de
// la piste change en cours de route et le `-50%` ne tombe plus au bon
// endroit — ça fait sauter/disparaître les logos au moment du bouclage.
const trustedTrack = document.querySelector(".trusted__track");
if (trustedTrack) {
  trustedTrack.style.animationPlayState = "paused";
  const startTrustedMarquee = () => {
    trustedTrack.style.animationPlayState = "running";
  };
  const logos = Array.from(trustedTrack.querySelectorAll("img"));
  Promise.all(
    logos.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()))
  ).then(startTrustedMarquee);
  // Filet de sécurité si le chargement traîne (mobile/connexion lente) :
  // on démarre quand même après un court délai plutôt que de laisser le
  // bandeau figé indéfiniment.
  setTimeout(startTrustedMarquee, 1500);
}

// ---------- Année du footer ----------
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- Traduction FR / EN ----------
//
// Système unique pour tout le site : chaque élément traduisible porte un
// attribut data-fr="..." directement dans son HTML, à côté du texte
// anglais normal. Pour changer une traduction : éditer cet attribut dans
// le fichier HTML concerné (Ctrl+F le texte anglais, l'attribut data-fr
// est juste à côté) — rien à synchroniser dans un dictionnaire séparé.
//
// Pour un champ de formulaire (placeholder), utiliser data-fr-placeholder
// à la place de data-fr.
//
// EXCLUS volontairement (police d'affichage Edition, voir style.css) :
// .hero__title, .about__title, .work__title, .contact__title,
// .section-hero__title — aucun data-fr sur ces éléments, ils ne
// traduisent donc jamais, par design.
//
// Le switch FR/EN (.nav__lang-btn) n'est visible QUE sur la home — sur
// les autres pages il est masqué par .nav.is-scrolled .nav__lang dans
// style.css (nav figée "scrolled" faute de hero). Le choix de langue est
// mémorisé (localStorage) et automatiquement réappliqué au chargement de
// n'importe quelle page du site, avec ou sans switch visible dessus.

let currentLang = "en";

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.setAttribute("lang", lang);

  document.querySelectorAll("[data-fr]").forEach((el) => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    el.innerHTML = lang === "fr" ? el.dataset.fr : el.dataset.en;
  });

  document.querySelectorAll("[data-fr-placeholder]").forEach((el) => {
    if (el.dataset.enPlaceholder === undefined) {
      el.dataset.enPlaceholder = el.getAttribute("placeholder") || "";
    }
    el.setAttribute(
      "placeholder",
      lang === "fr" ? el.dataset.frPlaceholder : el.dataset.enPlaceholder
    );
  });
}

// Messages du statut de formulaire : générés dynamiquement en JS (pas de
// contenu HTML statique auquel accrocher un data-fr), donc restent dans
// un petit dictionnaire dédié — voir setStatus() tout en bas du fichier.
const statusMessages = {
  en: {
    statusSending: "Sending…",
    statusOk: "Message sent — thanks, I'll get back to you shortly!",
    statusErrorSend: "Your message couldn't be sent. Please try again in a moment.",
    statusErrorConn: "Connection failed. Check your connection and try again.",
    statusNoEndpoint: "The form isn't connected to a sending service yet (see js/main.js → FORM_ENDPOINT).",
  },
  fr: {
    statusSending: "Envoi en cours…",
    statusOk: "Message envoyé — merci, je reviens vers vous rapidement !",
    statusErrorSend: "Votre message n'a pas pu être envoyé. Merci de réessayer dans un instant.",
    statusErrorConn: "Échec de connexion. Vérifiez votre connexion et réessayez.",
    statusNoEndpoint: "Le formulaire n'est pas encore connecté à un service d'envoi (voir js/main.js → FORM_ENDPOINT).",
  },
};

document.querySelectorAll(".nav__lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav__lang-btn").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");
    applyLanguage(btn.dataset.lang);
    try {
      localStorage.setItem("cxld-lang", btn.dataset.lang);
    } catch (err) {
      // Stockage indisponible (mode privé strict, etc.) : le switch reste
      // fonctionnel pour la session en cours, juste pas mémorisé au reload.
    }
  });
});

// Appliquer la langue au chargement de CETTE page (avec ou sans switch
// visible dessus — voir le commentaire en tête de section). Par défaut,
// le site s'affiche en français ; le choix explicite de l'utilisateur
// (mémorisé en localStorage) prend le dessus dès qu'il a cliqué une fois.
try {
  const savedLang = localStorage.getItem("cxld-lang");
  const lang = savedLang === "fr" || savedLang === "en" ? savedLang : "fr";
  document.querySelectorAll(".nav__lang-btn").forEach((b) => {
    const active = b.dataset.lang === lang;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  applyLanguage(lang);
} catch (err) {
  // Pas de stockage disponible : on force quand même le français par
  // défaut pour cette page, juste sans mémorisation entre les visites.
  document.querySelectorAll(".nav__lang-btn").forEach((b) => {
    const active = b.dataset.lang === "fr";
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  applyLanguage("fr");
}

// ---------- Menu plein écran ----------
const burger = document.querySelector(".nav__burger");
const menuOverlay = document.getElementById("menu-overlay");
const menuClose = document.querySelector(".menu-overlay__close");

// ---------- Header : fond noir + logo une fois le hero quitté ----------
const navEl = document.querySelector(".nav");
const heroEl = document.getElementById("hero");
if (navEl && heroEl) {
  const navScrollObserver = new IntersectionObserver(
    ([entry]) => {
      navEl.classList.toggle("is-scrolled", !entry.isIntersecting);
    },
    { threshold: 0, rootMargin: "-10% 0px 0px 0px" }
  );
  navScrollObserver.observe(heroEl);
}

function openMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.add("is-open");
  menuOverlay.setAttribute("aria-hidden", "false");
  burger?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden"; // pas de scroll de la page derrière le menu
}
function closeMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove("is-open");
  menuOverlay.setAttribute("aria-hidden", "true");
  burger?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

burger?.addEventListener("click", () => {
  const expanded = burger.getAttribute("aria-expanded") === "true";
  if (expanded) closeMenu();
  else openMenu();
});
menuClose?.addEventListener("click", closeMenu);
// Le bouton "See more" du carrousel "Work" ouvre directement le menu
// (la vraie liste des catégories), plutôt que de renvoyer vers #contact.
document.querySelector("[data-open-menu]")?.addEventListener("click", openMenu);
// Le logo ("retour à la landing page") et les catégories ferment le menu
// une fois cliqués, pour qu'on ne reste pas coincé dessus après avoir
// suivi le lien.
menuOverlay?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// ---------- Bouton "retour en haut" ----------
// Générique : s'active tout seul sur n'importe quelle page qui contient
// le bouton dans son markup (pas seulement les pages "case study").
const backToTopBtn = document.querySelector(".back-to-top");
if (backToTopBtn) {
  const SHOW_AFTER = 40; // px — apparaît dès qu'on commence à scroller, disparaît une fois de retour tout en haut
  const footerEl = document.querySelector(".footer");

  // ---- Ancrage au-dessus du footer ----
  // Le bouton est `position: fixed` (hors de .frame — voir style.css) donc
  // il flotte par-dessus tout le contenu, footer compris, une fois en bas
  // de page. Dès que le haut du footer entre dans la zone qu'occuperait le
  // bouton, on bascule sur `position: absolute` avec un `top` calculé en
  // coordonnées document (voir .is-docked dans style.css) : le bouton se
  // fige juste au-dessus du footer et remonte avec la page au lieu de
  // rester collé par-dessus.
  const getEdge = () => Math.min(28, Math.max(16, window.innerWidth * 0.03)); // réplique clamp(16px, 3vw, 28px) sans dépendre du style calculé du bouton (qui se fausse une fois docké — voir plus bas)
  const updateDock = () => {
    if (!footerEl) return;
    const edge = getEdge();
    const footerTop = footerEl.getBoundingClientRect().top; // relatif au viewport
    const wouldOverlap = footerTop < window.innerHeight - edge;
    if (wouldOverlap) {
      const footerDocTop = footerTop + window.scrollY;
      backToTopBtn.style.top = `${footerDocTop - backToTopBtn.offsetHeight - edge}px`;
      backToTopBtn.style.bottom = "auto";
      backToTopBtn.classList.add("is-docked");
    } else {
      backToTopBtn.style.top = "";
      backToTopBtn.style.bottom = "";
      backToTopBtn.classList.remove("is-docked");
    }
  };

  const onScroll = () => {
    backToTopBtn.classList.toggle("is-visible", window.scrollY > SHOW_AFTER);
    updateDock();
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateDock);

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---------- Apparitions au scroll ----------
// (.work-card est volontairement exclu : ces cartes ont leur propre
// transform fixe — rotation + élévation de l'arc, voir style.css — et
// la règle [data-reveal].is-visible { transform: translateY(0) } de cet
// effet l'écraserait entièrement une fois la carte révélée, aplatissant
// tout l'arc.)
const revealTargets = document.querySelectorAll(
  ".about, .work__head, .trusted, .contact__card, .section-hero, .project-card, .case-hero, .case-section, .case-figure, .case-gallery, .case-meta-strip, .case-colors"
);
revealTargets.forEach((el) => el.setAttribute("data-reveal", ""));

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
);
revealTargets.forEach((el) => revealObserver.observe(el));

// ---------- Carrousel "Work" : centrer la carte du milieu au chargement ----------
// Contrairement à `justify-content: center`, ce calcul en JS n'entre pas
// en conflit avec le scroll natif (certains navigateurs rendent le début
// de la liste inaccessible au scroll quand `justify-content: center` est
// combiné à `overflow-x: auto`). On se contente de positionner le scroll
// une fois au chargement — l'utilisateur peut ensuite scroller librement.
const workCarousel = document.getElementById("work-carousel");
if (workCarousel) {
  const workCards = Array.from(workCarousel.querySelectorAll(".work-card"));

  const centerMiddleWorkCard = () => {
    const middle = workCards[Math.floor(workCards.length / 2)];
    if (!middle) return;
    workCarousel.scrollLeft =
      middle.offsetLeft - workCarousel.clientWidth / 2 + middle.offsetWidth / 2;
  };
  window.addEventListener("load", centerMiddleWorkCard);
  window.addEventListener("resize", centerMiddleWorkCard);
  centerMiddleWorkCard();

  // ---- Arc dynamique + focus pendant le scroll ----
  // À chaque frame de scroll, on mesure la distance de chaque carte au
  // centre du cadre (en "largeurs de carte") et on en déduit :
  //  - une rotation qui s'annule au centre et augmente en s'éloignant ;
  //  - une élévation (cosinus) : la carte au centre est la plus haute ;
  //  - une échelle : la carte au centre grossit légèrement (focus).
  // Comme tout est recalculé en fonction de la position réelle du
  // scroll, l'arc "tourne" avec le carrousel — ce n'est jamais telle ou
  // telle carte qui est droite, mais toujours celle qui est au centre.
  const jitter = [-2, 1.2, -1, 1.5, -1.6]; // petit écart fixe par carte, pour casser l'aspect trop régulier

  const ARC_SPAN = 2.8;      // distance (en cartes) au-delà de laquelle l'arc est plat
  const MAX_ROTATE = 5;      // degrés de rotation par carte de distance au centre
  const MAX_LIFT = 24;       // px : écart d'élévation entre le centre et le bord de l'arc

  const FOCUS_SPAN = 1.15;     // distance (en cartes) au-delà de laquelle il n'y a plus aucun focus — plus large = transition plus progressive
  const MAX_SCALE_BOOST = 0.05; // grossissement max de la carte au centre
  const MAX_SCALE_SHRINK = 0.02; // quasi rien pour les autres — le focus doit rester ponctuel

  function applyWorkArc() {
    // Distance calculée à partir de la géométrie de mise en page pure
    // (offsetLeft/scrollLeft), PAS depuis getBoundingClientRect (qui
    // reflète le transform déjà appliqué). Avec `transform-origin: bottom
    // center`, une carte tournée a un rectangle visuel dont le centre
    // n'est plus exactement son centre de mise en page — mesurer sur ce
    // rectangle créait une boucle de rétroaction qui l'empêchait de
    // jamais atteindre delta = 0 pile, donc de finir parfaitement
    // centrée/verticale après un clic sur une flèche.
    const scrollCenter = workCarousel.scrollLeft + workCarousel.clientWidth / 2;

    workCards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const delta = (cardCenter - scrollCenter) / card.offsetWidth; // signé : négatif = à gauche du centre
      const absDelta = Math.abs(delta);

      const clampedArc = Math.max(-ARC_SPAN, Math.min(ARC_SPAN, delta));
      const focusLinear = Math.max(0, 1 - Math.min(absDelta, FOCUS_SPAN) / FOCUS_SPAN);
      // Smoothstep plutôt qu'une pente droite : le focus reste proche de
      // 0 tant qu'on n'est pas presque au centre, puis "pop" nettement
      // sur la carte réellement centrée, au lieu de s'étaler doucement
      // sur ses voisines.
      const focus = focusLinear * focusLinear * (3 - 2 * focusLinear);
      // Le jitter (irrégularité fixe par carte) s'efface complètement au
      // focus : sans ça, la carte pile au centre garderait quand même
      // quelques degrés d'inclinaison au lieu d'être parfaitement à la
      // verticale.
      const rotate = clampedArc * MAX_ROTATE + jitter[i % jitter.length] * (1 - focus);
      const lift = (1 - Math.cos((clampedArc / ARC_SPAN) * (Math.PI / 2))) * MAX_LIFT;

      const scale = 1 - MAX_SCALE_SHRINK * (1 - focus) + MAX_SCALE_BOOST * focus;

      card.style.setProperty("--work-rotate", `${rotate.toFixed(2)}deg`);
      card.style.setProperty("--work-lift", `${lift.toFixed(1)}px`);
      card.style.setProperty("--work-scale", scale.toFixed(3));
      card.style.setProperty("--work-glow", (focus * 0.4).toFixed(3));
    });
  }

  let workLoopRaf = null;

  function workLoopTick() {
    applyWorkArc();
    workLoopRaf = requestAnimationFrame(workLoopTick);
  }
  function startWorkLoop() {
    if (workLoopRaf) return;
    workLoopTick();
  }
  function stopWorkLoop() {
    if (workLoopRaf) cancelAnimationFrame(workLoopRaf);
    workLoopRaf = null;
  }

  // Boucle continue plutôt qu'un recalcul déclenché par l'événement
  // `scroll` : pendant un scroll inertiel (relâcher le doigt sur
  // mobile), le navigateur peut espacer/regrouper les événements
  // `scroll` de façon irrégulière, ce qui donnait des à-coups visibles
  // sur la rotation/l'élévation des cartes. En lisant `scrollLeft` à
  // chaque frame de rendu (rAF) au lieu d'attendre l'événement, l'arc
  // reste parfaitement synchronisé avec le défilement natif, aussi
  // fluide que le scroll lui-même.
  // La boucle ne tourne que pendant que le carrousel est visible à
  // l'écran (IntersectionObserver) : coût nul le reste du temps.
  if ("IntersectionObserver" in window) {
    const workVisibility = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) startWorkLoop();
          else stopWorkLoop();
        });
      },
      { threshold: 0.01 }
    );
    workVisibility.observe(workCarousel);
  } else {
    // Filet de sécurité pour les très vieux navigateurs sans IntersectionObserver.
    startWorkLoop();
  }

  applyWorkArc();

  // ---- Flèches précédente/suivante ----
  // Plutôt que de scroller d'une distance calculée (imprécise à cause du
  // scale dynamique des cartes, qui faussait la mesure et faisait sauter
  // une carte sur deux), on repère l'index de la carte réellement la plus
  // proche du centre, puis on cible directement l'index voisin — même
  // logique que le centrage initial, donc toujours exact.
  const prevArrow = document.querySelector(".work__arrow--prev");
  const nextArrow = document.querySelector(".work__arrow--next");

  function currentWorkCenterIndex() {
    const scrollCenter = workCarousel.scrollLeft + workCarousel.clientWidth / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    workCards.forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - scrollCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    return closestIndex;
  }

  // Scroll animé "maison" plutôt que `scrollTo({behavior:'smooth'})` : la
  // durée du smooth scroll natif est fixée par le navigateur (souvent
  // très courte), ce qui faisait traverser tout l'arc/le focus en un
  // clin d'œil et donnait un effet brusque au clic sur une flèche. Ici on
  // contrôle la durée et l'easing nous-mêmes, pour un mouvement bien plus
  // doux et progressif.
  let workScrollAnim = null;
  function animateWorkScrollTo(target, duration = 650) {
    if (workScrollAnim) cancelAnimationFrame(workScrollAnim);
    const start = workCarousel.scrollLeft;
    const distance = target - start;
    const startTime = performance.now();
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Le scroll-snap natif du navigateur (`scroll-snap-type: x proximity`)
    // essayait de "corriger" la position à chaque frame pendant qu'on la
    // fixait nous-mêmes en JS — les deux se battaient, ce qui cassait
    // l'animation (à-coups, retours en arrière). On le coupe le temps de
    // l'animation, et on le restaure une fois arrivé.
    workCarousel.style.scrollSnapType = "none";

    function step(now) {
      const elapsed = Math.min(1, (now - startTime) / duration);
      workCarousel.scrollLeft = start + distance * easeInOutCubic(elapsed);
      if (elapsed < 1) {
        workScrollAnim = requestAnimationFrame(step);
      } else {
        workScrollAnim = null;
        workCarousel.style.scrollSnapType = "";
      }
    }
    workScrollAnim = requestAnimationFrame(step);
  }

  function scrollToWorkIndex(index) {
    const clamped = Math.max(0, Math.min(workCards.length - 1, index));
    const card = workCards[clamped];
    if (!card) return;
    const target = card.offsetLeft - workCarousel.clientWidth / 2 + card.offsetWidth / 2;
    animateWorkScrollTo(target);
  }

  prevArrow?.addEventListener("click", () => scrollToWorkIndex(currentWorkCenterIndex() - 1));
  nextArrow?.addEventListener("click", () => scrollToWorkIndex(currentWorkCenterIndex() + 1));

  // ---- Glisser-déposer à la souris (desktop uniquement) ----
  // Le carrousel ne se pilotait qu'au trackpad/molette ou tactile —
  // sur desktop à la souris, rien ne permettait de le faire défiler
  // "à la main". `pointerType === "mouse"` isole ce comportement de la
  // souris : le tactile garde son scroll natif intact (déjà fluide),
  // seule la souris gagne ce glisser-déposer, cohérent avec le curseur
  // grab/grabbing posé en CSS (voir style.css → .work__carousel).
  let workDrag = null;
  let workDragMoved = false;
  workCarousel.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    if (workScrollAnim) cancelAnimationFrame(workScrollAnim);
    workDrag = { startX: e.clientX, scrollStart: workCarousel.scrollLeft };
    workDragMoved = false;
    workCarousel.setPointerCapture(e.pointerId);
    workCarousel.style.scrollSnapType = "none";
  });
  workCarousel.addEventListener("pointermove", (e) => {
    if (!workDrag || e.pointerType !== "mouse") return;
    const dx = e.clientX - workDrag.startX;
    if (Math.abs(dx) > 3) workDragMoved = true;
    workCarousel.scrollLeft = workDrag.scrollStart - dx;
  });
  function endWorkDrag(e) {
    if (!workDrag || e.pointerType !== "mouse") return;
    workDrag = null;
    workCarousel.style.scrollSnapType = "";
    // Sans ça, réactiver le snap ci-dessus aligne instantanément sur la
    // position déjà "accrochée" la plus proche — souvent celle de
    // départ si le glisser n'a pas suffi à dépasser son seuil de
    // proximité, ce qui annulait purement et simplement le glisser aux
    // yeux de la personne. On calcule explicitement la carte la plus
    // proche de LÀ où le glisser s'est arrêté et on y anime le scroll
    // (même logique que les flèches), pour que le carrousel "retienne"
    // le geste au lieu de revenir en arrière.
    if (workDragMoved) {
      scrollToWorkIndex(currentWorkCenterIndex());
    }
  }
  workCarousel.addEventListener("pointerup", endWorkDrag);
  workCarousel.addEventListener("pointercancel", endWorkDrag);
  workCarousel.addEventListener("pointerleave", endWorkDrag);
  // Évite qu'un glisser-déposer (même minime) ne déclenche aussi le
  // lien de la carte en dessous du curseur au relâchement.
  workCarousel.addEventListener(
    "click",
    (e) => {
      if (workDragMoved) {
        e.preventDefault();
        workDragMoved = false;
      }
    },
    { capture: true }
  );
}

// ---------- Formulaire de contact ----------
//
// Aucun backend maison : le formulaire poste vers Formspree
// (https://formspree.io), configuré pour envoyer à cold.prod28@gmail.com.
// Pour changer d'adresse ou de compte Formspree plus tard, remplace
// simplement la valeur de FORM_ENDPOINT ci-dessous par la nouvelle URL.
const FORM_ENDPOINT = "https://formspree.io/f/xpqvbabv";

const form = document.getElementById("contact-form");
const statusEl = document.getElementById("contact-status");
const submitBtn = form?.querySelector(".btn-connect");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  if (!FORM_ENDPOINT) {
    setStatus("statusNoEndpoint", "error");
    return;
  }

  const data = new FormData(form);
  submitBtn?.setAttribute("disabled", "true");
  setStatus("statusSending", null);

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      form.reset();
      setStatus("statusOk", "ok");
    } else {
      setStatus("statusErrorSend", "error");
    }
  } catch (err) {
    setStatus("statusErrorConn", "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});

// `key` référence une entrée du dictionnaire i18n plutôt qu'un texte en
// dur, pour que le statut s'affiche toujours dans la langue active
// (currentLang, mise à jour par applyLanguage() — voir plus haut).
function setStatus(key, state) {
  if (!statusEl) return;
  statusEl.textContent = statusMessages[currentLang][key];
  if (state) statusEl.setAttribute("data-state", state);
  else statusEl.removeAttribute("data-state");
}
