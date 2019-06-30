FROM node:10-alpine
ENV NODE_ENV=production
EXPOSE 8080
EXPOSE 7000

RUN npm i npm@latest -g
RUN mkdir /opt/node_app && chown node:node /opt/node_app

WORKDIR /opt/node_app
COPY package*.json ./
RUN npm install --no-optional
ENV PATH /opt/node_app/node_modules/.bin:$PATH
COPY . .