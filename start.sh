#!/bin/bash

# Install system dependencies for audio processing
apt-get update && apt-get install -y ffmpeg

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start the bot
python bot.py
