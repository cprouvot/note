# 🧠 Local Mind Mapping & To-Do Studio

Une application locale puissante inspirée de Miro, combinant un canevas de Mind Mapping infini et une To-Do List intelligente. Ce projet est conçu pour la gestion de projets visuelle, la structuration d'idées, et le suivi d'objectifs, avec une garantie de confidentialité totale (100% hors-ligne).

## ✨ Fonctionnalités Principales

### 🗺️ Mind Mapping Intéractif (Canvas)
*   **Canevas Infini** : Déplacez-vous librement et zoomez (Pan & Zoom) sans limites.
*   **Nœuds Personnalisés** : 
    *   **Idées structurées** : Connectables entre elles via flèches dynamiques.
    *   **Post-its / Rectangles** : Zones de texte flottantes, de tailles personnalisables (`NodeResizeControl`) et de couleurs de fond modifiables.
    *   **Texte Libre** : Titres et annotations transparentes.
*   **Contrôles Avancés** : 
    *   Rangement automatique (Alignement en arbre) des nœuds enfants au clic droit.
    *   Gestion du premier plan / arrière plan (z-index) via menu contextuel.
    *   Mouvement synchronisé : le déplacement d'un nœud parent entraîne organiquement tous ses enfants.
*   **Raccourcis Clavier** : Touche `Tab` pour ajouter instantanément de nouvelles idées enfants connectées à la volée.
*   **Gestion Multi-Cartes** : Système d'onglets (Tabs) pour créer et basculer d'un projet de mapping à un autre en 1 clic.

### ✅ To-Do List Intelligente
*   **Catégories Flexibles** : Création et suppression de vos propres "colonnes" de tâches (ex: Urgent, A faire, En attente...).
*   **Drag & Drop** : Réorganisez vos tâches ou glissez-les d'une catégorie à une autre de manière fluide grâce au moteur `dnd-kit`.
*   **Sous-tâches (Indentation)** : Touches `Tab` et `Maj+Tab` pour décaler vos tâches sur le côté et créer des hiérarchies visuelles très propres.
*   **Ergonomie Rapide** : Touche `Entrée` pour enchainer la création de nouvelles tâches, bouton inline `+ Ajouter une tâche`, et actions groupées (Exporter le texte, vider complètement la catégorie).

### 🔒 Privacy-First & Sauvegarde Automatique
*   **Architecture Locale (Local Storage)** : Absolument toutes les données (coordonnées des nœuds, dimensions, textes modifiés, avancement des tâches, catégories) sont sauvegardées en continu et **uniquement** dans le stockage de votre navigateur (`localStorage`). Aucune base de donnée, aucune donnée ne quitte votre appareil.

## 🛠️ Stack Technique

*   **React 18** (Vite.js)
*   **React Flow** : Moteur de rendu du canevas nodal.
*   **@dnd-kit** : Bibliothèque de Drag & Drop moderne pour les listes.
*   **Lucide React** : Librairie d'icônes SVG.
*   **Vanilla CSS** : Variables CSS (`--primary`, ...) pour un design system propre 100% natif.

## 🚀 Installation & Lancement local

1. Clonez ce dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Ouvrez votre navigateur web à l'adresse `http://localhost:5173/`.
