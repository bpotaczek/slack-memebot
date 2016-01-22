var request = require("request");
var authToken = 'xoxb-3389833011-k0qN0yVUsFWdpkaRNsKqP5qX';
var slackbot = require("./slackbot.js");
var bot = {};

var commands = {
    ".memebot": {
        text: ".memebot",
        name: "MemeBot",
        description: "Prints available commands",
        fn: memebot
    }
};
var memes = [];
var validIds = ['401687', '1232147', '107773', '61554', '176908', '146381', '101462', '19194965', '17699', '17496002',
    '100952', '10628640', '61522', '718432', '61556', '235589', '40945639', '405658', '61520', '61532', '438680'];
var slack;

function connect() {
    log("Connecting...");
    slack = new slackbot(authToken);
    slack.use(onWebsocketMessage);
    slack.connect();
    log("MemeBot is ready");
}

function send(channel, text, attachments) {
    slack.sendMessage(channel, text, attachments);
}

function onWebsocketMessage(message, callback) {
    if(message.type == 'message' && message.text && message.text.indexOf(".") == 0) {
        var channel = message.channel;
        var commandName = parseCommand(message.text);
        var command = commands[commandName];
        
        if(command) {
            command.fn(channel, message.text.substring(commandName.length, message.text.length).trim(), message);
        }
    }   
    log(message.text ? message.text : message.type);
    if(callback) callback();
}

function parseCommand(msg) {
    var lastIndex = msg.indexOf(" ");
    if(lastIndex <= 0) lastIndex = msg.length;
    return msg.substring(0, lastIndex);
}

function parseText(msg) {
    var index = msg.indexOf(" ");
    return {
        id: msg.substring(0, index),
        text: msg.substring(index + 1)
    };
}

function log(msg) {
    console.log(new Date() + "\t" + msg);
}

function memebot(channel, args, message) {
    if (args === 'list'){
        loadMemes(function(msg) {
            send(channel, msg);
        });
    } else {
        var obj = parseText(args);
        findMeme(obj.id, function(meme) {
            createMeme(obj, function(result) {
                if (result.success && result.data && result.data.url) {
                    send(channel, result.data.url);
                }
            });
        });
    }
}

function findMeme(id, callback) {
    for (var i = memes.length - 1; i >= 0; i--) {
        if (memes[i].id === id) {
            callback(true);
            return;
        }
    }
}

function loadMemes(callback) {
    request.get('https://api.imgflip.com/get_memes', function(err, response, body) {
        var result = JSON.parse(body);
        memes = [];
        if (result.success && result.data && result.data.memes) {
            var tempmemes = result.data.memes;
            tempmemes.sort(memeCompare);
            var msg = '';
            for (var i = tempmemes.length - 1; i >= 0; i--) {
                if (validIds.indexOf(tempmemes[i].id) > -1) {
                    msg += tempmemes[i].name + ' (' + tempmemes[i].id + ')\n';
                    memes.push(tempmemes[i]);
                }
            }
            if (callback) {
                callback(msg);
            }
        }
    });
}

function memeCompare(a,b){
    if (a.name < b.name)
        return 1;
    else if (a.name > b.name)
        return -1;
    else 
        return 0;
}

function createMeme(obj, callback) {
    var text = splitText(obj.text);
    request.post('https://api.imgflip.com/caption_image', {
        form: {
            template_id: obj.id,
            text0: text.text0,
            text1: text.text1,
            username: 'omnimemebot',
            password: 'vAYu7uCh'
        }
    }, function(erro, response, body) {
        callback(JSON.parse(body));
    });
}

function splitText(text) {
    if (text.indexOf(' ') === -1) return { text0: text, text1: '' };
    var t = text.split(' ');
    var n = t.length/2;
    return {
        text0: t.slice(0, n).join(' '),
        text1: t.slice(n).join(' ')
    };
}

function printHelp(channel, args, message) {
    var helpMsg = "MemeBot commands:";
    helpMsg += ".memebot list \tLists all memes";
    send(channel, helpMsg);
}

connect();
loadMemes();
