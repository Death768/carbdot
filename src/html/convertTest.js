const nodeHtmlToImage = require("node-html-to-image");
const fs = require("fs");

// using js cuz too lazy to setup the package that can run ts
// not sure if this is what your data structure looks like exactly but this is what im assuming you would have
// using traditional objects to emulate ur Card class cuz I CANT IMPORT UR CARD TYPE IN THIS FILE FOR SOME REASON
const playerHands = [
    {
        hand: [
            {
                suit: "Spade",
                value: 10,
            },
            {
                suit: "Club",
                value: 5,
            },
        ],
        status: "in_play",
    },
    {
        hand: [
            {
                suit: "Heart",
                value: 13,
            },
            {
                suit: "Diamond",
                value: 11,
            },
        ],
        status: "in_play",
    },
];

const dealerHand = {
    hand: [
        {
            suit: "Spade",
            value: 10,
        },
        {
            suit: "Heart",
            value: 1,
        },
    ],
    status: "in_play",
};
// before passing in the object to the html, you need to add a 'src' field with the image source in base64 to every card in every hand cuz HTML IMAGES ARE SUPER QUIRKY when u use this stupid package
const getCardImageURI = (card) => {
    // capitalizing the suit in the format of the image files just in case this isnt how you have it in the database cuz i cant bother looking for it in the code
    const formattedSuit =
        card.suit.substring(0, 1).toUpperCase() +
        card.suit.substring(1).toLowerCase();
    const image = fs.readFileSync(`assets/${formattedSuit}${card.value}.png`);
    const base64Image = new Buffer.from(image).toString("base64");
    const dataURI = "data:image/jpeg;base64," + base64Image;

    return dataURI;
};

playerHands.forEach((hand) => {
    hand.hand.forEach((card) => {
        card.src = getCardImageURI(card);
    });
});

// i saw something about not showing dealer hand in ur blackjack file, but im just not worrying about that for now, pass in the the entire dealer hand as well
dealerHand.hand.forEach((card) => {
    card.src = getCardImageURI(card);
});

const html = fs.readFileSync("html/viewgame.html").toString();

nodeHtmlToImage({
    output: "html/image.png",
    html: html,
    // dynamic content used in the template
    // data structure:
    // playerHands: [{
    //     hand: [{
    //         suit: string,
    //         value: number,
    //         src: string,
    //     }],
    //     status: string,
    // }]
    // dealerHand: {
    //     hand: [{
    //         suit: string,
    //         value: number,
    //         src: string,
    //     }],
    //     status: string,
    // }
    content: {
        playerHands,
        dealerHand,
    },
}).then(() => console.log("The image was created successfully!"));
