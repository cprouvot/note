# Stage 1: Build Image
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .

# Définition de la variable VITE_API_URL au moment du 빌드 (build-time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Production Nginx Image
FROM nginx:alpine

# Remplacement de la configuration Nginx par défaut
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers compilés React de l'étape 1 vers le conteneur web Nginx
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
