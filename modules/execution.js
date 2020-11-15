var helpers = require('./helpers');
var display = require('./display');
var util = require('./util');
var constants = require('./constants');
var gamevars = require('./gamevars');

module.exports = {

	pickDecks: function(command, socket)
	{
	  var deck = null;
	  if(!isNaN(command))
	    var deck = gamevars.decks[command]
	  else 
	    return;

	  if(deck == null)
	    return;

	  // load deck
	  var playerdeck = helpers.getDeckBySocket(socket, false);
	  var player = helpers.getPlayerBySocket(socket);
	  var game = helpers.getGameBySocket(socket);

	  player.character = deck.heroname;

	  // load hero power
	  player.heropower = gamevars.heroes[deck.hero].heropower;

	  // bind emotes
	  player.emotes = gamevars.emotes[player.character];


	  for(cardid in deck.cards)
	  {
	    var cardname = deck.cards[cardid];

	    var card = helpers.getCardByName(cardname)

	    card.ownernumber = player.number;
	    card.buffs = [];
	  
	    playerdeck.push(card);
	  }
	  console.log("Loaded deck for player " + socket.player);

	  // check opponent
	  var opponentdeck = helpers.getDeckBySocket(socket, true)

	  console.log("Opponent deck length: " + opponentdeck.length);
	  if(opponentdeck.length > 28)
	  {
	    game.io.to(game.name).emit('control', { command: "resume" });

	    module.exports.startMulligan(game);
	  }
	  else
	  {
	    socket.emit('terminal', 'Waiting for opponent to pick a deck');
	    socket.emit('control', { command: "suspend" });
	  }


	  return;
	},

	startMulligan: function(game)
	{
	  console.log(game.name + " mulligan phase");


	  var firstPlayer = game.getSocketByPlayerNumber(game.playerTurn);
	  var secondPlayer = game.getSocketByPlayerNumber(game.playerTurnOpposite());

	  var o1 = helpers.getGameObjectsBySocket(firstPlayer);
	  var o2 = helpers.getGameObjectsBySocket(secondPlayer);

	  // do opening emotes

	  // second player emotes to first player
	  firstPlayer.emit('terminal', display.say(o2.players.opponent.character, o2.players.opponent.emotes.start));

	  // first player emotes to self
	  if(o1.players.opponent.character == o1.players.self.character)
	  	firstPlayer.emit('terminal', display.say(o1.players.opponent.character, o1.players.opponent.emotes.mirrored_start));
	  else
		firstPlayer.emit('terminal', display.say(o1.players.opponent.character, o1.players.opponent.emotes.start));

	  // first player emotes to second player
	  secondPlayer.emit('terminal', display.say(o1.players.opponent.character, o1.players.opponent.emotes.start));

	  // second player emotes to self
	  if(o2.players.opponent.character == o2.players.self.character)
	  	secondPlayer.emit('terminal', display.say(o2.players.opponent.character, o2.players.opponent.emotes.mirrored_start));
	  else
		secondPlayer.emit('terminal', display.say(o2.players.opponent.character, o2.players.opponent.emotes.start));


	  // flip coin
	  game.io.to(game.name).emit('terminal', '\n[[b;gold;]Flipping the coin...]\n');

	  firstPlayer.emit('terminal', 'You go first!\n');
	  secondPlayer.emit('terminal', 'You get an extra card!\n');

	  game.io.to(game.name).emit('control', { command: "prompt", prompt: "Mulligan> " });

	  game.p1socket.promptCallback = module.exports.mulligan;
	  game.p2socket.promptCallback = module.exports.mulligan;

	  module.exports.mulligan("", game.p1socket);
	  module.exports.mulligan("", game.p2socket);
	},

	mulligan: function(command, socket)
	{
	  console.log("mulligan: " + command + " for " + socket.player);

	  var agame = helpers.getGameBySocket(socket);
	  var deck = helpers.getDeckBySocket(socket);
	  // TBI

	  // check if mulligan was already generated
	  if(agame.mulligan[socket.player].length == 0)
	  {
	    // shuffle deck
	    util.shuffle(deck);

	    // draw three cards
	    //var mulligan = deck.splice(0, 3);
	    for(i=0 ; i<3 ; i++)
	    {
	      agame.mulligan[socket.player].push({ keep: true, card: deck.pop() });
	    }

	    // if going second, get another
	    if(socket.player != agame.playerTurn)
	      agame.mulligan[socket.player].push({ keep: true, card: deck.pop() });

	  }

	  // user entered a number to change state
	  if(!isNaN(command) || command.indexOf(' ') >= 0 || command.indexOf(',') >= 0)
	  {
	  	// did the user mash together numbers?
	  	if(command > 10 || command.indexOf(' ') >= 0 || command.indexOf(',') >= 0)
	  	{
	  		if(command > 10)
	  			var numbermash = command.split('');
	  		else if(command.indexOf(" ") >= 0)
	  			var numbermash = command.split(' ');
	  		else if(command.indexOf(",") >= 0)
	  			var numbermash = command.split(',');

	  		for(num in numbermash)
	  		{
	  			// convert number user entered to array index 
	  			var cardtochange = numbermash[num] - 1;

			    if(agame.mulligan[socket.player][cardtochange] != null)
			    {
			      // invert "keep" state
			      agame.mulligan[socket.player][cardtochange].keep = !agame.mulligan[socket.player][cardtochange].keep;
			    }
			}

	  	}
	  	else
	  	{
	  		// convert number user entered to array index 
		    var cardtochange = command-1;

		    if(agame.mulligan[socket.player][cardtochange] != null)
		    {
		      // invert "keep" state
		      agame.mulligan[socket.player][cardtochange].keep = !agame.mulligan[socket.player][cardtochange].keep;
	    	}
	  	}


	  }
	  else if(command == "done")
	  {
	    var mulligancount = 0;

	    for(cardid in agame.mulligan[socket.player])
	    {
	      var keep = agame.mulligan[socket.player][cardid].keep;

	      // if keeping card, push it to hand
	      // otherwise, push it to deck and increase mulligan count
	      if(keep)
	        helpers.getHandBySocket(socket, false).push(agame.mulligan[socket.player][cardid].card);
	      else
	      {
	        helpers.getDeckBySocket(socket, false).push(agame.mulligan[socket.player][cardid].card);
	        mulligancount++;
	      }
	    }

	    // now draw more cards directly into hand and tell the player
	    util.shuffle(helpers.getDeckBySocket(socket, false));

	    if(mulligancount > 0)
	    {
	      socket.emit('terminal', "\nNew cards from your mulligan:\n");
	    }

	    for(i = 0; i < mulligancount; i++)
	    {
	      var card = helpers.getDeckBySocket(socket, false).pop();
	      console.log("Mulliganed new card for " + socket.id);
	      socket.emit('terminal', display.printDetailedCard(card));
	      helpers.getHandBySocket(socket, false).push(card);
	    }

	    // wait for opponent
	    if(helpers.getHandBySocket(socket, true).length < 3)
	    {
	      socket.emit('terminal', 'Waiting for opponent to finish mulligan');
	      socket.emit('control', {command: 'suspend'});
	    }
	    else
	    {
	      // begin game

	      // clear the callbacks
	      agame.p1socket.promptCallback = null;
	      agame.p2socket.promptCallback = null;

	      // resume consoles
	      agame.p1socket.emit('control', {command: 'resume'});
	      agame.p2socket.emit('control', {command: 'resume'});

	      // start game
	      module.exports.startGame(agame);

	     }

	    return;


	  }

	  // present the deck to the player:
	  var mulligantoprint = "Pick cards to mulligan\nType a number or numbers and press enter to toggle if a card is kept or discarded. Type \"done\" when ready.\n";
	  var i = 1;

	  for(cardid in agame.mulligan[socket.player])
	  {
	    var card = agame.mulligan[socket.player][cardid].card;
	    var keep = agame.mulligan[socket.player][cardid].keep;

	    // tmp
	    mulligantoprint += "\n" +  i + ": ";

	    if(keep)
	      mulligantoprint += "[[b;limegreen;]&#91;KEEP&#93;]";
	    else
	      mulligantoprint += "[[b;red;]&#91;DISCARD&#93;]"

	    mulligantoprint += " " + display.printDetailedCard(card);
	    i++;
	  }

	  socket.emit('terminal', mulligantoprint);



	  // start game
	  // check both mulligans
	  // null out callback

	  //activateTurnTimer(agame);
	  //startGame(agame);

	},


	startGame: function(agame)
	{
	      // give 1 mana to player 1
	      agame.getPlayer(agame.getSocketByPlayerNumber(agame.playerTurn), false).mana = 1;
	      agame.getPlayer(agame.getSocketByPlayerNumber(agame.playerTurn), false).maxmana = 1;

	      // set round one
	      agame.round = 1;

	      agame.getHand(agame.getSocketByPlayerNumber(agame.playerTurnOpposite(), false)).push(helpers.getCardById("GAME_005"));
	      agame.getSocketByPlayerNumber(agame.playerTurnOpposite(), false).emit('terminal', '\n[[;lightblue;]The Coin mysteriously appears in your hand...]');
	      agame.getSocketByPlayerNumber(agame.playerTurnOpposite(), false).emit('terminal', display.printDetailedCard(helpers.getCardById("GAME_005")));


	      // set up prompts
	      agame.updatePromptsWithDefault();

	      // start timer
	      this.activateTurnTimer(agame);

	      // tell first player to go
	      var firstplayersocket = agame.getSocketByPlayerNumber(agame.playerTurn);
      	  firstplayersocket.emit("terminal", "\n[[b;limegreen;]Your turn!]\n");

      	  // give them a card
      	  module.exports.drawCard(agame.getSocketByPlayerNumber(agame.playerTurn));

      	  // show them the board
      	  display.printBoard(firstplayersocket);

	},

	endTurn: function(socket)
	{
	    var agame = helpers.getGameBySocket(socket);

	    // game ended?
	    if(agame == null)
	    {
	    	//clearTimeout(agame.turntimercallback);
	    	console.log("Ending unknown game");
	    	return;
	    }

	    if(!agame.isPlayerTurn(socket))
	    {
	      socket.emit("terminal", "It is not your turn\n");
	      return;
	    }

	    // clear the turn timer
	    clearTimeout(agame.turntimercallback);
	    
	    // whos turn it is that is ending
	    var currentplayer = agame.getPlayer(socket, true);

	    // whos turn it is that is starting
	    var opponent = agame.getPlayer(socket, true);


	    console.log("Ending turn of " + agame.name + ". Moving turn from " + agame.playerTurn + " to " + agame.playerTurnOpposite());

	    // do end of turn things
	    gamevars.triggers.emit('doTrigger', constants.triggers.onendturn, agame, null, null);


	    // flip whos turn it is
	    agame.playerTurn = agame.playerTurnOpposite();

	    // increase round count
	    agame.round++;

	    // increase mana for new player
	    if(opponent.mana < 10)
	      opponent.maxmana++;

	    // refresh mana
	    opponent.mana = opponent.maxmana;

	    // set can attack (for weapons, etc)
	    opponent.canattack = true;

	    // turn on hero power
	    opponent.heropower.ready = true;

	    // tell new player it is their turn
	    var newplayersocket = agame.getSocketByPlayerNumber(opponent.number);
	    newplayersocket.emit("terminal", "\n[[b;limegreen;]Your turn!]\n");

	    // do start of turn things
	    gamevars.triggers.emit('doTrigger', constants.triggers.onstartturn, agame, null, null);


	    // draw new player a card
	    module.exports.drawCard(helpers.getOppositePlayerSocket(socket));

	    // set all minions (that can attack) to ready
	    var currentBoard = helpers.getBoardBySocket(socket, true);
	    for(cardonboardindex in currentBoard)
	    {
	    	var cardonboard = currentBoard[cardonboardindex];

	    	if(typeof cardonboard['mechanics'] != 'undefined' && cardonboard['mechanics'].indexOf('CANT_ATTACK') > -1)
	    		continue;

	    	if(cardonboard['attack'] <= 0)
	    		continue;

	    	cardonboard.canattack = true;
	    }

	    agame.updatePromptsWithDefault();

	    // show board?
	    display.printBoard(newplayersocket);

	    this.activateTurnTimer(agame);
	},

	drawCard: function(socket)
	{

		var agame = helpers.getGameBySocket(socket);

	    // draw a card for the new player
	    var draw = helpers.getDeckBySocket(socket, false).pop();
	    var player = helpers.getPlayerBySocket(socket, false);

	    if(draw == null)
	    {
	    	// fatigue!
	    	helpers.getOppositePlayerSocket(socket).emit('terminal', 'Your opponent is out of cards and draws...');
	    	socket.emit("terminal", "You draw...");

	    	player.fatigue++;

	    	agame.io.to(agame.name).emit('terminal', '\n[[b;red;]Fatigue]\n\n[[;darkred;]   .-.\n  (0.0)\n\'=.|m|.=\'\n.=\'`"``=.]\n\nOut of cards! Take '+ player.fatigue +' damage.\n');
	    	
	    	module.exports.damagePlayer(agame, player, player.fatigue);
	    }
	    else if(helpers.getHandBySocket(socket, false).length >= 10)
	    {
	    	// too many cards
	    	helpers.getOppositePlayerSocket(socket).emit('terminal', '[[;red;black]Your opponent has too many cards in their hand! They lost...]');
	    	
	    	socket.emit("terminal", "[[;red;black]You have too many cards in your hand! You lost...]");

	    	agame.io.to(agame.name).emit('terminal', display.printDetailedCard(draw, player.spellpower));

	    }
	    else
	    {
	    	helpers.getOppositePlayerSocket(socket).emit('terminal', 'Your opponent draws a card\n');
	    	socket.emit("terminal", "You draw...");
	    	socket.emit("terminal", display.printDetailedCard(draw, player.spellpower));

	    	helpers.getHandBySocket(socket, false).push(draw);
	    }


	},


	doUpdateTick: function(game)
	{
		console.log("Doing update tick for " + game.name);

		// count spellpower for each player
		game.player.p1.spellpower = helpers.getBoardTotalSpellpower(game.board.p1);
		game.player.p2.spellpower = helpers.getBoardTotalSpellpower(game.board.p2);

	},

	// position is optional
	// will _NOT_ execute the battlecry
	summonMinion: function(socket, card, position)
	{
		var o = helpers.getGameObjectsBySocket(socket);

		if(position == null || typeof position == 'undefined')
			position = o.decks.self.length;

		// put minion on board
		o.boards.self.splice(position, 0, card);

		// is minion charge?
		if(typeof card["mechanics"] != 'undefined' && card["mechanics"].indexOf("CHARGE") > -1)
			card["canattack"] = true;
		else
			card["canattack"] = false;


	    // do sound effect
	    if(typeof card["quote"] != 'undefined' && typeof card["quote"]["play"] != 'undefined')
	      o.game.io.to(o.game.name).emit('terminal', "[[;#FFBDC0;]&lt;" + card["name"] + '&gt; ' + card["quote"]["play"] + ']\n');

	  	// do other events in response
	  	gamevars.triggers.emit('doTrigger', constants.triggers.onplay, o.game, card, null);

	},

	activateTurnTimer: function(agame)
	{
	  var that = this;

	  // start turn timer
	  agame.turntimercallback = setTimeout(function() {

	    // do rope stuff
	    // trigger character rope speech TBD

	    agame.io.to(agame.name).emit('terminal', '\n[[b;orange;]There is only ' + agame.turntimerrope + ' seconds left in the turn!\n]');

	    agame.turntimercallback = setTimeout(function() {

	      agame.io.to(agame.name).emit('terminal', 'End of turn by timeout');

	      var currentplayersocket = agame.getSocketByPlayerNumber(agame.playerTurn);

	      currentplayersocket.emit('terminal', '\n[[b;red;]You ran out of time on your turn!]\n');
	      
	      that.endTurn(currentplayersocket);

	    }, agame.turntimerrope * 1000);

	  }, agame.turntimer * 1000);
	},

	deactivateTurnTimer: function(game)
	{
		if(game.turntimercallback != null)
			clearTimeout(game.turntimercallback);
	},

	quitGame: function(game)
	{
      module.exports.deactivateTurnTimer(game);

      game.io.to(game.name).emit("control", {command: "endgame"} );

      util.filterInPlace(gamevars.games, function (el) {
        return el.name != game.name;
      });

	},




}