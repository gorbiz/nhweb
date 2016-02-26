var express		= require('express');
var mysql		= require('mysql');
var bodyParser	= require('body-parser');
var session		= require('express-session')
var app			= express();

app.set('view engine', 'jade');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Doubt i need this but whatever...
app.use(session({
	secret: 'plz dont tell',
	resave: true,
    saveUninitialized: true
}));

var conn = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'bajskorv',
	database: 'nhtour'
});

function jade_render(res, target, sess, extra) {
	var p = {
		name: 'THINK OF NAME',
		userid: sess.userid,
		username: sess.username,
		target: target
	};
	for(var k in extra) { p[k] = extra[k]; }
	res.render(target, p);
}

conn.connect();

app.post('/login', function(req, res) {
	conn.query('select id from players where name=? and password_hash=MD5(?)',
		[ req.body.login_user, req.body.login_pass ],
		function(err, rows, fields)
		{
			if(err || 0 == rows.length) {
				req.session.login_error = 'Invalid username or password.'
			} else {
				req.session.userid		= rows[0].id;
				req.session.username	= req.body.login_user;
			}
			res.redirect('/');
		});
});

app.post('/signup', function(req, res) {
	var user	= req.body.signup_user;
	var pass	= req.body.signup_pass;
	var email	= req.body.signup_email;

	if(user.length > 10) {
		req.session.signup_error = 'Your username is too long, stop haxx0rizing.';
		return res.redirect('/');
	} else if(pass.length < 1) {
		req.session.signup_error = 'Your password is too short, stop haxx0rizing.';
		return res.redirect('/');
	}

	conn.query('insert into players values(0, ?, MD5(?), ?, 0, NOW())', [ user, pass, email ],
		function(err, rows, fields) {
			if(null != err) {
				if('ER_DUP_ENTRY' == err['code']) {
					req.session.signup_error = 'The username you wanted is already in use.';
				} else {
					req.session.signup_error = 'Unknown SQL error.';
				}
			} else {
				req.session.userid		= rows.insertId;
				req.session.username	= user;
			}
			res.redirect('/');
		});
});

app.put('/:var(openslot|requestslot)', function(req, res, next) {
	var from = ('openslot' == req.path.substr(1)) ? 'request' : 'open'
	var to = ('open' == from) ? 'request' : 'open'
	if(!req.session.owner) {
		return next('You are not the owner. You haxxin around?');
	}
	conn.query('select id from clan_members where id=? and slot_type=?', [ req.body.slot, from ], function(err, rows) {
		if(err || !rows.length) {
			res.sendStatus(500);
		} else {
			conn.query('update clan_members set slot_type=? where id=?', [ to, rows[0].id ]);
			res.send(to);
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.userid = undefined;
	req.session.username = undefined
	res.redirect('/');
});

app.get('/score', function(req, res) {
	var s = req.session;
	conn.query('select literal, score, repeatable, decrease_rate from objectives', function(err, rows) {
		if(err) {
			jade_render(res, 'oops', s, { oops: 'SQL shat itself <.<' });
		} else {
			var first = 0;
			var second = 0;
			for(i = 0; i < rows.length; ++i) {
				if(1 != rows[i].score) {
					first += rows[i].score;
					second += rows[i].repeatable ? (rows[i].score / rows[i].decrease_rate) : 0;
				}
			}
			jade_render(res, 'score', s, { objectives: rows, score_first: first, score_second: second });
		}
	});
});

app.post('/insertclan', function(req, res, next) {
	var s = req.session;
	var r = req.body;
	var redir = '/'

	console.log(r);

	if(!s.userid) {
		return next('You are not logged in :o');
	} else if(!r.clan_name || (r.clan_name.length > 16) || !r.slot0 || !r.slot1 || !r.slot2 || !r.slot3) {
		return next('You are too much of a l33t h4xx0r <.<');
	}

	conn.beginTransaction(function(err) {
		if(err) {
			return next('SQL failed to begin transaction.');
		}
		conn.query('insert into clans set game_id=0, owner_id=?, name=?, added=NOW()', [ s.userid, r.clan_name ],
			function(err, rows) {
				clan_id = rows.insertId;
				if(err) {
					conn.rollback();
					if('ER_DUP_ENTRY' == err['code']) {
						s.createclan_error = 'A clan with that name already exists.';
					} else {
						return next('SQL exploded under its own weight.');
					}
					res.redirect('/createclan');
				} else {
					var values = [ 
						clan_id, s.userid, 'filled',
						clan_id, r.slot0, 
						clan_id, r.slot1,
						clan_id, r.slot2,
						clan_id, r.slot3
					];
					conn.query('insert into clan_members (clan_id, player_id, slot_type) values' +
						'(?, ?, ?), (?, null, ?), (?, null, ?), (?, null, ?), (?, null, ?)', 
					values,
					function(err) {
						if(err) {
							conn.rollback();
							console.log(err);
							return next('Meh! SQL break-down create player slots.');
						}
						conn.commit(function(err) {
							if(err) {
								conn.rollback();
								return next('SQL failed to commit the transaction. Strange...');
							}
							res.redirect('/');
						});
					});
				}
			});
	});
});

app.get('/*', function (req, res, next) {
	var s = req.session;
	var target = req.path.substr(1);
	if(target) {
		console.log('"' + target + '"');
		jade_render(res, target, s);
	} else {
		var signup_err = s.signup_error;
		var login_err = s.login_error;
		s.signup_error = undefined;
		s.login_error = undefined;

		if(s.userid) {
			conn.query('select clans.id as clan_id, clans.owner_id, clans.game_id, clans.name as clan_name, ' +
				       'clan_members.id as slot_id, clan_members.player_id, clan_members.slot_type, players.name as player_name from clans' +
				       '    inner join clan_members on (clan_id = clans.id)' +
				       '    left join players on (clan_members.player_id = players.id) ' +
				       '  where clans.id=(select clan_id from clan_members where player_id=?)',
				[ s.userid ],
				function(err, rows) {
					if(err) {
						console.log(err);
						return next('SQL broke down trying to figure out what clan you are in.');
					}
					if(rows.length) {
						s.clanid = rows[0].clan_id;
						s.owner = (rows[0].owner_id == s.userid);
					}
					jade_render(res, 'index', s, { clan: rows });
				});
		} else {
			jade_render(res, 'login', s, { signup_error: signup_err, login_error: login_err });
		}
	}
});

app.use(function(err, req, res, next) {
	res.status(500);
	console.log(err);
	jade_render(res, 'oops', req.session, { oops: err });
});

app.listen(3000, '0.0.0.0', function () {
	console.log('Nethack tournament server!');
});
