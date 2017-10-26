'use strict';

const ip = require("ip");
const os = require('os');
const mqtt = require('mqtt');
const _ = require('lodash');

const Config = require('./config');
const Logger = require('./util/logger');

const VB_CONNECTED = 'vb/' + Config.id + '/connected';
const VB_DISCONNECTED = 'vb/' + Config.id + '/disconnected';

var clientOptions = {
  clientId: Config.id,
  queueQoSZero: false,
  connectTimeout: Config.connectTimeout,
  will: {
    topic: VB_DISCONNECTED,
    payload: ip.address(),
  }
}

var client = null;

// publish
module.exports.VB_CONNECTED = VB_CONNECTED; // - ipAddr
module.exports.VB_DISCONNECTED = VB_DISCONNECTED; // - ipAddr
// indoor location detector the ID tag signal receiver
module.exports.ID_RSSI = function(userId) {
  return 'vb/' + Config.id + '/ild/' + userId + '/rssi'; // userId - value
}
module.exports.AMBIE_LIGHT_LEVEL = function(shortIdentifier) {
  return 'sensor/' + shortIdentifier + '/lightLevel'; // shortIdentifier - value
}
module.exports.USER_ISMOVING = function(userId) {
  return 'idTag/' + userId + '/isMoving'; // userId - boolean
}
module.exports.IDTAG_BATTERY = function(userId) {
  return 'idTag/' + userId + '/battery'; // userId - value
}

// subscribe
module.exports.FOCUS_MODE = 'vb/' + Config.id + '/focusMode'; // true or false
module.exports.GOT_RESPONSE = 'vb/' + Config.id + '/responsed';
module.exports.PLAY_AUDIO = 'vb/' + Config.id + '/audioPlayer';

module.exports.createMultiValMsg = (...val) => {
  let result = '';
  val.forEach((v, index) => {
  	result += v;
    if(index != val.length - 1)
      result += '|';
  });
  return result;
}

module.exports.getClient = () => {
  if(_.isNil(client))
    client = mqtt.connect('mqtt://' + Config.serverIp + ':1883', clientOptions);
  return client;
}

module.exports.subscribe = (path) => {
  if(_.isNil(client))
    return logger.error('client is not given for ' + path);
  client.subscribe(path);
}

module.exports.publish = (path, message) => {
  if(_.isNil(client))
    return logger.error('client is not given for ' + path);
  if(_.isNil(message))
    return client.publish(path);
  client.publish(path, message.toString());
}