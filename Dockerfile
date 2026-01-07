FROM node:20-alpine

# Dossier de travail
WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci --omit=dev

# Code source
COPY . .

# Port exposé
EXPOSE 3000

# Lancement
CMD ["node", "index.cjs"]
