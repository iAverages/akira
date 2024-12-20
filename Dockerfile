FROM node:lts as build

RUN mkdir -p /app

WORKDIR /app

RUN npm install -g pnpm

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY package.json /app
COPY pnpm-lock.yaml /app

RUN pnpm install --production

COPY . /app

RUN pnpm prisma generate
RUN pnpm run build

FROM node:lts-alpine as runner

RUN npm install -g pnpm

RUN mkdir -p /app

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/.output /app/.output
COPY --from=build /app/.vinxi /app/.vinxi


EXPOSE 3000

CMD pnpm start