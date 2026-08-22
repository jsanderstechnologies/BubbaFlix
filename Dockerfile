# Stage 1: Build the Vite React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source files
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Serve application using Nginx + Native Node.js Backend + FFmpeg & VLC Transcoder Engine
FROM nginx:alpine

# Install Node.js runtime, FFmpeg, and VLC media engine for universal backend stream transcoding
RUN apk add --no-cache nodejs ffmpeg vlc

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
