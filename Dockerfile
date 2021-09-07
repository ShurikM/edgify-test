# build

# set node image with version
FROM node:10-slim

# create directory
RUN mkdir /application

# set work directory
WORKDIR /application

# copy all sources to container
COPY . /application

# install dependencies
RUN npm install

# run your application
CMD npm run start

EXPOSE 3000
