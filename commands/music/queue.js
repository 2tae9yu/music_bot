import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('대기열')
        .setDescription('현재 대기열 목록을 확인합니다.'),

    async execute(interaction) {
        const queue = interaction.client.queue.get(interaction.guildId);

        // 대기열이 비어 있을 때
        if(!queue || queue.songs.length === 0) {
            return interaction.reply('대기열이 비어있습니다. 노래를 추가해주세요!');
        }

        // 현재 재생 중인 곡 (배열의 0번)
        const currentTrack = queue.songs[0];

        // 대기 중인 곡들 (배열의 1번부터 끝까지)
        const tracks = queue.songs.slice(1);

        // 임베드(메시지 박스) 만들기
        const embed = new EmbedBuilder()
            .setColor('#0099ff') // 원하는 색상으로 변경 가능
            .setTitle('대기열')
            .setDescription(`현재 재생 중: \n [${currentTrack.info.title}](${currentTrack.info.uri}) - \`${formatTime(currentTrack.info.length)}\``)
            .setTimestamp();

        // 대기 중인 곡이 있을 경우 목록 추가
        if(tracks.length > 0) {
            // 너무 길면 10개만 자르고 나머지는 숫자로 표시
            const limit = 10;
            const displayTracks = tracks.slice(0, limit);
            
            const listString = displayTracks.map((track, i) => {
                return `**${i + 1}.** [${track.info.title}](${track.info.uri}) - \`${formatTime(track.info.length)}\``;
            }).join('\n');

            embed.addFields({ 
                name: '대기 중인 곡', 
                value: listString + (tracks.length > limit ? `\n\n...외 **${tracks.length - limit}**곡` : '')
            });
        } else {
            embed.addFields({ name: '대기 중인 곡', value: '대기 중인 노래가 없습니다.' });
        }

        return interaction.reply({ embeds: [embed] });
    }
};

// 밀리초(ms)를 '분:초' 형태로 바꿔주는 도우미 함수
function formatTime(ms) {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    return `${min}:${sec}`;
}