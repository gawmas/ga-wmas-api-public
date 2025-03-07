FROM node:18.19-alpine3.19
WORKDIR /gawmas
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]
