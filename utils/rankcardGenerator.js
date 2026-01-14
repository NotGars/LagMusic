import { createCanvas } from 'canvas';
import { AttachmentBuilder } from 'discord.js';

const XP_FOR_LEVEL = (level) => level * 100;

function getTotalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += XP_FOR_LEVEL(i);
  }
  return total;
}

function getNextLevelXp(level) {
  return XP_FOR_LEVEL(level);
}

export async function generateRankcard(userData, style = 'lofi-night') {
  const width = 1000;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (style === 'lofi-night') {
    generateLofiNightCard(ctx, userData, width, height);
  } else if (style === 'lofi-minimal') {
    generateLofiMinimalCard(ctx, userData, width, height);
  } else if (style === 'lofi-anime-desk') {
    generateLofiAnimDeskCard(ctx, userData, width, height);
  } else {
    generateLofiNightCard(ctx, userData, width, height);
  }

  const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
    name: 'rankcard.png',
  });

  return attachment;
}

function generateLofiNightCard(ctx, userData, width, height) {
  const bgColor = '#0f0f1e';
  const accentColor = '#9b59b6';
  const textColor = '#e0e0e0';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(155, 89, 182, 0.1)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2 + 1;
    ctx.fillRect(x, y, size, size);
  }

  ctx.fillStyle = textColor;
  ctx.font = 'bold 48px Arial';
  ctx.fillText(userData.username, 50, 80);

  ctx.font = '32px Arial';
  ctx.fillStyle = accentColor;
  ctx.fillText(`Nivel ${userData.level}`, 50, 130);

  const totalXp = getTotalXpForLevel(userData.level) + userData.xp;
  const nextLevelXp = getNextLevelXp(userData.level);
  const progressPercent = (userData.xp / nextLevelXp) * 100;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(50, 180, 600, 30);

  ctx.fillStyle = accentColor;
  ctx.fillRect(50, 180, (600 * progressPercent) / 100, 30);

  ctx.fillStyle = textColor;
  ctx.font = '20px Arial';
  ctx.fillText(`${userData.xp} / ${nextLevelXp} XP`, 60, 205);

  ctx.textAlign = 'right';
  ctx.font = '24px Arial';
  ctx.fillText(`Total XP: ${userData.total_xp}`, width - 50, 100);
  ctx.fillText(`Voz: ${userData.voice_time_minutes}m | Música: ${userData.music_time_minutes}m`, width - 50, 150);

  ctx.textAlign = 'left';
}

function generateLofiMinimalCard(ctx, userData, width, height) {
  const bgColor = '#e8e4d8';
  const accentColor = '#5a5a5a';
  const textColor = '#2a2a2a';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 48px Georgia';
  ctx.fillText(userData.username, 50, 80);

  ctx.font = '32px Georgia';
  ctx.fillStyle = accentColor;
  ctx.fillText(`Level ${userData.level}`, 50, 130);

  const nextLevelXp = getNextLevelXp(userData.level);
  const progressPercent = (userData.xp / nextLevelXp) * 100;

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 180, 600, 20);

  ctx.fillStyle = accentColor;
  ctx.fillRect(50, 180, (600 * progressPercent) / 100, 20);

  ctx.fillStyle = textColor;
  ctx.font = '18px Georgia';
  ctx.fillText(`${userData.xp} / ${nextLevelXp} XP`, 60, 215);

  ctx.textAlign = 'right';
  ctx.font = '20px Georgia';
  ctx.fillStyle = accentColor;
  ctx.fillText(`Total XP: ${userData.total_xp}`, width - 50, 100);
  ctx.fillText(`Voice: ${userData.voice_time_minutes}m | Music: ${userData.music_time_minutes}m`, width - 50, 145);

  ctx.textAlign = 'left';
}

function generateLofiAnimDeskCard(ctx, userData, width, height) {
  const bgColor = '#f5ead6';
  const accentColor = '#c17a6f';
  const textColor = '#3a3a3a';
  const lightColor = '#fff0e6';

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, 150, height);
  ctx.fillRect(width - 150, 0, 150, height);

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(100, 100, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.font = 'bold 52px Arial';
  ctx.fillText(userData.username, 200, 90);

  ctx.font = '36px Arial';
  ctx.fillStyle = accentColor;
  ctx.fillText(`Level ${userData.level}`, 200, 150);

  const nextLevelXp = getNextLevelXp(userData.level);
  const progressPercent = (userData.xp / nextLevelXp) * 100;

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(200, 190, 500, 35);

  ctx.fillStyle = accentColor;
  ctx.fillRect(200, 190, (500 * progressPercent) / 100, 35);

  ctx.fillStyle = textColor;
  ctx.font = '22px Arial';
  ctx.fillText(`${userData.xp} / ${nextLevelXp} XP`, 210, 220);

  ctx.textAlign = 'right';
  ctx.font = '24px Arial';
  ctx.fillText(`Total XP: ${userData.total_xp}`, width - 170, 100);
  ctx.font = '20px Arial';
  ctx.fillText(`Voice: ${userData.voice_time_minutes}m`, width - 170, 150);
  ctx.fillText(`Music: ${userData.music_time_minutes}m`, width - 170, 180);

  ctx.textAlign = 'left';
}
