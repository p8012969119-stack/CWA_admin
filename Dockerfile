FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json* ./
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
