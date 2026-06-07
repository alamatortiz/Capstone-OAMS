FROM node:20-alpine

WORKDIR /app

# Copy package files first to optimize Docker build caching
COPY package*.json ./

RUN npm install

# Copy the rest of your backend source code
COPY . .

EXPOSE 5000

# Launches your backend server using your package.json script
CMD ["npm", "run", "dev"]