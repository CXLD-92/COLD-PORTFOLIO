# Portfolio — Kylian B. (COLD Production)

Site statique (aucun backend requis) basé sur ta maquette Figma/PDF.
Version **mobile** pour l'instant, comme demandé — le passage au
responsive desktop se fera dans une prochaine itération.

## Structure

```
portfolio/
├── index.html                 page unique (hero, à propos, work, trusted by, contact)
├── css/style.css               tous les styles + tokens (couleurs, typos, espacements)
├── js/
│   ├── scene.js                scène 3D (flamme chromée interactive + fumée)
│   └── main.js                 nav, animations au scroll, envoi du formulaire
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

## Prochaines étapes possibles

- Version desktop responsive (grille du "Work", nav complète, etc.)
- Pages de détail projet (les écrans "CERTIFICATION" de la maquette)
- Remplacer les textes Lorem ipsum et les logos "Trusted by" par le
  vrai contenu
- Remplacer les visuels de fond des cartes "Work" par tes vraies images
  de projets (actuellement des dégradés de substitution)
