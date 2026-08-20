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

# Stage 2: Serve application using Nginx + Node.js FFmpeg Transcoder Backend
FROM nginx:alpine

# Install FFmpeg and Node.js for real-time video/audio transcoding
RUN apk add --no-cache ffmpeg nodejs npm

WORKDIR /app

# Copy server files and package.json for transcoder backend
COPY package*.json ./
COPY server ./server
RUN npm install --only=production

# Copy custom Nginx configuration for React Router single-page app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static output files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 5000

# Start both Node FFmpeg transcoder server and Nginx web server
CMD ["sh", "-c", "node server/transcoder.js & nginx -g 'daemon off;'"]
