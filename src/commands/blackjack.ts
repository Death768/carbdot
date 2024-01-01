import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types';
import { Cards } from '../Cards';
import blackjack from '../schemas/blackjackSchema';

class Hand {
	hand: Cards.Card[];
	status: string;
	constructor(hand: Cards.Card[], status: string) {
		this.hand = hand;
		this.status = status;
	}

}

function getBlackjackValue(card : Cards.Card) {
	if(card.value > 10) {
		return 10;
	} else if(card.value === 1) {
		return 11;
	} else {
		return card.value;
	}
}

function calculateHandScore(hand : Cards.Card[]) {
	let score = 0;
	hand.forEach(card => {
		score += getBlackjackValue(card);
	});
	hand.forEach(card => {
		if(card.value === 1 && score > 21) {
			score -= 10;
		}
	});
	return score;
}

function runDealer(hand : Hand, deck : Cards.Deck) {
	let dealerHand = hand;
	let dealerScore = calculateHandScore(dealerHand.hand);
	while(dealerScore < 17) {
		dealerHand.hand.push(deck.draw());
		dealerScore = calculateHandScore(dealerHand.hand);
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
		/*.addSubcommand(subcommand =>
			subcommand
				.setName('insurance')
				.setDescription('Buy insurance!'))*/
		.addSubcommand(subcommand =>
			subcommand
				.setName('viewgame')
				.setDescription('Shows your game of blackjack!')),
	execute: async (interaction) => {
		if(interaction.options.getSubcommand() === 'start') {
			await interaction.reply({ content: 'Starting game...', ephemeral: true });

			await blackjack.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(data => {
				if(data) return interaction.editReply({ content: 'You already have a game in progress!', ephemeral: true });

				const deck = new Cards.Deck();											//remember to change deck size to 8 once you introduce replaying with same thing
				deck.shuffle();

				let playercard1 = deck.draw();
				let dealercard1 = deck.draw();
				let playercard2 = deck.draw();
				let dealercard2 = deck.draw();

				let player_hand : Hand = new Hand([playercard1, playercard2], 'in_play');
				let dealer_hand : Hand = new Hand([dealercard1, dealercard2], 'not_shown');

				const newGame = new blackjack({
					user_id: interaction.user.id,
					guild_id: interaction.guild.id,
					deck: deck,
					player_hand: [{
						hand: player_hand.hand,
						status: player_hand.status
					}],
					dealer_hand: {
						hand: dealer_hand.hand,
						status: dealer_hand.status
					},
					insurance: false,
				});

				newGame.save().catch(err => console.log(err));
				interaction.editReply({ content: `Your hand: ${playercard1.toString()}, ${playercard2.toString()}\nDealer's hand: ${dealercard2}, ?? of ??`, ephemeral: true });
				if(dealercard1.value === 1) {
					interaction.followUp({ content: `If you would like to buy insurance, use /blackjack insurance\nIf you make a different move, it will be assumed that you do not take insurance`, ephemeral: true });
				}
			});
		} else if(interaction.options.getSubcommand() === 'play') {
			await interaction.reply({ content: 'Playing move...', ephemeral: true });

			await blackjack.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(async data => {
				if(!data) return interaction.editReply({ content: `You do not have a game in progress!`, ephemeral: true });

				let deck = Cards.Deck.castFromMongoose(JSON.parse(JSON.stringify(data.deck)));
				let currentHand : Hand = new Hand([], '');
				let currentHandID : number = -1;
				let firstFound = false;
				data.player_hand.forEach(hand => {
					if(hand.status === 'in_play' && !firstFound) {
						currentHand = JSON.parse(JSON.stringify(hand));
						currentHandID = data.player_hand.findIndex((element : any) => element._id === hand._id);
						firstFound = true;
					}
				});

				if (!currentHand) return interaction.editReply({ content: `You do not have a hand in play!`, ephemeral: true });

				if (interaction.options.getString('move') === 'hit') {
					let newCard = deck.draw();
					currentHand.hand.push(newCard);
					currentHand.status = calculateHandScore(currentHand.hand) > 21 ? 'bust' : 'in_play';

					await data.updateOne({
						$set: {
							deck: deck,
							[`player_hand.${currentHandID}`]: {
								hand: currentHand.hand,
								status: currentHand.status
							}
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have hit, getting a ${newCard.toString()}`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'stand') {
					currentHand.status = 'stand';

					await data.updateOne({
						$set: {
							deck: deck,
							[`player_hand.${currentHandID}.status`]: currentHand.status
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have stood!`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'double_down') {
					let newCard = deck.draw();
					currentHand.hand.push(newCard);
					currentHand.status = calculateHandScore(currentHand.hand) > 21 ? 'double_down_bust' : 'double_down';

					await data.updateOne({
						$set: {
							deck: deck,
							[`player_hand.${currentHandID}`]: {
								hand: currentHand.hand,
								status: currentHand.status
							}
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have doubled down, getting a ${newCard.toString()}`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'split') {
					console.log(currentHand.hand, currentHandID);
					if (currentHand.hand.length !== 2) return interaction.editReply({ content: `You cannot split this hand!`, ephemeral: true });
					if (getBlackjackValue(currentHand.hand[0]) !== getBlackjackValue(currentHand.hand[1])) return interaction.editReply({ content: `You cannot split this hand!`, ephemeral: true });

					let newCard = deck.draw();
					let newCard2 = deck.draw();
					let newHand : Hand = new Hand([currentHand.hand[0], newCard], 'in_play');
					let newHand2 : Hand = new Hand([currentHand.hand[1], newCard2], 'in_play');

					await data.updateOne({
						$set: {
							deck: deck,
							[`player_hand.${currentHandID}`]: {
								hand: newHand.hand,
								status: newHand.status
							}
						}
					}).catch(err => console.log(err));
					await data.updateOne({
						$push: {
							[`player_hand`]: {
								$position: currentHandID + 1,
								$each: [{
									hand: newHand2.hand,
									status: newHand2.status
								}]
							}
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have split your hand!`, ephemeral: true });
				} else if (interaction.options.getString('move') === 'surrender') {
					currentHand.status = 'surrender';

					await data.updateOne({
						$set: {
							deck: deck,
							[`player_hand.${currentHandID}.status`]: currentHand.status
						}
					}).catch(err => console.log(err));
					await interaction.editReply({ content: `You have surrendered!`, ephemeral: true });
				}
			});

			await blackjack.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(async data => {
				if(!data) return new Error('blackjack.ts 231');

				let allHandsDone = true;
				let allHandsBust = true;
				data.player_hand.forEach(hand => {
					if(hand.status === 'in_play') {
						allHandsDone = false;
					} else if(hand.status !== 'bust' && hand.status !== 'double_down_bust' && hand.status !== 'surrender') {
						allHandsBust = false;
					}
				});

				if(allHandsDone) {
					let deck = Cards.Deck.castFromMongoose(JSON.parse(JSON.stringify(data.deck)));
					let dealerHand = JSON.parse(JSON.stringify(data.dealer_hand));
					if(!allHandsBust) {
						dealerHand = runDealer(dealerHand, deck);
					}
					let dealerScore = calculateHandScore(dealerHand.hand);

					let retString = ``;
					let playerScore = 0;
					data.player_hand.forEach(hand => {
						let parsedHand = JSON.parse(JSON.stringify(hand));
						let handScore = calculateHandScore(parsedHand.hand);
						retString += `Your hand: `;
						parsedHand.hand.forEach((card: any) => {
							const parsedCard = JSON.parse(JSON.stringify(card));
							retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, `;
						});
						retString += `\n`;
						retString += `Score: ${handScore}\n`;
						retString += `Status: ${hand.status}\n`;

						if(hand.status === 'bust') {
							playerScore -= 1;
						} else if(hand.status === 'blackjack') {
							playerScore += 1.5;
						} else if(hand.status === 'stand') {
							if(dealerHand.status === 'bust') {
								playerScore += 1;
							} else if(dealerScore > handScore) {
								playerScore -= 1;
							} else if(dealerScore < handScore) {
								playerScore += 1;
							}
						} else if(hand.status === 'double_down') {
							if(dealerHand.status === 'bust') {
								playerScore += 2;
							} else if(dealerScore > handScore) {
								playerScore -= 2;
							} else if(dealerScore < handScore) {
								playerScore += 2;
							}
						} else if(hand.status === 'surrender') {
							playerScore -= 0.5;
						}
					});

					retString += `Dealer's hand: `;
					dealerHand.hand.forEach((card: any) => {
						const parsedCard = JSON.parse(JSON.stringify(card));
						retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, `;
					});
					retString += `\n`;

					if(!allHandsBust) {
						if(dealerHand.status === 'bust') {
							retString += `Dealer busts!\n`;
						} else {
							retString += `Dealer score: ${dealerScore}\n`;
						}
					}

					retString += `You ${playerScore >= 0 ? `get ${Math.abs(playerScore)}` : `lose ${Math.abs(playerScore)}`} points!`;

					await data.deleteOne();
					await interaction.followUp({ content: retString, ephemeral: false });
				}
			});
		} /*else if(interaction.options.getSubcommand() === 'insurance') {
			await interaction.reply({ content: 'Buying insurance...', ephemeral: true });

			await blackjack.findOne({
				user_id: interaction.user.id,
				guild_id: interaction.guild.id
			}).then(data => {
				if(!data) return interaction.editReply({ content: 'You do not have a game in progress!', ephemeral: true });
				if(data.insurance) return interaction.editReply({ content: 'You have already bought insurance!', ephemeral: true });
				data.player_hand.forEach(hand => {
					if(hand.status !== 'in_play') return interaction.editReply({ content: 'You have already made a move!', ephemeral: true });
				});
				if(JSON.parse(JSON.stringify(data.dealer_hand?.hand[0])).value !== 1) return interaction.editReply({ content: 'The dealer does not have an ace!', ephemeral: true });

				data.insurance = true;
				data.save().catch(err => console.log(err));
				return interaction.editReply({ content: 'You have bought insurance!', ephemeral: true });
			});
		} */else if(interaction.options.getSubcommand() === 'viewgame') {
				await interaction.reply({ content: 'Finding game...', ephemeral: true });
				await blackjack.findOne({
					user_id: interaction.user.id,
					guild_id: interaction.guild.id
				}).then(data => {
					if (!data) return interaction.editReply({ content: 'You do not have a game in progress!', ephemeral: true });

					let retString = '';

					let firstInPlay = false;
					retString += `Your hand${data.player_hand.length ? `` : `s`}:\n`;
					data.player_hand.forEach(hand => {
						if (!firstInPlay) {
							hand.hand.forEach(card => {
								const parsedCard = JSON.parse(JSON.stringify(card));
								retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, `;
							});
							if (hand.status == 'in_play') {
								retString += `status: current\n`;
								firstInPlay = true;
							} else {
								retString += `status: ${hand.status}\n`;
							}
						} else {
							hand.hand.forEach(card => {
								const parsedCard = JSON.parse(JSON.stringify(card));
								retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, `;
							});
							retString += `status: ${hand.status}\n`;
						}
					});

					retString += `Dealer's hand:\n`;
					if(data.dealer_hand?.status == 'not_shown') {
						const parsedCard = JSON.parse(JSON.stringify(data.dealer_hand.hand[0]));
						retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, ?? of ??\n`;
					} else {
						data.dealer_hand?.hand.forEach(card => {
							const parsedCard = JSON.parse(JSON.stringify(card));
							retString += `${new Cards.Card(parsedCard.suit, parsedCard.value).toString()}, `;
						});
						retString += `status: ${data.dealer_hand?.status}\n`;
					}

					//retString += `Insurance: ${data.insurance}\n`;

					return interaction.editReply({ content: retString, ephemeral: true });
				});
		}
	},
};

export default command;