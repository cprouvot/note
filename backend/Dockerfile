# Production Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache openssl
COPY package*.json ./

RUN npm install

COPY . .
RUN npx prisma generate || true

EXPOSE 3000

# Utilisation directe du démarrage Node de prod, sans nodemon
CMD ["npm", "start"]
