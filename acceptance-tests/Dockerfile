FROM node:25.6.0-alpine@sha256:c8d96e95e88f08f814af06415db9cfd5ab4ebcdf40721327ff2172ff25cfb997

ENV PORT=8080

COPY . /app

EXPOSE ${PORT}
CMD ["node", "/app/fake-api/server.js"]
