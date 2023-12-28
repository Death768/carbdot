import { Client, Routes, SlashCommandBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Command } from '../types';
import { token, clientID } from '../../config.json';

module.exports = (client: Client) => {
	const commands: SlashCommandBuilder[] = [];

	let commandsDir = join(__dirname, '../commands');

	readdirSync(commandsDir).forEach((file) => {
		if(!file.endsWith('.js')) return;
		let command : Command = require(join(commandsDir, file)).default;
		commands.push(command.data);
		client.commands.set(command.data.name, command);
	});

	const rest = new REST({ version: '10' }).setToken(token);

	rest.put(Routes.applicationCommands(clientID), {
		body: commands.map((command) => command.toJSON()),
	}).then((data : any) => {
		data.forEach((command : any) => {
			console.log(`Sucessfully loaded (/) command ${command.name}.`);
		});
		console.log(`Sucessfully loaded ${data.length} application (/) commands.`);
	}).catch((err : any) => {
		console.error(err);
	});
}