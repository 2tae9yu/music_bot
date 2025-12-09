import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('일시정지')
        .setDescription('노래를 일시정지하거나 다시 재생합니다.'),

    async execute(interaction) {
        // [선택 사항] 봇과 같은 방에 있는지 체크 (play.js와 동일)
        const voiceChannel = interaction.member.voice.channel;
        const botVoiceChannelId = interaction.guild.members.me.voice.channelId;

        if(botVoiceChannelId && (!voiceChannel || voiceChannel.id !== botVoiceChannelId)) {
            return interaction.reply({ content: '봇과 같은 음성 채널에 있어야합니다.', ephemeral: true });
        }

        const queue = interaction.client.queue.get(interaction.guildId);
        if(!queue) return interaction.reply({ content: '재생 중인 곡이 없습니다.', ephemeral: true });

        // 현재 상태 반대로 변경 (멈춤 <-> 재생)
        const isPaused = !queue.player.paused;
        await queue.player.setPaused(isPaused);
        
        return interaction.reply({ content: isPaused ? '⏸️ 곡을 일시정지합니다.' : '▶️ 곡을 다시 재생합니다.', ephemeral: true });
    }
};