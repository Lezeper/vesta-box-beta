const player = require('./play');
const Stream = require('stream');
const Writable = Stream.Writable;

var ws = Writable();

ws._write = function (chunk, enc, next) {
    console.log(chunk);
    return next();
};

// player.play('output.wav');
// player.play('output.wav', true);
player.play('output.wav').pipe(ws);

setInterval(function(){}, 1000)