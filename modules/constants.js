module.exports = {

	synonymself: [ "self", "hero", "champion", "summoner", "me" ],

    synonymopponent: [ "enemy", "opponent", "face", "hero", "champion", "summoner" ],

    opponenttarget: "OPPONENT",

    selftarget: "SELF",

    triggers: {
    	onplay: "onplay",
    	onattack: "onattack",
    	onstartturn: "onstartturn",
    	onendturn: "onendturn",
    	onherodamaged: "onherodamaged",
    	onminiondamaged: "onminiondamaged",
    	onheal: "onheal",
    	ondeath: "ondeath",
        onleaveplay: "onleaveplay"
    },

    borderCharacters: {
        verticalEdge: "║",
        horizontalEdge: "═",
        topLeftCorner: "╔",
        bottomLeftCorner: "╚",
        bottomRightCorner: "╝",
        topRightCorner: "╗",
        leftMiddleConnector: "╠",
        rightMiddleConnector: "╣"
    },

    boardSize: 67,

    formatcolor: {
        default: ";#AAAAAA;",
        error: ";red;",
        criticalerror: "b;red;",
        spell: ";lightblue;",
        quote: ";#FFBDC0;",
        attack: ";#FFA22C;",
        death: 'b;#D60000;'

    }

}