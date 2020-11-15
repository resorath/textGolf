/* Commands for players to execute */

var helpers = require('./helpers');
var execution = require('./execution');
var display = require('./display');
var util = require('./util');
var ca = require('./cardactions')
var preconditions = require('./preconditions');
var constants = require('./constants');
var engineering = require('./engineering');
var gamevars = require('./gamevars');

module.exports = {

  // test
  meow: function(socket, parts)
  {
    console.log("mew mew");
    socket.emit('control', { command: "prompt", prompt: "mew?> " });

    var agame = helpers.getGameBySocket(socket);
    
    socket.promptCallback = function(command, socket)
    {
      console.log("meow meow " + command);
      var agame = helpers.getGameBySocket(socket);

      if(command == "mew")
      {

        socket.promptCallback = null;

        socket.emit('terminal', 'meow meow');
        agame.defaultPrompt(socket);
      }


    }

  },

  // end of turn
  end: function(socket, parts)
  {
    execution.endTurn(socket);

  },

  // look at a card
  look: function(socket, parts)
  {
    // parse what we want to look at. 
    var lookatindex = parts[0];

    if(!lookatindex)
      return null;

    var player = helpers.getPlayerBySocket(socket);

    if(lookatindex.toLowerCase() == "hero")
    {
      socket.emit('terminal', display.printDetailedCard(helpers.getCardById(player.heropower.card)));
      return;
    }

    if(lookatindex.toLowerCase() == "weapon")
    {
      if(player.weapon != null)
      {
        socket.emit('terminal', display.printDetailedCard(player.weapon));
        return;
      }
      else
      {
        socket.emit('terminal', 'You don\'t have a weapon equipped\n');
        return;
      }
    }

    var index = helpers.boardIndexToCard(lookatindex, socket);

    if(index == null)
      return;

    socket.emit('terminal', display.printDetailedCard(index, player.spellpower));

  },

  // look aliases
  inspect: function(socket, parts) { return module.exports.look(socket, parts); },

  // print out hand
  hand: function(socket, parts)
  {

      display.printHand(socket, parts);

  },

  // print out board
  board: function(socket, parts)
  {
    display.printBoard(socket);

    /*
      var response = "\nYour opponent has " + helpers.getHandBySocket(socket, true).length + " cards\n" +
      "Opponent health: " + helpers.getPlayerBySocket(socket, true).health + " hp"

      if(helpers.getPlayerBySocket(socket, true).armor > 0)
        response += " + " + helpers.getPlayerBySocket(socket, true).armor + " armor";

      response += "\n";

      if(helpers.getPlayerBySocket(socket, true).weapon != null)
        response += "Equipped: " + display.printCard(helpers.getPlayerBySocket(socket, true).weapon, true, helpers.getPlayerBySocket(socket, true).canattack) +"\n";

      var heropower_o = helpers.getPlayerBySocket(socket, true).heropower
      if(heropower_o.ready)
        response += "\nHero power: " + heropower_o.name + " (" + heropower_o.cost + ")\n";

      response += "\nOpponent's side:\n\n";

      var i = 1;

      helpers.getBoardBySocket(socket, true).forEach(function(card) {
        response += "o" + i + ": " + display.printCard(card, true) + "\n";
        i++;
      });

      response += "\n------------\n\nYour side:\n\n";

      i = 1;

      helpers.getBoardBySocket(socket, false).forEach(function(card) {
        response += "m" + i + ": " + display.printCard(card, true) + "\n";
        i++;
      });  

      if(helpers.getPlayerBySocket(socket, false).weapon != null)
        response += "\nEquipped: " + display.printCard(helpers.getPlayerBySocket(socket, false).weapon, true, helpers.getPlayerBySocket(socket, false).canattack) +"\n";

      var heropower = helpers.getPlayerBySocket(socket, false).heropower
      if(heropower.ready && heropower.cost)
        response += "\nHero power: [[;lime;]" + heropower.name + "] (" + heropower.cost + ")\n";

      response += "\nYour hand:";

      socket.emit('terminal', response);

      module.exports.hand(socket, parts);*/

  },

  // play a card from hand
  // play handId [boardposition]
  play: function(socket, parts)
  {
      var game = helpers.getGameBySocket(socket);
      var player = helpers.getPlayerBySocket(socket, false);
      var oppositeplayer = helpers.getPlayerBySocket(socket, true);

      // can only play a card on turn
      if(!game.isPlayerTurn(socket))
      {
        socket.emit("terminal", "It is not your turn\n");
        return;
      }

      var handtarget = parts[0];
      var target = parts[1];
      var secondary = parts[2];

      var position = null;

      // what card to play is required
      if(handtarget == null)
      {
        socket.emit("terminal", "Select a card from your hand to play, e.g. play h1\n");
        return;
      }

      // target in hand must be from the hand
      if(handtarget.toLowerCase().charAt(0) != 'h')
      {
        socket.emit("terminal", "Select a card from your hand to play, e.g. play h1\n");
        return;
      }

      // fetch the card data from the hand (but don't pull it yet)
      var cardtoplay = helpers.boardIndexToCard(handtarget, socket); 
      if(cardtoplay == null)
      {
        socket.emit("terminal", "Select a card from your hand to play, e.g. play h1\n");
        return;
      }  

      // if its a minion, we have to set the variables differently
      // minion format is: play [position] [target]
      // everything else: play [target]
      // so we need to make target consistent
      if(cardtoplay.type == "MINION")
      {

        // swap position and target inputs as they are backwards coming in
        position = target;
        target = secondary;
        secondary = null;

        // if a position was given, but no target, check to see if the "position" is actually a target
        // and make the position default 0
        if(position != null && target == null)
        {
          var targettype = position.toLowerCase().charAt(0);
          if(targettype == 'o' || targettype == 'm')
          {
            target = position;
            position = 0;
          }
        }

        // default position is 0
        if(position == null)
          position = 0;

        // board target must exist and be between 0 and max friendly board count (inclusive)
        if(position == null 
          || isNaN(position) 
          || position < 0 
          || position > helpers.getBoardBySocket(socket, false).length)
        {
          socket.emit("terminal", "Select a valid place to put that minion\n");
          return;
        }
      }

      // check mana
      if(player.mana < cardtoplay.cost)
      {
        socket.emit("terminal", "You don't have enough mana!\n");
        return;
      }

      // card index in hand array
      var indexinhand = handtarget.substring(1);
      indexinhand--;

      console.log(socket.id + " playing index :" + indexinhand);

      // record if successful play
      var targetcard = null;

      // Do preconditions first

      // choose target card if applicable
      if(target != null)
      {
        if(helpers.targetIsOpponent(target))
          targetcard = constants.opponenttarget;
        else if(helpers.targetIsSelf(target))
          targetcard = constants.selftarget;
        else
        {
          var targettype = target.toLowerCase().charAt(0);
          if(targettype == 'o' || targettype == 'm')
            targetcard = helpers.boardIndexToCard(target, socket);
        }

        if(targetcard == null)
        {
          socket.emit("terminal", "Invalid target");
          return;
        }
      } 

      // check preconditions specific to each type of card
      switch(cardtoplay.type)
      {

        case "MINION":

          // check if minion needs a target
          if( helpers.cardHasPlayRequirement(cardtoplay, ["REQ_TARGET_TO_PLAY", "REQ_TARGET_IF_AVAILABLE"]) !== false 
              && targetcard == null )
          {
            socket.emit("terminal", "This card needs a position and target to play!\nplay [position] [target]\n");
            return;
          }

          var board = helpers.getBoardBySocket(socket, false);

          // is there enough room on the board?
          if(board.length >= 7)
          {
            socket.emit("terminal", "There is not enough room on the board!\n");
            return;
          }

          break;

        case "SPELL":
        case "WEAPON":

          // check if spell needs a target
          if(helpers.cardHasPlayRequirement(cardtoplay, "REQ_TARGET_TO_PLAY") !== false && targetcard == null)
          {
            socket.emit("terminal", "This card needs a target to play!\nplay [target]\n");
            return;
          }
          break;


      }

      // run any preconditions that might exist, if they return false, fail
      if(typeof preconditions[cardtoplay.id] === 'function')
        if(!preconditions[cardtoplay.id](socket, cardinhand, targetcard, parts))
          return;

      // now to the execution


      // remove card from hand
      var cardinhand = helpers.getHandBySocket(socket, false).splice(indexinhand, 1)[0];

      // announce play to opposite
      helpers.getOppositePlayerSocket(socket).emit('terminal', "Your opponent played...");
      // announce play to player
      socket.emit('terminal', 'Playing...');

      game.io.to(game.name).emit('terminal', display.printDetailedCard(cardinhand, player.spellpower));

      // Do specific things to put the card on the board
      switch(cardtoplay.type)
      {
        case "MINION":
          execution.summonMinion(socket, cardtoplay, position);

          break;

        case "SPELL":

          gamevars.triggers.emit('doTrigger', constants.triggers.onplay, game, cardtoplay, null);
          break;


        case "WEAPON":
          // equip weapon
          // delete old weapon if one exists
          if(player.weapon != null)
          {
            socket.emit("terminal", player.weapon.name + " was destroyed!");
            player.weapon = null;
          }

          // equip weapon
          player.weapon = cardtoplay;

          // add damage to player
          player.attack = cardtoplay.attack;

          gamevars.triggers.emit('doTrigger', constants.triggers.onplay, game, cardtoplay, null);

          break;
      }


      // do card actions (either spell cast or battlecry)
      if(typeof ca[cardtoplay.id] === 'function')
        ca[cardtoplay.id](socket, cardinhand, targetcard, parts);
      else
        console.log("Card " + cardtoplay.id + " didn't have lookup action to play");

      // deduct mana
      player.mana -= cardinhand.cost;

      // do other card actions
      // this has been moved above
      //gamevars.triggers.emit('doTrigger', constants.triggers.onplay, game, cardtoplay, null);



      game.defaultPrompt(socket);

  },

  // hero power
  // similar to play a spell
  hero: function(socket, parts)
  {
       
    var o = helpers.getGameObjectsBySocket(socket);

    // can only play a card on turn
    if(!o.game.isPlayerTurn(socket))
    {
      socket.emit("terminal", "It is not your turn\n");
      return;
    }

    // load power
    var power = o.players.self.heropower;

    if(!power.ready)
    {
      socket.emit("terminal", "You can't do that now!\n"); // this could be better
      return;
    }

    // optional target
    var target = parts[0];

    // is a target needed though?
    if(power.targetrequired && target == null)
    {
      socket.emit('terminal', power.name + " needs a target! Try: help hero\n");
      return;
    }

    // Mana check
    if(o.players.self.mana < power.cost)
    {
      socket.emit('terminal', "You don't have enough mana!\n");
      return;
    }

    // check target validity and assign targetcard
    var targetcard = null;
    if(target != null)
      {
        if(helpers.targetIsOpponent(target))
          targetcard = constants.opponenttarget;
        else if(helpers.targetIsSelf(target))
          targetcard = constants.selftarget;
        else
        {
          var targettype = target.toLowerCase().charAt(0);
          if(targettype == 'o' || targettype == 'm')
            targetcard = helpers.boardIndexToCard(target, socket);
        }

        if(targetcard == null)
        {
          socket.emit("terminal", "Invalid target");
          return;
        }
      } 

    // deduct mana
    o.players.self.mana -= power.cost;

    // turn off hero power
    power.ready = false;

    // cast hero power
    power.cast(socket, targetcard);

    o.game.updatePromptsWithDefault();

  },

  // do an emote
  emote: function(socket, parts)
  {
    var emote = parts.join("_").toLowerCase();

    var emotes = ["thanks", "well_played", "greetings", "wow", "oops", "threaten"];

    if(!emotes.includes(emote))
    {
      socket.emit('terminal', "Invalid emote!");
      socket.emit('terminal', 'Valid emotes: ' + emotes.join(', ').replace('_', ' ') + "\n");
      return;
    }

    var o = helpers.getGameObjectsBySocket(socket);

    if(new Date().getTime() - o.players.self.lastemote < 5000)
    {
      socket.emit('terminal', 'You can only emote once every 5 seconds\n');
      return;
    }

    o.game.io.to(o.game.name).emit('terminal', display.say(o.players.self.character, o.players.self.emotes[emote]));

    o.players.self.lastemote = new Date().getTime();
  },


  // attack a minion or hero into another minion or hero
  // play source destination
  attack: function(socket, parts)
  {


    var isource = parts[0];
    var idestination = parts[1]

    var isSelfAttacking = false;
    var targetEnemyHero = false;

    var sourceCard = null;
    var destinationCard = null;

    var agame = helpers.getGameBySocket(socket);

    var self = helpers.getPlayerBySocket(socket, false);
    var opponent = helpers.getPlayerBySocket(socket, true);

    var opponentsocket = helpers.getOppositePlayerSocket(socket);

    // can only play a card on turn
    if(!agame.isPlayerTurn(socket))
    {
      socket.emit("terminal", "It is not your turn\n");
      return;
    }

    if(isource == null || idestination == null)
    {
      socket.emit('terminal', 'attack <source> <target>\nTry: help attack\n');
      return;
    }

    if(helpers.targetIsOpponent(idestination))
      targetEnemyHero = true;
    else
      destinationCard = helpers.boardIndexToCard(idestination, socket);

    if(helpers.targetIsSelf(isource))
      isSelfAttacking = true;
    else
      sourceCard = helpers.boardIndexToCard(isource, socket);

    // bad inputs
    if((sourceCard == null && !isSelfAttacking) || (destinationCard == null && !targetEnemyHero))
    {
      socket.emit('terminal', 'attack <source> <target>\nTry: help attack\n');
      return;
    }

    // can the card attack?
    if( !isSelfAttacking && ((typeof sourceCard["canattack"] != 'undefined' && !sourceCard["canattack"]) || typeof sourceCard["canattack"] == 'undefined'))
    {
      socket.emit('terminal', 'Give that minion a turn to get ready!\n');
      return;
    }
    else if(isSelfAttacking && self.attack <= 0)
    {
      // this message sucks
      socket.emit('terminal', 'Characters without attack cannot attack\n');
      return;
    }
    else if(isSelfAttacking && !self.canattack)
    {
      socket.emit('terminal', 'You can\'t attack right now!\n');
      return;  
    }

    // does the card have at least 1 attack?
    if(!isSelfAttacking && sourceCard["attack"] <= 0)
    {
      socket.emit('terminal', 'Minions without attack damage, can\'t attack!\n');
      return;
    }


    var opponentBoard = helpers.getBoardBySocket(socket, true);

    // is there a taunt minion in the way?
    // test if minion is taunt, then it doesn't matter, can always be attacked
    if( !targetEnemyHero && helpers.cardHasMechanic(destinationCard, 'TAUNT'))
    {
      // todo target is valid, maybe nothing right now?
    }
    else
    {
      for(opcardindex in opponentBoard)
      {
        var opcard = opponentBoard[opcardindex];

        if(typeof opcard['mechanics'] != 'undefined' && opcard['mechanics'].indexOf('TAUNT') > -1)
        {
          socket.emit('terminal', 'There is a taunt minion in the way!\n');
          return;
        }
      }

    }

    // is the target stealth?
    if(!targetEnemyHero)
    {
       if(helpers.cardHasMechanic(destinationCard, 'STEALTH'))
       {
          socket.emit('terminal', 'That minion has stealth and can\'t be directly attacked!\n');
          return;
       }
    }

    // do the actual attack
    console.log(agame.name + " attacking " + parts[0] + " to " + parts[1]);

    // unready the card
    if(!isSelfAttacking)
      sourceCard["canattack"] = false;
    else
      self.canattack = false;

    // do sound effect
    if(!isSelfAttacking)
      if(typeof sourceCard["quote"] != 'undefined' && typeof sourceCard["quote"]["attack"] != 'undefined')
        socket.emit('terminal', "[[;#FFBDC0;]&lt;" + sourceCard["name"] + '&gt; ' + sourceCard["quote"]["attack"] + ']\n');

    else
    {
      //@todo: do per-character attack sound
    }

    // do trigger
    // @todo: @critical: this is going to bug on effects when attacking hero
    if(!isSelfAttacking)
      gamevars.triggers.emit('doTrigger', constants.triggers.onattack, agame, sourceCard, destinationCard);
    else
    {
      if(self.weapon != null)
          gamevars.triggers.emit('doTrigger', constants.triggers.onattack, agame, self.weapon, destinationCard);

    }


    if(targetEnemyHero)
    {
      var enemyplayer = helpers.getPlayerBySocket(socket, true);

      if(!isSelfAttacking)
      {
        socket.emit('terminal', '[[' + constants.formatcolor.attack + ']' + sourceCard['name'] +' attacks enemy ' + opponent.character + ' for ' + sourceCard['attack'] + ' damage.]\n');
        opponentsocket.emit('terminal', '[[' + constants.formatcolor.attack + ']' + sourceCard['name'] + ' attacks YOU for ' + sourceCard['attack'] + ' damage.]\n');

        //agame.io.to(agame.name).emit('terminal', sourceCard['name'] + " attacks hero for " + sourceCard['attack'] + " damage.\n");
        engineering.damagePlayer(agame, enemyplayer, sourceCard['attack']);
      }
      else
      {
        socket.emit('terminal', '[[' + constants.formatcolor.attack + ']You attack enemy ' + opponent.character + ' for ' + sourceCard['attack'] + ' damage.]\n');
        opponentsocket.emit('terminal', '[[' + constants.formatcolor.attack + ']Enemy ' + self.character + ' attacks YOU for ' + sourceCard['attack'] + ' damage.]\n');

        //agame.io.to(agame.name).emit('terminal', self.character + " attacks hero for " + self.attack + " damage,\n");
        engineering.damagePlayer(agame, enemyplayer, self.attack);        
      }
    }
    else
    {

      if(!isSelfAttacking)
      {
        agame.io.to(agame.name).emit('terminal', '[[' + constants.formatcolor.attack + ']' + sourceCard['name'] + " attacks " + destinationCard['name'] + " for " + sourceCard['attack'] + " damage and suffers " + destinationCard['attack'] + " damage in return.]\n");

        engineering.damageCard(agame, destinationCard, sourceCard['attack']);
        engineering.damageCard(agame, sourceCard, destinationCard['attack']);
      }
      else
      {
        socket.emit('terminal', '[[' + constants.formatcolor.attack + ']You attack ' + destinationCard['name'] + " for " + self.attack + " damage and suffer " + destinationCard['attack'] + " damage in return.]\n");
        opponentsocket.emit('terminal', '[[' + constants.formatcolor.attack + ']Enemy ' + self.character + ' attacks ' + destinationCard['name'] + " for " + self.attack + " damage and suffers " + destinationCard['attack'] + " damage in return.]\n");

        engineering.damageCard(agame, destinationCard, self.attack);
        engineering.damagePlayer(agame, self, destinationCard['attack']);
      }


    }

    // do weapon durability
    if(isSelfAttacking && self.weapon != null)
    {
      self.weapon.durability--;

      if(self.weapon.durability <= 0)
      {
        agame.io.to(agame.name).emit('terminal', self.weapon.name + ' has run out of durability and is destroyed!');

        self.attack -= self.weapon.attack;
        self.weapon = null;
      }
    }

    // update prompts
    agame.updatePromptsWithDefault();

  },

  // help <commandname>
  help: function(socket, parts)
  {
    if(parts.length == 0)
    {
      // list available commands
      var returnval = '\nAvailable commands: \n\n';
      returnval += '[[b;white;]hand] [detail] - look at your hand, and optionally with additional detail\n'
      returnval += '[[b;white;]board] - look at the board and your hand\n'
      returnval += '[[b;white;]end] - finish your turn\n';
      returnval += '[[b;white;]look] (any card) - look at a card in detail\n'
      returnval += '[[b;white;]play] (card in hand) [target] - play a card from your hand\n';
      returnval += '[[b;white;]attack] (your card on board) (enemy card on board) - attack with a minion on the board\n';
      returnval += '[[b;white;]hero] [target] - use your hero power\n';
      returnval += '[[b;white;]emote] [emote] - send a message to your opponent\n';

      socket.emit('terminal', returnval);

    }
    else
    {
      switch(parts[0])
      {
        case 'meow':
          socket.emit('terminal', parts[0] + ': meow meow\n');
          break;


        default:
          socket.emit('terminal', parts[0] + ' is not a command, try \'help\'\n');
          socket.emit('terminal', '(help is not fully implemented)\n');
          break;
      }


    }

  },

  // some debug commands
  // not much error checking here
  debug: function(socket, parts)
  {
      var game = helpers.getGameBySocket(socket);
      var player = helpers.getPlayerBySocket(socket, false);
      var oppositeplayer = helpers.getPlayerBySocket(socket, true);

      var subcommand = parts[0];

      if(subcommand == "mana")
      {
        player.mana = parts[1];
        socket.emit('terminal', '[[i;#D2B4DE;](debug) set mana to ' + parts[1] + "]\n");
        game.defaultPrompt(socket);
      }

      if(subcommand == "give")
      {
        var card = helpers.getCardById(parts[1]);
        if(card != null)
        {
          card.ownernumber = helpers.getPlayerBySocket(socket, false).number;
          socket.emit('terminal', '[[i;#D2B4DE;](debug) card '+ card["name"] +' added to hand]\n');
          helpers.getHandBySocket(socket).push(card);
          socket.emit('terminal', display.printDetailedCard(card, player.spellpower));
        }
        else
          socket.emit('terminal', '[[i;#D2B4DE;](debug) card id not found]\n');
      }

      if(subcommand == "stoptimer")
      {
        socket.emit('terminal', '[[i;#D2B4DE;](debug) Game timer stopped]\n');
        execution.deactivateTurnTimer(game);
      }

      if(subcommand == "starttimer")
      {
        socket.emit('terminal', '[[i;#D2B4DE;](debug) Game timer started]\n');
        execution.activateTurnTimer(game);
      }

      if(subcommand == "draw")
      {
        socket.emit('terminal', '[[i;#D2B4DE;](debug) Drawing card]\n');
        execution.drawCard(socket);
      }

      if(subcommand == "fatigue")
      {
        socket.emit('terminal', '[[i;#D2B4DE;](debug) Dumping deck...]\n');
        var deck = helpers.getDeckBySocket(socket, false);
        deck.splice(0, deck.length);
      }

      if(subcommand == "testboard")
      {
        display.printBoard(socket);
      }

      if(subcommand == "spellpower")
      {
        if(parts[1] != null)
        {
          player.spellpower = parts[1];
          socket.emit('terminal', '[[i;#D2B4DE;](debug) Spellpower set to ' + parts[1] + ']\n');
        }
        else
          socket.emit('terminal', '[[i;#D2B4DE;](debug) Spellpower: ' + player.spellpower + ']\n');
      }

  }


}