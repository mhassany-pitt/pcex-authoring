FROM node:20-alpine
RUN npm install -g npm@10.5.2
RUN npm install -g @angular/cli@17.3.7
WORKDIR /app
CMD npm install ; ng build --base-href=http://adapt2.sis.pitt.edu/pcex-authoring/