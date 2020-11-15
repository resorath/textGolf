// Game instance
module.exports = {

  Game: function(name) {

    // name of the game and room
    this.name = name;

    // whos turn it is
    this.playerTurn = 0;

    // and whos its not...
    this.playerTurnOpposite = function() { return (this.playerTurn == 1 ? 2 : 1) };

    // the IO object attached to this game
    this.io = null;

    // what round it is
    this.round = 0;

    // each player's hand
    this.hand = {
      p1: [],
      p2: []
    };

    // each player's side of the board
    this.board = {
      p1: [],
      p2: []
    };

    // each player's deck
    this.deck =  {
      p1: [],
      p2: []
    };

    // each player's graveyard
    this.graveyard = {
      p1: [],
      p2: [],
    }

    // the player's actual characters
    this.players = [];

    // an array of card callbacks to be run when a card is played, attacks, or dies
    // header: callbackfunction(socket, card, action)
    // action is PLAY, DIES, ATTACKS
    this.cardcallbacks = [];

    // mulligan storage
    this.mulligan = {
      1: [],
      2: []
    }


    // turn timer
    // 75 second turn, rope at 20 seconds
    this.turntimer = 55; 
    this.turntimerrope = 20;

    // timeout function holder
    this.turntimercallback = null;

    this.getSocketByPlayerNumber = function (num)
    {
      return players[num].socket;
    }

    this.everyoneConnected = function()
    {
      return (this.p1socket != null && this.p2socket != null);
    }

    this.updatePromptsWithDefault = function()
    {
      this.defaultPrompt(this.p1socket);
      this.defaultPrompt(this.p2socket);
    }

    this.defaultPrompt = function (socket)
    {
      var player = this.getPlayer(socket, false);

      var prompt = player.character + " " + player.health + " HP ";

      if(player.armor > 0)
        prompt += "[" + player.armor + " armor]"

      prompt += " | " + player.mana + " Mana ";

      if(player.attack > 0)
        prompt += "| " + player.attack + " Attack ";

      if(player.status.length > 0)
      {
        for(aff in player.status)
        {
          prompt += " " + player.status[aff].name + " ";
        }
      }

      if(player.number == this.playerTurn)
        prompt += " [[;aquamarine;]YOUR TURN]> ";
      else
        prompt += " ENEMY TURN> ";

      socket.emit('control', {"command": "prompt", "prompt": prompt});
    }

    this.isPlayerTurn = function (socket)
    {
      return (socket.player == this.playerTurn)
    }

    this.currentPlayer = function()
    {
      if(this.playerTurn == 1)
        return this.player.p1;
      else
        return this.player.p2;
    }

    this.oppositePlayer = function()
    {
      if(this.playerTurn == 1)
        return this.player.p2;
      else
        return this.player.p1;
    }


  },


  Player: function(number)
  {
    this.number = number;
    this.socket = null;

  }

};