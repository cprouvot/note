# Development Dockerfile
FROM node:20-alpine

WORKDIR /usr/src/app

# Copie des fichiers de configuration
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Le port par défaut de Vite
EXPOSE 5173

# Lancement de Vite avec host 0.0.0.0 pour l'exposition sur Orbstack
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
