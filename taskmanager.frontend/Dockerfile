FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --include=optional && npm install lightningcss-linux-x64-gnu@1.31.1 @tailwindcss/oxide-linux-x64-gnu@4.2.1 --no-save

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app .
EXPOSE 3000
CMD ["npm", "run", "start"]
