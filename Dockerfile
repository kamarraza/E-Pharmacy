FROM node:18-alpine
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy sources
COPY . .

# Build Next.js app
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
