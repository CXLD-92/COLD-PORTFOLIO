# Portfolio — Kylian B. (COLD Production)

Site statique (aucun backend requis) basé sur ta maquette Figma/PDF.
Responsive mobile → tablette → desktop : le cadre du site (`.frame`)
grandit par palier avec la largeur de l'écran (voir `--frame-max` et
la section "RESPONSIVE DESKTOP" tout en bas de `css/style.css`) au
lieu de rester figé à une largeur mobile.

## Structure

```
portfolio/
├── index.html                  page d'accueil (hero, à propos, work, trusted by, contact)
├── certifications.html         page de section — 3 travaux "Certifications"
├── music.html                  page de section — 3 travaux "Music"
├── media.html                  page de section — 3 travaux "Media"
├── brand-design.html           page de section — 3 travaux "Brand design"
├── css/style.css               tous les styles + tokens (couleurs, typos, espacements)
├── js/
│   ├── preload.js              écran de chargement (avant la landing page)
│   ├── scene.js                scène 3D (flamme chromée interactive + fumée)
│   └── main.js                 nav, menu, animations au scroll, envoi du formulaire
└── assets/
    ├── models/flame.glb        ton modèle 3D (fourni)
    ├── fonts/                  dépose ici EDITION & Pressio (voir fonts/README.md)
    └── vendor/three/           three.js + GLTFLoader + OrbitControls (copie locale)
```

Aucune dépendance externe à installer : `three.js` est déjà copié dans
`assets/vendor/`, donc le site fonctionne même hors-ligne (à l'exception
de la police Oswald, chargée depuis Google Fonts).

## Lancer le site en local

Un simple serveur statique suffit (nécessaire pour que les imports de
modules JS et le chargement du `.glb` fonctionnent — ouvrir le fichier
directement avec `file://` ne marchera pas) :

```bash
cd portfolio
python3 -m http.server 8000
# puis ouvre http://localhost:8000
```

ou avec Node : `npx serve .`

## Écran de chargement

Avant d'atterrir sur la landing page, un écran noir plein écran et
centré s'affiche : une petite flamme blanche (SVG statique, qui
respire doucement) au-dessus d'une fine barre blanche qui se remplit
(`js/preload.js`).

- Il attend le chargement réel du modèle 3D (`flame.glb`), des polices
  custom (Edition/Pressio) et des images déjà présentes dans la page,
  PLUS une durée d'affichage minimale (1.6s) même si tout est prêt
  avant — pour laisser le temps de voir l'écran plutôt qu'un flash.
- Le suivi du modèle 3D n'ajoute aucun téléchargement supplémentaire :
  `js/preload.js` observe simplement `THREE.DefaultLoadingManager`,
  que `scene.js` utilise par défaut pour charger `flame.glb`.
- Filet de sécurité intégré : si un asset traîne ou échoue, l'écran
  disparaît quand même au bout de 6 secondes maximum, pour ne jamais
  bloquer l'accès au site.
- Respecte `prefers-reduced-motion` (transition de la barre + pulsation
  de la flamme désactivées).

## La flamme 3D

- Modèle : `assets/models/flame.glb` (ton fichier, non modifié).
- Matériau : remplacé par un chrome argenté (`MeshPhysicalMaterial`,
  metalness 1) avec un environnement studio généré en code — donc pas
  de fichier HDRI à héberger.
- Interaction : cliquer-glisser (souris ou tactile) fait tourner la
  flamme sur elle-même (`OrbitControls`, zoom/pan désactivés). Une
  rotation automatique continue reprend après ~2 s d'inactivité. Le
  modèle est recentré sur son propre centre de gravité au chargement
  (`js/scene.js`), et c'est ce même point qui sert à la fois de centre
  caméra et de pivot de rotation — donc il tourne bien sur lui-même,
  parfaitement centré dans sa zone d'affichage.
- Fumée : particules douces animées derrière la flamme (canvas généré,
  pas d'image externe).

La scène 3D occupe la zone du haut du hero (`.hero__canvas-wrap`) ; le
bloc "PORTFOLIO / KYLIAN B / flèche" est juste en dessous, dans le flux
normal (pas superposé). Le mot "PORTFOLIO" est redimensionné en JS
(`js/main.js → fitHeroTitle`) pour occuper exactement toute la largeur
de l'écran, quelle que soit la police chargée — recalculé aussi au
resize.

## Langue

Le site démarre en **français** par défaut (bouton "FR" actif dans le
switch en haut à gauche). Le switch FR/EN est pour l'instant visuel
uniquement (bascule l'état actif du bouton) — à brancher sur une vraie
i18n quand le contenu anglais sera prêt.

## Icône menu (burger)

J'ai repris l'esprit de la maquette (trois barres asymétriques plutôt
qu'un hamburger classique à traits égaux), mais à la résolution
d'export du PDF je n'ai pas pu garantir une reproduction pixel-parfaite
de cette icône précise. Si tu as un export SVG/PNG net de l'icône
d'origine, envoie-le-moi et je la remplace à l'identique.


## Le formulaire de contact

Pas de backend maison : le formulaire poste vers un service tiers.

1. Crée un compte sur [Formspree](https://formspree.io) (ou EmailJS,
   Web3Forms…) et récupère l'URL de ton formulaire.
2. Ouvre `js/main.js`, renseigne `FORM_ENDPOINT` :
   ```js
   const FORM_ENDPOINT = "https://formspree.io/f/xxxxxxx";
   ```
3. C'est tout — les champs (nom, e-mail, objet, message) sont déjà
   nommés correctement (`name`, `email`, `subject`, `message`).

Si tu déploies sur **Netlify**, tu peux à la place ajouter
`data-netlify="true"` sur la balise `<form>` dans `index.html` et
laisser `FORM_ENDPOINT` vide : Netlify gère l'envoi nativement.

## Polices

- **Oswald** (H3, labels, UI) : déjà chargée via Google Fonts, rien à
  faire.
- **EDITION** (H1) et **Pressio** (H2) : polices sous licence que je ne
  peux pas redistribuer. Dépose les fichiers `.woff2` dans
  `assets/fonts/` — voir `assets/fonts/README.md` pour les noms de
  fichiers exacts attendus. En attendant, des polices de secours
  condensée/serif prennent le relais automatiquement.

## Déployer

Le site est 100% statique : tu peux le déposer tel quel sur Netlify,
Vercel ou GitHub Pages (glisser-déposer le dossier `portfolio/` sur
Netlify fonctionne directement).

## Pages de section

Chaque catégorie du menu (Certifications, Music, Media, Brand design)
ouvre sa propre page (`certifications.html`, `music.html`, `media.html`,
`brand-design.html`), toutes construites sur le même gabarit :

- la nav, toujours affichée dans son état "logo visible + fond plein"
  (pas de hero 3D à traverser dessous sur ces pages) ;
- le nom de la section en grand, en police Edition, redimensionné en JS
  pour occuper toute la largeur (même mécanisme que "PORTFOLIO" en
  accueil) ;
- 3 cartes carrées, chacune un lien direct vers un travail — empilées
  sur mobile, en rangée qui s'enroule (flex-wrap) dès la tablette —
  actuellement en fond dégradé de substitution avec juste un titre
  (à remplacer par les vraies images/pages de projet une fois prêtes) ;
- le footer.

Le bouton "See more" du carrousel "Work" en accueil ouvre directement
le menu (au lieu de renvoyer vers le formulaire de contact), pour
retrouver ces 4 sections en un clic.

## Prochaines étapes possibles

- Pages de détail projet (les écrans "CERTIFICATION" de la maquette)
- Remplacer les textes Lorem ipsum et les logos "Trusted by" par le
  vrai contenu
- Remplacer les visuels de fond des cartes "Work" par tes vraies images
  de projets (actuellement des dégradés de substitution)
