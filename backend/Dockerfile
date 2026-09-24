FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Compile TypeScript to JavaScript in the dist folder
RUN npm run build

# Expose backend port
EXPOSE 5000

# Start the compiled Node.js server
CMD ["node", "dist/server.js"]
