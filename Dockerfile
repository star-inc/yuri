# SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)

FROM node:24-alpine

ENV TRUST_PROXY="uniquelocal"
ENV HTTP_HOSTNAME="0.0.0.0"
ENV RUNTIME_ENV="container"
ENV NODE_ENV="production"
ENV HUSKY="0"

RUN addgroup -g 3000 scarlet && \
    adduser -HD -u 3000 -G scarlet -h /workplace flandre

RUN mkdir -p /.npm /workplace && \
    chown -R 3000:3000 /.npm /workplace

WORKDIR /workplace

COPY --chown=3000:3000 package.json package-lock.json* ./

USER 3000

RUN npm install --omit=dev --ignore-scripts

COPY --chown=3000:3000 . .

EXPOSE 3000
CMD ["node", "app.ts"]
