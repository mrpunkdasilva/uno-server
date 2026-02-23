#
FROM node:20-alpine AS builder

WORKDIR /usr/src/app


RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production


FROM node:20-alpine

WORKDIR /usr/src/app


COPY --from=builder --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .


USER node


EXPOSE 3000


CMD [ "node", "src/app.js" ]
