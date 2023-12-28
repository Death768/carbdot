import { SlashCommandBuilder } from "discord.js";

export interface Command {
	data: SlashCommandBuilder;
	execute: (interaction : ApplicationCommand) => void;
}

export interface Event {
	name: string;
	once?: boolean | false;
	execute: (...args?) => void;
}