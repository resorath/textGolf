var constants = require('./constants');
var gamevars = require('./gamevars');

module.exports = {

	// meta helper function to assemble common game objects
	getGameObjectsBySocket: function(socket) {

		var o = {

			game: this.getGameBySocket(socket),

			players: { 
				self: this.getPlayerBySocket(socket, false),
				opponent: this.getPlayerBySocket(socket, true)
			},

			boards: {
				self: this.getBoardBySocket(socket, false),
				opponent: this.getBoardBySocket(socket, true)
			},

			sockets: {
				self: socket,
				opponent: this.getOppositePlayerSocket(socket)
			},

			decks: {
				self: this.getDeckBySocket(socket, false),
				opponent: this.getDeckBySocket(socket, true)
			},

			hands: {
				self: this.getHandBySocket(socket, false),
				opponent: this.getHandBySocket(socket, true)
			},

			graveyards: {
				self: this.getGraveyardBySocket(socket, false),
				opponent: this.getGraveyardBySocket(socket, true)
			}
		};

		return o;
	},

	getGameObjectsByPlayerNumber: function(game, number) {

		var socket = game.getSocketByPlayerNumber(number);

		return this.getGameObjectsBySocket(socket);

	},

	getHandBySocket: function(socket, getOppositeHand)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	    return agame.getHand(socket, getOppositeHand);

	},

	getBoardBySocket: function(socket, getOppositeBoard)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	    return agame.getBoard(socket, getOppositeBoard);
	},

	getDeckBySocket: function(socket, getOppositeDeck)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	    return agame.getDeck(socket, getOppositeDeck);
	},

	getGraveyardBySocket: function(socket, getOppositeDeck)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	    return agame.getGraveyard(socket, getOppositeDeck);
	},

	getGameBySocket: function(socket)
	{
	    for(game in gamevars.games)
	    {
		  var agame = gamevars.games[game];
		  for(var i = 0; i < agame.players.length; i++)
		  {
			if(agame.players[i].socket != null && agame.players[i].socket.id == socket.id)
				return agame;
		  }
		}
	    return null;
	},

	getPlayerNumberBySocket: function(socket)
	{
	    if(socket != null && socket.player != null)
	      return socket.player;

	    return null;
	},

	getPlayerBySocket: function(socket, getOppositeDeck)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	    return agame.getPlayer(socket, getOppositeDeck);
	},

	boardIndexToCard: function(boardindex, socket)
	{

	  // opponent's board
	  if(boardindex.toLowerCase().charAt(0) == "o")
	  {
	    var index = Number(boardindex.substring(1)) - 1;
	    return this.getBoardBySocket(socket, true)[index];
	  }

	  // player's board
	  if(boardindex.toLowerCase().charAt(0) == "m")
	  {
	    var index = Number(boardindex.substring(1)) - 1;
	    return this.getBoardBySocket(socket, false)[index];
	  }

	  // player's hand
	  if(boardindex.toLowerCase().charAt(0) == "h")
	  {
	    var index = Number(boardindex.substring(1)) - 1;
	    return this.getHandBySocket(socket, false)[index];
	  }

	  return null;

	},

	getCardByName: function(name)
	{
	  var returnVal = null;

	  gamevars.cards.forEach(function(card)
	  {
	    if(card["name"] && card["name"].toUpperCase() === name.toUpperCase() && 
	      ( card["type"] == "WEAPON" || card["type"] == "SPELL" || card["type"] == "MINION" ) )
	    {
	      //console.log("Found card: " + card["name"] + " id: " + card["id"]);

	      // create a new card from the database
	      returnVal = JSON.parse(JSON.stringify(card));
	      returnVal.buffs = [];
	      return;
	    }
	  })

	  if(returnVal == null)
	    console.log("WARNING: couldn't find card by name " + name);

	  return returnVal;
	},

	getCardById: function(id)
	{
	  var returnVal = null;

	  if(typeof id == 'undefined' || id == null)
	  {
	  	console.log("WARNING: Get undefined ID in getCardById");
	  	return;
	  }

	  gamevars.cards.forEach(function(card)
	  {
	    if(card["id"] && card["id"].toUpperCase() === id.toUpperCase())
	    {
	      // create a new card from the database
	      returnVal = JSON.parse(JSON.stringify(card));
	      returnVal.buffs = [];
	      return;
	    }
	  })

	  if(returnVal == null)
	    console.log("WARNING: couldn't find card by id " + id);

	  return returnVal;
	},

	// true false if card has specified mechanic
	cardHasMechanic: function(card, mechanic)
	{
		if(card == null || typeof card == 'undefined')
			return false;

		if(typeof card['mechanics'] == 'undefined')
			return false;

		return (card['mechanics'].indexOf(mechanic) > -1);
	},

	// FALSE or number if card has specificed play requirement
	cardHasPlayRequirement: function(card, requirement)
	{
		if(card == null || typeof card == 'undefined')
			return false;

		if(typeof card['playRequirements'] == 'undefined')
			return false;

		if(typeof requirement == 'string')
		{
			if(requirement in card['playRequirements'])
				return card['playRequirements'][requirement];
		}
		else
		{
			requirement.forEach(function(req) {
				if(req in card['playRequirements'])
					return card['playRequirements'][req];
			})
		}
	},

	targetIsOpponent: function(target)
	{
		return (constants.synonymopponent.indexOf(target.toLowerCase()) > -1)
	},

	targetIsSelf: function(target)
	{
		return (constants.synonymself.indexOf(target.toLowerCase()) > -1)
	},

	getOppositePlayerSocket: function(socket)
	{
	  // find game of socket first
	  var agame = this.getGameBySocket(socket);

	  if(agame != null)
	  {
	  	if(agame.p1socket.id == socket.id)
	  		return agame.p2socket;
	  	else
	  		return agame.p1socket;

	  }

	},

	cardOwnedByPlayer: function(game, playernum, card)
	{
		var o = this.getGameObjectsByPlayerNumber(game, playernum);

		if(o.hands.self.includes(card))
			return true;

		if(o.boards.self.includes(card))
			return true;

		if(o.decks.self.includes(card))
			return true;

		return false;
	},

	getSocketFromCard: function(game, card)
	{
		// determine owner//////
		var playernum = card.ownernumber;

		return game.getSocketByPlayerNumber(playernum);
	},

	getBoardTotalSpellpower: function(board)
	{
		var t = 0;

		board.forEach(function(card) {

			if(typeof card.spellDamage != 'undefined')
				t+=card.spellDamage;

			card.buffs.forEach(function(buff) {

				if(typeof buff.spellDamage != 'undefined')
					t+=buff.spellDamage;

			});

		});

		return t;
	},

}