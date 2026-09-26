# Guide de déploiement - Relais Vitesse EPS

Ce guide détaille les étapes pour déployer l'application sur Render et GitHub.

## 📋 Prérequis

- Un compte GitHub
- Un compte Render (gratuit disponible)
- Node.js 18+ installé localement (pour les tests)

## 🚀 Déploiement sur Render

### Étape 1 : Préparer le repository GitHub

1. Créez un nouveau repository sur GitHub
2. Initialisez et poussez votre code :

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/votre-username/relais-vitesse-eps.git
git push -u origin main
```

### Étape 2 : Déployer sur Render (Site Statique)

**Méthode recommandée pour les applications React/Vite**

1. Connectez-vous à [Render](https://render.com)
2. Cliquez sur **"New +"** → **"Static Site"**
3. Connectez votre repository GitHub
4. Configurez :
   - **Name**: `relais-vitesse-eps` (ou votre choix)
   - **Branch**: `main` (ou `master`)
   - **Root Directory**: (laisser vide)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment**: `Node`
   - **Node Version**: `20`

5. Cliquez sur **"Create Static Site"**
6. Render va automatiquement :
   - Installer les dépendances
   - Exécuter le build
   - Déployer l'application

7. Votre application sera disponible à : `https://relais-vitesse-eps.onrender.com`

### Étape 3 : Configuration alternative (Web Service)

Si vous préférez utiliser un Web Service :

1. Créez un nouveau **Web Service**
2. Utilisez le fichier `render.yaml` :
   - Render détectera automatiquement le fichier
   - Ou configurez manuellement avec les paramètres du fichier

3. Variables d'environnement (optionnel) :
   ```env
   NODE_ENV=production
   ```

### Étape 4 : Configuration automatique avec render-static.yaml

Le fichier `render-static.yaml` peut être utilisé pour une configuration rapide :

1. Assurez-vous que le fichier est dans votre repository
2. Render détectera automatiquement le fichier lors de la création du service
3. Tous les paramètres seront pré-configurés

## 🔧 Configuration personnalisée

### Variables d'environnement sur Render

Si vous avez besoin de variables d'environnement :

1. Allez dans votre service sur Render
2. Cliquez sur **"Environment"**
3. Ajoutez vos variables :
   ```
   VITE_APP_ENV=production
   VITE_API_URL=https://votre-api.com
   ```

### Domaine personnalisé

1. Dans votre service Render, allez dans **"Settings"**
2. Cliquez sur **"Custom Domains"**
3. Ajoutez votre domaine
4. Configurez les DNS selon les instructions Render

## 📝 Fichiers de configuration

### render.yaml / render-static.yaml

Ces fichiers configurent automatiquement :
- Le build command
- Le répertoire de publication
- Les en-têtes de sécurité
- Le cache des assets statiques
- La région (Frankfurt par défaut)

### .github/workflows/deploy.yml

Ce fichier configure GitHub Actions pour :
- Tester le build sur plusieurs versions de Node.js
- Vérifier le linting
- S'assurer que le build fonctionne

## 🔍 Vérification du déploiement

### Avant le déploiement

```bash
# Tester localement le build de production
npm run build
npm run preview

# Vérifier qu'il n'y a pas d'erreurs
npm run lint
npm run type-check
```

### Après le déploiement

1. Vérifiez que l'application se charge correctement
2. Testez les fonctionnalités principales
3. Vérifiez la console pour les erreurs
4. Testez sur mobile et desktop

## 🐛 Dépannage

### Le build échoue sur Render

- Vérifiez les logs de build dans Render
- Assurez-vous que Node.js 18+ est utilisé
- Vérifiez que toutes les dépendances sont dans `package.json`

### L'application ne se charge pas

- Vérifiez que le `Publish Directory` est bien `dist`
- Vérifiez les erreurs dans la console du navigateur
- Vérifiez les en-têtes HTTP dans les DevTools

### Les routes ne fonctionnent pas

- Vérifiez la configuration de `base` dans `vite.config.ts`
- Assurez-vous que Render est configuré pour servir `index.html` pour toutes les routes
- Vérifiez la configuration des en-têtes dans `render.yaml`

### Les assets ne se chargent pas

- Vérifiez que le `base` dans `vite.config.ts` correspond à votre URL de déploiement
- Vérifiez les logs de build pour voir où les assets sont générés
- Vérifiez les en-têtes de cache dans `render.yaml`

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Documentation Vite](https://vitejs.dev/)
- [Documentation React Router](https://reactrouter.com/)

## 🔐 Sécurité

Les fichiers de configuration incluent des en-têtes de sécurité :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

Ces en-têtes sont automatiquement appliqués lors du déploiement sur Render.
