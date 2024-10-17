# Build Stage
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app's source code
COPY . .

# Install PM2 globally
RUN npm install -g pm2

# Production Stage
FROM node:18-alpine

WORKDIR /app

# Copy the built app from the build stage
COPY --from=build /app /app

# Expose the port your app runs on
EXPOSE 3000

# Start the app with PM2 in daemon mode
CMD ["node", "index.js"]