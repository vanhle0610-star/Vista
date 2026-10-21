FROM node:22.13-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM node:22.13-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM node:22.13-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build --chown=nextjs:nextjs /app .
USER nextjs
EXPOSE 3000
CMD ["npm","start"]
