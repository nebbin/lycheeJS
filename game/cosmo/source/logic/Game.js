
lychee.define('game.logic.Game').requires([
	'game.entity.Background',
	'game.entity.Shield',
	'game.logic.Level',
	'lychee.game.Layer'
]).includes([
	'lychee.event.Emitter'
]).exports(function(lychee, game, global, attachments) {

	var _config = attachments["json"];


	var _background = game.entity.Background;
	var _blackhole  = game.entity.Blackhole;
	var _enemy      = game.entity.Enemy;
	var _lazer      = game.entity.Lazer;
	var _meteor     = game.entity.Meteor;
	var _shield     = game.entity.Shield;
	var _ship       = game.entity.Ship;



	/*
	 * HELPERS
	 */

	var _get_ship_level = function(points, downgrade) {

		downgrade = downgrade === true;


		var shiplevel = 0;

		for (var lvlid in _config.upgrade) {

			var lvl = parseInt(lvlid, 10);
			var min = _config.upgrade[lvl];

			if (points > min) {
				shiplevel = lvl;
			}

		}


		if (downgrade === true) {

			shiplevel = -1;


			for (var lvlid in _config.downgrade) {

				var lvl = parseInt(lvlid, 10);
				var min = _config.downgrade[lvlid].min;
				var max = _config.downgrade[lvlid].max;

				if (points > min && points < max) {
					shiplevel = lvl;
				}

			}

		}


		return shiplevel;

	};

	var _process_update = function(data, downgrade) {

		downgrade = downgrade === true;


		var ship     = this.__level.getShip();
		var oldstate = ship.state;

		var oldlvl = 0;
		if (oldstate !== 'default') {
			oldlvl = parseInt(oldstate.substr(-1), 10);
		}

		var newlvl = _get_ship_level(data.points, downgrade);


		if (
			   oldlvl !== newlvl
			&& newlvl !== -1
		) {

			if (newlvl > oldlvl) {
				ship.setState('upgrade'   + newlvl);
				data.health = 100;
			} else if (newlvl < oldlvl) {
				ship.setState('downgrade' + oldlvl);
			}


			if (this.game.settings.sound === true) {
				this.jukebox.play('ship-transformation');
			}


			this.loop.timeout(1000, function() {

				var state = ship.state;
				if (state.substr(0, 7) === 'upgrade') {

					var lvl = parseInt(state.substr(-1), 10);
					ship.setState('level' + lvl);

				} else if (state.substr(0, 9) === 'downgrade') {

					var lvl = parseInt(state.substr(-1), 10);
					if (!isNaN(lvl)) {

						lvl--;

						if (lvl > 0) {
							ship.setState('level' + lvl);
						} else {
							ship.setState('default');
						}

					}

				}

			}, this);

		}


		this.trigger('update', [ data ]);

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function(game) {

		this.game     = game;
		this.jukebox  = game.jukebox;
		this.loop     = game.loop;
		this.renderer = game.renderer;

		this.__clock        = null;
		this.__scrollOffset = 0;

		this.__background   = null;
		this.__level        = null;
		this.__width        = null;
		this.__height       = null;

		this.__shield       = new _shield();
		this.__stage        = null;
		this.__session      = { ship: null, stage: null };
		this.__isRunning    = false;

		lychee.event.Emitter.call(this);

	};


	Class.prototype = {

		/*
		 * PRIVATE API
		 */

		__processSuccess: function(data) {
			this.__isRunning = false;
			this.trigger('success', [ data ]);
		},

		__processFailure: function(data) {
			this.__isRunning = false;
			this.trigger('failure', [ data ]);
		},



		/*
		 * LOGIC INTERACTION
		 */

		spawn: function(construct, posarray, velarray, owner) {

			posarray = posarray instanceof Array ? posarray : null;
			velarray = velarray instanceof Array ? velarray : null;
			owner    = owner !== undefined       ? owner    : null;


			if (
				   posarray !== null
				&& velarray !== null
				&& posarray.length === velarray.length
			) {

				if (construct === _lazer) {

					if (this.game.settings.sound === true) {
						this.jukebox.play('ship-lazer');
					}


					var data = this.__level.data;
					for (var a = 0, al = posarray.length; a < al; a++) {
						data.points -= 10;
					}


					_process_update.call(this, data, true);

				}


				for (var a = 0, al = posarray.length; a < al; a++) {

					var pos = posarray[a];
					var vel = velarray[a];


					this.__level.spawn(
						construct,
						pos.x,
						pos.y,
						vel.x,
						vel.y,
						owner
					);

				}

			}

		},



		/*
		 * PUBLIC API
		 */

		enter: function(stage, width, height) {

			if (this.__level !== null) {
				this.__level.unbind('failure');
				this.__level.unbind('success');
				this.__level.unbind('update');
			}

			this.__width  = width;
			this.__height = height;

			this.__level = new game.logic.Level();
			this.__level.bind('failure', this.__processFailure, this);
			this.__level.bind('success', this.__processSuccess, this);
			this.__level.bind('update',  _process_update, this);


			var data = {
				points: null,
				ships:  stage.type === 'multiplayer' ? 2 : 1,
				level:  stage.level
			};


			var newstage = data.level;
			var oldstage = this.__session.stage;
			if (oldstage !== null) {

				var oldstglvl = parseInt(oldstage.substr(-1), 10);
				var newstglvl = parseInt(newstage.substr(-1), 10);

				if (newstglvl > oldstglvl) {
					data.ships  = this.__session.ships;
					data.points = this.__session.points;
				}

			}

			this.__level.reset(data, width, height);
			this.__stage = newstage;


			this.__background = new _background({
				width:  width,
				height: height
			});


			_process_update.call(this, this.__level.data, true);

			this.__isRunning = true;

		},

		leave: function() {

			this.__session.ship   = this.__level.getShip();
			this.__session.stage  = this.__stage;
			this.__session.points = this.__level.data.points;

		},

		update: function(clock, delta) {

			var level = this.__level;
			if (level === null) return;

			var ship  = level.getShip();
			var minX = -1/2 * this.__width;
			var maxX =  1/2 * this.__width;
			var minY = -1/2 * this.__height;
			var maxY =  1/2 * this.__height;

			var f      = (delta / 1000);
			var speedx = ship.speedx;
			var speedy = ship.speedy;


			var entities = level.entities;
			var el       = entities.length;
			for (var e1 = 0; e1 < el; e1++) {

				var entity   = entities[e1];
				var position = entity.position;
				var velocity = entity.velocity;

				var isblackhole = entity instanceof _blackhole;
				var isenemy     = entity instanceof _enemy;
				var islazer     = entity instanceof _lazer;
				var ismeteor    = entity instanceof _meteor;
				var isship      = entity === ship;


				entity.update(clock, delta);


				// Shift all Meteors and Enemies around
				if (
					   isblackhole === true
					|| isenemy === true
					|| ismeteor === true
				) {
					position.y += f * speedy;
				}



				if (isship === true) {

					var ehw = entity.width / 2;
					var minStageX = Math.floor(-1/2 * level.width);
					var maxStageX = Math.round( 1/2 * level.width);


					if (position.x < minStageX) {
						entity.setSpeedX(0);
						position.x = minStageX;
						velocity.x = 0;
					}

					if (position.x > maxStageX) {
						entity.setSpeedX(0);
						position.x = maxStageX;
						velocity.x = 0;
					}


					var oldel = el;

					for (var e2 = 0; e2 < el; e2++) {

						var oentity = entities[e2];

						var oismeteor = oentity instanceof _meteor;
						if (oismeteor === true) {

							if (entity.collidesWith(oentity) === true) {
								el += level.collide(oentity, entity);
							}

						}

					}


					if (
						el < oldel
						&& this.game.settings.sound === true
					) {
						this.__shield.setState('flicker');
						this.jukebox.play('ship-shield');
					}

				} else if (islazer === true) {

					if (
						   position.y < minY
						|| position.y > maxY
					) {

						level.destroy(entity, false);
						el--;
						continue;

					}

					if (position.x < minX) position.x = maxX;
					if (position.x > maxX) position.x = minX;


					var owner = entity.owner;
					var oldel = el;
					var hits  = 0;

					for (var e2 = 0; e2 < el; e2++) {

						var oentity = entities[e2];
						if (oentity === owner) continue;


						var oisenemy  = oentity instanceof _enemy;
						var oismeteor = oentity instanceof _meteor;
						var oisship   = oentity instanceof _ship;
						if (
							   oisenemy === true
							|| oismeteor === true
						) {

							if (entity.collidesWith(oentity) === true) {
								el += level.collide(entity, oentity);
							}

						} else if (oisship === true) {

							if (entity.collidesWith(oentity) === true) {
								el += level.collide(entity, oentity);
								hits++;
							}

						}

					}


					if (
						el < oldel - 1
						&& this.game.settings.sound === true
					) {
						this.jukebox.play('explosion');
					}


					if (
						hits > 0
						&& this.game.settings.sound === true
					) {
						this.__shield.setState('flicker');
						this.jukebox.play('ship-shield');
					}

				}


				if (
					   isblackhole === true
					|| isenemy === true
					|| ismeteor === true
				) {

					if (position.y > maxY) {
						level.destroy(entity, false);
						el--;
						continue;
					}


					var ehw = entity.width / 2;

					if (position.x < minX + ehw) {
						position.x = minX + ehw;
						velocity.x = -1 * velocity.x;
					}

					if (position.x > maxX - ehw) {
						position.x = maxX - ehw;
						velocity.x = -1 * velocity.x;
					}

				}



				if (isblackhole === true) {

					var radius = entity.radius;

					for (var e2 = 0; e2 < el; e2++) {

						var oentity  = entities[e2];
						var oisship  = oentity instanceof _ship;
						var oislazer = oentity instanceof _lazer;
						if (oisship === true || oislazer === true) {

							var oposition = oentity.position;
							var ovelocity = oentity.velocity;

							var distx    = (position.x - oposition.x);
							var disty    = (position.y - oposition.y);
							var gravityx = 0;
							var gravityy = 0;

							var inxrange  = distx > -1 * radius && distx < radius;
							var inyrange  = disty > -1 * radius && disty < radius;
							var iny2range = disty > -2 * radius && disty < 2 * radius;

							if (
								oisship === true
								&& inxrange === true
								&& inyrange === true
							) {

								gravityx = distx / radius;
								if (gravityx > 0) {
									gravityx =  1 - gravityx;
								} else {
									gravityx = -1 - gravityx;
								}

								ovelocity.x += gravityx * radius;

							} else if (
								oislazer === true
								&& iny2range === true
							) {

								gravityx = (distx / this.__width);
								if (gravityx > 0) {
									gravityx =  1 - gravityx;
								} else {
									gravityx = -1 - gravityx;
								}

								ovelocity.x += gravityx * 100;

							}

						}

					}

				}



				if (isenemy === true) {

					var fire = entity.fireclock < clock;

					if (
						fire === true
						&& position.y > minY
						&& position.y < maxY
					) {

						level.spawn(
							_lazer,
							position.x,
							position.y,
							  0,
							200,
							entity
						);


						entity.fireclock = clock + 2500;

					}

				}

			}


			var background = this.__background;
			if (background !== null) {

				var origin = background.origin;

				background.setOrigin({
					x: origin.x - f * speedx,
					y: origin.y + f * speedy
				});

			}


			var shield = this.__shield;
			if (shield !== null) {
				shield.update(clock, delta);
			}


			this.__scrollOffset += f * speedy;
			this.__clock = clock;

		},

		render: function(clock, delta) {

			var renderer = this.renderer;
			var level    = this.__level;
			if (
				renderer !== null
				&& level !== null
			) {

				var offsetX = this.__width / 2;
				var offsetY = this.__height / 2;


				var background = this.__background;
				if (background !== null) {

					background.render(
						renderer,
						offsetX,
						offsetY
					);

				}


				var entities = level.entities;
				var ship     = level.getShip();
				var shield   = this.__shield;

				for (var e = 0, el = entities.length; e < el; e++) {

					var entity = entities[e];

					// This will avoid lazers above ship
					if (entity === ship) continue;

					entity.render(
						renderer,
						offsetX,
						offsetY
					);

				}

				if (ship !== null) {

					ship.render(
						renderer,
						offsetX,
						offsetY
					);

				}

				if (shield !== null) {

					shield.render(
						renderer,
						offsetX + ship.position.x,
						offsetY + ship.position.y
					);

				}

			}

		},

		getShip: function() {

			if (this.__level !== null) {
				return this.__level.getShip();
			}


			return null;

		}

	};


	return Class;

});

