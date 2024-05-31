import { Cards } from "../Cards";
import blackjackGame from "../schemas/blackjackSchema";

module blackjack {
	export class Hand {
		hand: Cards.Card[];
		status: string;
		constructor(hand: Cards.Card[], status: string) {
			this.hand = hand;
			this.status = status;
		}
		static getBlackjackValue(card: Cards.Card) {
			if (card.value > 10) {
				return 10;
			} else if (card.value === 1) {
				return 11;
			} else {
				return card.value;
			}
		}
		calculateHandScore() {
			let score = 0;
			this.hand.forEach(card => {
				score += Hand.getBlackjackValue(card);
			});
			this.hand.forEach(card => {
				if (card.value === 1 && score > 21) {
					score -= 10;
				}
			});
			return score;
		}
		drawCard(deck: Cards.Deck) {
			let drawnCard : Cards.Card = deck.draw();
			this.hand.push(drawnCard);
			return drawnCard;
		}
		toString() {
			let retString = '';
			this.hand.forEach(card => {
				retString += `${card.toString()}, `;
			});
			return retString;
		}
	}
	export class blackjackGame {
		deck: Cards.Deck;
		player_hand: Hand[];
		dealer_hand: Hand;
		insurance: boolean;

		constructor(deckSize: number);
		constructor(deckSize: undefined, deck: Cards.Deck, player_hand: Hand[], dealer_hand: Hand, insurance: boolean);
		constructor(deckSize = 1, deck? : Cards.Deck, player_hand? : Hand[], dealer_hand? : Hand, insurance? : boolean) {
			if(deck !== undefined) {
				this.deck = deck!;
				this.player_hand = player_hand!;
				this.dealer_hand = dealer_hand!;
				this.insurance = insurance!;
				return;
			}

			this.deck = new Cards.Deck(deckSize);
			this.deck.shuffle();
			this.insurance = false;

			this.player_hand = [new Hand([], 'in_play')];
			this.dealer_hand = new Hand([], 'not_shown');

			this.player_hand[0].drawCard(this.deck);
			this.dealer_hand.drawCard(this.deck);
			this.player_hand[0].drawCard(this.deck);
			this.dealer_hand.drawCard(this.deck);
		}

		runDealer() {
			let dealerHand = this.dealer_hand;
			let dealerScore = dealerHand.calculateHandScore();
			while(dealerScore < 17) {
				dealerHand.drawCard(this.deck);
				dealerScore = dealerHand.calculateHandScore();
			}
			if(dealerScore > 21) {
				dealerHand.status = 'bust';
			} else {
				dealerHand.status = 'stand';
			}
		}

		getFirstHandInPlay() : [Hand, number] {
			for(let hand of this.player_hand) {
				if (hand.status === 'in_play') {
					return [hand, this.player_hand.indexOf(hand)];
				}
			};
			return [new Hand([], ''), -1];
		}

		allHandsNotInPlay() : [boolean, boolean] {
			let allHandsDone = true;
			let allHandsBust = true;
			this.player_hand.forEach((hand: Hand) => {
				if (hand.status === 'in_play') {
					allHandsDone = false;
				}
				if (hand.status !== 'bust') {
					allHandsBust = false;
				}
			});
			return [allHandsDone, allHandsBust];
		}

		handler(action : 'hit' | 'stand' | 'split' | 'double_down' | 'surrender') : Cards.Card | undefined {
			let [hand, handIndex] = this.getFirstHandInPlay();
			if (action === 'hit') {
				let drawnCard = hand.drawCard(this.deck);
				if (hand.calculateHandScore() > 21) {
					hand.status = 'bust';
				}
				return drawnCard;
			} else if (action === 'stand') {
				hand.status = 'stand';
			} else if (action === 'double_down') {
				let drawnCard = hand.drawCard(this.deck);
				if (hand.calculateHandScore() > 21) {
					hand.status = 'double_down_bust';
				} else {
					hand.status = 'double_down';
				}
				return drawnCard;
			} else if (action === 'split') {
				let hand1 = new Hand([hand.hand[0], this.deck.draw()], 'in_play');
				let hand2 = new Hand([hand.hand[1], this.deck.draw()], 'in_play');

				this.player_hand[handIndex] = hand1;
				this.player_hand.splice(handIndex + 1, 0, hand2);

			} else if (action === 'surrender') {
				hand.status = 'surrender';
			}
		}

		static calculateHandPayoff(hand_score : number, dealer_score : number, status : string) : number {
			const pointMap = new Map<string, number>([
				['bust', -1],
				['blackjack', 1.5],
				['stand', dealer_score > 21 ? 1 : dealer_score > hand_score ? -1 : dealer_score < hand_score ? 1 : 0],
				['double_down', dealer_score > 21 ? 2 : dealer_score > hand_score ? -2 : dealer_score < hand_score ? 2 : 0],
				['surrender', -0.5]
			]);
			return pointMap.get(status)!;
		}

		calculatePayout() : number {
			let dealer_score = this.dealer_hand.calculateHandScore();

			let total = 0;
			this.player_hand.forEach((hand) => {
				let hand_score = hand.calculateHandScore();
				total += blackjackGame.calculateHandPayoff(hand_score, dealer_score, hand.status);
			});
			return total;
		}

		static processDatabase(data : any) {
			let deck_cards = new Array<Cards.Card>();
			data.game.deck.cards.forEach((card : any) => {
				deck_cards.push(new Cards.Card(card.suit, card.value));
			});
			let deck_drawnCards = new Array<Cards.Card>();
			data.game.deck.drawnCards.forEach((card : any) => {
				deck_drawnCards.push(new Cards.Card(card.suit, card.value));
			});
			let deck = new Cards.Deck(undefined, deck_cards, deck_drawnCards);

			let player_hand = new Array<Hand>();
			data.game.player_hand.forEach((hand : any) => {
				let hand_cards = new Array<Cards.Card>();
				hand.hand.forEach((card : any) => {
					hand_cards.push(new Cards.Card(card.suit, card.value));
				});
				player_hand.push(new Hand(hand_cards, hand.status));
			});

			let dealer_hand = new Hand([], data.game.dealer_hand.status);
			data.game.dealer_hand.hand.forEach((card : any) => {
				dealer_hand.hand.push(new Cards.Card(card.suit, card.value));
			});

			return new blackjackGame(undefined, deck, player_hand, dealer_hand, data.insurance);
		}
	}
}

export default blackjack;