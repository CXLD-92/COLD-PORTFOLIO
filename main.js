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
function fitTextToWidth(el, { fontFamily = 'Edition, Oswald, "Arial Narrow", sans-serif', fontWeight = 400, scale = 1, widthRef = null } = {}) {
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

  const finalSize = (targetWidth / measured) * probeSize;
  el.style.fontSize = `${finalSize}px`;
  return targetWidth;
}

function fitFullWidthText() {
  fitTextToWidth(document.querySelector(".hero__title"));
  // "About" reste collé à gauche mais on veut qu'il s'étende jusqu'au
  // centre de la page (donc 50% de la largeur du conteneur), pas toute
  // la largeur — d'où scale: 0.5. Comme le titre est maintenant un item
  // flex (rétréci à son contenu), on mesure la largeur cible sur toute
  // la ligne (.about__title-row) plutôt que sur le titre lui-même.
  const aboutTitle = document.querySelector(".about__title");
  fitTextToWidth(aboutTitle, {
    scale: 0.5,
    widthRef: document.querySelector(".about__title-row"),
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

  // "Contact" occupe toute la largeur disponible dans la carte, comme
  // "PORTFOLIO" dans le hero — légère marge (scale: 0.94) pour ne pas
  // toucher les bords de la carte.
  fitTextToWidth(document.querySelector(".contact__title"), { scale: 0.94 });
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

// ---------- Switch de langue (état visuel — brancher une vraie i18n plus tard) ----------
document.querySelectorAll(".nav__lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav__lang-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

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
// Le logo ("retour à la landing page") et les catégories ferment le menu
// une fois cliqués, pour qu'on ne reste pas coincé dessus après avoir
// suivi le lien.
menuOverlay?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// ---------- Apparitions au scroll ----------
// (.work-card est volontairement exclu : ces cartes ont leur propre
// transform fixe — rotation + élévation de l'arc, voir style.css — et
// la règle [data-reveal].is-visible { transform: translateY(0) } de cet
// effet l'écraserait entièrement une fois la carte révélée, aplatissant
// tout l'arc.)
const revealTargets = document.querySelectorAll(
  ".about, .work__head, .trusted, .contact__card"
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

  let workFocusTicking = false;

  function applyWorkArc() {
    workFocusTicking = false;
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

  function requestWorkFocusUpdate() {
    if (!workFocusTicking) {
      workFocusTicking = true;
      requestAnimationFrame(applyWorkArc);
    }
  }

  workCarousel.addEventListener("scroll", requestWorkFocusUpdate, { passive: true });
  window.addEventListener("resize", requestWorkFocusUpdate);
  window.addEventListener("load", applyWorkArc);
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
}

// ---------- Formulaire de contact ----------
//
// Aucun backend maison : le formulaire poste vers un service tiers.
// Remplace la valeur de FORM_ENDPOINT par l'URL de ton formulaire
// Formspree (https://formspree.io) une fois ton compte créé, par ex :
//   const FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";
// Tant que ce n'est pas configuré, le formulaire affiche un message
// clair au lieu d'échouer silencieusement.
const FORM_ENDPOINT = ""; // ← à compléter

const form = document.getElementById("contact-form");
const statusEl = document.getElementById("contact-status");
const submitBtn = form?.querySelector(".btn-connect");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  if (!FORM_ENDPOINT) {
    setStatus(
      "The form isn't connected to a sending service yet (see js/main.js → FORM_ENDPOINT).",
      "error"
    );
    return;
  }

  const data = new FormData(form);
  submitBtn?.setAttribute("disabled", "true");
  setStatus("Sending…", null);

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      form.reset();
      setStatus("Message sent — thanks, I'll get back to you shortly!", "ok");
    } else {
      setStatus("Your message couldn't be sent. Please try again in a moment.", "error");
    }
  } catch (err) {
    setStatus("Connection failed. Check your connection and try again.", "error");
  } finally {
    submitBtn?.removeAttribute("disabled");
  }
});

function setStatus(message, state) {
  if (!statusEl) return;
  statusEl.textContent = message;
  if (state) statusEl.setAttribute("data-state", state);
  else statusEl.removeAttribute("data-state");
}
