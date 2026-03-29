FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN yarn install

COPY . .

RUN yarn prisma:generate
RUN yarn build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma:migrate:deploy && node dist/server.js"]
