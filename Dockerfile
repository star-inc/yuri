# SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)

# Stage 1: Builder
FROM node:24-alpine AS builder

WORKDIR /workplace

COPY package.json package-lock.json* ./

RUN npm install --ignore-scripts

COPY . .

RUN npm run build

# Stage 2: Runner
FROM node:24-alpine

ENV RUNTIME_ENV="container"
ENV NODE_ENV="production"

RUN addgroup -g 3000 scarlet && \
    adduser -HD -u 3000 -G scarlet -h /workplace flandre

RUN mkdir -p /.npm /workplace && \
    chown -R 3000:3000 /.npm /workplace

WORKDIR /workplace

COPY --chown=3000:3000 package.json package-lock.json* ./

USER 3000

RUN npm install --omit=dev --ignore-scripts

COPY --from=builder --chown=3000:3000 /workplace/dist ./

EXPOSE 3000
CMD ["node", "index.js"]
