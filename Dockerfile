FROM mcr.microsoft.com/playwright:v1.55.1-noble
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run typecheck
CMD ["npm", "run", "qa:all"]
