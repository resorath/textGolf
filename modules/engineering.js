/* Standalone modifications to cards */
var helpers = require('./helpers');
var constants = require('./constants');
var gamevars = require('./gamevars');
var execution = require('./execution');

module.exports = {

	addBuff: function(card, buff)
	{
		card.buffs.push(buff);

		// apply buff
		card.attack += buff.changeattack;
		card.health += buff.changehealth;
		card.cost += buff.changemana;


		if(card.attack < 0)
			card.attack = 0;

		if(card.health < 1)
			card.health = 1;

		if(card.cost < 0)
			card.cost = 0;

	},

	removeBuff: function(card, buff)
	{		
		for(buffid in card.buffs)
		{
			var cardbuff = card.buffs[buffid];

			if(cardbuff == buff)
			{
				card.buffs.splice(buffid, 1);
			}
		}

		// remove buff
		card.attack -= buff.changeattack;

		card.health -= buff.changehealth;

		card.cost -= buff.changemana;


		if(card.attack < 0)
			card.attack = 0;

		if(card.health < 1)
			card.health = 1;

		if(card.cost < 0)
			card.cost = 0;

	},

	// figure out what to damage based on target
	healTarget: function(agame, target, amount)
	{
		if(target == constants.selftarget)
			return module.exports.healPlayer(agame, agame.currentPlayer(), amount);
		if(target == constants.opponenttarget)
			return module.exports.healPlayer(agame, agame.oppositePlayer(), amount);
		else
			return module.exports.healCard(agame, target, amount);

	},

	// figure out what to heal based on target
	damageTarget: function(agame, target, amount)
	{
		if(target == constants.selftarget)
			return module.exports.damagePlayer(agame, agame.currentPlayer(), amount);
		if(target == constants.opponenttarget)
			return module.exports.damagePlayer(agame, agame.oppositePlayer(), amount);
		else
			return module.exports.damageCard(agame, target, amount);

	},

	damageCard: function(agame, card, amount)
	{
		card.health -= amount;

		// do on damage trigger
		gamevars.triggers.emit('doTrigger', constants.triggers.onminiondamaged, agame, card, null);

		if(card.health <= 0)
		{
			agame.io.to(agame.name).emit('terminal', '[[' + constants.formatcolor.death + ']' + card['name'] + " is destroyed!]\n");

			module.exports.removeCard(agame, card, true);
		}
	},

	healCard: function(agame, card, amount)
	{
		// need original values of card
		var basecard = helpers.getCardById(card.id);

		// determine how much can be healed
		var healamount = basecard.health - card.health;
		if(healamount > amount)
			healamount = amount;

		// heal card
		card.health += amount;

		// enforce maximum health
		if(card.health > basecard.health)
			card.health = basecard.health;

		gamevars.triggers.emit('doTrigger', constants.triggers.onheal, agame, card, null);

		// return how much was healed
		return healamount;

	},

	// removes a card from the board, and optionally triggers its deathrattle
	removeCard: function(agame, card, deathrattle)
	{
		// who owned this card?
		var playerid = card.ownernumber;

		var board = null;
		var graveyard = null;

		if(playerid == 1)
		{
			board = agame.board.p1;
			graveyard = agame.graveyard.p1;
		}
		else if(playerid == 2)
		{
			board = agame.board.p2;
			graveyard = agame.graveyard.p2;
		}
		else
		{
			console.log("FATAL: Card not owned");
			console.log(card);
			return;
		}

		if(deathrattle)
		{
			//module.exports.doTrigger(constants.triggers.ondeath, agame, card, null);
	  		gamevars.triggers.emit('doTrigger', constants.triggers.ondeath, agame, card, null);
		}

		gamevars.triggers.emit('doTrigger', constants.triggers.onleaveplay, agame, card, null);

		var index = board.indexOf(card);

		graveyard.push(board.splice(index, 1));

		// return location of removed card
		return index;

	},

	damagePlayer: function(agame, player, amount)
	{
		if(player.armor < amount)
		{
			amount -= player.armor;

			player.armor = 0;
		}
		else
		{
			player.armor -= amount;

			amount = 0;
		}

		player.health -= amount;

		gamevars.triggers.emit('doTrigger', constants.triggers.onherodamaged, agame, null, null);

		agame.updatePromptsWithDefault();

		// check if game is over
		// todo: refactor this so we don't need to retrieve the socket
		if(player.health <= 0)
		{
			var socket = agame.getSocketByPlayerNumber(player.number);
			socket.emit('terminal', 'Game over, you lose!\n');
			helpers.getOppositePlayerSocket(socket).emit('terminal', 'Game over, you win!\n');

			execution.quitGame(agame);
		}

	},

	healPlayer: function(agame, player, amount)
	{
		player.health += amount;

		if(player.health > player.maxhealth)
			player.health = player.maxhealth

		gamevars.triggers.emit('doTrigger', constants.triggers.onheal, agame, null, null);

		agame.updatePromptsWithDefault();
	},



}