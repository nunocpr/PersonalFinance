FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN yarn install

COPY . .

RUN yarn prisma:generate
RUN yarn build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma:migrate:deploy && node dist/server.js"]
