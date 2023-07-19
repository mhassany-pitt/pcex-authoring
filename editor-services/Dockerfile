FROM node:18-alpine
RUN apk add --no-cache openjdk11-jre
WORKDIR /pcex-editor
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]