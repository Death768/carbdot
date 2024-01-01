import mongoose from 'mongoose';

const blackjackSchema = new mongoose.Schema({
	user_id: String,
	guild_id: String,
	deck: Object,
	player_hand: [{
		hand: [Object],
		status: {
			type: String,
			enum: ['in_play', 'stand', 'double_down', 'double_down_bust', 'bust', 'blackjack', 'surrender']
		},
	}],
	dealer_hand: {
		hand: [Object],
		status: {
			type: String,
			enum: ['not_shown', 'bust', 'stand', 'blackjack']
		}
	},
	insurance: {
		type: Boolean,
		default: false
	},
});

const blackjack = mongoose.model('blackjack', blackjackSchema);
export default blackjack;