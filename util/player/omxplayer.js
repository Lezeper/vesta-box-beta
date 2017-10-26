'use strict';

let spawn = require('child_process').spawn;
let EventEmitter = require('events');

// The permitted audio outputs, local means via the 3.5mm jack.
let ALLOWED_OUTPUTS = ['hdmi', 'local', 'both'];

// Creates an array of arguments to pass to omxplayer.
function buildArgs (isLive, source, givenOutput, loop, initialVolume) {

	let output = '';

	if (givenOutput) {

		if (ALLOWED_OUTPUTS.indexOf(givenOutput) === -1) {
			throw new Error(`Output ${givenOutput} not allowed.`);
		}

		output = givenOutput;

	} else {
		output = 'local';
	}
	
	let args = [source, '-o', output];
	
	if(isLive) {
		args.unshift('--live');
	}

	// Handle the loop argument, if provided
	if (loop) {
		args.push('--loop');
	}

	// Handle the initial volume argument, if provided
	if (Number.isInteger(initialVolume)) {
		args.push('--vol', initialVolume);
	}
	
	return args;
}

function Omx (isLive, source, output, loop, initialVolume) {

	let omxplayer = new EventEmitter();
	let player = null;
	let open = false;

	// Marks player as closed.
	function updateStatus () {

		open = false;
		omxplayer.emit('close');

	}

	// Emits an error event, with a given message.
	function emitError (message) {

		open = false;
		omxplayer.emit('error', message);

	}

	// Spawns the omxplayer process.
	function spawnPlayer (isL, src, out, loop, initialVolume) {

		let args = buildArgs(isL, src, out, loop, initialVolume);
		let omxProcess = spawn('omxplayer', args);
		open = true;

		omxProcess.stdin.setEncoding('utf-8');
		omxProcess.on('close', updateStatus);

		omxProcess.on('error', () => {
			emitError('Problem running omxplayer, is it installed?.');
		});

		return omxProcess;
	}

	// Simulates keypress to provide control.
	function writeStdin (value) {

		if (open) {
			player.stdin.write(value);
		} else {
			throw new Error('Player is closed.');
		}

	}

	if (source) {
		player = spawnPlayer(isLive, source, output, loop, initialVolume);
	}

	// Restarts omxplayer with a new source.
	omxplayer.newSource = (isL, src, out, loop, initialVolume) => {

		if (open) {

			player.on('close', () => { player = spawnPlayer(isL, src, out, loop, initialVolume); });
			player.removeListener('close', updateStatus);
			writeStdin('q');

		} else {

			player = spawnPlayer(isL, src, out, loop, initialVolume);

		}
	};

	omxplayer.play = () => { writeStdin('p'); };
	omxplayer.pause = () => { writeStdin('p'); };
	omxplayer.volUp = () => { writeStdin('+'); };
	omxplayer.volDown = () => { writeStdin('-'); };
	omxplayer.fastFwd = () => { writeStdin('>'); };
	omxplayer.rewind = () => { writeStdin('<'); };
	omxplayer.fwd30 =() => { writeStdin('\u001b[C'); };
	omxplayer.back30 = () => { writeStdin('\u001b[D'); };
	omxplayer.fwd600 = () => { writeStdin('\u001b[A'); };
	omxplayer.back600 = () => { writeStdin('\u001b[B'); };
	omxplayer.quit = () => { writeStdin('q'); };
	omxplayer.subtitles = () => { writeStdin('s'); };
	omxplayer.info = () => { writeStdin('z'); };
	omxplayer.incSpeed = () => { writeStdin('1'); };
	omxplayer.decSpeed = () => { writeStdin('2'); };
	omxplayer.prevChapter = () => { writeStdin('i'); };
	omxplayer.nextChapter = () => { writeStdin('o'); };
	omxplayer.prevAudio = () => { writeStdin('j'); };
	omxplayer.nextAudio = () => { writeStdin('k'); };
	omxplayer.prevSubtitle = () => { writeStdin('n'); };
	omxplayer.nextSubtitle = () => { writeStdin('m'); };
	omxplayer.decSubDelay = () => { writeStdin('d'); };
	omxplayer.incSubDelay = () => { writeStdin('f'); };

	Object.defineProperty(omxplayer, 'running', {
		get: () => { return open; }
	});

	return omxplayer;
}

module.exports = Omx;