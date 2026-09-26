# Guide de démarrage rapide - Déploiement

## 🚀 Déploiement rapide sur Render

### Prérequis
- Un compte GitHub
- Un compte Render (gratuit disponible sur https://render.com)

### Étapes

1. **Pousser votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Relais Vitesse EPS"
   git branch -M main
   git remote add origin https://github.com/VOTRE-USERNAME/relais-vitesse-eps.git
   git push -u origin main
   ```

2. **Créer un Static Site sur Render**
   - Connectez-vous à [Render Dashboard](https://dashboard.render.com)
   - Cliquez sur **"New +"** → **"Static Site"**
   - Connectez votre repository GitHub
   - Sélectionnez votre repository `relais-vitesse-eps`

3. **Configuration (automatique avec render.yaml)**
   - Render détectera automatiquement le fichier `render-static.yaml`
   - Les paramètres seront pré-remplis :
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `dist`
     - **Environment**: Static Site
     - **Node Version**: 20 (spécifié dans .nvmrc)

4. **Créer le service**
   - Cliquez sur **"Create Static Site"**
   - Render va automatiquement :
     - Installer les dépendances (npm install)
     - Builder l'application (npm run build)
     - Déployer les fichiers du dossier `dist/`

5. **Accéder à votre application**
   - Votre application sera disponible à : `https://relais-vitesse-eps.onrender.com`
   - Le déploiement prend environ 2-3 minutes
   - Les futurs push sur la branche `main` déclencheront automatiquement un nouveau déploiement

## 🔧 Configuration manuelle (si nécessaire)

Si Render ne détecte pas automatiquement la configuration :

- **Name**: `relais-vitesse-eps`
- **Branch**: `main`
- **Root Directory**: (laisser vide)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment**: `Static Site`
- **Node Version**: `20`

## 📝 Variables d'environnement (optionnel)

Si vous avez besoin de variables d'environnement :

1. Allez dans votre service sur Render
2. Cliquez sur **"Environment"**
3. Ajoutez vos variables avec le préfixe `VITE_` :
   ```
   VITE_APP_ENV=production
   VITE_API_URL=https://votre-api.com
   ```

## ✅ Vérification

Après le déploiement, vérifiez que :
- ✅ L'application se charge correctement
- ✅ Les routes fonctionnent (essayez de naviguer dans l'app)
- ✅ Le responsive fonctionne (testez sur mobile)
- ✅ Pas d'erreurs dans la console du navigateur

## 🐛 Dépannage

### Le build échoue
- Vérifiez les logs de build dans Render
- Assurez-vous que Node.js 20 est utilisé
- Vérifiez que toutes les dépendances sont dans `package.json`

### L'application ne se charge pas
- Vérifiez que le `Publish Directory` est bien `dist`
- Vérifiez les erreurs dans la console du navigateur (F12)
- Vérifiez que le fichier `dist/index.html` existe après le build

### Les routes ne fonctionnent pas
- Le fichier `_redirects` dans `public/` devrait être copié automatiquement
- Vérifiez que Render est configuré pour servir `index.html` pour toutes les routes
- Le fichier `render-static.yaml` inclut une configuration de routes

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Documentation Vite](https://vitejs.dev/)
- [Guide complet de déploiement](DEPLOY.md)
