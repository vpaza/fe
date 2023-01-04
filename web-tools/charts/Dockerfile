FROM node:lts

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./
# Copy the script and js file
COPY convert.js ./
COPY init.sh ./

# Install app dependencies
RUN npm install

# Run init.sh
CMD [ "sh", "init.sh" ]