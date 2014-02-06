
lychee.define('game.entity.ui.menu.Title').includes([
	'lychee.ui.Sprite'
]).exports(function(lychee, game, global, attachments) {

	var _config  = {
		width:  512,
		height: 144
	};
	var _texture = attachments["png"];


	var Class = function(settings) {

		if (settings === undefined) {
			settings = {};
		}


		settings.texture = _texture;
		settings.width   = _config.width;
		settings.height  = _config.height;


		lychee.ui.Sprite.call(this, settings);

		settings = null;

	};


	Class.prototype = {

	};


	return Class;

});
