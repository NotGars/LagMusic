FROM node:22

WORKDIR /app

# Copy bot package files
COPY package.json package-lock.json ./
RUN npm install

# Copy bot source
COPY . .

# Run the bot
CMD ["npx", "tsx", "index.ts"]
