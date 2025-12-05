import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ]
});

// 명령어 저장 공간
client.commands = new Collection();

// 대기열 저장 공간
client.queue = new Map();

// URL 객체 대신 process.cwd()와 path.join 사용
const foldersPath = path.join(process.cwd(), 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(pathToFileURL(filePath).href);
        
        if ('data' in command.default && 'execute' in command.default) {
            client.commands.set(command.default.data.name, command.default);
        }
    }
}

const Nodes = [{
    name: 'LocalNode',
    url: 'localhost:2333',
    auth: '0000'
}];

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes);

shoukaku.on('error', (_, error) => console.error('Lavalink Error:', error));
shoukaku.on('ready', (name) => console.log(`✅ Lavalink Connected: ${name}`));

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, shoukaku);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '오류 발생!', ephemeral: true });
        } else {
            await interaction.reply({ content: '오류 발생!', ephemeral: true });
        }
    }
});

client.once(Events.ClientReady, c => {
    console.log(`🤖 로그인 완료: ${c.user.tag}`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    // 기초 정보 확인
    const guild = oldState.guild;
    const queue = client.queue.get(guild.id);

    // 대기열이 없으면 봇이 노래를 안 틀고 있다는 뜻이므로 무시
    if(!queue) return;

    // 봇(나 자신)이 실제로 음성 채널에 있는지 확인
    // Lavalink(Shoukaku)가 아니라 디스코드 멤버 정보에서 직접 가져옴
    const bot = guild.members.me; 

    // 봇이 음성 채널에 아예 없다면 대기열만 남은 상태이므로 정리하고 나옴
    if(!bot.voice.channelId) {
        client.queue.delete(guild.id);

        return;
    }

    // 봇이 있는 채널 ID
    const botChannelId = bot.voice.channelId;

    // 변경 사항이 '봇이 있는 채널'에서 일어났는지 확인
    // (누군가 나갔거나 들어왔을 때)
    if (oldState.channelId === botChannelId || newState.channelId === botChannelId) {
        // 1초 대기 (서버 동기화)
        setTimeout(async () => {
            try {
                // 채널 정보 강제 갱신 (force: true)
                const channel = await client.channels.fetch(botChannelId, { force: true });
                
                if(!channel) return;

                // 봇 제외 사람 수 세기
                const members = channel.members.filter(member => !member.user.bot);

                console.log(`👀 인원 점검: ${members.size}명 남음`);

                if (members.size === 0) {
                    console.log('👋 사람이 없어서 나갑니다.');
                    
                    if(queue.textChannel) {
                        queue.textChannel.send('보이스 채널에 사용자가 없어 연결을 종료합니다.');
                    }

                    if(queue.timeout) clearTimeout(queue.timeout);

                    // Lavalink 연결 끊기 요청
                    shoukaku.leaveVoiceChannel(guild.id);
                    
                    // 대기열 삭제
                    client.queue.delete(guild.id);
                }
            } catch(error) {
                console.error('🚨 자동 퇴장 오류:', error);
            }
        }, 1000); 
    }
});

client.login(process.env.HAERIN_BOT_TOKEN);