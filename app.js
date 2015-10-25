/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , WSServer  = require('ws').Server
  , conf = require('./conf/twitter.json')
  , gTranslate = require('./conf/gTranslate.json')
  , log4js = require('log4js')
  , bodyParser = require('body-parser')
  , request = require('request')
  , querystring = require('querystring')

var app = express()
  , httpServer =  http.createServer(app)
  , wss = new WSServer({ server : httpServer })
  , worker = null
  , logger = log4js.getLogger()


app.configure(function(){
  app.set('port', process.env.VCAP_APP_PORT || process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use( bodyParser.json() ); // to support JSON-encoded bodies
  app.use( bodyParser.urlencoded() );
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


var twitter = require('ntwitter')
var worker4twitter = function(option, WebSocketServer){
  this.track = option.track;
  this.wss = WebSocketServer;
  this.stream = null;

  this.wss.on('connection', function(ws) {
    logger.info("new websocket connection established")
  });

  this.tw = new twitter({
    consumer_key: option.keys.consumer_key,
    consumer_secret: option.keys.consumer_secret,
    access_token_key: option.keys.access_token_key,
    access_token_secret: option.keys.access_token_secret
  });
}

worker4twitter.prototype.begin = function() {
  var self = this;

  var begin_ = function(){
    logger.debug("begin_");
    self.tw.stream('statuses/filter', {'track':self.track}, function(stream) {
      self.stream = stream;
      var track_obj = {
        "type": "track",
        "data": { "name": self.track }
      };

      logger.debug("stream");

      self.wss.clients.forEach(function(ws) {
        logger.debug(track_obj);
        ws.send(JSON.stringify(track_obj));
      });

      stream.on('data', function (data) {
        var obj = {
          "type": "tweet",
          "data": {"user": data.user.profile_image_url, "text": data.text}
        };

        var removed_str = self.removeHashtag(data.text);
        var detect = self.detectLang(removed_str);
        self.translate(removed_str, detect, function(res) {
          var json = JSON.parse(res);
          obj.result = {
            "source" : { "lang": detect.source, "text": removed_str },
            "target" : { "lang": detect.target, "text": json.data.translations[0].translatedText }
          }
          logger.debug(obj);

          self.wss.clients.forEach(function(ws) {
            ws.send(JSON.stringify(obj));
          });
        });
      });
    });
  }

  if(this.stream) {
    this.stream.destroy();
    this.stream.on("destroy", begin_);
  } else {
    begin_();
  }
}

worker4twitter.prototype.removeHashtag = function(str){
  return str.replace(/#[a-zA-Z0-9_-]+/g, "");
}

worker4twitter.prototype.detectLang = function(str){
  var c = 0;
  var str_ = str.replace(/#[a-zA-Z0-9_-]+/g, ""), len_ = str_.length
  for (var i = 0; i < len_; i++) { c += str_[i].match(/[\x20-\x7E]/) ? 1 : 0 }

  console.log("str = %s, c = %d, len = %d", str_, c, len_);

  return c < (len_ / 2) ? {"source": "ja", "target": "en"} : {"source": "en", "target": "ja" }
}

worker4twitter.prototype.translate = function(str, detect, callback){
  request({
    "uri": "https://www.googleapis.com/language/translate/v2",
    "qs": {
      "key": gTranslate.apikey,
      "q": str,
      "source": detect.source,
      "target": detect.target
    }
  }, function(error, result, body) {
    callback(body);
  });
}

worker = new worker4twitter(conf, wss);
worker.begin();

app.get('/', routes.index);

app.get('/test', function(req, res) {
  var str = req.query.text;
  var removed_str = worker.removeHashtag(str);
  var detect = worker.detectLang(removed_str);

  worker.translate(removed_str, detect, function(result) {
    console.log(removed_str, detect, result);
    res.json(result);
  });
});


app.get('/track', function(req, res){
  res.json({"track": worker.track});
});

app.put('/track', function(req, res) {
  console.dir(req.body);
  var name_ = req.body.name;
  worker.track = name_;
  worker.begin();
  logger.info("track updated: %s", worker.track);

  res.send("track updated with : " + name_);
});



httpServer.listen(app.get('port'), function(){
  logger.info("Express server listening on port " + httpServer.address().port);
});
