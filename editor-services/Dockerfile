FROM node:20-alpine
RUN apk add --no-cache openjdk11-jdk
RUN apk add --no-cache python3
RUN apk add --no-cache g++
RUN apk add --no-cache gcc
WORKDIR /pcex-authoring
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]