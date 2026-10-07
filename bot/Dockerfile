FROM node:22

WORKDIR /app

# yt-dlp (descarga de canciones). Si esto falla en el build, el bot lo baja solo al arrancar.
RUN ARCH="$(uname -m)"; \
    if [ "$ARCH" = "aarch64" ]; then ASSET=yt-dlp_linux_aarch64; else ASSET=yt-dlp_linux; fi; \
    curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$ASSET" -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp || echo "yt-dlp no se pudo instalar en el build; se descargará al iniciar"

# Copy bot package files
COPY package.json package-lock.json ./
RUN npm install

# Copy bot source
COPY . .

# Run the bot
CMD ["npx", "tsx", "index.ts"]
