# 🧠 Mindboard - Fullstack Mind Mapping & To-Do Studio

Une application puissante combinant un canevas de Mind Mapping infini et une To-Do List intelligente. Ce projet est conçu pour la gestion de projets visuelle, la structuration d'idées, et le suivi d'objectifs, avec un système de compte utilisateur persistant et une architecture Dockerisée pour faciliter le déploiement.

## 🚀 Guide de Déploiement (Production / VPS)

Ce projet est structuré pour être facilement hébergeable, que ce soit via des plateformes PaaS (Render, Railway, Vercel) ou un VPS (OVH, Hetzner) avec Docker. Afin que Antigravity (ou tout autre agent) puisse le déployer avec succès, voici les instructions clés.

### 1. Variables d'Environnement (À définir sur l'hébergeur)

L'agent ou le développeur doit s'assurer que les variables suivantes sont configurées :

**Backend (`backend/.env` ou variables d'environnement du serveur) :**
- `DATABASE_URL` : L'URI de connexion PostgreSQL (ex: `postgresql://user:pass@host:5432/mindboarddb?schema=public`).
- `JWT_SECRET` : Clé de cryptage sécurisée pour les sessions (ex: `MaSuperCleSecreteDifficileAVoir`).
- `PORT` : Le port sur lequel l'API tournera (souvent fourni par le PaaS, par défaut `3000`).

**Frontend (`frontend/.env` ou variables d'environnement de build) :**
- `VITE_API_URL` : L'URL publique du Backend une fois déployé (ex: `https://api.mon-domaine.com`).
> **Important** : Le frontend étant compilé via Vite, cette variable doit absolument être injectée *au moment du build*.

### 2. Commandes de Build et de Déploiement

Le projet se sépare en deux applications indépendantes. L'agent AI devra idéalement créer deux services distincts :

**Service Backend (Node.js) :**
- Dossier racine : `backend/`
- Commande d'installation : `npm install`
- Déploiement de la BDD : `npx prisma generate && npx prisma db push`
- Commande de démarrage : `node src/server.js` (ou `npm start` si ajouté au package.json)

**Service Frontend (Static Site / Vercel / Netlify / Render) :**
- Dossier racine : `frontend/`
- Commande d'installation : `npm install`
- Commande de build : `npm run build`
- Dossier de sortie (Output directory) : `dist/`

### 3. Architecture Technique

*   **Frontend** : React 18 (Vite.js). Architecture "Single Page Application".
*   **Backend** : Engine Node.js avec Express, architecture REST.
*   **Base de Données** : PostgreSQL via Prisma ORM pour garantir l'intégrité relationnelle.

---

## 🛠️ Utilisation en local avec Docker Compose

L'environnement local en cours de développement offre déjà la version dockerisée complète orchestrée via `docker-compose.yml`.

1. Clonez ce dépôt.
2. Démarrez conjointement l'infrastructure entière (Front, Back, BDD) en tâche de fond :
   ```bash
   docker compose up --build -d
   ```
3. Poussez la structure relationnelle de Prisma dans la base de données :
   ```bash
   docker exec mindboard-backend npx prisma db push
   ```
4. 🎉 L'application est prête ! Accédez-y sur `http://localhost:8080/`.

*Pour stopper silencieusement et économiser les ressources, tapez : `docker compose down`.*
