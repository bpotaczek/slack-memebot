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
var top = 20;
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
    if(message.type == 'message' && message.text && message.text.indexOf(".") === 0) {
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
    if (args.indexOf('list') > -1) {
        var a = args.split(' ');
        var msg;
        if (a.length > 1) {
            msg = printMemesBySearch(a.slice(1).join(' '), args[0] === 'listdetail');
        } else {
            msg = printMemesByTop(args[0] === 'listdetail');
        }
        send(channel, msg);
    } else if (args) {
        var obj = parseText(args);
        findMeme(obj.id, function(meme) {
            createMeme(obj, function(result) {
                if (result.success && result.data && result.data.url) {
                    send(channel, result.data.url);
                }
            });
        });
    } else {
        printHelp(channel);
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

function loadMemes() {
    request.get('https://api.imgflip.com/get_memes', function(err, response, body) {
        var result = JSON.parse(body);
        if (result.success && result.data && result.data.memes) {
            memes = result.data.memes;
            log('memes loaded!');
        }
    });
}

function printMemesByTop(showImages) {
    var msg = '';
    var data = memes.slice(0, top);
    data.sort(memeCompare);
    for (var i = 0; i < top; i++) {
        msg += data[i].name + ' (' + data[i].id + ')\n';
        if (showImages) {
            msg += data[i].url;
        }
    }
    return msg;
}

function printMemesBySearch(search) {
    var msg = '';
    for (var i = 0; i < memes.length; i++) {
        if (memes[i].name.toLowerCase().indexOf(search.toLowerCase()) > -1) {
            msg += memes[i].name + ' (' + memes[i].id + ')\n';
            if (showImages) {
                msg += data[i].url;
            }
        }
    }
    return msg;
}

function memeCompare(a,b){
    if (a.name < b.name)
        return -1;
    else if (a.name > b.name)
        return 1;
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
    if (text.indexOf('|') > -1) {
        var u = text.split('|');
        return {
            text0: u[0],
            text1: u[1]
        };
    } else {
        if (text.indexOf(' ') === -1) return { text0: text, text1: '' };
        var t = text.split(' ');
        var n = t.length/2;
        return {
            text0: t.slice(0, n).join(' '),
            text1: t.slice(n).join(' ')
        };
    }
}

function printHelp(channel) {
    var helpMsg = "memebot commands:\n";
    helpMsg += "*.memebot list* \tLists top " + top + " memes\n";
    helpMsg += "*.memebot list starwars* \tSearches for memes with starwars in title\n";
    helpMsg += "*.memebot listdetail* \tLists top " + top + " memes (results includes images)\n";
    helpMsg += "*.memebot listdetail starwars* \tSearches for memes with starwars in title (results includes images)\n";
    helpMsg += "*.memebot _id_ _caption_*\tCreates a meme(use a | for line break)";
    send(channel, helpMsg);
}

connect();
loadMemes();
