FROM node:25.2.1-alpine@sha256:f4769ca6eeb6ebbd15eb9c8233afed856e437b75f486f7fccaa81d7c8ad56007

ENV PORT=8080

COPY . /app

EXPOSE ${PORT}
CMD ["node", "/app/fake-api/server.js"]
