# 🧠 Fullstack Mind Mapping & To-Do Studio

Une application puissante combinant un canevas de Mind Mapping infini et une To-Do List intelligente. Ce projet est conçu pour la gestion de projets visuelle, la structuration d'idées, et le suivi d'objectifs, avec un système de compte utilisateur persistant et une architecture Dockerisée pour faciliter son déploiement sur VPS (OVH ou autre).

## ✨ Fonctionnalités Principales

### 🗺️ Mind Mapping Intéractif (Canvas)
*   **Canevas Infini** : Déplacez-vous librement et zoomez (Pan & Zoom) sans limites.
*   **Contrôles Avancés** : Rangement automatique en arbre, gestion de la profondeur (z-index), et liens dynamiques synchronisés.
*   **Gestion Multi-Cartes** : Onglets (Tabs) pour basculer de projets en 1 clic. Conservées en temps réel en base de données.

### ✅ To-Do List Intelligente
*   **Catégories Flexibles** : Création et gestion par Drag & Drop via `dnd-kit`.
*   **Sous-tâches (Indentation)** : Touches `Tab` et `Maj+Tab` pour créer des hiérarchies claires.
*   **Synchronisation Cloud** : Les requêtes asynchrones enregistrent chaque action directement derrière le pare-feu.

### 🔒 Sécurité et Comptes (Nouveau !)
*   **Sessions Multi-Appareils** : Authentification par email/mot de passe sécurisée (bcrypt) vérifiée avec des JSON Web Tokens (JWT).
*   **Tableau de bord Administrateur** : Un panneau interne permet aux administrateurs de modérer le site et de supprimer/gouverner des utilisateurs en base.

## 🛠️ Stack Technique

*   **Frontend** : React 18 (Vite.js), React Flow, dnd-kit, Lucide React, CSS Vanilla.
*   **Backend** : Node.js, Express.js.
*   **Base de Données** : PostgreSQL + Prisma ORM.
*   **Déploiement** : Docker et Docker Compose.

---

## 🚀 Installation & Déploiement (Serveur / VPS / Local)

Le projet utilise **Docker Compose** pour orchestrer dynamiquement 3 conteneurs :
1. La Base de Données `PostgreSQL`
2. L'API métier `Node.js`
3. L'Interface Web `React Vite`

**Pré-requis** : Avoir Docker installé (ou OrbStack sur macOS).

1. Clonez ce dépôt.
2. Démarrez conjointement l'infrastructure entière en arrière-plan :
   ```bash
   docker compose up --build -d
   ```
3. Poussez la structure relationnelle de Prisma dans la base de données fraichement créée :
   ```bash
   docker exec miro-backend npx prisma db push
   ```
4. 🎉 **C'est prêt !** Accédez à l'application web via votre navigateur sur `http://localhost:5173/`.

> *Tips : Pour arrêter silencieusement le projet, tapez simplement `docker compose down`.*
