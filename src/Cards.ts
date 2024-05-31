module Cards {
	export class Deck {
		cards: Card[] = [];
		drawnCards: Card[] = [];

		constructor(deckSize : number);
		constructor(deckSize : undefined, cards : Card[], drawnCards : Card[]);
		constructor(deckSize = 1, cards? : Card[], drawnCards? : Card[]) {
			if(cards !== undefined) {
				this.cards = cards;
				this.drawnCards = drawnCards!;
				return;
			}
			for(let i = 0; i < deckSize; i++) {
				const suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
				for (let suit of suits) {
					for (let i = 1; i <= 13; i++) {
						this.cards.push(new Card(suit, i));
						}
				}
			}
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
		getCardPNG(shown = true) {
			if (!shown) {
				return "assets/CardBack.png";
			}
			const formattedSuit = this.suit.substring(0, 1).toUpperCase() + this.suit.substring(1).toLowerCase();
			return `assets/${formattedSuit}${this.value}.png`;
		}
	}
}

export { Cards };