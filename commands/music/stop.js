import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('정지')
        .setDescription('현재 재생 중인 노래를 멈추고 대기 상태로 전환합니다. (대기열 유지)'),

    async execute(interaction) {
        const queue = interaction.client.queue.get(interaction.guildId);

        if(!queue) return interaction.reply({ content: '재생 중인 노래가 없습니다.', ephemeral: true });

        // 🚨 핵심: "이건 강제로 멈춘 거야"라고 깃발을 꽂습니다.
        queue.isForcedStop = true;

        // 노래를 멈춥니다. -> play.js의 'end' 이벤트가 발생합니다.
        await queue.player.stopTrack();
        
        return interaction.reply({ content: '현재 재생 중인 곡을 정지합니다. `/재생` 명령어로 대기열을 이어서 들을 수 있습니다.', ephemeral: true });
    }
};