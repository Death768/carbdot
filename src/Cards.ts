module Cards {
	export class Deck {
		cards: Card[] = [];
		drawnCards: Card[] = [];

		constructor(deckSize : number = 1) {
			for(let i = 0; i < deckSize; i++) {
				const suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
				for (let suit of suits) {
					for (let i = 1; i <= 13; i++) {
						this.cards.push(new Card(suit, i));
					}
				}
			}
		}

		static castFromMongoose(obj: { cards: { suit: string, value: number }[], drawnCards: { suit: string, value: number }[]  }) {
			const deck : Deck = new Deck(0);
			obj.cards.forEach(card => {
				deck.cards.push(new Card(card.suit, card.value));
			});
			obj.drawnCards.forEach(card => {
				deck.drawnCards.push(new Card(card.suit, card.value));
			});
			return deck;
		}

		shuffle() {
			this.cards.push(...this.drawnCards);
			this.drawnCards = [];
			for (let i = this.cards.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
			}
		}

		draw() {
			let drawnCard : Card = this.cards.pop()!;
			this.drawnCards.push(drawnCard);
			return drawnCard;
		}
	}

	export class Card {
		constructor(public suit: string, public value: number) {}
		toString() {
			const cardDict = new Map([ [1, "Ace"], [2, "Two"], [3, "Three"], [4, "Four"], [5, "Five"], [6, "Six"], [7, "Seven"], [8, "Eight"], [9, "Nine"], [10, "Ten"], [11, "Jack"], [12, "Queen"], [13, "King"] ]);
			let name = cardDict.get(this.value);
			return `${name} of ${this.suit}`;
		}
	}
}

export { Cards };