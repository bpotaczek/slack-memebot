var async = require('async'),
    https = require('https'),
    querystring = require('querystring'),
    ws = require('ws');

function slackbot(token) { 
    this.token = token;
    this.handlers = [];
    this.messageID = 0;
    return this;
}

slackbot.prototype.api = function(method, params, cb) {
  var options, post_data, req;

  params.token = this.token;
  post_data = querystring.stringify(params);

  options = {
    hostname: 'api.slack.com',
    method: 'POST',
    path: '/api/' + method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': post_data.length
    }
  };

  req = https.request(options);

  req.on('response', function(res) {
    var buffer;
    buffer = '';
    res.on('data', function(chunk) {
      return buffer += chunk;
    });
    return res.on('end', function() {
      var value;
      if (cb) {
        if (res.statusCode === 200) {
          value = JSON.parse(buffer);
          return cb(value);
        } else {
          return cb({
            'ok': false,
            'error': 'API response: ' + res.statusCode
          });
        }
      }
    });
  });
  
  req.on('error', function(error) {
    if (cb) {
      return cb({
        'ok': false,
        'error': error.errno
      });
    }
  });
  
  req.write(post_data);
  return req.end();
};

slackbot.prototype.use = function(fn) {
    this.handlers.push(fn);
    return this;
};

slackbot.prototype.handle = function(data) {
    async.series(this.handlers.map(function(fn) {
        return function(cb) {
            fn(data, cb);
        };
    }));
    return this;
};

slackbot.prototype.sendMessage = function(channel, text, attachments) {
  var message = {
    type: 'message',
    channel: channel,
    text: text,
    username: 'Meme Bot',
    icon_emoji: ':paperclip:'
  };
  return this.api("chat.postMessage", message);
};

slackbot.prototype.ping = function(callback) {
  var message = {
    id: ++this.messageID,
    type: 'ping',
    time: Date.now()
  };
  this.ws.send(JSON.stringify(message), callback);
};

slackbot.prototype.connect = function() {
    var self = this;
    self.api('rtm.start', {agent: 'node-slack'}, function(data) {
      self.kill();
      if(self.ws) self.ws.close();
      self.ws = new ws(data.url);
      self.ws.on('message', function(data, flags) {
        var message = JSON.parse(data);
        self.handle(message);
      });
    });    
};

slackbot.prototype.kill = function() {
    var self = this;
    if(self.ws) self.ws.close();
};

var pings = 0;
var pongs = 0;
slackbot.prototype.startConnectionChecking = function() {
    var self = this;
    // Ping server every two minutes to ensure connection is ok
    setInterval(function () {
        log("Sending ping");
        pings++;
        self.ping(function(error) {
            slackbotlog(error + " Connection dropped!");
        });
    }, 3000);
    
    setInterval(function() {
        if(pings > pongs) {
            slackbotlog("Too many pings! Reconnecting...");
            self.connect();
        }
    }, 5000);
};

function slackbotlog(msg) {
    console.log(new Date() + "\t" + msg);
}

module.exports = slackbot;
