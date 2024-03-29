import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { join } from 'path';
import { readdirSync } from 'fs';
import { Command, Event } from './types';
import { token } from '../config.json';
const { Guilds, GuildMembers, GuildMessages, GuildMessageReactions } = GatewayIntentBits;

declare module 'discord.js' {
	interface Client {
		commands: Collection<string, Command>;
	}
}

const client = new Client({
	intents: [Guilds, GuildMembers, GuildMessages, GuildMessageReactions],
});

client.commands = new Collection();

const handlersDir= join(__dirname, './handlers');
readdirSync(handlersDir).forEach(handler => {
	if(!handler.endsWith('.js')) return;
	require(`${handlersDir}/${handler}`)(client);
});

client.login(token);