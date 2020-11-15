module.exports = {

	Buff: function(name)
	{
		this.name = name;

		this.changehealth = 0;
		this.changeattack = 0;
		this.changemana = 0;
		this.text = "";

		this.sourcecard = null;

		this.isaura = false;

		this.callbacks = {

			onplay: null, // a card is played
			onattack: null,	// a minion or hero attacks
			onstartturn: null, // a turn is started
			onendturn: null, // a turn ends
			onherodamaged: null, // a hero takes damage
			onminiondamaged: null, // a minion takes damage
			onheal: null, // something is healed
			ondeath: null // something dies

		}

	}

}