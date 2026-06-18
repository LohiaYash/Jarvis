FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  python3 \
  make \
  g++ \
  libxtst-dev \
  libpng-dev \
  libx11-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN npm install
RUN npm run build

FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app ./
EXPOSE 4010
CMD ["npm", "run", "start", "-w", "@jarvis/api"]

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app ./
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@jarvis/web"]
