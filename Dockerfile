# Stage 1: Build the Vite React application
FROM node:18-alpine AS build

WORKDIR /app

# Optional build argument for TMDB key override
ARG VITE_APP_TMDB_KEY
ENV VITE_APP_TMDB_KEY=$VITE_APP_TMDB_KEY

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve application using ultra-lightweight Nginx + Native Node.js Settings Backend
FROM nginx:alpine

# Install ONLY lightweight Node.js runtime (No npm, No FFmpeg, No heavy build tools!)
RUN apk add --no-cache nodejs

WORKDIR /app

# Copy server backend and startup script
COPY server ./server
COPY start.sh ./start.sh

# Ensure start.sh script is executable
RUN chmod +x ./start.sh

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static HTML/JS/CSS output from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 5000

CMD ["/app/start.sh"]
