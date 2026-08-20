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

# Stage 2: Serve application using lightweight Nginx
FROM nginx:alpine

# Copy custom Nginx configuration for React Router single-page app
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static output files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
