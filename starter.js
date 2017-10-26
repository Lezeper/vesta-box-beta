'use strict';

const { spawn, exec } = require('child_process');
const ip = require("ip");
const _ = require('lodash');
const os = require('os');
const bodyParser = require("body-parser");
const express = require('express');
const moment = require('moment');

const server = express();
server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());
const Mqtt = require('./mqtt');
const mqttClient = Mqtt.getClient();

const Bulb = require('./modules/home_automation/bulb');
const HttpAddr = require('./http-addr');
const Config = require('./config');
const Player = require('./util/player/play');
const Logger = require('./util/logger');
Logger.clear();

var SensorManager = null;

const poping = exec('aplay -t raw -r 48000 -c 2 -f S16_LE /dev/zero &');

// process.on('exit', function() {
//   process.kill(poping.pid + 1, 'SIGHUP')
// });

const STT = spawn('python', ['-u', __dirname+'/modules/stt/start.py', Config.serverIp, Config.id]);
STT.stdout.on('data', (data) => {
  data = data.toString();
  console.log('output: ', data)
});
STT.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

// check for server is connected or not
var serverIsConnected = false;
var serverIsConnectedTimeout = null;
setTimeout(function() {
  if(!serverIsConnected) {
    Logger.error('Cant connect to server...');
    // TODO: LED Lighting
  }
}, Config.connectTimeout);

/** MQTT communication **/

mqttClient.on('connect', () => {
  serverIsConnected = true;
  if(!_.isNil(serverIsConnectedTimeout))
    clearTimeout(serverIsConnectedTimeout);

  Logger.info("Connected to Broker");

  mqttClient.subscribe(Mqtt.FOCUS_MODE);
  mqttClient.subscribe(Mqtt.GOT_RESPONSE);
  mqttClient.subscribe(Mqtt.PLAY_AUDIO);
  // tell server this box is connected and need config info
  mqttClient.publish(Mqtt.VB_CONNECTED, ip.address());
});

mqttClient.on('message', (topic, message_) => {
  let message = message_.toString();
  console.log(topic, message);

  // TODO: WHY?
  // skip if didn't receive config info
  // if(_.isNil(SensorManager))
  //   return;
  
  if(topic == Mqtt.FOCUS_MODE) {
    if(message == 'true') {
      STT.stdin.write('focus|true'+os.EOL);
      SensorManager.setIsFocusMode(true);
    } else if(message == 'false') {
      STT.stdin.write('focus|false'+os.EOL);
      SensorManager.setIsFocusMode(false);
    }
  } else if(topic == Mqtt.GOT_RESPONSE) {
    STT.stdin.write('responsed'+os.EOL);
  } else if(topic == Mqtt.PLAY_AUDIO) {
    
    // Player.play(message).on('done', function() {
    //   // TODO: do something when audio play done
    // });
  }
});

/** HTTP communication **/

const httpErrorHandler = (errMsg, res) => {
  Logger.error(errMsg);
  res.status(500).send({ msg: errMsg });
}

// receive config info from server, start work
server.post(HttpAddr.START, function(req, res) {
  Logger.info('receive config info from server, start work...');
  let bodyObj = JSON.parse(JSON.stringify(req.body));

  let idTags = bodyObj.idTags;
  let telemetrySensors = bodyObj.telemetrySensors;

  let isStartID = _.isArray(idTags) && idTags.length > 0;
  let isStartTelemetry = _.isArray(telemetrySensors) && telemetrySensors.length > 0;

  SensorManager = require('./modules/sensor_manager');
  SensorManager.setup(isStartID, isStartTelemetry, idTags, telemetrySensors);

  if(!SensorManager.isRuning()) {
    SensorManager.start();
  } else {
    Logger.info('bypass SensorManager.start since it is already running...');
  }
  
  res.status(200).send();
});

server.post(HttpAddr.ALARMING, function(req, res) {
  // console.log(req.body);
  res.status(200).send();
});

server.get(HttpAddr.LOGGER, function(req, res) {
  res.status(200).send({ data: Logger.getJSONLogger() });
});

server.listen(3000);
Logger.info("box local server is started.");