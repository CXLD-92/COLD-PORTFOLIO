# Polices

Toutes les polices du site sont maintenant auto-hébergées ici, à partir
des fichiers que tu as fournis :

- `edition-regular.woff2`   ← EDITION_.TTF            → H1 (`--font-display`)
- `pressio-regular.woff2`   ← PressioTEST-No_34.otf    → H2 / eyebrows (`--font-serif`)
- `oswald-*.woff2`          ← Oswald (variable + statiques) → H3, UI, boutons (`--font-ui`)

Rien à faire de plus : `css/style.css` charge ces fichiers directement
en local, il n'y a plus aucune dépendance à Google Fonts ou à un autre
CDN de polices.

Si un jour tu reçois une variante italique de Pressio ou d'autres
graisses d'Edition, dépose-les ici et ajoute la règle `@font-face`
correspondante en haut de `css/style.css`.
