FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

ENV PORT=8080

COPY . /app

EXPOSE ${PORT}
CMD ["node", "/app/fake-api/server.js"]
