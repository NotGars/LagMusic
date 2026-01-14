import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useQueue } from 'discord-player';
import supabase from '../../config/supabase.js';

export default {
  data: new SlashCommandBuilder().setName('voteskip').setDescription('Votación para saltar'),
  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue?.isPlaying()) return interaction.reply({ content: '❌ No hay música.', ephemeral: true });

    const channel = interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });

    const totalMembers = channel.members.filter((m) => !m.user.bot).size;
    const requiredVotes = Math.ceil(totalMembers / 2);

    const { data: existingVote } = await supabase
      .from('vote_skips')
      .select('*')
      .eq('guild_id', interaction.guild.id)
      .eq('channel_id', channel.id)
      .maybeSingle();

    if (existingVote) {
      const voters = existingVote.voters || [];
      if (voters.includes(interaction.user.id)) return interaction.reply({ content: '❌ Ya votaste.', ephemeral: true });

      voters.push(interaction.user.id);
      await supabase.from('vote_skips').update({ voters }).eq('id', existingVote.id);

      if (voters.length >= requiredVotes) {
        await supabase.from('vote_skips').delete().eq('id', existingVote.id);
        const track = queue.currentTrack;
        queue.node.skip();
        return interaction.reply({ content: `✅ Votación exitosa! Saltada: **${track.title}**` });
      }
      return interaction.reply({ content: `✅ Voto registrado. ${voters.length}/${requiredVotes}` });
    }

    const track = queue.currentTrack;
    await supabase.from('vote_skips').insert({
      guild_id: interaction.guild.id,
      channel_id: channel.id,
      song_title: track.title,
      voters: [interaction.user.id],
      total_members: totalMembers,
    });

    if (1 >= requiredVotes) {
      queue.node.skip();
      return interaction.reply({ content: `✅ Saltada: **${track.title}**` });
    }

    return interaction.reply({ content: `🗳️ Votación iniciada. 1/${requiredVotes} votos` });
  },
};
