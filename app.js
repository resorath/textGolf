"use strict";
/** 
 * Hearthstone Text Edition (Textstone)
 * Author: Sean Feil (https://www.github.com/resorath/hstxt)
 */

console.log("Loading modules...");

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var components = require('./modules/Game');
var helpers = require('./modules/helpers');
var execution = require('./modules/execution');
var cfunc = require('./modules/commands');
var display = require('./modules/display');
var util = require('./modules/util');
var interrupts = require('./modules/interrupts');
var heroes = require('./modules/Heroes');
var gamevars = require('./modules/gamevars');
var EventEmitter = require('events');
const Game = require('./modules/Game');

var githead = null;
var serverVersion = null;
try {
  require('child_process').execSync('git rev-parse HEAD');
  serverVersion = "dev-" + githead.slice(-8);
}
catch(err)
{ 
  serverVersion = "azure-dev";
} 

console.log("Starting web server..."); 

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/keyboard-event-polyfill.js', function(req, res) {
  res.sendFile(__dirname + '/keyboard-event-polyfill.js');
});

app.get('/games', function(req, res) {
  res.jsonp(JSON.stringify({ count: gamevars.games.length }));
});

var port = process.env.PORT || 8000;

console.log("Loading data...");

// load cards and decks
/*gamevars.cards = JSON.parse(fs.readFileSync("cards.json"));
gamevars.decks = JSON.parse(fs.readFileSync("decks.json"));
gamevars.emotes = JSON.parse(fs.readFileSync("emotes.json"));*/

// master games list.
gamevars.games = [];

console.log("Reticulating splines...");

// setup triggers class
class Trigger extends EventEmitter {}

gamevars.triggers = new Trigger();

gamevars.heroes = heroes;


// matchmaking sockets
var matchmakingqueue = [];

http.listen(port, function(){
  console.log('listening on *:' + port);
});

console.log("Textstone server ready!");

// end testing


/*process.stdin.resume();

function exitHandler(options, err) {
  io.sockets.emit('terminal', '\n[[bu;red;]server going down...]\n');

  if (options.cleanup) console.log('clean');
  if (err)console.log(err.stack);
  if (options.exit) process.exit();}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
*/
// on a connection
io.on('connection', function(socket){

  console.log('a user connected ' + socket.id);

  // Disconnected user, remove them from the game
  socket.on('disconnect', function(){
    console.log('a user disconnected ' + socket.id);

    var playernum = helpers.getPlayerNumberBySocket(socket);

    if(playernum != null)
    {
      var agame = helpers.getGameBySocket(socket);

      if(agame != null)
      {

        if(playernum == 1)
        {
          console.log("Removing player 1 from " + agame.name + " due to disconnect");
          agame.p1socket = null;
        }
        else if(playernum == 2)
        {
          console.log("Removing player 2 from " + agame.name + " due to disconnect");
          agame.p2socket = null;
        }

        io.to(agame.name).emit('control', { command: "opponentleft" });

        if(agame.p1socket == null && agame.p2socket == null)
        {
          console.log("Removing game " + agame.name + " because it is out of players");
          execution.quitGame(agame);

          /*util.filterInPlace(gamevars.games, function (el) {
            return el.name != agame.name;
          });*/

        }

        // can't resume a game if it hasn't started, so kill the game.
        if(agame.round == 0)
        {
          console.log("Removing game " + agame.name + " because a player left before it started");
          io.to(agame.name).emit("terminal", "The game cannot continue because your opponent left before the game started! Retry making the game...\n");

          execution.quitGame(agame);
          /*io.to(agame.name).emit("control", {command: "endgame"} );

          util.filterInPlace(gamevars.games, function (el) {
            return el.name != agame.name;
          });*/

        }
      }

    };


  });

  socket.on('command', function(msg){

    var agame = helpers.getGameBySocket(socket);
    if(agame == null)
      return;

    if(!agame.everyoneConnected())
      return;

    console.log(agame.name + "-" + socket.player + ": " + msg);
    
    parseCommand(msg, socket);

  });

  // join a room
  socket.on('join', function(roomname) {
    joinRoom(socket, roomname, false);
  });

  socket.on('control', function(msg) {

    if(msg == "ready")
    {
      socket.emit('terminal', 'Server version ' + serverVersion + '\n');

      // http://us.blizzard.com/en-us/company/about/legal-faq.html
      // http://us.blizzard.com/en-us/company/about/copyrightnotices.html
      socket.emit('terminal', 'TextStone uses characters and game concepts from HearthStone: Heroes of Warcraft by Blizzard Entertainment, but is otherwise unaffiliated to Blizzard Entertainment.\n&copy;2014 Blizzard Entertainment, Inc. All rights reserved. Heroes of Warcraft is a trademark, and Hearthstone is a registered trademark of Blizzard Entertainment, Inc. in the U.S. and/or other countries.\n');
    }

    if(msg == "showsetup")
    {
      socket.emit('terminal', 'To start a new game, enter a unique game name or leave blank and press enter for matchmaking.\nTo join a friend\'s game, enter their game name.\nTo rejoin a game you disconnected from, enter the game name you left.\n');
    
      socket.emit('control', { command: 'prompt', prompt: 'Game name> '})
    }


  });


});

function joinRoom(socket, roomname, ismatchmaking)
{
      // check if room already exists:
  var found = false;
  var existinggame = null;
  var matchmakinggame = false;

  // check if the game name is empty, indicating matchmaking
  if(roomname == "")
  {
    // tell the user matchmaking is starting
    socket.emit('terminal', 'Joined matchmaking queue... waiting for an opponent...');

    // send the socket to the matchmaking queue and wait ...
    gamevars.triggers.emit('matchmaking', socket);
    
    return;
    
  }

  for(game in gamevars.games)
  {
    var agame = gamevars.games[game];
    if(agame.name == roomname)
    {
      if(agame.players.length < 4)  // Max 4 players
      {
        var playernumber = agame.players.length + 1;

        var newplayer = new Game.Player(playernumber);
        
        newplayer.socket = socket;
        agame.players.push(newplayer);

        socket.player = playernumber;
        socket.game = agame.name;

        socket.join(roomname);

        if(ismatchmaking)
        {
          socket.emit('terminal', 'Opponent found! Joining game');
          socket.emit('terminal', 'You can resume your game by using game name: ' + roomname);
        }
        else
          socket.emit('terminal', 'Game joined! Your opponent is already here...');

        socket.emit('control', { command: "assignplayer", player: playernumber });

        console.log("Joining " + socket.id + " to existing game (" + roomname + ") as player 1");

        found = true;
        existinggame = agame;

        break;
      }
      else
      {
        console.log("Game " + roomname + " join failed, is full from " + socket.id);
        socket.emit('control', { command: "roomfull" });
        return;
      }
    }

  }

  // no existing room
  if(!found)
  {
    console.log("Joining " + socket.id + " to new game (" + roomname + ") as player 1");
    socket.join(roomname);

    

    var newgame = new components.Game(roomname);
    newgame.io = io;

    var newplayer = new Game.Player(1);
    newplayer.socket = socket;
    newgame.players.push(newplayer);

    newgame.isNewGame = true;
    newgame.name = roomname;

    socket.player = 1;
    socket.game = newgame.name;

    gamevars.games.push(newgame);

    if(ismatchmaking)
    {
      socket.emit('terminal', 'Opponent found! Joining game');
      socket.emit('terminal', 'You can resume your game by using game name: ' + roomname);
    }
    else
      socket.emit('terminal', 'Game joined! Waiting for an opponent...\nHint: Tell a friend to join the game using the same game name (' +  roomname + ')!');
    
    socket.emit('control', { command: "assignplayer", player: 1 });
  }
  else
  {
    // a game is already in progress, rejoin
    if(existinggame.round > 0)
    {
      console.log("Resuming existing game " + existinggame.round);
      existinggame.defaultPrompt(socket);
      io.to(roomname).emit('control', { command: "resumegame" });

    }
  }

  var agame = helpers.getGameBySocket(socket);
  if(agame != null && agame.everyoneConnected())
  {

    if(agame.isNewGame)
    {

      // random first player
      agame.playerTurn = (util.Random(agame.players.length) + 1);
      console.log(agame.name + " player " + agame.playerTurn + " goes first!");

      // signal start.
      console.log("Game " + roomname + " ready to start");
      io.to(agame.name).emit('control', { command: "startgame" });

      // both players pick deck
      display.printAvailableDecks(agame.p1socket, gamevars.decks);
      display.printAvailableDecks(agame.p2socket, gamevars.decks);

      io.to(agame.name).emit('control', { command: "prompt", prompt: "Pick a deck> " });

      agame.p1socket.promptCallback = execution.pickDecks;
      agame.p2socket.promptCallback = execution.pickDecks;

      agame.isNewGame = false;

    
    }
    else if(agame != null && !agame.everyoneConnected())
    {
      console.log("Game " + roomname + " resumed due to reconnect");
      io.to(agame.name).emit('control', { command: "resumegame" });
    }


  }
}


// Parse a command sent from a player
function parseCommand(command, socket)
{
  if(!command)
    return null;

  command = command.toLowerCase();

  var game = helpers.getGameBySocket(socket);

  // check if the prompt callback override is set, and execute that instead
  // the callback function must accept the entire command
  if(socket.promptCallback != null)
  {
    console.log("prompt callback set for " + socket.id + " to " + socket.promptCallback.name);
    socket.promptCallback(command, socket);
    return;
  }

  var parts = command.split(" ");
  var root = parts.shift();

  if(typeof cfunc[root] === 'function')
    cfunc[root](socket, parts)
  else
  {
    socket.emit('terminal', 'unknown command: \'' + root + '\' try \'help\'\n');
    console.log("Command " + command + " not recognized by " + socket.game + ":" + socket.player);
  }

  //game.updatePromptsWithDefault();

}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

// trigger must be:
// onplay, onattack, onstartturn, onendturn, onherodamaged, onminiondamaged, onheal, ondeath (deathrattle)
// sourcecard - card initiating trigger
// targetcard - card that may be impacted by trigger (optional)
gamevars.triggers.on('doTrigger', function(trigger, game, sourcecard, targetcard) {

    trigger = trigger.toLowerCase();

    // do secrets (only for the opposite player)
    var secretplayer = game.getPlayer(game.getSocketByPlayerNumber(game.playerTurnOpposite(), false));

    secretplayer.secrets.forEach(function (secret) {
      if(typeof interrupts[secret.id] !== 'undefined' && typeof interrupts[secret.id][trigger] === 'function')
        interrupts[secret.id][trigger](game, secret, sourcecard, targetcard);
    });

    // get boards
    var board = game.getBoard(game.p1socket, false);
    board = board.concat(game.getBoard(game.p2socket, false));

    // go to each card and see if it needs a trigger (including the sourcecard and targetcards. )
    board.forEach(function (card) {
      if(typeof interrupts[card.id] !== 'undefined' && typeof interrupts[card.id][trigger] === 'function')
        interrupts[card.id][trigger](game, card, sourcecard, targetcard);

      // go through any buffs on the card to see if they have their own action
      if(typeof card.buffs !== 'undefined' && typeof card.buffs != null) 
      {
        card.buffs.forEach(function (buff) {
          if(typeof interrupts[buff.id] !== 'undefined' && typeof interrupts[buff.id][trigger] === 'function')
            interrupts[buff.id][trigger](game, buff, sourcecard, targetcard);
        })
      }

    });

    // go through each player status and see if it needs a trigger
    // load statuses with buff effects like freeze
    // example, remove freeze, remove temporary buffs (druids)
    var currentPlayer = game.getPlayer(game.getSocketByPlayerNumber(game.playerTurn, false));
    var oppositePlayer = secretplayer;

    currentPlayer.status.forEach(function (status) {
      if(typeof interrupts[status.id] !== 'undefined' && typeof interrupts[status.id][trigger] === 'function')
        interrupts[status.id][trigger](game, status, currentPlayer);
    });

    oppositePlayer.status.forEach(function (status) {
      if(typeof interrupts[status.id] !== 'undefined' && typeof interrupts[status.id][trigger] === 'function')
        interrupts[status.id][trigger](game, status, oppositePlayer);
    })

    // do global updates (updating spellpower, etc)
    execution.doUpdateTick(game);


});

gamevars.triggers.on('matchmaking', function(socket) {

  if(matchmakingqueue.length <= 0)
  {
    matchmakingqueue.push(socket);

    console.log("Joining socket " + socket.id + " to matchmaking queue because it is empty");

    return;
  }
  else
  {
    // pop the first in queue and join them together ("matchmaking")
    var p1 = matchmakingqueue.pop();

    var p2 = socket;

    // invent a game name
    var gamename = "mm-" + guid();

    console.log("Matchmaking is putting " + p1.id + " and " + socket.id + " into game " + gamename);

    // join both sockets to game
    joinRoom(p1, gamename, true);
    joinRoom(p2, gamename, true);

  }
});


