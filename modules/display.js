var helpers = require('./helpers');
var util = require('./util');
var constants = require('./constants');

module.exports = {

	// nicely print a card to a player
	// playstatus is optional, and is either 0 = can't play, 1 = can play, 2 = should play (e.g. combo)
	printCard: function(card, showstatus, playstatus)
	{

	  var returnval = "";

	  if(playstatus == null || typeof playstatus === 'undefined')
	  	playstatus = 0;

	  if(card["type"] == "MINION")
	  {	  	
	  	// get base card for comparison
	  	var basecard = helpers.getCardById(card.id);

	  	if(playstatus === 1)
			returnval += "[[;lime;]" + card["name"] + "] [";
	  	else if(playstatus === 2)
			returnval += "[[;yellow;]" + card["name"] + "] [";
	  	else
	    	returnval += card["name"] + " [";

	    if(card.attack < basecard.attack)
	    	returnval += "[[;red;]" + card.attack + "]";
	    else if(card.attack > basecard.attack)
	    	returnval += "[[;lime;]" + card.attack + "]";
	    else
	    	returnval += "[[;white;]" + card.attack + "]";

	    returnval += "/";

	    if(card.health < basecard.health)
	    	returnval += "[[;red;]" + card.health + "]";
	    else if(card.health > basecard.health)
	    	returnval += "[[;lime;]" + card.health + "]";
	    else
	    	returnval += "[[;white;]" + card.health + "]";

	    returnval += "] (" + card["cost"] + ")";

	    if(typeof card["canattack"] != 'undefined' && card["canattack"] && showstatus)
	  		returnval += " [[;lime;] (READY)]"; 

	  	if(helpers.cardHasMechanic(card, "TAUNT") && showstatus)
	  		returnval += " [[;gold;] (TAUNT)]";

	  }
	  else if(card["type"] == "SPELL")
	  {
	    
	  	if(playstatus === 1)
			returnval += "[[;lime;]" + card["name"] + "]";
	  	else if(playstatus === 2)
			returnval += "[[;yellow;]" + card["name"] + "]";
	  	else
	    	returnval += card["name"];

		returnval += " (" + card["cost"] + ")";
	  }

	  if(card["type"] == "WEAPON")
	  {	  	
	  	// get base card for comparison
	  	var basecard = helpers.getCardById(card.id);

	  	if(playstatus === 1)
			returnval += "[[;lime;]" + card["name"] + "] [";
	  	else if(playstatus === 2)
			returnval += "[[;yellow;]" + card["name"] + "] [";
	  	else
	    	returnval += card["name"] + " [";

	    if(card.attack < basecard.attack)
	    	returnval += "[[;red;]" + card.attack + "]";
	    else if(card.attack > basecard.attack)
	    	returnval += "[[;lime;]" + card.attack + "]";
	    else
	    	returnval += "[[;white;]" + card.attack + "]";

	    returnval += "/";

	    if(card.durability < basecard.durability)
	    	returnval += "[[;red;]" + card.durability + "]";
	    else if(card.durability > basecard.durability)
	    	returnval += "[[;lime;]" + card.durability + "]";
	    else
	    	returnval += "[[;white;]" + card.durability + "]";

	    returnval += "] (" + card["cost"] + ")";

	  }

	  return returnval;

	},

	printDetailedCard: function(card, spellpower)
	{
	  var basecard = helpers.getCardById(card.id);

	  if(typeof spellpower == 'undefined' || spellpower == null)
	  	spellpower = 0;

	  var cardtext = "";

	  if(typeof card["text"] != 'undefined')
	  {
	  	cardtext = card["text"];

	  	// replace spell damage in string with added spellpower
	  	if(spellpower > 0)
	  	{
		  	var re = /\$([0-9]+)/
		  	var spelldamagematch = cardtext.match(re);
		  	var spelldamage = null;
		  	if(spelldamagematch != null)
		  		spelldamage = spelldamagematch[1];

		  	if(spelldamage != null)
		  	{
			  	var totaldamage = +spelldamage + +spellpower;
			  	cardtext = cardtext.replace(re, "[[;;bold]*" + totaldamage + "*]");
			}
		}
		// if there is no spellpower, simply remove the $ on the card description
		else
		{
			cardtext = cardtext.replace('$', '');
		}
	  }



	  if(card["type"] == "MINION")
	  {
	  	// get base card for comparison

	  	var returnval = "";

	    returnval += "[[b;white;]" + card["name"] + "]\n" + "Cost: " + card["cost"] + " Attack: ";

	    if(card.attack < basecard.attack)
	    	returnval += "[[;red;]" + card.attack + "]";
	    else if(card.attack > basecard.attack)
	    	returnval += "[[;lime;]" + card.attack + "]";
	    else
	    	returnval += "[[;white;]" + card.attack + "]";

	    returnval += " Health: ";

	    if(card.health < basecard.health)
	    	returnval += "[[;red;]" + card.health + "]";
	    else if(card.health > basecard.health)
	    	returnval += "[[;lime;]" + card.health + "]";
	    else
	    	returnval += "[[;white;]" + card.health + "]";

	    returnval += "\n";

	    if(typeof card["rarity"] != 'undefined' && card["rarity"] != "FREE")
	   		returnval += card["rarity"] + " ";

	    if(typeof card["type"] != 'undefined')
	    	returnval += card["type"] + " ";

	    if(typeof card["race"] != 'undefined')
	    	returnval += card["race"] + " ";
	    
	    if(cardtext != "")
	    	returnval += "\n" + cardtext;

	    // do buffs
	    if(typeof card['buffs'] != 'undefined')
	    {
	    	returnval += "\n"
	    	card.buffs.forEach(function(buff)
	    	{
	    		returnval += "[[;lightblue;]\n" + buff.name + " (" + buff.sourcecard.text + ")]";
	    	});
	    }
	  }

	  if(card["type"] == "SPELL" || card["type"] == "HERO_POWER")
	  {
	    var returnval = "[[b;lightblue;]" + card["name"] + "]\n" + "Cost: " + card["cost"] + "\n";
	    
	    if(typeof card["rarity"] != 'undefined' && card["rarity"] != "FREE")
	   		returnval += card["rarity"] + " ";

	    if(typeof card["type"] != 'undefined' && card["type"] != "HERO_POWER")
	    	returnval += card["type"] + "\n";
	    
	    if(cardtext != "")
	    	returnval += cardtext + "\n";

	  }

	  if(card["type"] == "WEAPON")
	  {
	  	var returnval = "[[b;#FFFFD5;]" + card["name"] + "]\n" + "Cost: " + card["cost"] + "\n";

	  	returnval += "Damage: ";

	    if(card.attack < basecard.attack)
	    	returnval += "[[;red;]" + card.attack + "]";
	    else if(card.attack > basecard.attack)
	    	returnval += "[[;lime;]" + card.attack + "]";
	    else
	    	returnval += "[[;white;]" + card.attack + "]";

	    returnval += " Durability: ";

	    if(card.durability < basecard.durability)
	    	returnval += "[[;red;]" + card.durability + "]";
	    else if(card.durability > basecard.health)
	    	returnval += "[[;lime;]" + card.durability + "]";
	    else
	    	returnval += "[[;white;]" + card.durability + "]";

	    returnval += "\n";

	  	if(typeof card["rarity"] != 'undefined' && card["rarity"] != "FREE")
	   		returnval += card["rarity"] + " ";

	    if(typeof card["type"] != 'undefined')
	    	returnval += card["type"];

	   	if(cardtext != "")
	    	returnval += "\n" + cardtext;
	  }


	    return "\n" + returnval + "\n";
	},


	printAvailableDecks: function(socket, decks)
	{
	  var printdeck = "Pick a deck: \n\n";

	  var i = 0;
	  for(deck in decks)
	  {
	    printdeck += i + ": " + decks[deck]["name"] + "\n";
	    i++;
	  }

	  socket.emit('terminal', printdeck);
	},

	printBoard: function(socket, boardsize)
	{
		var o = helpers.getGameObjectsBySocket(socket);

		if(typeof boardsize == 'undefined' || boardsize == null)
			boardsize = constants.boardSize;

		var line = (function() {
			var r = '';
			r += Array(boardsize).join(constants.borderCharacters.horizontalEdge);
			return r;
		})();

		var emptyline = (function() {
			var r = '';
			r += Array(boardsize).join(' ');
			return r;
		})();

		var boardLine = function(card, i, o) {

			// get card
			var vcard = module.exports.printCard(card, true);

			// remove non-printing character blocks
			var strippedcard = util.stripColorCoding(vcard);

			// get length
			var linelength = strippedcard.length + 5;

			// sanity check
			if( (boardsize - linelength) <= 0 )
			{
				console.log("Warning: Line length too long!");
				boardsize = linelength + 1;
			}

			var r = "\n" + constants.borderCharacters.verticalEdge + " " + o + i + ": " + vcard;
			r += Array(boardsize - linelength).join(' ');
			r += constants.borderCharacters.verticalEdge;

			return r;
		}

		var o_armor = o.players.opponent.armor > 0 ? '[[[;gold;]' + o.players.opponent.armor + '] armor' : '';
		var o_attack = o.players.opponent.attack > 0 ? o.players.opponent.attack + ' attack ' : '';
		var o_weapon = o.players.opponent.weapon == null ? '(Nothing)' : module.exports.printCard(o.players.opponent.weapon);
		var o_heropower = o.players.opponent.heropower.ready ? o.players.opponent.heropower.name + ' (' + o.players.opponent.heropower.cost + ')' : o.players.opponent.heropower.name + ' (inactive)'

		var o_board = (function() {
			var r = constants.borderCharacters.verticalEdge + emptyline + constants.borderCharacters.verticalEdge;
			var i = 1;
			o.boards.opponent.forEach(function(card) {
				r += boardLine(card, i, 'o');
				i++;
			});
			return r;
		})();

		var m_board = (function() {
			var r = constants.borderCharacters.verticalEdge + emptyline + constants.borderCharacters.verticalEdge;
			var i = 1;
			o.boards.self.forEach(function(card) {
				r += boardLine(card, i, 'm');
				i++;
			});
			return r;
		})();

		var m_weapon = (function() {
			if(o.players.self.weapon != null && o.players.self.attack > 0 && o.players.self.canattack)
				return module.exports.printCard(o.players.self.weapon, 1, 1);
			else if(o.players.self.weapon != null)
				return module.exports.printCard(o.players.self.weapon, 1, 0);
			else
				return "(Nothing)";
		})();


		var m_heropower = (function() {
			if(o.players.self.heropower.ready)
			{
				if(o.players.self.heropower.cost <= o.players.self.mana)
					return '[[;lime;]' + o.players.self.heropower.name + '] (' + o.players.self.heropower.cost + ')'
				else
					return o.players.self.heropower.name + ' (' + o.players.self.heropower.cost + ')'
			}
			else
				return o.players.self.heropower.name + ' (inactive)'
		})();


		var board = `
Enemy ${o.players.opponent.character} [[;green;]${o.players.opponent.health}] HP ${o_armor} [[;orange;]${o_attack}] [[;lightblue;]${o.players.opponent.mana}]/${o.players.opponent.maxmana} mana
Cards - hand: ${o.hands.opponent.length}  deck: ${o.decks.opponent.length}
Equipped: ${o_weapon}
Hero power: ${o_heropower}

${constants.borderCharacters.topLeftCorner}${line}${constants.borderCharacters.topRightCorner}
${o_board}
${constants.borderCharacters.verticalEdge}${emptyline}${constants.borderCharacters.verticalEdge}
${constants.borderCharacters.leftMiddleConnector}${line}${constants.borderCharacters.rightMiddleConnector}
${m_board}
${constants.borderCharacters.verticalEdge}${emptyline}${constants.borderCharacters.verticalEdge}
${constants.borderCharacters.bottomLeftCorner}${line}${constants.borderCharacters.bottomRightCorner}

Your hero power: ${m_heropower}
Your weapon: ${m_weapon}

Your hand:`;

		socket.emit('terminal', board);

		module.exports.printHand(socket, {});

	},

	printHand: function(socket, parts)
	{
		i = 1;

	      var player = helpers.getPlayerBySocket(socket, false);
	      var board = helpers.getBoardBySocket(socket, false);

	      var response = "\n";

	      helpers.getHandBySocket(socket, false).forEach(function(card) {
	        if(parts[0] != null && parts[0].indexOf("detail") === 0)
	          response += "h" + i + ": " + module.exports.printDetailedCard(card) + "\n";
	        else
	        {
	          // get play status
	          var playstatus = 0;
	          if(player.mana >= card.cost && !(card.type == "MINION" && board.size >= 7) )
	            playstatus = 1;

	          response += "h" + i + ": " + module.exports.printCard(card, false, playstatus) + "\n";
	        }
	        i++;
	      });  

	      response += "\n";

	      socket.emit('terminal', response);
	},

	say: function(source, message)
	{
		return "[[;#FFBDC0;]&lt;" + source + '&gt; ' + message + ']\n';
	}


}
