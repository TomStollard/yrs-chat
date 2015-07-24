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

function showMessage(msg, user, imageLink) {
  msg = emojione.toImage(msg);
  var messageElement;
  if (user == 'RubyBot') {
    messageElement = $('<li class="bot-msg">').html('<a href="http://yrs.io">' + user + '</a>' + ': ' + msg);
  } else{
    messageElement = $('<li>').html('<a href="https://twitter.com/'+ user +'" target="_blank"><img class="profileImage" src="' + imageLink + '"/></a><div class="message"><a class="twitter-link" href="https://twitter.com/'+ user +'" target="_blank">@' + user + '</a>' + ': ' + msg + '</div>');
  }
  $('#messages').append(messageElement).animate({scrollTop: 1000000}, "slow");
  $('li').linkify({
    target: "_blank"
  });
}


// firebase stuff
ref.onAuth(function(data) {
  authData = data;
  socket.emit("join", data.token);
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

    var console = $('<li>').html('<span><font color="red">Server</span>' + ': Please do not spam!</font>')
    $('#messages').append(console).animate({scrollTop: 1000000}, "slow");

  } else {
    socket.emit('chat message',
      msgbox.val(),
      authData.twitter.username,
      authData.twitter.profileImageURL);
    canPost=false;
    setTomeout(function(){canPost=true},500);
  }
  msgbox.val('');
  return false;
});


socket.on('chat message', showMessage);

window.onbeforeunload = function(e) {
  return 'Closing YRS Chat means you will no longer receive messages';
};
});