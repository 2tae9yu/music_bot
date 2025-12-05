import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('일시정지')
        .setDescription('노래를 일시정지하거나 다시 재생합니다.'),

    async execute(interaction) {
        const queue = interaction.client.queue.get(interaction.guildId);
        if(!queue) return interaction.reply('재생 중인 노래가 없습니다.');

        // 현재 상태 반대로 변경 (멈춤 <-> 재생)
        const isPaused = !queue.player.paused;
        await queue.player.setPaused(isPaused);
        
        return interaction.reply(isPaused ? '⏸️ 일시정지했습니다.' : '▶️ 다시 재생합니다.');
    }
};