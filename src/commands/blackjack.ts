import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { Command } from '../types';
import { Cards } from '../Cards';
import blackjack from '../games/blackjack';
import blackjackGame from '../schemas/blackjackSchema';

function runDealer(hand : blackjack.Hand, deck : Cards.Deck) {
	let dealerHand = hand;
	let dealerScore = dealerHand.calculateHandScore();
	while(dealerScore < 17) {
		dealerHand.hand.push(deck.draw());
		dealerScore = dealerHand.calculateHandScore();
	}
	if(dealerScore > 21) {
		dealerHand.status = 'bust';
	} else {
		dealerHand.status = 'stand';
	}
	return dealerHand;
}

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack!')
		.addSubcommand(subcommand =>
			subcommand
				.setName('start')
				.setDescription('Start a game of blackjack!'))
				/*.addIntegerOption(option =>
					option
						.setName('hands')
						.setDescription('The number of hands you want.')))*/
		.addSubcommand(subcommand =>
			subcommand
				.setName('play')
				.setDescription('Play a move!')
				.addStringOption(option =>
					option
						.setName('move')
						.setDescription('The move to play.')
						.setRequired(true)
						.addChoices({ name: 'Hit', value: 'hit' })
						.addChoices({ name: 'Stand', value: 'stand' })
						.addChoices({ name: 'Double Down', value: 'double_down' })
						.addChoices({ name: 'Split', value: 'split' })
						.addChoices({ name: 'Surrender', value: 'surrender' })))
		.addSubcommand(subcommand =>
			subcommand
				.setName('viewgame')
				.setDescription('Shows your game of blackjack!')),
	execute: async (interaction) => {
		if(interaction.options.getSubcommand() === 'start') {
			await interaction.reply({ content: 'Starting game...', ephemeral: true });

			await blackjackGame.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id,
			}).then(data => {
				if(data) return interaction.editReply({ content: 'You already have a game in progress!', ephemeral: true });

				let game = new blackjack.blackjackGame(1);

				let newGame = new blackjackGame({
					user_id: interaction.user.id,
					guild_id: interaction.guild.id,
					game: game,
				});

				newGame.save().catch(err => console.log(err));

				interaction.editReply({ content: `Your hand: ${game.player_hand[0].hand[0].toString()}, ${game.player_hand[0].hand[1].toString()}\nDealer's hand: ${game.dealer_hand.hand[0]}, ?? of ??`, ephemeral: true });
				if(game.dealer_hand.hand[0].value === 1) {
					interaction.followUp({ content: `If you would like to buy insurance, use /blackjack insurance\nIf you make a different move, it will be assumed that you do not take insurance`, ephemeral: true });
				}
			});
		} else if(interaction.options.getSubcommand() === 'play') {
			await interaction.reply({ content: 'Playing move...', ephemeral: true });

			await blackjackGame.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id,
			}).then( async data => {
				if(!data) return interaction.editReply({ content: `You do not have a game in progress!`, ephemeral: true });
				let processedData = blackjack.blackjackGame.processDatabase(data);

				let [currentHand, currentHandID] = processedData.getFirstHandInPlay();

				if (currentHandID === -1) return interaction.editReply({ content: `You do not have a hand in play!`, ephemeral: true });

				if (interaction.options.getString('move') === 'hit') {
					let newCard = processedData.handler('hit');

					await data.updateOne({
						$set: {
							[`game.deck`]: processedData.deck,
							[`game.player_hand.${currentHandID}`]: {
								hand: currentHand.hand,
								status: currentHand.status
							}
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have hit, getting a ${newCard!.toString()}`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'stand') {
					processedData.handler('stand');

					await data.updateOne({
						$set: {
							[`game.player_hand.${currentHandID}.status`]: currentHand.status
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have stood!`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'double_down') {
					let newCard = processedData.handler('double_down');

					await data.updateOne({
						$set: {
							[`game.deck`]: processedData.deck,
							[`game.player_hand.${currentHandID}`]: {
								hand: currentHand.hand,
								status: currentHand.status
							}
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have doubled down, getting a ${newCard!.toString()}`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'split') {
					if (currentHand.hand.length !== 2) return interaction.editReply({ content: `You cannot split this hand!`, ephemeral: true });
					if (blackjack.Hand.getBlackjackValue(currentHand.hand[0]) !== blackjack.Hand.getBlackjackValue(currentHand.hand[1])) return interaction.editReply({ content: `You cannot split this hand!`, ephemeral: true });

					processedData.handler('split');

					await data.updateOne({
						$set: {
							[`game.deck`]: processedData.deck,
							[`game.player_hand`]: processedData.player_hand
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have split your hand!`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'surrender') {
					processedData.handler('surrender');

					await data.updateOne({
						$set: {
							[`game.player_hand.${currentHandID}.status`]: currentHand.status
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have surrendered!`, ephemeral: true });
				}
			});

			await blackjackGame.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(async data => {
				if(!data) return new Error('blackjack.ts 172');
				let processedData = blackjack.blackjackGame.processDatabase(data);

				let [allHandsDone, allHandsBust] = processedData.allHandsNotInPlay();

				if(allHandsDone) {
					let deck = processedData.deck;
					let dealerHand = processedData.dealer_hand;
					if(!allHandsBust) {
						dealerHand = runDealer(dealerHand, deck);
					}
					let dealerScore = dealerHand.calculateHandScore();

					let retString = '';
					let playerPay = 0;
					processedData.player_hand.forEach(hand => {
						let handScore = hand.calculateHandScore();
						retString += `Your hand: ${hand.toString()}\n`;
						retString += `Score: ${handScore}\n`;
						retString += `Status: ${hand.status}\n`;

						playerPay += blackjack.blackjackGame.calculateHandPayoff(handScore, dealerScore, hand.status);
					});

					retString += `Dealer's hand: ${processedData.dealer_hand.toString()}\n`;

					if(!allHandsBust) {
						if(dealerHand.status === 'bust') {
							retString += `Dealer busts!\n`;
						} else {
							retString += `Dealer score: ${dealerScore}\n`;
						}
					}

					retString += `You ${playerPay >= 0 ? `get ${Math.abs(playerPay)}` : `lose ${Math.abs(playerPay)}`} point${Math.abs(playerPay) === 1 ? `` : `s`}!`;

					await data.deleteOne();
					return interaction.followUp({ content: retString, ephemeral: false });
				}
			});
		} else if(interaction.options.getSubcommand() === 'viewgame') {
			await interaction.reply({ content: 'Finding game...', ephemeral: true });

			await blackjackGame.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(data => {
				if (!data) return interaction.editReply({ content: 'You do not have a game in progress!', ephemeral: true });
				let processedData = blackjack.blackjackGame.processDatabase(data);

				let retString = '';

				let firstInPlay = false;
				retString += `Your hand${data.game.player_hand.length ? `` : `s`}:\n`;
				processedData.player_hand.forEach(hand => {
					if (!firstInPlay) {
						retString += hand.toString() + ' ';
						if (hand.status == 'in_play') {
							retString += `status: current\n`;
							firstInPlay = true;
						} else {
							retString += `status: ${hand.status}\n`;
						}
					} else {
						retString += hand.toString() + ' ';
						retString += `status: ${hand.status}\n`;
					}
				});

				retString += `Dealer's hand:\n`;
				if(processedData.dealer_hand.status == 'not_shown') {
					retString += `${processedData.dealer_hand.hand[0].toString()}, ?? of ??\n`;
				} else {
					retString += processedData.dealer_hand.toString() + ' ';
					retString += `status: ${data.game.dealer_hand.status}\n`;
				}

				//return interaction.followUp({ attachment: new AttachmentBuilder(getBlackjackImage(JSON.parse(JSON.stringify(data.player_hand)), JSON.parse(JSON.stringify(data.dealer_hand)), false)), ephmeral: false});
				return interaction.followUp({ content: retString, ephemeral: true });
			});
		}
	},
};

export default command;