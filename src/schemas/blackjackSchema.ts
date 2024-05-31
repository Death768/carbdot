import mongoose from 'mongoose';
import blackjack from '../games/blackjack';

interface IBlackjack {
	user_id: string;
	guild_id: string;
	game: blackjack.blackjackGame;
}

const blackjackGameSchema = new mongoose.Schema<IBlackjack>({
	user_id: String,
	guild_id: String,
	game: {
		deck: {
			cards: [{
				suit: String,
				value: Number
			}],
			drawnCards: [{
				suit: String,
				value: Number
			}]
		},
		player_hand: [{
			hand: [{
				suit: String,
				value: Number
			}],
			status: String
		}],
		dealer_hand: {
			hand: [{
				suit: String,
				value: Number
			}],
			status: String
		},
		insurance: Boolean

	}
});

const blackjackGame = mongoose.model<IBlackjack>('blackjackGame', blackjackGameSchema);

export default blackjackGame;