// preconditions for spells and cards

var helpers = require('./helpers');
var util = require('./util');
var execution = require('./execution');
var constants = require('./constants');
var buffs = require('./Buff');
var engineering = require('./engineering');

// card actions by internal CardID
module.exports = {

	// polymorph
	CS2_022: function(socket, card, target, parts)
	{
		if(target.type != 'MINION')
		{
			socket.emit('terminal', 'Target must be a minion!');
			return false;

		}

		return true;
	}

}