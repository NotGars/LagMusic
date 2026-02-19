FROM node:22

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy bot source
COPY bot ./bot

# Run the bot
CMD ["npx", "tsx", "bot/index.ts"]
