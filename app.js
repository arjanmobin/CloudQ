const PORT = process.env.PORT || 3000
const IP = process.env.IP || "localhost"

var express = require('express'); 
var app = express();// Express web server framework
var server = app.listen(PORT)
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require("body-parser")
var io = require("socket.io")(server)
var Spotify = require('node-spotify-api');

var client_id = '6af837285d024dcd8d64bae9cec7a332'; // Your client id
var client_secret = 'ac913c32882949c4bf926b365e3e9e77'; // Your secret

var stateKey = 'spotify_auth_state';

var connectedSockets = []

var redirect_uri = `http://7a798363.ngrok.io/callback/`;
// var redirect_uri = `http://${IP}:${PORT}/callback/`;

var spotifyAPI = new Spotify({
  id: client_id,
  secret: client_secret
});


app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}))

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email app-remote-control playlist-modify-private playlist-modify-public user-read-currently-playing user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          const {id} = body;

          res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
            user_id: id
          }));
        });

        // we can also pass the token to the browser to make requests from there
        
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.post("/sms", (req, res) => {
  let message = req.body.Body;

 
  spotifyAPI.search({type: "track", query: message})
  .then((response) => {
    let song = response.tracks.items[0] ;
    let title = song.name;
    let artist = song.artists[0].name;
    let cover = song.album.images[0].url;
    let uri = song.uri;

    let songData = {
      title,
      artist,
      cover,
      uri
    };

    if (connectedSockets.length > 0) {
      io.to(connectedSockets[connectedSockets.length-1]).emit("songSuggestion", songData)
    }

  }).catch((err) => {
    console.log(err)
  });
});

io.on("connection", (socket) => {
  console.log("new socket")
  connectedSockets.push(socket.id)
});


app.listen(PORT, IP, function() {
  console.log('running at ' + IP + ':' + PORT);
});


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};