var constants = require('./constants');
var helpers = require('./helpers');
var engineering = require('./engineering');
var execution = require('./execution');
var display = require('./display');
var util = require('./util');

module.exports = {

	// the heroes themselves
	MAGE: {

		name: "Jaina",

		heropower: {

			name: "Fireblast",
			cost: 2,
			ready: true,
			targetrequired: true,
			card: "CS2_034",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var damage = 1;

				var heropowercard = helpers.getCardById(this.card);
				
				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				if(target == constants.selftarget)
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]Your fireblast explodes violently in your hands, dealing '+ damage +' damage!]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s fireblast explodes in their hands! dealing '+ damage + ' damage]\n');
				}

				else if(target == constants.opponenttarget)
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]Your fireblast streaks across the board to your opponent, dealing '+ damage +' damage]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s fireblast hits you for '+ damage + ' damage!]\n');
				}

				else
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]Your fireblast collides with '+ target.name + ', dealing ' + damage +' damage]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s fireblast collides with ' + target.name + ', dealing ' + damage + ' damage!]\n\n');
				}

				engineering.damageTarget(o.game, target, damage);

			}

		}
	},

	PRIEST: {

		name: "Anduin",

		heropower: {

			name: "Lesser Heal",
			cost: 2,
			ready: true,
			targetrequired: true,
			card: "CS1h_001_H1",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var heal = 2;

				var heropowercard = helpers.getCardById(this.card);

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				if(target == constants.selftarget)
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]The warmth of your spell heals for '+ heal +' health!]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s lesser heal restores '+ heal + 'health to themselves]\n');
				
					//execution.healPlayer(o.game, o.players.self, heal);
				}

				else if(target == constants.opponenttarget)
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]Your spell heals your opponent for '+ heal +' health]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s lesser heal restores '+ heal + ' health to you!]\n');
				
					//execution.healPlayer(o.game, o.players.opponent, heal);
				}

				else
				{
					o.sockets.self.emit('terminal', '[[;lightblue;]Your spell heals '+ target.name + ' for ' + heal +' health]\n');
					o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent\'s lesser heal restores ' + heal + ' health to ' + target.name + ']\n\n');
				
					//engineering.healCard(o.game, target, heal);
				}

				engineering.healTarget(o.game, target, heal);

			}

		}
	},

	WARLOCK: {

		name: "Gul'dan",

		heropower: {

			name: "Life Tap",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_056",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var damage = 2;

				var heropowercard = helpers.getCardById(this.card);

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.sockets.self.emit('terminal', '[[;lightblue;]You suffer '+ damage+ ' damage]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent suffers ' + damage + ' damage]\n');
			

				engineering.damagePlayer(o.game, o.players.self, damage);

				execution.drawCard(socket);

			}

		}
	},


	ROGUE: {

		name: "Valeera",

		heropower: {

			name: "Dagger Mastery",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_083b",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var damage = 2;

				var heropowercard = helpers.getCardById(this.card);
				var knife = helpers.getCardById("CS2_082");

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				if(o.players.self.weapon != null)
				{
					o.game.io.to(o.game.name)("terminal", o.players.self.weapon.name + " was destroyed!");
					o.players.self.weapon = null;
				}


				o.sockets.self.emit('terminal', '[[;lightblue;]You equip...]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent equips...]\n');

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(knife));

		        // equip weapon
		        o.players.self.weapon = knife;

		        // add damage to player
		        o.players.self.attack = knife.attack;

			}

		}
	},

	SHAMAN: {

		name: "Thrall",

		heropower: {

			name: "Totemic Call",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_049_H1",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var damage = 2;

				var heropowercard = helpers.getCardById(this.card);

				// make sure there is enough space on the board
				if(o.boards.self.length >= 7)
				{
					o.sockets.self.emit('terminal', 'There is no room on the board!\n');
					return false;
				}

				// get all the totems
				// healing, searing, stoneclaw, wrathofair
				var totemIds = ["AT_132_SHAMANa", "AT_132_SHAMANb", "CS2_051", "CS2_052"];

				// see whats already on the board and remove it from the possibilities
				o.boards.self.forEach(function(card) {

					var index = totemIds.indexOf(card.id)

					if(index > -1)
						totemIds.splice(index, 1);
				});

				if(totemIds.length == 0)
				{
					o.sockets.self.emit('terminal', 'You have summoned all your totems!');
					return false;
				}

				// pull a random totem
				var totemindex = util.Random(totemIds.length);

				// pull the proper card
				var totem = helpers.getCardById(totemIds[totemindex]);

				// summon it
				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.sockets.self.emit('terminal', '[[;lightblue;]You summon...]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent summons]\n\n');

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(totem));

				// .. at last position
				//o.boards.self.splice(o.boards.self.length, 0, totem);
				execution.summonMinion(socket, totem);

				// @todo: register healing totem as needed


			}

		}
	},

	HUNTER: {

		name: "Rexxar",

		heropower: {

			name: "Steady Shot",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "DS1h_292",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var damage = 2;

				var heropowercard = helpers.getCardById(this.card);

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.sockets.self.emit('terminal', '[[;lightblue;]You deal '+ damage+ ' damage to your opponent]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent deals ' + damage + ' to you]\n\n');

				engineering.damagePlayer(o.game, o.players.opponent, damage);

			}

		}
	},

	PALADIN: {

		name: "Uther",

		heropower: {

			name: "Reinforce",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_101",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				if(o.boards.self.length >= 7)
				{
					o.sockets.self.emit('terminal', 'There is no room on the board!\n');
					return false;
				}

				var heropowercard = helpers.getCardById(this.card);
				var recruit = helpers.getCardById("CS2_101t");

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.game.io.to(o.game.name).emit('terminal', "[[;#FFBDC0;]&lt;Silver Hand Recruit&gt; Ready for action!]\n");

				// put recruit on board (last position)
				//o.boards.self.splice(o.boards.self.length, 0, recruit);
				execution.summonMinion(socket, recruit);

			}

		}
	},

	WARRIOR: {

		name: "Garrosh",

		heropower: {

			name: "Armor up!",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_102",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var armor = 2;

				var heropowercard = helpers.getCardById(this.card);

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.sockets.self.emit('terminal', '[[;lightblue;]You gain '+ armor+ ' armor]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent gains ' + armor + ' armor]\n\n');

				o.players.self.armor += armor;

			}

		}
	},


	DRUID: {

		name: "Malfurion",

		heropower: {

			name: "Shapeshift",
			cost: 2,
			ready: true,
			targetrequired: false,
			card: "CS2_017",
			cast: function(socket, target) {
				
				var o = helpers.getGameObjectsBySocket(socket);

				var armor = 1;
				var attack = 1;

				var heropowercard = helpers.getCardById(this.card);

				o.game.io.to(o.game.name).emit('terminal', display.printDetailedCard(heropowercard));

				o.sockets.self.emit('terminal', '[[;lightblue;]You gain '+ armor+ ' armor and '+ attack +' attack]\n');
				o.sockets.opponent.emit('terminal', '[[;lightblue;]Your opponent gains ' + armor + ' armor and '+ attack +' attack]\n\n');

				// add armor
				o.players.self.armor += armor;

				// add the +1 attack buff that expires at end of turn
				o.players.self.status.push(heropowercard);

				o.players.self.attack += 1;

			}
		}
	},

}