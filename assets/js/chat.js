$(document).ready(function() {
// static stuff
var ref = new Firebase("***firebase-url***");
var socket = io();
var canPost = true;
var authData;

var msgbox = $("#message");

$('.helpButton').click(function() {
  $('.about-box').fadeIn(function() {
    $('.close-button').click(function() {
      $('.about-box').fadeOut()
    });
  })
});

function showMessage(msg, user, tags, imageLink) {
  msg = emojione.toImage(msg);

  msg = linkifyString(msg);

  var messageElement;
  if (user == 'RubyBot') {
    messageElement = $('<li class="bot-msg">').html('<a href="http://yrs.io" target="_blank">' + user + '</a>' + ': ' + msg);

  } else if (user == 'Server') {
    messageElement = $('<li class="server-msg">').html('<a href="http://yrs.io" target="_blank">' + user + '</a>' + ': ' + msg);

  } else {

    if (!imageLink || imageLink == ''){
      messageElement = $('<li>').html(
        '<a href="https://twitter.com/'+ user +'" target="_blank"></a>' +
        '<div class="message">' +
        '<a class="twitter-link" href="https://twitter.com/'+ user +'" target="_blank">@' + user + '</a><span class="label">' + tags + '</span>' +
        '<p class="msg">' + msg + '</p></div>'
      );
    } else {
      messageElement = $('<li>').html(
        '<a href="https://twitter.com/'+ user +'" target="_blank"><img class="profileImage" src="' + imageLink + '"/></a>' +
        '<div class="message">' +
        '<a class="twitter-link" href="https://twitter.com/'+ user +'" target="_blank">@' + user + '</a><span class="label">' + tags + '</span>' +
        '<p class="msg">' + msg + '</p></div>'
      );
    }
  }

  $('#messages').append(messageElement).animate({scrollTop: 1000000}, "slow");
}


// firebase stuff
ref.onAuth(function(data) {
  authData = data;
  if (!data){
    $('.twitter').css("display", "block")
  } else {
    socket.emit("user join", data.token, data.twitter.username, data.twitter.profileImageURL);
  }
});

$('#twitter-button').click(function() {
  ref.authWithOAuthPopup("twitter", function(error, data) {
    if (error) {
      console.log("Login Failed!", error);
    } else {
      $('.twitter').fadeOut()
    }
  });
  return false;
});

ref.getAuth();

$('form').submit(function(){
  if(canPost == false){
    showMessage('Please do not spam!', 'Server', '');
  } else {
    socket.emit('chat message',
      msgbox.val(),
      authData.token,
      function(response) {
        if (response.status == "failed"){
          showMessage(response.message, "Server", "S", "");
        }
      }
    );
    canPost=false;
    setTomeout(function(){canPost=true},500);
  }
  msgbox.val('');
  return false;
});


socket.on('chat message', function(message, user) {
  showMessage(message, user.name, user.tags, user.image);
});


socket.on("user join", function(user) {
  showMessage(user.name + " has joined!", "Server")
});


socket.on("user leave", function(user) {
  showMessage(user.name + " has left.", "Server")
});

window.setInterval(function() {
  socket.emit("user ping", authData.token)
}, 5000);


$(window).unload(function() {
  socket.emit("user leave", token);
})
});

window.onbeforeunload = function(){
    return "Closing the window will disconnect your from YRS Chat";
};


