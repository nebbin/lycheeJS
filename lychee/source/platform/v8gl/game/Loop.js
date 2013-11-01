
lychee.define('lychee.game.Loop').tags({
	platform: 'v8gl'
}).includes([
	'lychee.event.Emitter'
]).supports(function(lychee, global) {

	if (
		   typeof setInterval === 'function'
		&& global.glut !== undefined
		&& typeof global.glut.displayFunc === 'function'
	) {
		return true;
	}

	return false;

}).exports(function(lychee, global) {

	var _instances   = [];
	var _timeout_id  = 0;
	var _interval_id = 0;



	/*
	 * EVENTS
	 */

	var _listeners = {

		display: function() {

			for (var i = 0, l = _instances.length; i < l; i++) {

				var instance = _instances[i];
				var clock    = Date.now() - instance.__clock.start;

				_render_loop.call(instance, clock);

			}

		},

		interval: function() {

			for (var i = 0, l = _instances.length; i < l; i++) {

				var instance = _instances[i];
				var clock    = Date.now() - instance.__clock.start;

				_update_loop.call(instance, clock);

			}


			glut.postRedisplay();

		}

	};



	/*
	 * FEATURE DETECTION
	 */

	(function(global, delta) {

		var glut = global.glut || {};

		var display = typeof glut.displayFunc === 'function';
		if (display === true) {
			glut.displayFunc(_listeners.display);
		}

		var interval = typeof global.setInterval === 'function';
		if (interval === true) {
			global.setInterval(_listeners.interval, delta);
		}


		if (lychee.debug === true) {

			var methods = [];
			if (interval) methods.push('setInterval');
			if (display)  methods.push('glut.displayFunc');

			if (methods.length === 0) methods.push('NONE');

			console.log('lychee.game.Loop: Supported interval methods are ' + methods.join(', '));

		}

	})(global, 1000 / 60);



	/*
	 * HELPERS
	 */

	var _update_loop = function(clock) {

		if (this.__state !== 'running') return;


		var delta = clock - this.__clock.update;
		if (delta >= this.__ms.update) {
			this.trigger('update', [ clock, delta ]);
			this.__clock.update = clock;
		}


		var data;
		for (var iId in this.__intervals) {

			data = this.__intervals[iId];

			// Skip cleared intervals
			if (data === null) continue;

			var curStep = Math.floor((clock - data.start) / data.delta);
			if (curStep > data.step) {
				data.step = curStep;
				data.callback.call(data.scope, clock - data.start, curStep);
			}

		}


		for (var tId in this.__timeouts) {

			data = this.__timeouts[tId];

			// Skip cleared timeouts
			if (data === null) continue;

			if (clock >= data.start) {
				this.__timeouts[tId] = null;
				data.callback.call(data.scope, clock);
			}

		}

	};

	var _render_loop = function(clock) {

		if (this.__state !== 'running') return;


		var delta = clock - this.__clock.render;
		if (delta >= this.__ms.render) {
			this.trigger('render', [ clock, delta ]);
			this.__clock.render = clock;
		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function(data) {

		var settings = lychee.extend({}, data);


		this.__timeouts  = {};
		this.__intervals = {};
		this.__state     = 'running';
		this.__ms        = {
			render: Infinity,
			update: Infinity
		};


		lychee.event.Emitter.call(this);


		var ready = this.reset(settings.render, settings.update);
		if (ready === true) {
			_instances.push(this);
		}

		settings = null;

	};


	Class.prototype = {

		reset: function(render, update) {

			render = typeof render === 'number' ? render : 0;
			update = typeof update === 'number' ? update : 0;


			if (render > 60) render = 60;
			if (update > 60) update = 60;
			if (render < 0)  render = 0;
			if (update < 0)  update = 0;


			if (
				   render === 0
				&& update === 0
			) {

				return false;

			}


			this.__clock = {
				start:  Date.now(),
				update: 0,
				render: 0
			};


			if (render > 0) this.__ms.render = 1000 / update;
			if (update > 0) this.__ms.update = 1000 / update;


			return true;

		},

		start: function() {
			this.__state = 'running';
		},

		stop: function() {
			this.__state = 'stopped';
		},

		timeout: function(delta, callback, scope) {

			delta    = typeof delta === 'number'    ? delta    : null;
			callback = callback instanceof Function ? callback : null;
			scope    = scope !== undefined          ? scope    : global;


			if (delta === null || callback === null) {
				return null;
			}


			var id = _timeout_id++;
			this.__timeouts[id] = {
				start:    this.__clock.update + delta,
				callback: callback,
				scope:    scope
			};


			var that = this;
			return {
				clear: function() {
					that.__timeouts[id] = null;
				}
			};

		},

		interval: function(delta, callback, scope) {

			delta    = typeof delta === 'number'    ? delta    : null;
			callback = callback instanceof Function ? callback : null;
			scope    = scope !== undefined          ? scope    : global;


			if (delta === null || callback === null) {
				return null;
			}


			var id = _interval_id++;
			this.__intervals[id] = {
				start:    this.__clock.update + delta,
				delta:    delta,
				step:     0,
				callback: callback,
				scope:    scope
			};


			var that = this;
			return {
				clear: function() {
					that.__intervals[id] = null;
				}
			};

		}

	};


	return Class;

});

