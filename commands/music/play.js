import { SlashCommandBuilder, time } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('재생')
        .setDescription('노래를 재생하거나 대기열에 추가합니다.')
        .addStringOption(option => {
            return option
                .setName('제목')
                .setDescription('제목 또는 URL을 입력해주세요.')
                .setRequired(true)
        }),

    async execute(interaction, shoukaku) {
        // 유저 음성 채널 확인
        const voiceChannel = interaction.member.voice.channel;

        if(!voiceChannel) {
            return interaction.reply({ content: '음성 채널에 연결되어있지 않습니다.', ephemeral: true });
        }

        const title = interaction.options.getString('제목');

        // 우선 대기
        await interaction.deferReply();

        // 노드 및 트랙 검색
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        const search = title.startsWith('http') ? title : `ytsearch:${title}`;
        const result = await node.rest.resolve(search);

        if(!result || result.loadType === 'empty') {
            return interaction.editReply('검색 결과가 없습니다.');
        }

        let track;

        if(result.loadType === 'search') {
            track = result.data[0];
        } else {
            track = result.data;
            if(Array.isArray(track)) track = track[0];
        }


        // 2. 플레이어 준비
        let player = shoukaku.players.get(interaction.guildId);
        if(!player) {
            player = await shoukaku.joinVoiceChannel({
                guildId: interaction.guildId,
                channelId: voiceChannel.id,
                shardId: 0,
                deaf: true
            });
        }

        // 3. 큐 관리
        let queue = interaction.client.queue.get(interaction.guildId);

        // 이미 노래가 재생 중이라면 대기열에 추가
        if(!queue) {
            queue = {
                player: player,
                textChannel: interaction.channel,
                songs: [],
                timeout: null,
                isForcedStop: false // 🚩 강제 정지 확인용 변수 초기화
            };

            interaction.client.queue.set(interaction.guildId, queue);

            // 이벤트 리스너 등록
            player.on('end', () => {
                const currentQueue = interaction.client.queue.get(interaction.guildId);
                if(!currentQueue) return;
                
                // 방금 끝난(또는 멈춘) 곡 제거
                currentQueue.songs.shift();

                // 만약 /정지 명령어로 멈춘 거라면
                if(currentQueue.isForcedStop) {
                    // 깃발을 다시 내리고
                    currentQueue.isForcedStop = false;

                    // 다음 곡을 재생하지 않고 바로 대기 모드로 들어갑니다.
                    disconnectTimer(currentQueue, interaction, shoukaku);

                    return;
                }

                // 일반적인 경우: 다음 곡이 있으면 재생
                if(currentQueue.songs.length > 0) {
                    player.playTrack({ track: { encoded: currentQueue.songs[0].encoded } });
                    currentQueue.textChannel.send(`현재 재생 중: ${currentQueue.songs[0].info.title}`);
                } else {
                    // 대기열이 비었으면 타이머 시작
                    disconnectTimer(currentQueue, interaction, shoukaku);
                }
            });
        }

        // 4. 노래 추가 및 재생 판단
        queue.songs.push(track);

        // 타이머 취소 (노래가 들어왔으니까)
        if(queue.timeout) {
            clearTimeout(queue.timeout);
            queue.timeout = null;
        }

        // 플레이어가 멈춰있으면(정지 상태거나 처음일 때) -> 바로 재생
        if(!player.track) {
            // 정지 상태였을 수도 있으니 강제 정지 깃발 해제
            queue.isForcedStop = false; 
            
            // 현재 대기열의 첫 번째 곡 재생 (방금 넣은 곡일 수도 있고, 아까 남은 곡일 수도 있음)
            await player.playTrack({ track: { encoded: queue.songs[0].encoded } });
            return interaction.editReply(`현재 재생 중: ${track.info.title}`);
        } else {
            return interaction.reply(`대기열 추가됨: ${track.info.title}`);
        }
    }
};

// 중복되는 타이머 코드를 함수로 뺐습니다 (깔끔하게)
function disconnectTimer(queue, interaction, shoukaku) {
    // 이미 타이머가 있으면 무시
    if (queue.timeout) return;
    
    queue.timeout = setTimeout(() => {
        const checkQueue = interaction.client.queue.get(interaction.guildId);
        // 여전히 노래가 안 나오고 있으면 종료
        if (checkQueue && !checkQueue.player.track) {
            shoukaku.leaveVoiceChannel(interaction.guildId);
            interaction.client.queue.delete(interaction.guildId);
            checkQueue.textChannel.send('동작이 없어 연결을 종료합니다.');
        }
    }, 1 * 60 * 1000); // 1분
}