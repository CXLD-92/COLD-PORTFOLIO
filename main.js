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

// ---------- Switch de langue FR / EN ----------
//
// Ne couvre que le contenu texte de la page d'accueil. Volontairement
// exclus : les <h1> composés dans la police d'affichage Edition
// (.hero__title "Portfolio", .about__title "About") — ce sont des
// éléments de composition graphique (grande typo décorative), pas du
// contenu éditorial à traduire. Tout le reste (nav, menu plein écran,
// marquee, about, work, trusted, contact, statuts du formulaire) l'est.
const i18n = {
  en: {
    navWork: "Work",
    menuCertifTitle: "Certifications",
    menuCertifSub: "Reward design",
    menuMusicTitle: "Music",
    menuMusicSub: "Artistic direction",
    menuMediaTitle: "Media",
    menuMediaSub: "Visual identity",
    menuBrandTitle: "Brand design",
    menuBrandSub: "Identity & branding",
    aboutText:
      "My name is Kylian, I\u2019m 21 years old, and I\u2019m a French graphic designer working under the name COLD PRODUCTION. I\u2019m a freelance graphic designer specializing in visual identity for the music industry, including album covers and brand design. Over the past two years, I\u2019ve had the opportunity to work with influential artists, major media outlets, and companies across Europe, which has allowed me to grow while striving to create striking visuals with undeniable originality. Every project is a chance to transform an idea into something that leaves a lasting impression. Let\u2019s build something powerful together.",
    inquiries: "Worldwide inquiries",
    workCta: "My projects",
    workSubtitle: "From idea to identity, every project is a chance to build work that leaves a mark.",
    trustedLabel: "Trusted by",
    contactEyebrow: "Shoot me an e-mail",
    labelName: "What is your name?",
    labelEmail: "What is your e-mail?",
    labelSubject: "What is your project?",
    labelMessage: "Tell me more about it!",
    placeholderName: "Nickname, first & last name\u2026",
    placeholderSubject: "Subject of your request",
    placeholderMessage: "Additional details (optional)",
    connect: "Let's connect",
    statusSending: "Sending\u2026",
    statusOk: "Message sent \u2014 thanks, I'll get back to you shortly!",
    statusErrorSend: "Your message couldn't be sent. Please try again in a moment.",
    statusErrorConn: "Connection failed. Check your connection and try again.",
    statusNoEndpoint: "The form isn't connected to a sending service yet (see js/main.js \u2192 FORM_ENDPOINT).",
  },
  fr: {
    navWork: "Travaux",
    menuCertifTitle: "Certifications",
    menuCertifSub: "Design de r\u00e9compenses",
    menuMusicTitle: "Musique",
    menuMusicSub: "Direction artistique",
    menuMediaTitle: "M\u00e9dia",
    menuMediaSub: "Identit\u00e9 visuelle",
    menuBrandTitle: "Identit\u00e9 de marque",
    menuBrandSub: "Identit\u00e9 & branding",
    aboutText:
      "Je m'appelle Kylian, j'ai 21 ans, et je suis graphiste fran\u00e7ais travaillant sous le nom de COLD PRODUCTION. Je suis graphiste ind\u00e9pendant, sp\u00e9cialis\u00e9 dans l'identit\u00e9 visuelle pour l'industrie musicale, notamment les pochettes d'album et le brand design. Ces deux derni\u00e8res ann\u00e9es, j'ai eu l'opportunit\u00e9 de travailler avec des artistes influents, de grands m\u00e9dias et des entreprises \u00e0 travers l'Europe, ce qui m'a permis de progresser tout en cherchant \u00e0 cr\u00e9er des visuels marquants \u00e0 l'originalit\u00e9 ind\u00e9niable. Chaque projet est l'occasion de transformer une id\u00e9e en quelque chose qui laisse une empreinte durable. Construisons ensemble quelque chose de puissant.",
    inquiries: "Disponible pour des projets dans le monde entier",
    workCta: "Mes projets",
    workSubtitle: "De l'id\u00e9e \u00e0 l'identit\u00e9, chaque projet est l'occasion de construire un travail qui marque les esprits.",
    trustedLabel: "Ils m'ont fait confiance",
    contactEyebrow: "Envoie-moi un e-mail",
    labelName: "Quel est votre nom\u00a0?",
    labelEmail: "Quel est votre e-mail\u00a0?",
    labelSubject: "Quel est votre projet\u00a0?",
    labelMessage: "Parlez-m'en davantage\u00a0!",
    placeholderName: "Surnom, pr\u00e9nom & nom\u2026",
    placeholderSubject: "Objet de votre demande",
    placeholderMessage: "D\u00e9tails suppl\u00e9mentaires (optionnel)",
    connect: "Connectons-nous",
    statusSending: "Envoi en cours\u2026",
    statusOk: "Message envoy\u00e9 \u2014 merci, je reviens vers vous rapidement\u00a0!",
    statusErrorSend: "Votre message n'a pas pu \u00eatre envoy\u00e9. Merci de r\u00e9essayer dans un instant.",
    statusErrorConn: "\u00c9chec de connexion. V\u00e9rifiez votre connexion et r\u00e9essayez.",
    statusNoEndpoint: "Le formulaire n'est pas encore connect\u00e9 \u00e0 un service d'envoi (voir js/main.js \u2192 FORM_ENDPOINT).",
  },
};

let currentLang = "en";

function applyLanguage(lang) {
  const t = i18n[lang];
  if (!t) return;
  currentLang = lang;
  document.documentElement.setAttribute("lang", lang);

  const setText = (selector, key) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = t[key];
  };
  const setPlaceholder = (selector, key) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("placeholder", t[key]);
  };

  setText('.nav__links a[href$="#work"]', "navWork");

  setText('.menu-overlay__item[href="certifications.html"] .menu-overlay__item-title', "menuCertifTitle");
  setText('.menu-overlay__item[href="certifications.html"] .menu-overlay__item-sub', "menuCertifSub");
  setText('.menu-overlay__item[href="music.html"] .menu-overlay__item-title', "menuMusicTitle");
  setText('.menu-overlay__item[href="music.html"] .menu-overlay__item-sub', "menuMusicSub");
  setText('.menu-overlay__item[href="media.html"] .menu-overlay__item-title', "menuMediaTitle");
  setText('.menu-overlay__item[href="media.html"] .menu-overlay__item-sub', "menuMediaSub");
  setText('.menu-overlay__item[href="brand-design.html"] .menu-overlay__item-title', "menuBrandTitle");
  setText('.menu-overlay__item[href="brand-design.html"] .menu-overlay__item-sub', "menuBrandSub");

  // Le bandeau défilant (.marquee__item / .sr-only) reste volontairement
  // en anglais dans les deux langues — pas de traduction ici.

  setText(".about__text", "aboutText");
  setText(".about__inquiries-text", "inquiries");

  // .work__title et .contact__title sont EXCLUS volontairement : ce sont
  // aussi des éléments en police Edition (voir .work__title / .contact__title
  // dans style.css), au même titre que .hero__title et .about__title — la
  // règle d'exclusion porte sur la police utilisée, pas sur le tag HTML.
  const workCtaSpan = document.querySelector(".work__cta span");
  if (workCtaSpan) workCtaSpan.textContent = t.workCta;
  setText(".work__subtitle", "workSubtitle");

  setText(".trusted__label", "trustedLabel");

  setText(".contact__eyebrow", "contactEyebrow");
  setText('label[for="cf-name"]', "labelName");
  setText('label[for="cf-email"]', "labelEmail");
  setText('label[for="cf-subject"]', "labelSubject");
  setText('label[for="cf-message"]', "labelMessage");
  setPlaceholder("#cf-name", "placeholderName");
  setPlaceholder("#cf-subject", "placeholderSubject");
  setPlaceholder("#cf-message", "placeholderMessage");
  const connectSpan = document.querySelector(".btn-connect span");
  if (connectSpan) connectSpan.textContent = t.connect;

  translateSitewideCaseContent(lang);
}

// ---------- Traduction du reste du site (pages catégories + études de cas) ----------
//
// Ces pages (certifications-*, music-*, media-*, brand-design.html) ont
// chacune leur propre texte, trop nombreux pour être listés un par un comme
// au-dessus. Plutôt que d'écrire un sélecteur par page, on traduit ici par
// correspondance de texte : chaque élément ciblé garde son texte original en
// mémoire (attribut data-i18n-src, rempli une seule fois au premier passage)
// et on cherche ce texte original dans caseDict pour trouver sa traduction.
// Un texte absent du dictionnaire (page pas encore couverte) reste affiché
// tel quel plutôt que de disparaître.
//
// .section-hero__title (h1, page catégories) reste EXCLU comme les autres
// titres en police Edition — seul .section-hero__subtitle est traduit.
//
// Les libellés de .case-hero__meta / .case-meta-strip (ex : "Client",
// "Mission"...) sont traduits à part (metaLabelDict), car ce sont des
// <span> isolés à l'intérieur d'un <li>/<div> qui contient aussi une valeur
// (nom d'artiste, date...) à ne surtout pas traduire.
const metaLabelDict = {
  Client: "Client",
  Mission: "Mission",
  Streams: "Streams",
  Delivered: "Livr\u00e9",
  "Feat.": "Feat.",
  Single: "Single",
  Projects: "Projets",
  "Featured artists": "Artistes invit\u00e9s",
  Certified: "Certifi\u00e9",
  "Numbers of viusals": "Nombre de visuels",
};

function htmlToText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent.replace(/\s+/g, " ").trim();
}

const caseDict = {
  // --- certifications.html ---
  [`Graphic design for music certifications for influential artists`]: `Design graphique pour les certifications musicales d'artistes influents`,
  [`Multiple certification production`]: `Production de plusieurs certifications`,
  [`Diamond certification design`]: `Design de certification diamant`,
  [`Golden certification design`]: `Design de certification or`,

  // --- certifications-la-fouine.html ---
  [`Golden certifications artwork design`]: `Design de visuels de certifications or`,
  [`The biggest project to date. Certification artwork across three of La Fouine's music projects, produced for one of French rap's most established names and everyone who stood alongside him on these records.`]: `Le plus gros projet \u00e0 ce jour. Visuels de certification sur trois projets musicaux de La Fouine, r\u00e9alis\u00e9s pour l'un des noms les plus \u00e9tablis du rap fran\u00e7ais et tous ceux qui l'ont accompagn\u00e9 sur ces disques.`,
  [`My biggest project to date`]: `Mon plus gros projet \u00e0 ce jour`,
  [`The brief covered every single artwork and every gold record certification tied to those releases. A volume of work that meant constant back and forth, tight deadlines, and a level of coordination this studio hadn't been asked for before.`]: `Le brief couvrait chaque visuel single et chaque certification disque d'or li\u00e9e \u00e0 ces sorties. Un volume de travail qui a demand\u00e9 des allers-retours constants, des d\u00e9lais serr\u00e9s, et un niveau de coordination que ce studio n'avait encore jamais eu \u00e0 g\u00e9rer.`,
  [`None of it happens without the trust of La Fouine's management and Sommet Cr\u00e9ation, who brought this project in and let it run at the scale it needed. A huge thank you to both for the opportunity, and for the confidence over months of production.`]: `Rien de tout cela n'aurait \u00e9t\u00e9 possible sans la confiance du <strong>management de La Fouine</strong> et de <strong>Sommet Cr\u00e9ation</strong>, qui ont apport\u00e9 ce projet et l'ont laiss\u00e9 se d\u00e9ployer \u00e0 la hauteur de ses besoins. Un immense merci aux deux pour l'opportunit\u00e9, et pour la confiance accord\u00e9e durant des mois de production.`,  [`One of the certification plaques, handed over live for the release party of the new album`]: `L'une des plaques de certification, remise en live lors de la release party du nouvel album`,
  [`One headline artist, an entire cast honored`]: `Un artiste en t\u00eate d'affiche, toute une \u00e9quipe honor\u00e9e`,
  [`La Fouine fronts these releases, but he is not the only name on this project. Every artist who featured on one of these three projects received their own personalized frame \u2014 among them Ninho, Sofiane, L2B, Himra, and several others. Beyond the featured artists, plaques were also produced for the producers, sound engineers, composers and artistic directors who worked on the records. everyone who put their hands on the project got to hold a piece of what it became.`]: `La Fouine porte ces sorties, mais il n'est pas le seul nom sur ce projet. Chaque artiste pr\u00e9sent sur l'un de ces trois projets a re\u00e7u son propre cadre personnalis\u00e9 \u2014 parmi eux <strong>Ninho</strong>, <strong>Sofiane</strong>, <strong>L2B</strong>, <strong>Himra</strong>, et plusieurs autres. Au-del\u00e0 des featurings, des plaques ont aussi \u00e9t\u00e9 produites pour les producteurs, ing\u00e9nieurs du son, compositeurs et directeurs artistiques ayant travaill\u00e9 sur les disques. Tous ceux qui ont mis la main au projet ont pu tenir entre leurs mains un morceau de ce qu'il est devenu.`,  [`Part of one single batch. Dozens of plaques produced for the release party.`]: `Une partie d'un seul et m\u00eame lot. Des dizaines de plaques produites pour la release party.`,
  [`Live at the Z\u00e9nith de Paris. A certification handed over on stage, in front of thousands.`]: `En direct du Z\u00e9nith de Paris. Une certification remise sur sc\u00e8ne, devant des milliers de personnes.`,
  [`Himra, holding his own certification on the same Z\u00e9nith stage.`]: `Himra, tenant sa propre certification sur cette m\u00eame sc\u00e8ne du Z\u00e9nith.`,
  [`From mockup to plaque`]: `De la maquette \u00e0 la plaque`,
  [`Every certification started as a full artwork mockup. built and refined until it was ready to validate with the teams before going to physical production. Each one meant the same discipline as a cover: typography set and adjusted by hand, logos placed and resized to sit cleanly against the record, layout balanced so the certification text never fought with the artwork behind it. At this scale, consistency mattered as much as any single design. Every plaque had to feel unmistakably part of the same family, whichever project or artist it belonged to.`]: `Chaque certification a commenc\u00e9 comme une maquette compl\u00e8te du visuel, construite et affin\u00e9e jusqu'\u00e0 \u00eatre pr\u00eate \u00e0 valider avec les \u00e9quipes avant de passer en production physique. Chacune demandait la m\u00eame rigueur qu'une pochette : typographie ajust\u00e9e \u00e0 la main, logos plac\u00e9s et redimensionn\u00e9s pour s'accorder proprement au disque, mise en page \u00e9quilibr\u00e9e pour que le texte de certification ne vienne jamais g\u00eaner le visuel derri\u00e8re. \u00c0 cette \u00e9chelle, la coh\u00e9rence comptait autant que chaque design pris isol\u00e9ment. Chaque plaque devait se sentir indiscutablement de la m\u00eame famille, quel que soit le projet ou l'artiste auquel elle appartenait.`,
  [`Mockup "\u00c9tat des lieux," La Fouine feat. Ninho, certification awarded to Ninho.`]: `Maquette \u2014 "\u00c9tat des lieux," La Fouine feat. Ninho, certification remise \u00e0 Ninho.`,
  [`Mockup "Flying Blue," La Fouine, certification awarded to L2B.`]: `Maquette \u2014 "Flying Blue," La Fouine, certification remise \u00e0 L2B.`,
  [`Mockup "Capitale du Crime Radio," gold record awarded to La Fouine.`]: `Maquette \u2014 "Capitale du Crime Radio," disque d'or remis \u00e0 La Fouine.`,
  [`Extract from "Kizomba," featuring R2. one of the many singles covered across this campaign.`]: `Extrait de "Kizomba," feat. R2. L'un des nombreux singles couverts par cette campagne.`,

  // --- certifications-balade-1d1r.html ---
  [`Diamond certification artwork design`]: `Design de visuel de certification diamant`,
  [`Certification artwork for "Balade," 1D1R feat. Vacra. a single that crossed 50 million streams equivalent sales, earning it a diamond certification.`]: `Visuel de certification pour "Balade," 1D1R feat. Vacra, un single ayant franchi les 50 millions de streams \u00e9quivalent ventes, lui valant une certification diamant.`,
  [`A diamond for "Balade"`]: `Un disque de diamant pour "Balade"`,
  [`"Balade" pairs 1D1R and Vacra on a single that went on to cross 50 million streams equivalent sales enough for a diamond certification, the highest tier a record can reach. The brief was the certification artwork itself: a piece built to be printed, framed, and handed over on stage in front of the crowd that made those numbers possible.`]: `"Balade" r\u00e9unit 1D1R et Vacra sur un single ayant franchi les 50 millions de streams \u00e9quivalent ventes assez pour une certification diamant, le plus haut palier qu'un disque puisse atteindre. Le brief portait sur le visuel de certification lui-m\u00eame : une pi\u00e8ce con\u00e7ue pour \u00eatre imprim\u00e9e, encadr\u00e9e, et remise sur sc\u00e8ne devant le public qui a rendu ces chiffres possibles.`,
  [`Live at the Cirque d'Hiver, Paris, April 29, 2026. The diamond plaque handed over on stage.`]: `En direct du Cirque d'Hiver, Paris, 29 avril 2026. La plaque de diamant remise sur sc\u00e8ne.`,
  [`Extract from the presentation the plaque held up in front of the crowd.`]: `Extrait de la pr\u00e9sentation la plaque brandie devant le public.`,
  [`Before going to physical production, the artwork went through a full mockup, the diamond record built to sit cleanly behind the title, and the certification band balanced against the photo below. Once validated with the teams, this exact layout became the plaque handed over at the Cirque d'Hiver.`]: `Avant de passer en production physique, le visuel est pass\u00e9 par une maquette compl\u00e8te le disque de diamant construit pour s'aligner proprement derri\u00e8re le titre, et le bandeau de certification \u00e9quilibr\u00e9 avec la photo en dessous. Une fois valid\u00e9e avec les \u00e9quipes, cette mise en page exacte est devenue la plaque remise au Cirque d'Hiver.`,
  [`Mockup \u2014 "Balade," 1D1R feat. Vacra, diamond single certification awarded to Vacra.`]: `Maquette \u2014 "Balade," 1D1R feat. Vacra, certification single diamant remise \u00e0 Vacra.`,

  // --- certifications-alicante-karmen.html ---
  [`Golden certification artwork design`]: `Design de visuel de certification or`,
  [`Certification artwork for "Alicante," Karmen feat. PLK, a single that crossed 15 million streams equivalent sales, earning it a gold certification.`]: `Visuel de certification pour "Alicante," Karmen feat. PLK, un single ayant franchi les 15 millions de streams \u00e9quivalent ventes, lui valant une certification or.`,
  [`Golden certification for "Alicante"`]: `Certification or pour "Alicante"`,
  [`"Alicante" pairs Karmen and PLK on a single that went on to cross 15 million streams equivalent sales. Enough for a gold certification. Beyond the layout itself, the brief called for real custom typography work on the track title: the script lettering of "Alicante" was designed to sit on the record like a signature, not a stock font dropped onto a template.`]: `"Alicante" r\u00e9unit Karmen et PLK sur un single ayant franchi les 15 millions de streams \u00e9quivalent ventes. Assez pour une certification or. Au-del\u00e0 de la mise en page elle-m\u00eame, le brief demandait un vrai <strong>travail typographique sur mesure</strong> pour le titre du morceau : le lettrage script d'"Alicante" a \u00e9t\u00e9 pens\u00e9 pour se poser sur le disque comme une signature, pas une police toute faite plaqu\u00e9e sur un template.`,  [`Karmen, holding up the gold plaque on stage.`]: `Karmen, brandissant la plaque or sur sc\u00e8ne.`,
  [`One certification, several plaques`]: `Une certification, plusieurs plaques`,
  [`Karmen fronts "Alicante," but the certification didn't stop at his own plaque. A full set was produced for everyone tied to the record: PLK, Mister V, and several other guests who took part in the project, each one built on the exact same layout so the whole set reads as one coherent certification, whoever's holding it.`]: `Karmen porte "Alicante," mais la certification ne s'est pas arr\u00eat\u00e9e \u00e0 sa propre plaque. Une s\u00e9rie compl\u00e8te a \u00e9t\u00e9 produite pour tous ceux li\u00e9s au disque : <strong>PLK</strong>, <strong>Mister V</strong>, et plusieurs autres invit\u00e9s ayant pris part au projet, chacune construite sur exactement la m\u00eame mise en page pour que l'ensemble se lise comme une certification coh\u00e9rente, peu importe qui la tient.`,  [`The plaque made for PLK, framed and ready before shipping.`]: `La plaque r\u00e9alis\u00e9e pour PLK, encadr\u00e9e et pr\u00eate avant exp\u00e9dition.`,
  [`Handed over at La Cigale, Paris`]: `Remise \u00e0 La Cigale, Paris`,
  [`The certification was presented as a trophy at La Cigale in Paris, during Karmen's concert, in front of a sold-out room and a lineup of surprise guests. The moment traveled well beyond the venue, it drove a steady wave of stories and posts online in the days that followed.`]: `La certification a \u00e9t\u00e9 pr\u00e9sent\u00e9e comme un troph\u00e9e \u00e0 La Cigale \u00e0 Paris, pendant le concert de Karmen, devant une salle comble et une s\u00e9rie d'invit\u00e9s surprise. Le moment a largement d\u00e9pass\u00e9 la salle il a g\u00e9n\u00e9r\u00e9 une vague continue de stories et de posts en ligne dans les jours qui ont suivi.`,
  [`The crowd at La Cigale, sold out for the night.`]: `Le public \u00e0 La Cigale, salle comble pour la soir\u00e9e.`,
  [`Backstage at La Cigale, just before going on.`]: `En coulisses \u00e0 La Cigale, juste avant de monter sur sc\u00e8ne.`,
  [`Every plaque started as a full artwork mockup, validated before going to physical production the "Alicante" script set against the gold record, the artist photo balanced beneath it, and the certification band placed so it never competes with the artwork above.`]: `Chaque plaque a commenc\u00e9 comme une maquette compl\u00e8te du visuel, valid\u00e9e avant de passer en production physique le script "Alicante" pos\u00e9 sur le disque d'or, la photo de l'artiste \u00e9quilibr\u00e9e en dessous, et le bandeau de certification plac\u00e9 pour ne jamais entrer en concurrence avec le visuel au-dessus.`,
  [`Mockup of "Alicante," Karmen feat. PLK, gold single certification awarded to PLK.`]: `Maquette d'"Alicante," Karmen feat. PLK, certification single or remise \u00e0 PLK.`,

  // --- music.html / music-adriana-lima-ghetto-phenomene.html ---
  [`Artistic direction for single and album covers for established artists`]: `Direction artistique de pochettes single et album pour artistes confirm\u00e9s`,
  [`Single cover artistic direction`]: `Direction artistique de pochette single`,
  [`Artistic direction`]: `Direction artistique`,
  [`Cover artwork, custom logotype and release visuals for "Adriana Lima," a single by Ghetto Ph\u00e9nom\u00e8ne feat. Razor Beats.`]: `Pochette, logotype sur mesure et visuels de sortie pour "Adriana Lima," un single de Ghetto Ph\u00e9nom\u00e8ne feat. Razor Beats.`,
  [`A single called "Adriana Lima"`]: `Un single intitul\u00e9 "Adriana Lima"`,
  [`Ghetto Ph\u00e9nom\u00e8ne came in for the full visual identity of the single, feat. Razor Beats (the composer): the cover artwork itself, a custom logotype for the title, and the visuals built for the release. Everything was designed to work together as one system.`]: `Ghetto Ph\u00e9nom\u00e8ne est venu chercher l'identit\u00e9 visuelle compl\u00e8te du single, feat. Razor Beats (le compositeur) : la pochette elle-m\u00eame, un logotype sur mesure pour le titre, et les visuels con\u00e7us pour la sortie. Tout a \u00e9t\u00e9 pens\u00e9 pour fonctionner ensemble comme un seul syst\u00e8me.`,
  [`Cover artwork of the single "Adriana Lima," Ghetto Ph\u00e9nom\u00e8ne feat. Razor Beats.`]: `Pochette du single "Adriana Lima," Ghetto Ph\u00e9nom\u00e8ne feat. Razor Beats.`,
  [`A custom logotype for the title`]: `Un logotype sur mesure pour le titre`,
  [`The title itself needed its own identity rather than a stock typeface: a hand-built script logotype, warm and a little worn at the edges.`]: `Le titre lui-m\u00eame avait besoin de sa propre identit\u00e9 plut\u00f4t que d'une police toute faite : un logotype script construit \u00e0 la main, chaleureux et l\u00e9g\u00e8rement us\u00e9 sur les bords.`,
  [`The logotype, staged on its own for release communication.`]: `Le logotype, mis en sc\u00e8ne seul pour la communication de sortie.`,
  [`Release visuals`]: `Visuels de sortie`,
  [`The same artwork and logotype carried over into the video built to announce the single's release, keeping the cover, the typography and the mood consistent from the first teaser to the release itself.`]: `Le m\u00eame visuel et le m\u00eame logotype se sont retrouv\u00e9s dans la vid\u00e9o con\u00e7ue pour annoncer la sortie du single, gardant la pochette, la typographie et l'ambiance coh\u00e9rentes depuis le premier teaser jusqu'\u00e0 la sortie elle-m\u00eame.`,
  [`The release video, built around the same cover and logotype.`]: `La vid\u00e9o de sortie, construite autour de la m\u00eame pochette et du m\u00eame logotype.`,

  // --- music-multi-glk.html ---
  [`Cover design & custom typography`]: `Design de pochette & typographie sur mesure`,
  [`A cover built for GLK a name that no longer needs an introduction in French rap. Beyond the desert scene staged on the artwork, the real heart of this project is a custom wordmark drawn entirely from scratch: a single piece of typography designed to carry the release on its own, across every format and every platform.`]: `Une pochette con\u00e7ue pour GLK un nom qui n'a plus besoin de pr\u00e9sentation dans le rap fran\u00e7ais. Au-del\u00e0 de la sc\u00e8ne d\u00e9sertique mise en sc\u00e8ne sur le visuel, le vrai c\u0153ur de ce projet est un wordmark sur mesure dessin\u00e9 enti\u00e8rement \u00e0 partir de z\u00e9ro : une pi\u00e8ce typographique unique con\u00e7ue pour porter la sortie \u00e0 elle seule, sur tous les formats et toutes les plateformes.`,
  [`A confirmed artist, a defining opportunity`]: `Un artiste confirm\u00e9, une opportunit\u00e9 d\u00e9terminante`,
  [`GLK is a key figure in the French rap scene: his discography and career speak for themselves. Being asked to design the cover art for one of his singles isn\u2019t just any commission, it\u2019s the kind of project that sets the bar very high and demands a result worthy of an artist who has nothing left to prove.`]: `GLK est une figure cl\u00e9 de la sc\u00e8ne rap fran\u00e7aise : sa discographie et sa carri\u00e8re parlent d'elles-m\u00eames. \u00catre sollicit\u00e9 pour concevoir la pochette de l'un de ses singles n'est pas une commande comme les autres, c'est le genre de projet qui place la barre tr\u00e8s haut et exige un r\u00e9sultat \u00e0 la hauteur d'un artiste qui n'a plus rien \u00e0 prouver.`,
  [`This project wouldn't have happened without the trust of AKM and Sommet Cr\u00e9ation, who opened the door to working directly on a release of this scale. A huge thank you to both for the opportunity, and for the confidence to let this vision run all the way through.`]: `Ce projet n'aurait pas vu le jour sans la confiance d'<strong>AKM</strong> et de <strong>Sommet Cr\u00e9ation</strong>, qui ont ouvert la porte \u00e0 un travail direct sur une sortie de cette envergure. Un immense merci aux deux pour l'opportunit\u00e9, et pour la confiance accord\u00e9e pour mener cette vision jusqu'au bout.`,  [`The final cover with a Mercedes G-Wagon tearing through the dust, staged as the visual backbone of the release.`]: `La pochette finale avec un Mercedes G-Wagon fendant la poussi\u00e8re, mis en sc\u00e8ne comme colonne vert\u00e9brale visuelle de la sortie.`,
  [`Building the scene before building the type`]: `Construire la sc\u00e8ne avant de construire la typographie`,
  [`Before any typography could work, the image needed to carry the right weight on its own. The composition was built in Photoshop: a raw desert setting, a warm sun-bleached color grade, and a cloud of dust kicked up behind the vehicle to inject motion and tension into a still frame. Every layer of dust, grain, light falloff was worked by hand until the scene felt shot, not composited.`]: `Avant que la typographie puisse fonctionner, l'image devait porter le bon poids \u00e0 elle seule. La composition a \u00e9t\u00e9 construite dans <strong>Photoshop</strong> : un d\u00e9cor d\u00e9sertique brut, un \u00e9talonnage chaud d\u00e9lav\u00e9 par le soleil, et un nuage de poussi\u00e8re soulev\u00e9 derri\u00e8re le v\u00e9hicule pour injecter du mouvement et de la tension dans une image fixe. Chaque couche de poussi\u00e8re, de grain, de chute de lumi\u00e8re a \u00e9t\u00e9 travaill\u00e9e \u00e0 la main jusqu'\u00e0 ce que la sc\u00e8ne semble prise sur le vif, pas compos\u00e9e.`,  [`That desert palette wasn't a random choice: it sets the tone for the whole release and becomes the color language the typography then has to sit inside, rather than fight against.`]: `Cette palette d\u00e9sertique n'\u00e9tait pas un choix au hasard : elle donne le ton de toute la sortie et devient le langage colorim\u00e9trique dans lequel la typographie doit ensuite s'inscrire, plut\u00f4t que d'entrer en conflit avec lui.`,
  [`The custom-drawn "multi" wordmark, repeated to show its rhythm and consistency at any scale.`]: `Le wordmark "multi" dessin\u00e9 sur mesure, r\u00e9p\u00e9t\u00e9 pour montrer son rythme et sa coh\u00e9rence \u00e0 toute \u00e9chelle.`,
  [`A custom logotype, drawn from zero`]: `Un logotype sur mesure, dessin\u00e9 \u00e0 partir de z\u00e9ro`,
  [`This is where the real work lives. The "multi" wordmark was constructed letter by letter in Illustrator, on a strict grid, with every curve, counter and junction redrawn by hand until the whole word reads as a single, deliberate shape rather than a sequence of separate letters.`]: `C'est l\u00e0 que se trouve le vrai travail. Le wordmark "multi" a \u00e9t\u00e9 construit lettre par lettre dans <strong>Illustrator</strong>, sur une grille stricte, avec chaque courbe, contreforme et jonction redessin\u00e9e \u00e0 la main jusqu'\u00e0 ce que le mot entier se lise comme une forme unique et d\u00e9lib\u00e9r\u00e9e plut\u00f4t qu'une suite de lettres s\u00e9par\u00e9es.`,  [`Every angle had to stay consistent, every counter had to breathe the same way, and the whole construction had to hold up whether it's stamped small in a corner of a Story or blown up full-screen on a cover. That level of precision is, honestly, where the vast majority of the hours on this project went far more than the photo composition itself. The image sets the mood; the type is what makes the release recognizable in a single glance, on any platform, at any size.`]: `Chaque angle devait rester coh\u00e9rent, chaque contreforme devait respirer de la m\u00eame fa\u00e7on, et toute la construction devait tenir qu'elle soit tamponn\u00e9e en petit dans un coin de Story ou agrandie plein \u00e9cran sur une pochette. Ce niveau de pr\u00e9cision est, honn\u00eatement, ce qui a absorb\u00e9 la grande majorit\u00e9 des heures sur ce projet bien plus que la composition photo elle-m\u00eame. L'image donne l'ambiance ; la typographie est ce qui rend la sortie reconnaissable en un seul coup d'\u0153il, sur n'importe quelle plateforme, \u00e0 n'importe quelle taille.`,
  [`Construction grid, alignment guides, angle markers and the geometric logic behind every letter.`]: `Grille de construction, guides d'alignement, rep\u00e8res d'angle et la logique g\u00e9om\u00e9trique derri\u00e8re chaque lettre.`,
  [`Typography as the real deliverable`]: `La typographie comme v\u00e9ritable livrable`,
  [`A cover gets seen once, scrolled past, replaced by the next release. A wordmark like this one is built to outlast the scroll, it's the piece that travels across the single's artwork, its promotional content, and every platform it lands on, always instantly identifiable as "MULTI". That's the whole point of treating typography as a design discipline in its own right, not an afterthought stamped on top of a finished image.`]: `Une pochette est vue une fois, d\u00e9fil\u00e9e, remplac\u00e9e par la sortie suivante. Un wordmark comme celui-ci est construit pour survivre au scroll c'est la pi\u00e8ce qui voyage \u00e0 travers le visuel du single, son contenu promotionnel, et chaque plateforme sur laquelle il atterrit, toujours identifiable en un instant comme "MULTI". C'est tout l'enjeu de traiter la typographie comme une discipline de design \u00e0 part enti\u00e8re, pas comme une r\u00e9flexion apr\u00e8s coup plaqu\u00e9e sur une image finie.`,
  [`MULTI, live on streaming platforms, released July 2026.`]: `MULTI, disponible sur les plateformes de streaming, sorti en juillet 2026.`,
  [`The cover's color code`]: `Le code couleur de la pochette`,
  [`Four tones pulled directly from the artwork, the desert palette that anchors the whole release and the backdrop the "multi" wordmark was built to sit on top of.`]: `Quatre teintes tir\u00e9es directement du visuel, la palette d\u00e9sertique qui ancre toute la sortie et le fond sur lequel le wordmark "multi" a \u00e9t\u00e9 construit pour se poser.`,

  // --- music-pelele-zbig.html ---
  [`Cover design & art direction`]: `Design de pochette & direction artistique`,
  [`The cover for "Pelele," a single by ZBIG, a rising French rap artist right now, recently featured alongside Jul. Produced in collaboration with Razor Beats, a composer on a similar rise, already trusted by a long list of names across the scene.`]: `La pochette de "Pelele," un single de ZBIG, artiste montant du rap fran\u00e7ais en ce moment, r\u00e9cemment en featuring aux c\u00f4t\u00e9s de Jul. R\u00e9alis\u00e9e en collaboration avec Razor Beats, un compositeur en pleine ascension similaire, d\u00e9j\u00e0 sollicit\u00e9 par une longue liste de noms de la sc\u00e8ne.`,
  [`An artist on the rise, a sound to match`]: `Un artiste en pleine ascension, un son \u00e0 la hauteur`,
  [`ZBIG's momentum right now speaks for itself. A rapidly growing fanbase, and a feature alongside Jul that says a lot about where his career is headed. "Pelele" needed a cover with the same energy: something that feels immediate, a little dangerous, built for a scroll where attention doesn't wait.`]: `La dynamique de ZBIG en ce moment parle d'elle-m\u00eame. Une fanbase en croissance rapide, et un featuring aux c\u00f4t\u00e9s de Jul qui en dit long sur la direction que prend sa carri\u00e8re. "Pelele" avait besoin d'une pochette avec la m\u00eame \u00e9nergie : quelque chose d'imm\u00e9diat, un peu dangereux, con\u00e7u pour un scroll o\u00f9 l'attention n'attend pas.`,
  [`This one came together with Razor Beats, a composer whose own reputation has been climbing fast, already trusted by a long list of names in French rap. Two rising trajectories on the same release. The visual had to carry that weight.`]: `Celle-ci s'est construite avec <strong>Razor Beats</strong>, un compositeur dont la r\u00e9putation grimpe vite, d\u00e9j\u00e0 sollicit\u00e9 par une longue liste de noms du rap fran\u00e7ais. Deux trajectoires ascendantes sur la m\u00eame sortie. Le visuel devait porter ce poids.`,  [`The final cover, a scooter tearing through wet, glowing asphalt, a Louis Vuitton bag caught mid-swing, "PELELE" pressed straight into the ground.`]: `La pochette finale, un scooter fendant un bitume mouill\u00e9 et luisant, un sac Louis Vuitton saisi en plein mouvement, "PELELE" imprim\u00e9 \u00e0 m\u00eame le sol.`,
  [`A scene built entirely in Photoshop`]: `Une sc\u00e8ne enti\u00e8rement construite dans Photoshop`,
  [`Nothing on this cover was shot as a single frame every element was composited by hand in Photoshop: the rider, the bag, the wet asphalt, all brought together and lit as one coherent scene. The golden lens flare sweeping in from the top right sets the temperature for the whole image, and the water on the ground exists specifically to catch and bounce that light back at the viewer.`]: `Rien sur cette pochette n'a \u00e9t\u00e9 pris en un seul clich\u00e9 chaque \u00e9l\u00e9ment a \u00e9t\u00e9 compos\u00e9 \u00e0 la main dans <strong>Photoshop</strong> : le pilote, le sac, l'asphalte mouill\u00e9, tout r\u00e9uni et \u00e9clair\u00e9 comme une sc\u00e8ne coh\u00e9rente. Le reflet dor\u00e9 qui balaie depuis le coin sup\u00e9rieur droit donne la temp\u00e9rature de toute l'image, et l'eau au sol existe pr\u00e9cis\u00e9ment pour capter et renvoyer cette lumi\u00e8re vers le spectateur.`,  [`The title itself is embossed straight into the texture of the asphalt rather than sitting on top of it as a flat overlay, grain, cracks and reflections were rebuilt around the letterforms so "PELELE" reads as part of the street, not a sticker slapped over the photo. That's the difference between a composite that looks assembled and one that looks like a single shot.`]: `Le titre lui-m\u00eame est emboss\u00e9 directement dans la texture de l'asphalte plut\u00f4t que pos\u00e9 dessus en simple calque plat, grain, fissures et reflets ont \u00e9t\u00e9 reconstruits autour des lettres pour que "PELELE" se lise comme faisant partie de la rue, pas comme un autocollant plaqu\u00e9 sur la photo. C'est la diff\u00e9rence entre un montage qui a l'air assembl\u00e9 et un qui ressemble \u00e0 une seule prise.`,
  [`The wide format portrait and typography built side by side as one piece of art direction.`]: `Le portrait au format large et la typographie construits c\u00f4te \u00e0 c\u00f4te comme une seule pi\u00e8ce de direction artistique.`,
  [`Art direction: attitude over decoration`]: `Direction artistique : l'attitude avant la d\u00e9coration`,
  [`This widescreen piece is where the project's tone really gets defined. The portrait was pushed into high-contrast black and white smoke, sunglasses, the hood pulled low nothing decorative, just presence. Next to it, "PELELE" is hand-lettered as an oversized, tilted brush mark: rough edges, uneven strokes, built to feel written rather than typed.`]: `Cette pi\u00e8ce au format large est l\u00e0 o\u00f9 le ton du projet se d\u00e9finit vraiment. Le portrait a \u00e9t\u00e9 pouss\u00e9 en noir et blanc haute contraste fum\u00e9e, lunettes de soleil, capuche baiss\u00e9e rien de d\u00e9coratif, juste de la pr\u00e9sence. \u00c0 c\u00f4t\u00e9, "PELELE" est lettr\u00e9 \u00e0 la main comme une marque au pinceau surdimensionn\u00e9e et inclin\u00e9e : bords bruts, traits irr\u00e9guliers, con\u00e7u pour donner l'impression d'\u00eatre \u00e9crit plut\u00f4t que tap\u00e9.`,
  [`The "ZBIG X RAZOR BEATS" credit is treated the same way, in matching handwritten strokes, so the whole composition reads as a single gesture rather than a photo with a logo stamped on top. That's the goal of art direction on a project like this: attitude first, decoration never.`]: `Le cr\u00e9dit "ZBIG X RAZOR BEATS" est trait\u00e9 de la m\u00eame fa\u00e7on, avec des traits manuscrits assortis, pour que toute la composition se lise comme un seul geste plut\u00f4t qu'une photo avec un logo tamponn\u00e9 dessus. C'est tout l'objectif de la direction artistique sur un projet comme celui-ci : l'attitude d'abord, jamais la d\u00e9coration.`,
  [`Making-of the cover taken apart and rebuilt, layer by layer.`]: `Making-of la pochette d\u00e9mont\u00e9e et reconstruite, couche par couche.`,
  [`Behind the scenes: layer by layer`]: `Dans les coulisses : couche par couche`,
  [`This breakdown exists to show the actual construction of the cover every layer, from the base plate to the final grain pass, revealed one at a time. It's proof that the finished image isn't a single lucky shot: it's dozens of decisions stacked on top of each other, each one earning its place in the final composite.`]: `Cette d\u00e9composition existe pour montrer la construction r\u00e9elle de la pochette chaque couche, de la base jusqu'\u00e0 la passe de grain finale, r\u00e9v\u00e9l\u00e9e une par une. C'est la preuve que l'image finale n'est pas un simple coup de chance : ce sont des dizaines de d\u00e9cisions empil\u00e9es les unes sur les autres, chacune m\u00e9ritant sa place dans le montage final.`,
  [`PELELE, live on streaming platforms. ZBIG & Razor Beats, single, released July 2026.`]: `PELELE, disponible sur les plateformes de streaming. ZBIG & Razor Beats, single, sorti en juillet 2026.`,
  [`Four tones pulled directly from the cover, the golden-hour glow, the wet asphalt, and the near-black silhouette that anchors the whole scene.`]: `Quatre teintes tir\u00e9es directement de la pochette, la lueur de l'heure dor\u00e9e, l'asphalte mouill\u00e9, et la silhouette presque noire qui ancre toute la sc\u00e8ne.`,

  // --- media.html / media-120-rap.html ---
  [`Visual identities for leading digital medias`]: `Identit\u00e9s visuelles pour les m\u00e9dias digitaux de r\u00e9f\u00e9rence`,
  [`Complete logotype design`]: `Design de logotype complet`,
  [`Media \u2014 Culture & rap`]: `M\u00e9dia \u2014 Culture & rap`,
  [`A custom logo designed for a well-known digital media outlet (100K subscribers) focused primarily on rap news, conceived from the outset as a unique visual identity, available in a full range of color variations, capable of complementing any type of content while remaining instantly recognizable as 120%RAP.`]: `Un logo sur mesure con\u00e7u pour un m\u00e9dia digital reconnu (100K abonn\u00e9s) ax\u00e9 principalement sur l'actualit\u00e9 rap, pens\u00e9 d\u00e8s le d\u00e9part comme une identit\u00e9 visuelle unique, disponible dans toute une gamme de variations chromatiques, capable d'accompagner tout type de contenu tout en restant instantan\u00e9ment reconnaissable comme 120%RAP.`,
  [`A content-driven variation system`]: `Un syst\u00e8me de d\u00e9clinaisons pilot\u00e9 par le contenu`,
  [`A media outlet like 120%RAP publishes several types of content daily: music news, soccer, wrestling, movies, sports in general, and more. A simple static logo wouldn\u2019t have been enough: the project required a variation system, in which each theme has its own color scheme while maintaining exactly the same basic structure. The \u201c120%\u201d block remains white and fixed in all versions; it serves as the brand\u2019s anchor, recognizable at a glance. Meanwhile, the second block adopts a color scheme specific to its theme.`]: `Un m\u00e9dia comme 120%RAP publie plusieurs types de contenu au quotidien : actualit\u00e9 musicale, foot, catch, cin\u00e9ma, sport en g\u00e9n\u00e9ral, et bien plus. Un simple logo statique n'aurait pas suffi : le projet demandait un <strong>syst\u00e8me de d\u00e9clinaisons</strong>, o\u00f9 chaque th\u00e9matique a sa propre palette tout en conservant exactement la m\u00eame structure de base. Le bloc "120%" reste blanc et fixe dans toutes les versions ; il sert d'ancrage \u00e0 la marque, reconnaissable en un coup d'\u0153il. Le second bloc, lui, adopte une palette propre \u00e0 sa th\u00e9matique.`,  [`The finished logotype, staged in context.`]: `Le logotype finalis\u00e9, mis en sc\u00e8ne en contexte.`,
  [`A custom-built logotype construction`]: `Une construction de logotype enti\u00e8rement sur mesure`,
  [`Rather than using an existing font, the 120%RAP logo was redesigned letter by letter from scratch. The vector design follows a very strict grid: uniform angles between letters, calibrated counterforms, and a fixed aspect ratio that ensure a crisp rendering at any scale, whether it\u2019s a 40-px thumbnail in an Instagram feed or a full-screen poster.`]: `Plut\u00f4t que d'utiliser une police existante, le logo 120%RAP a \u00e9t\u00e9 redessin\u00e9 lettre par lettre \u00e0 partir de z\u00e9ro. Le trac\u00e9 vectoriel suit une grille tr\u00e8s stricte : angles uniformes entre les lettres, contreformes calibr\u00e9es, et un ratio fixe qui garantit un rendu net \u00e0 toute \u00e9chelle, que ce soit une miniature de 40px dans un feed Instagram ou une affiche plein \u00e9cran.`,
  [`The diagonal line that runs through the \u201c120%\u201d block creates a dynamic contrast with the more massive, vertical \u201cRAP\u201d block: this contrast gives the logo immediate legibility, even in motion (Stories, Reels, video intros). The entire system was delivered in positive and negative versions, tested and validated on both light and dark backgrounds. This is an essential requirement for a logo intended to appear weekly on dozens of different visuals.`]: `La ligne diagonale qui traverse le bloc "120%" cr\u00e9e un contraste dynamique avec le bloc "RAP", plus massif et vertical : ce contraste donne au logo une lisibilit\u00e9 imm\u00e9diate, m\u00eame en mouvement (Stories, Reels, intros vid\u00e9o). L'ensemble du syst\u00e8me a \u00e9t\u00e9 livr\u00e9 en <strong>versions positive et n\u00e9gative</strong>, test\u00e9es et valid\u00e9es sur fonds clairs comme sombres. Une exigence essentielle pour un logo destin\u00e9 \u00e0 appara\u00eetre chaque semaine sur des dizaines de visuels diff\u00e9rents.`,  [`Construction grid: positive and negative versions, alignment guides and clear space.`]: `Grille de construction : versions positive et n\u00e9gative, guides d'alignement et zone de protection.`,
  [`Foot, Catch, Sports: three themes, three distinct color signatures.`]: `Foot, Catch, Sports : trois th\u00e9matiques, trois signatures colorim\u00e9triques distinctes.`,
  [`The same system, extended to culture and entertainment`]: `Le m\u00eame syst\u00e8me, \u00e9tendu \u00e0 la culture et au divertissement`,
  [`Green for football, red for wrestling, gold for sports the same logic carries over to streaming, film and music content, with magenta, orange and pink signatures of their own. The result: in a feed where attention is won or lost in a fraction of a second, the audience identifies both the brand and the type of content before even reading the caption.`]: `Vert pour le foot, rouge pour le catch, or pour le sport la m\u00eame logique se prolonge sur les contenus streaming, cin\u00e9ma et musique, avec leurs propres signatures magenta, orange et rose. R\u00e9sultat : dans un feed o\u00f9 l'attention se gagne ou se perd en une fraction de seconde, l'audience identifie <em>\u00e0 la fois</em> la marque et le type de contenu avant m\u00eame de lire la l\u00e9gende.`,  [`Stream, Cin\u00e9, Music: the same variation system applied to culture & entertainment content.`]: `Stream, Cin\u00e9, Music : le m\u00eame syst\u00e8me de d\u00e9clinaisons appliqu\u00e9 aux contenus culture & divertissement.`,
  [`A complete art direction, not just a logotype`]: `Une direction artistique compl\u00e8te, pas seulement un logotype`,
  [`The real value of this project doesn't stop at the logo variations: each theme color was designed upfront as a cross-content color code, later reused by 120%RAP across its entire visual identity, templates, graphic elements and the staging of its different content formats. The logotype becomes the starting point of a coherent, scalable system, able to welcome new themes without ever losing brand recognition.`]: `La vraie valeur de ce projet ne s'arr\u00eate pas aux d\u00e9clinaisons du logo : chaque couleur th\u00e9matique a \u00e9t\u00e9 pens\u00e9e en amont comme un <strong>code couleur transversal</strong>, ensuite r\u00e9utilis\u00e9 par 120%RAP sur toute son identit\u00e9 visuelle, ses templates, ses \u00e9l\u00e9ments graphiques et la mise en sc\u00e8ne de ses diff\u00e9rents formats de contenu. Le logotype devient le point de d\u00e9part d'un syst\u00e8me coh\u00e9rent et \u00e9volutif, capable d'accueillir de nouvelles th\u00e9matiques sans jamais perdre en reconnaissance de marque.`,  [`It's this systemic approach a single construction, a shared color grammar, variations designed for the media's real day-to-day use on social platforms that sets a complete art direction apart from a simple logo exercise.`]: `C'est cette approche syst\u00e9mique une construction unique, une grammaire colorim\u00e9trique partag\u00e9e, des d\u00e9clinaisons pens\u00e9es pour l'usage quotidien r\u00e9el du m\u00e9dia sur les r\u00e9seaux sociaux qui distingue une direction artistique compl\u00e8te d'un simple exercice de logo.`,

  // --- brand-design.html ---
  [`Graphic design services for companies and brands`]: `Services de design graphique pour entreprises et marques`,
  [`Complete graphic identity`]: `Identit\u00e9 graphique compl\u00e8te`,
};

function translateSitewideCaseContent(lang) {
  document.querySelectorAll(".case-hero__meta li span, .case-meta-strip div span").forEach((el) => {
    if (el.dataset.i18nSrc === undefined) el.dataset.i18nSrc = el.textContent;
    el.textContent = lang === "en" ? el.dataset.i18nSrc : metaLabelDict[el.dataset.i18nSrc.trim()] || el.dataset.i18nSrc;
  });

  const selector = [
    ".section-hero__subtitle",
    ".case-hero__eyebrow",
    ".case-hero__lead",
    ".case-section__title",
    ".case-section__text",
    ".case-figure__caption",
    ".project-card__caption-text",
  ].join(", ");

  document.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.i18nSrc === undefined) el.dataset.i18nSrc = el.innerHTML;
    if (lang === "en") {
      el.innerHTML = el.dataset.i18nSrc;
      return;
    }
    const key = htmlToText(el.dataset.i18nSrc);
    el.innerHTML = caseDict[key] !== undefined ? caseDict[key] : el.dataset.i18nSrc;
  });
}

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

// ---------- Appliquer la langue mémorisée au chargement ----------
//
// Le switch FR/EN n'est visible QUE sur la home (voir .nav.is-scrolled
// .nav__lang dans style.css — masqué sur toutes les autres pages, qui
// démarrent "is-scrolled" en dur faute de hero). Mais le choix fait sur la
// home doit quand même s'appliquer partout : on lit ici la préférence
// mémorisée et on traduit la page silencieusement au chargement, même
// sans bouton visible sur cette page précise.
try {
  const savedLang = localStorage.getItem("cxld-lang");
  if (savedLang === "fr" || savedLang === "en") {
    document.querySelectorAll(".nav__lang-btn").forEach((b) => {
      const active = b.dataset.lang === savedLang;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    applyLanguage(savedLang);
  }
} catch (err) {
  // Pas de stockage disponible : la page reste simplement en anglais par défaut.
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
  statusEl.textContent = i18n[currentLang][key];
  if (state) statusEl.setAttribute("data-state", state);
  else statusEl.removeAttribute("data-state");
}
