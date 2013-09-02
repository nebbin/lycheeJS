
lychee.define('game.logic.Controller').requires([
	'game.entity.Ship'
]).includes([
	'lychee.event.Emitter'
]).exports(function(lychee, game, global, attachments) {

	var _ship = game.entity.Ship;



	/*
	 * HELPERS
	 */

	var _validate_enum = function(enumobject, value) {

		if (typeof value !== 'number') return false;


		var found = false;

		for (var id in enumobject) {

			if (value === enumobject[id]) {
				found = true;
				break;
			}

		}


		return found;

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function(id, data) {

		var settings = lychee.extend({}, data);


		this.id = id || null;

		this.mode  = Class.MODE.local;
		this.ship  = null;

		this.setMode(settings.mode);
		this.setShip(settings.ship);


		lychee.event.Emitter.call(this);

		settings = null;

	};


	Class.MODE = {
		local:  0,
		online: 1
	};


	Class.prototype = {

		/*
		 * SERVICE INTEGRATION
		 */

		control: function(data) {

			if (data.id === this.id) {

				var position = data.position || null;
				var touch    = data.touch    || null;
				var key      = data.key      || null;

				if (position !== null) this.processPosition(position, true);
				if (key !== null)      this.processKey(key, true);
				if (touch !== null)    this.processTouch(touch, true);

			}

		},



		/*
		 * LOGIC INTEGRATION
		 */

		processKey: function(key, silent) {

			silent = silent === true;


			var processed = false;

			var ship = this.ship;
			if (ship !== null) {

				switch(key) {

					case 'left':  case 'a': ship.left();  processed = true; break;
					case 'down':  case 's': ship.stop();  processed = true; break;
					case 'right': case 'd': ship.right(); processed = true; break;
					case 'up':    case 'w': ship.fire();  processed = true; break;
					case 'space':           ship.fire();  processed = true; break;

				}

			}


			if (
				   silent === false
				&& processed === true
				&& this.mode === Class.MODE.online
			) {

				var data = {
					id:  this.id,
					key: key
				};

				this.trigger('control', [ data ]);

			}

		},

		processPosition: function(position, silent) {

			silent = silent === true;


			var ship = this.ship;
			if (ship !== null) {

				ship.position.x = position.x;
				ship.position.y = position.y;

			}

		},

		processTouch: function(position, silent) {

			silent = silent === true;


			var processed = false;

			var ship = this.ship;
			if (ship !== null) {

				var hwidth  = ship.width / 2;
				var centerx = ship.position.x;

				if (
					   position.x > centerx - hwidth
					&& position.x < centerx + hwidth
				) {

					ship.fire();

				} else {

					if (position.x > centerx) {
						ship.right();
					} else {
						ship.left();
					}

				}

				processed = true;

			}


			if (
				   silent === false
				&& processed === true
				&& this.mode === Class.MODE.online
			) {

				var data = {
					id:    this.id,
					touch: { x: position.x, y: position.y }
				};

				this.trigger('control', [ data ]);

			}

		},



		/*
		 * CUSTOM API
		 */

		setMode: function(mode) {

			if (_validate_enum(Class.MODE, mode) === true) {

				this.mode = mode;

				return true;

			}


			return false;

		},

		setShip: function(ship) {

			if (ship instanceof _ship) {

				this.ship = ship;

				return true;

			}


			return false;

		}

	};


	return Class;

});

