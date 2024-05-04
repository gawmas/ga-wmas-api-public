# Use an official Node.js runtime as a base image
FROM node:18.19-alpine3.19

# Set the working directory in the container
WORKDIR /gawmas

# Copy package.json to the working directory
COPY package.json .

# Install the application dependencies
RUN npm install

# Copy the entire application code to the working directory
COPY . .

# Command to run your application
CMD ["npm", "start"]
