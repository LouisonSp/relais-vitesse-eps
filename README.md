# Relais Vitesse

Application de classe pour le relais vitesse en EPS. L'enseignant prépare la piste, les élèves et les zones. L'élève chronomètre un binôme, place la transmission, filme le passage du témoin et revoit la tentative.

Aujourd'hui, tout est enregistré dans le navigateur de l'appareil (classes, séances, vidéos). C'est suffisant pour une séance sur un ordinateur ou un téléphone partagé. Une base commune, pour que chaque téléphone ait les mêmes classes, est prévue ensuite : voir [Application téléphone et base de données](#application-téléphone-et-base-de-données).

## Lancer en local

Prérequis : Node.js 20.

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Depuis un téléphone sur le même Wi-Fi, utiliser l'adresse réseau affichée par Vite.

## Côté enseignant

1. Sur l'accueil, choisir **Enseignant**.
2. Créer un groupe. La clé de classe (6 caractères) sert aux élèves.
3. Ajouter les élèves du groupe.
4. Configurer la piste :
   - distance totale (axe du couloir 1) ;
   - zones de transmission : début depuis le départ, longueur, distance restante jusqu'à l'arrivée ;
   - arrivées différées sur 12 secondes : un plot = une vitesse, la distance est calculée automatiquement (25 km/h = 83,3 m). Le libellé peut être changé, par exemple `A2`.
5. Enregistrer. Une zone qui dépasse la piste est refusée.

La clé se copie pour la donner aux élèves.

## Côté élève

1. Choisir **Élève**, entrer son nom et la clé de classe.
2. Créer une séance.
3. Indiquer le donneur et le receveur (liste de la classe, ou saisie libre).
4. Chrono, dans cet ordre :
   - **Départ** : lance le donneur ;
   - **Départ receveur** : lance le receveur, le donneur continue ;
   - **Transmission** : arrête le donneur, le receveur continue ;
   - **Arrivée** : arrête le receveur.
5. Cliquer sur la piste à l'endroit du témoin. Le clic n'est accepté que dans une zone de transmission.
6. Choisir le plot atteint en 12 s, ou laisser l'arrivée de la piste.
7. Filmer la transmission, puis enregistrer la tentative.

Chaque tentative garde les deux temps, les distances (donneur : départ jusqu'au clic ; receveur : clic jusqu'à l'arrivée ou au plot), le temps du témoin et l'échange. **Reconstituer** rejoue les deux coureurs sur le schéma. **Revoir la vidéo**, ou un clic sur le point, relance le film.

Si le plot choisi est avant le clic, la distance du receveur est nulle : placer la zone avant ce plot, ou choisir un plot plus loin. Sur un 400 m, les plots de 15 à 30 km/h sont dans les 100 premiers mètres.

## Vérifier le projet

```bash
npm run type-check
npm run lint
npm run build
```

## Mettre sur GitHub puis sur Render

Le fichier `render.yaml` décrit un site statique (build `npm install && npm run build`, dossier publié `dist`, routes renvoyées vers `index.html`).

1. Le code est sur GitHub.
2. Créer un compte sur [Render](https://render.com).
3. **New** → **Blueprint**, puis choisir ce dépôt. Render lit `render.yaml`.
4. Lancer le déploiement. L'adresse ressemble à `https://relais-vitesse-eps.onrender.com`.
5. Chaque push sur `main` redéploie le site.

On peut aussi créer un **Static Site** à la main avec les mêmes commandes :

- Build : `npm install && npm run build`
- Publish directory : `dist`

Node 20 est indiqué dans `.nvmrc`.

## Application téléphone et base de données

Le site construit est une application web installable (PWA). Sur le téléphone, ouvrir l'adresse Render, puis **Ajouter à l'écran d'accueil** (Android) ou **Sur l'écran d'accueil** (Safari). L'icône ouvre l'application en plein écran. Le plugin `vite-plugin-pwa` prépare le manifeste et la mise en cache des fichiers de l'application.

Limite actuelle : les données ne quittent pas l'appareil. L'enseignant et les élèves doivent utiliser le même navigateur pour partager la classe, les élèves et les séances. Les vidéos sont dans IndexedDB de ce navigateur.

Pour une application téléphonique commerciale, l'étape suivante est une base partagée :

1. Ajouter une API et une base PostgreSQL (Render peut héberger les deux).
2. Renseigner `VITE_API_URL` dans l'environnement de build (modèle dans `.env.example`).
3. Brancher cette URL à la place des stores locaux `teacherStore`, `sessionStore` et `authStore`.

Les stores Zustand sont le seul endroit qui lit et écrit les classes, les séances et les comptes. Les écrans n'ont pas à changer quand la base arrivera. L'empaquetage boutique (App Store, Play Store) peut se faire ensuite autour de ce même site, une fois les comptes et les vidéos hébergés.

## Structure utile

- `src/pages` : accueil, connexion élève, tableau de bord, séance, espace enseignant
- `src/components/AttemptPanel.tsx` : chrono, binôme, vidéo, liste des tentatives
- `src/components/TrackCanvas.tsx` : piste, zones, plots, clic, reconstitution
- `src/components/TrackConfigForm.tsx` : configuration de la piste
- `src/lib/trackMath.ts` : distances, temps du témoin, plots de 12 s
- `src/lib/videoDb.ts` : vidéos dans IndexedDB
- `src/store` : données locales enseignant, séances et connexion
