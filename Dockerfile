# Stage 1: Build the Vite React application
FROM node:18-alpine AS build

WORKDIR /app

# Optional build argument for TMDB key override
ARG VITE_APP_TMDB_KEY
ENV VITE_APP_TMDB_KEY=$VITE_APP_TMDB_KEY

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy application source files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve application using Nginx + Node.js Settings Backend
FROM nginx:alpine

# Install Node.js and npm for backend settings server
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy server package files and install production dependencies directly in Alpine runtime
COPY package*.json ./
COPY server ./server
COPY start.sh ./start.sh

RUN npm install --production

# Ensure start.sh script is executable
RUN chmod +x ./start.sh

# Copy custom Nginx configuration for React Router single-page app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static output files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 5000

CMD ["/app/start.sh"]
