/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , WSServer  = require('ws').Server
  , fs = require('fs')

var app = express();
var httpServer =  http.createServer(app);
var wss = new WSServer({ server : httpServer });

var twitter = require('ntwitter');

var conf = JSON.parse(fs.readFileSync(__dirname + "/conf/twitter.conf"));

var tw = new twitter({
  consumer_key: conf.keys.consumer_key,
  consumer_secret: conf.keys.consumer_secret,
  access_token_key: conf.keys.access_token_key,
  access_token_secret: conf.keys.access_token_secret
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/users', user.list);

wss.on('connection', function(ws) {
});


tw.stream('statuses/filter', {'track':conf.track}, function(stream) {
  stream.on('data', function (data) {
    var obj = {"user": data.user.profile_image_url, "text": data.text};

    wss.clients.forEach(function(ws) {
      ws.send(JSON.stringify(obj));
    });
  });
});

httpServer.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
