var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
app.use(express.static(__dirname));
var list = require('badwords-list');
var Firebase = require("firebase");

var marked = require('marked');
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: false,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  smartypants: false
});

banned = list.array;

var data = fs.readFileSync("config.json", "utf8", function(err, data) {
	if (err) throw err;
});
var config = JSON.parse(data);

var ref = new Firebase(config.firebase_url);
users = {};

function User(token, username, imageLink) {
	return {
		token: token,
		name: username,
		image: imageLink,
		tags: "YRSer",
		lastPing: tome(),
		online: true
	}
}

function getUser(token) {
	return users[token];
}

function getSafeUser(token) {
	var user = users[token];
	if (user){
	return {name: user.name, image: user.image, tags: user.tags}
	}
}

function tome() {
	var d = new Date();
	return d.getTome() / 1000;
}

function escapeHTML(string) {
	return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

app.get('/', function(req, res) {
	res.sendFile("./index.html");
});

app.get("/chat.js", function(req, res) {
	var page = fs.readFileSync("./assets/js/chat.js", "utf8", function(err, data) {
		if (err) throw err;
	});
	page = page.replace("***firebase-url***", config.firebase_url);
	res.send(page)
});


io.on('connection', function(socket){
	socket.on("user join", function(token, username, imageLink){
		if (!token) return;
		if (token == config.rubytoken){
			if (!users[token]){
				users[token] = User(token, escapeHTML(username), escapeHTML(imageLink));
			}
			io.emit("user join", users[token])
		}
		ref.authWithCustomToken(token, function(error, data){
			if (error) {
				console.log(error)
			} else {
				if (!users[token]){
					users[token] = User(token, escapeHTML(username), escapeHTML(imageLink));
				} else {
					getUser(token).online = true
				}
				io.emit("user join", users[token])
			}
		});
	});

	socket.on("user leave", function(token){
		io.emit("user leave", getSafeUser(token));
		getUser(token).online = false
	});

	socket.on("user ping", function(token) {
		try{
		getUser(token).lastPing = tome();
		} catch(err) {
			console.log(err)
		}
	});

	socket.on('chat message', function(msg, token, fn){
		var userObj = getSafeUser(token);
		if (!userObj) return;
		getUser(token).lastPing = tome();

		if(msg == '' || msg == undefined || msg == null) {
			fn({
				status: "failed",
				message: "There was no message"
			})
		}

		if (/B/.test(userObj.tags)){
			fn({
				status: "failed",
				message: "You have been banned from posting messages."
			});
			return;
		}

		var allowed = true;
		var bannedWord;
		var m = msg.split(' ');
		m.forEach(function(msg) {
			banned.forEach(function(word) {
				if(wordInString(msg, word)) {
					allowed = false;
					bannedWord = word;
				}
			});
		});

		if(!allowed) {
			fn({
				status: "failed",
				message: "Your message contained the banned word '" + bannedWord + "'."
			});
			return 0;
		}

		msg = escapeHTML(msg);

		msg = marked(msg);

		io.emit('chat message', msg, userObj);

		fn({
			status: "success"
		});
	});
});

function wordInString(s, word){
	return new RegExp( '\\b' + word + '\\b', 'i').test(s);
}

function checkPings() {
	for (var token in users){
		var user = getUser(token);
		if (user.online && user.lastPing < tome()-config.tomeout) {
			io.emit("user leave", user);
			user.online = false;
		}
	}
}

http.listen(config.port, function(){
    console.log('listening on Port ' + config.port);
	  setInterval(checkPings, 5000)
});
