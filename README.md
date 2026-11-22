# Curling

Un jeu de puzzle à plusieurs, où chacun joue sur son téléphone ou sa tablette. Tout le monde reconstitue la même image en même temps. Le premier qui termine gagne 3 points, et chaque joueur qui finit gagne 1 point. Une partie compte 5 objets, qui forment ensemble une grande image finale, avec une question bonus.

- **L'animateur** ouvre le site sur l'ordinateur ou la tablette branché à la télé, puis clique sur « Créer une partie ».
- **Les joueurs** scannent le QR code affiché, tapent leur prénom, et c'est parti. Il n'y a rien à installer.
- **3 thèmes d'images** : la maison à la campagne, une journée à la plage, la ferme.
- **6 niveaux**, le même pour tout le monde : des pièces carrées (4, 9 ou 16), puis de vraies pièces de puzzle (16, 25, ou 36 pièces à tourner).
- **Jouer seul** (bouton sur l'accueil) : tous les thèmes, tranquillement ou contre des joueurs simulés, plus le sudoku (4×4, 6×6, 9×9), le taquin et les dominos (de 3 à 20 dominos).
- Ça marche de 1 à 60 joueurs. Si un téléphone se met en veille, le joueur retrouve sa partie et ses pièces déjà posées.

---

## Mettre le jeu en ligne gratuitement (environ 15 minutes)

On utilise deux services gratuits : **GitHub**, qui garde les fichiers du jeu, et **Render**, qui fait tourner le jeu sur internet.

### Étape 1 : déposer les fichiers sur GitHub

1. Allez sur **github.com** et créez un compte gratuit (« Sign up »).
2. Une fois connecté, cliquez sur le **+** en haut à droite, puis sur **New repository**.
3. Nom du dépôt : `curling`. Laissez **Public** coché et cliquez sur **Create repository**.
4. Sur la page suivante, cliquez sur le lien **uploading an existing file**.
5. Décompressez le fichier `curling.zip` sur votre ordinateur. Ouvrez le dossier, sélectionnez **tout son contenu** (le dossier `public`, et les fichiers `server.js`, `package.json`, etc.) et faites-le glisser dans la page GitHub.
6. Attendez la fin du chargement, puis cliquez sur **Commit changes** en bas.

### Étape 2 : lancer le jeu sur Render

1. Allez sur **render.com** et cliquez sur **Get Started**. Choisissez **GitHub** pour vous connecter : c'est le plus simple.
2. Cliquez sur **New +**, puis sur **Web Service**.
3. Choisissez votre dépôt `curling`. Si Render demande l'accès à GitHub, acceptez.
4. Remplissez ainsi :
   - **Name** : `curling`. Ce nom fera partie de l'adresse du jeu.
   - **Language / Runtime** : `Node`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : **Free**
5. Cliquez sur **Create Web Service** (ou **Deploy**). Attendez 2 à 3 minutes, jusqu'à voir le mot **Live** en vert.
6. L'adresse de votre jeu s'affiche en haut, sous la forme `https://curling-xxxx.onrender.com`. C'est cette adresse qu'il faut ouvrir sur l'écran de l'animateur.

### Bon à savoir avec l'offre gratuite

- Si personne n'utilise le jeu pendant 15 minutes, Render le met en veille. La personne qui l'ouvre ensuite attend **environ une minute**, le temps que le jeu se réveille. **Ouvrez donc la page de l'animateur quelques minutes avant de jouer.**
- Pendant une partie, le jeu reste éveillé.
- Pour supprimer cette attente, il faut passer à l'offre payante de Render, environ 7 $ par mois.

---

## Installer le jeu sur un ordinateur (Wi-Fi de la maison ou de l'établissement)

Sans compte, sans internet obligatoire : l'ordinateur sert de « serveur », les téléphones se connectent au même Wi-Fi.

1. Installez **Node.js** (version « LTS ») depuis **nodejs.org**. À faire une seule fois.
2. Décompressez `curling.zip` où vous voulez (par exemple dans Documents).
3. Double-cliquez sur **`lancer-windows.bat`** (Windows) ou **`lancer-mac.command`** (Mac).
   - La première fois, Windows peut afficher « Windows a protégé votre ordinateur » : cliquez sur *Informations complémentaires* puis *Exécuter quand même*. Sur Mac : clic droit sur le fichier, puis *Ouvrir*.
   - Si Windows demande d'autoriser Node.js sur le réseau, acceptez pour les réseaux privés.
4. Le navigateur s'ouvre tout seul sur le jeu. Le QR code affiché donne automatiquement la bonne adresse aux téléphones.
5. Laissez la fenêtre noire ouverte pendant le jeu ; fermez-la pour arrêter.

## Mettre à jour avec une nouvelle version

Le jeu ne garde aucune donnée sur l'ordinateur : il suffit de remplacer les fichiers.

1. Fermez la fenêtre noire de Curling.
2. Supprimez l'ancien dossier `curling` (ou renommez-le, par prudence).
3. Décompressez le nouveau `curling.zip` au même endroit.
4. Double-cliquez à nouveau sur le lanceur. C'est tout.

En ligne (Render) : sur GitHub, ouvrez votre dépôt `curling`, cliquez sur *Add file → Upload files*, déposez les fichiers de la nouvelle version, puis *Commit changes*. Render remet le jeu à jour tout seul en 2 à 3 minutes.

---

## Comment jouer

1. **L'animateur** ouvre l'adresse du jeu, clique sur **Créer une partie**, puis choisit les images et le niveau.
2. **Les joueurs** scannent le QR code avec l'appareil photo de leur téléphone. Ils peuvent aussi aller sur l'adresse du jeu et taper le code à 4 lettres. Ensuite, ils tapent leur prénom.
3. L'animateur clique sur **Lancer la partie**.
4. Sur chaque téléphone, les pièces arrivent en vrac. Pour placer une pièce, on la fait glisser à sa place, ou on la touche puis on touche sa case. Les pièces sont aimantées : pas besoin d'être précis.
5. Quand quelqu'un termine, les autres ont encore 45 secondes. La télé affiche ensuite les points, et l'objet gagné rejoint l'image finale.
6. Après les 5 objets, une question bonus apparaît sur les téléphones : la bonne réponse rapporte 1 point. Puis vient le classement final.

L'animateur peut retirer un joueur (bouton × dans la liste) ou terminer une manche plus tôt.

---

## Les images selon le niveau

- **Niveaux 1 et 2 :** dessins à gros traits.
- **Niveaux 3 et 4 :** dessins style BD franco-belge (déjà prêts pour « La maison à la campagne » ; les autres thèmes utilisent des traits fins en attendant).
- **Niveaux 5 et 6 :** **vraies photos** si elles sont présentes dans le dossier `public/photos`, sinon un rendu dessiné réaliste.

Pour ajouter les photos : déposez des images carrées (au moins 1000 × 1000 pixels, en .jpg) dans `public/photos`, avec les noms indiqués dans `public/photos/LISEZMOI.txt` (par exemple `maison-1.jpg` pour la maison). Les descriptions pour les générer sont dans `public/photos/DESCRIPTIONS.txt`. Le jeu les utilise automatiquement, sans rien régler.

---

## Jouer à distance (familles éloignées)

Il faut la **version en ligne** (Render) : la version installée sur un ordinateur ne fonctionne que sur le Wi-Fi de la maison. Chacun joue de chez soi, en Wi-Fi ou en 4G.

1. L'organisateur ouvre l'adresse du jeu sur son téléphone ou son ordinateur et clique sur **Créer une partie**.
2. Il choisit les images et le niveau, puis touche **Inviter des joueurs à distance** : le lien part par SMS, e-mail ou WhatsApp.
3. Pas de télé ? Il tape son prénom sous **Je joue aussi** : il devient joueur **et** garde les commandes (lancer la partie, manche suivante, réponse finale).
4. Chaque joueur voit sur son téléphone la progression des autres, les résultats de chaque manche et le classement final.

Astuce : lancez en même temps un appel vidéo (WhatsApp, FaceTime…), c'est encore plus convivial.

---

## Pour un informaticien

- Node.js 18 ou plus. Lancer en local : `npm install` puis `npm start` (ou les lanceurs), ouvrir http://localhost:3000.
- `server.js` : Express et Socket.IO. Les parties sont gardées en mémoire et supprimées après 3 h d'inactivité.
- `public/themes.js` : la banque d'images. Chaque thème a 5 dessins SVG sur un carré de 400 × 400, leur place dans la scène finale et la question bonus. **Pour ajouter un thème, il suffit d'ajouter une entrée ici.**
- `public/puzzle.js` : le découpage des pièces et le glisser-déposer. Le même nombre tiré au hasard donne le même puzzle sur tous les téléphones.
- `public/app.js` : l'écran de l'animateur et celui du joueur.
