import { SlashCommandBuilder } from "discord.js";

export interface Command {
	data: Pick<SlashCommandBuilder, 'name' | 'toJSON'>;
	execute: (interaction : ApplicationCommand) => void;
}

export interface Event {
	name: string;
	once?: boolean | false;
	execute: (...args?) => void;
}