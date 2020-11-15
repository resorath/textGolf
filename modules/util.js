module.exports = {
	
	/**
	 * Shuffles array in place.
	 * @param {Array} a items The array containing the items.
	 */
	shuffle: function(a) {
	    var j, x, i;
	    for (i = a.length; i; i--) {
	        j = Math.floor(Math.random() * i);
	        x = a[i - 1];
	        a[i - 1] = a[j];
	        a[j] = x;
	    }
	},

	// Zero-based random number
	// e.g. max = 2 is 1 in 2 chance when checking 0. 
	Random: function(max)
	{
	  return Math.floor(Math.random() * max);
	},

	// min - max inclusive
	RandomInt: function (min, max) {
    	return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	filterInPlace: function(a, condition) {
	  var i = 0;
	  var j = 0;

	  while (i < a.length) {
	    const val = a[i];
	    if (condition(val, i, a)) a[j++] = val;
	    i++;
	  }

	  a.length = j;
	  return a;
	},

	doMultipleThingsSlowly: function(callbackThingToDo, delay, amount) {

		var interval = setInterval(callbackThingToDo, delay);

		setTimeout(function() { clearInterval(interval); }, ((delay + 50) * amount ));

	},

	// O(n^2) ... 
	bindQuotes: function(cards, quotes)
	{
		quotes.forEach(function(quote) {
			cards.forEach(function(card) {

				if(card.id === quote.id)
				{
					card['quote'] = quote['quote'];
				}

			});			
		});

	},

	// Removes formatting from strings, useful for seeing the string without codes
	stripColorCoding: function(formattedString) {

		var pattern = /\[\[([!gbiuso]*;[^;\]]*;[^;\]]*(?:;|[^\]()]*);?[^\]]*)\]([^\]]*\\\][^\]]*|[^\]]*|[^[]*\[[^\]]*)\]/gi;
		var match = pattern.exec(formattedString);

		var result = formattedString;
		while(match != null)
		{
			if(match != null)
				result = result.replace(match[0], match[2]);

			match = pattern.exec(formattedString);
		}

		return result;

	}

}