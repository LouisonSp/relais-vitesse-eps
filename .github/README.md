# GitHub Workflow

Ce dossier contient les workflows GitHub Actions pour l'automatisation CI/CD.

## Fichiers

- **`workflows/deploy.yml`** : Workflow qui teste et build l'application à chaque push/PR

## Utilisation

Les workflows se déclenchent automatiquement lors de :
- Push sur les branches `main` ou `master`
- Pull Requests vers `main` ou `master`

Vous n'avez rien à configurer, cela fonctionne automatiquement !
