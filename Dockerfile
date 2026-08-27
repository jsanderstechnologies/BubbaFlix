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

# Install Node.js runtime, FFmpeg, VLC, and universal GPU hardware acceleration drivers (Intel QSV/VAAPI & AMD Radeon VAAPI)
RUN apk add --no-cache nodejs ffmpeg vlc libva libva-intel-driver intel-media-driver mesa-va-gallium mesa-dri-gallium

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

EXPOSE 5150 5000

CMD ["/app/start.sh"]
