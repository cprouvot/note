# Development Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copie des fichiers de configuration
RUN apk add --no-cache openssl
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Génération des modèles Prisma si le dossier prisma existe
RUN npx prisma generate || true

EXPOSE 3000

# Nodemon pour le live reloading
CMD ["npm", "run", "dev"]
