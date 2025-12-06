import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('스킵')
        .setDescription('현재 재생 중인 노래를 건너뜁니다.'),

    async execute(interaction) {
        const queue = interaction.client.queue.get(interaction.guildId);

        // 재생 중인 곡이 없을때
        if(!queue) return interaction.reply('재생 중인 노래가 없습니다.');

        // 대기열에 다음 곡이 없을 때
        if(queue.songs.length <= 1) {
            return interaction.reply({ content: '대기열이 비어있어 건너뛸 수 없습니다.', ephemeral: true });
        }

        await interaction.deferReply();

        queue.player.stopTrack();

        await interaction.deleteReply();
    }
};