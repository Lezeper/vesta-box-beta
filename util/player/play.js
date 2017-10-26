'use strict';

const spawn = require('child_process').spawn;
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
const _ = require('lodash');
const fs = require('fs');
const Logger = require('../logger');

var child = null;
var isPlaying = false;
var stopFlag = false;
const cmd = 'sox';
var cmdArgs = [];

const repeatPlayer = function(filePath) {
  child = spawn(cmd, cmdArgs).on('exit', function(){
    isPlaying = false;
    if(!stopFlag){
      isPlaying = true;
      repeatPlayer(filePath);
    }
  });
}

const buildCmdArgs = function(filePath) {
  var cmdArgs_ = []
    .concat('-G')
    .concat(filePath)
    .concat('-q')
    .concat('-d');

  return cmdArgs_;
}

module.exports.playStream = function(audioType) {
  if(_.isNil(audioType))
    return Logger.error("audioType is not given");

  return spawn('play', ['-t', audioType, '-']);
}

module.exports.play = function(filePath, isRepeat=false, next){
  if(_.isNil(filePath) || (!fs.existsSync(filePath) && filePath.indexOf('http') == -1))
    return Logger.error("local sound file: "+ filePath +" not found...");

  cmdArgs = buildCmdArgs(filePath);
  
  child = spawn(cmd, cmdArgs);

  isPlaying = true;
  stopFlag = false;
  
  Logger.info('playing soundfile:' + filePath);

  child.on('exit', function(){
    isPlaying = false;
    if(isRepeat && !stopFlag){
      isPlaying = true;
      repeatPlayer(filePath);
    } else {
      eventEmitter.emit('done');
    }
  });

  child.on('error', function(err){
    Logger.error(err);
    if(_.isFunction(next))
      next(err);
    child.kill();
  });

  return eventEmitter;
}

module.exports.stop = function(){
  if(!_.isNil(child)) {
    stopFlag = true;
    child.kill();
  }
  eventEmitter.emit('done');
  isPlaying = false;
  Logger.info("player stoped.");
};

module.exports.isPlaying = isPlaying;