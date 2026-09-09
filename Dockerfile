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

# Stage 2: Serve application using Nginx + Native Node.js Backend
FROM ubuntu:22.04

# Prevent interactive timezone prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Configure Ubuntu multiverse repository, install Node.js 20, Nginx, FFmpeg, and Intel hardware drivers
RUN apt-get update && apt-get install -y software-properties-common curl \
    && add-apt-repository multiverse \
    && apt-get update \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends \
    nodejs \
    nginx \
    ffmpeg \
    libva-drm2 \
    libva2 \
    intel-media-va-driver-non-free \
    i965-va-driver \
    mesa-va-drivers \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server backend and startup script
COPY server ./server
COPY start.sh ./start.sh

# Ensure start.sh script is executable
RUN chmod +x ./start.sh

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# Copy compiled static HTML/JS/CSS output from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5150 5000

CMD ["/app/start.sh"]
