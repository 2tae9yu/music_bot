import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('나가기')
        .setDescription('재생을 정지하고 봇을 내보냅니다.'),

    async execute(interaction, shoukaku) {
        const queue = interaction.client.queue.get(interaction.guildId);

        if(queue) {
            if(queue.timeout) clearTimeout(queue.timeout);
            
            shoukaku.leaveVoiceChannel(interaction.guildId);
            
            interaction.client.queue.delete(interaction.guildId);
            return interaction.reply({ content: '재생을 멈추고 연결을 끊었습니다.', ephemeral: true });
        }

        // 봇이 채널에 있다면 강제 퇴장
        const bot = interaction.guild.members.me;
        if(bot.voice.channel) {
            shoukaku.leaveVoiceChannel(interaction.guildId);
            return interaction.reply({ content: '연결을 끊었습니다.' , ephemeral: true });
        }

        return interaction.reply({ content: '재생 중인 노래가 없습니다.', ephemeral: true });
    }
};