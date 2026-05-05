# SPDX-License-Identifier: BSD-3-Clause (https://ncurl.xyz/s/mI23sevHR)

FROM node:24-alpine

ENV TRUST_PROXY="uniquelocal"
ENV HTTP_HOSTNAME="0.0.0.0"
ENV RUNTIME_ENV="container"

RUN addgroup \
        -g 3000 \
        scarlet
RUN adduser -HD \
        -u 3000 \
        -G scarlet \
        -h /workplace \
        flandre

RUN mkdir -p /.npm /workplace && \
    chown -R 3000:3000 /.npm /workplace

WORKDIR /workplace
COPY --chown=3000:3000 . /workplace

USER 3000
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
