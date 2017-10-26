'use strict'

const _ = require('lodash');
const Config = require('../../config');
const Logger = require('../../util/logger');
const Mqtt = require('../../mqtt');
const noble = require('noble');
const estimoteParser = require('./parser');
const ESTIMOTE_SERVICE_UUID = 'fe9a';
/**
-30 dBm => -91
-20 dBm => -81
-16 dBm => -76
-12 dBm => -74
 -8 dBm => -68 
 -4 dBm => -66
  0 dBm => -62
  4 dBm => -60
 */
const txPower = -66;
const idRSSIMapSize = Math.round(1000 / (Config.idBroadCastInterval*1));

const reportRssiInterval = Config.reportRssiInterval;

var userMovingMap = new Map(); // map{ userId: boolean };
var idBeaconRssiMap = new Map(); // map{ userId: [rssi] }
var myIDBeaconIntervalId = null;
var isStartID = false;
var isStartTelemetry = false;
var isFocusMode = false;

var telemetrySensors = [];
var idTags = [];

const calculateAccuracy = (rssi) => {
  if (rssi == 0) {
    return -1.0; // if we cannot determine accuracy, return -1.
  }

  let ratio = rssi * 1.0 / txPower;
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  }
  else {
    let accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    return accuracy;
  }
}

noble.on('stateChange', function (state) {
  Logger.info('state has changed: ' + state);
  if (state == 'poweredOn') {
    noble.startScanning([], true, function (error) {
      if (error) {
        Logger.error('error starting scanning', error);
      } else {
        Logger.info('started scanning');
      }
    });
  }
});

noble.on('discover', function (peripheral) {
  // idBeacons
  if(isStartID) {
    for(let i = 0; i < idTags.length; i++) {
      // id beacon is broadcasting iBeacon package
      if(peripheral.uuid === idTags[i].uuid){

        if(idBeaconRssiMap.has(peripheral.uuid)) {
          let temp = idBeaconRssiMap.get(peripheral.uuid);

          if(temp.length >= idRSSIMapSize) {
            temp.shift();
          }

          temp.push(peripheral.rssi);
          idBeaconRssiMap.set(peripheral.uuid, temp);
        } else {
          idBeaconRssiMap.set(peripheral.uuid, [peripheral.rssi]);
        }

        if(isFocusMode) {
          peripheral.advertisement.serviceData.find(function(el) {
            let idTelemetryPacket = estimoteParser.parseEstimoteIDTelemetryPacket(el.data);
            if(!_.isNil(idTelemetryPacket.isMoving)) {
              userMovingMap.set(idTags[i].uuid, idTelemetryPacket.isMoving);
              // Mqtt.publish(Mqtt.USER_ISMOVING(idTags[i].uuid), idTelemetryPacket.isMoving.toString());
            }
          });
        }

        return;

      }
    }
  }

  // Telemetry Beacon
  if (isStartTelemetry) {
    if(_.map(telemetrySensors, 'uuid').indexOf(peripheral.uuid) > -1){
      peripheral.advertisement.serviceData.find(function(el) {
        if(el.uuid == ESTIMOTE_SERVICE_UUID && el.data){
          let telemetryPacket = estimoteParser.parseEstimoteTelemetryPacket(el.data);
          if (telemetryPacket) {
            Mqtt.publish(Mqtt.AMBIE_LIGHT_LEVEL(telemetryPacket.shortIdentifier), telemetryPacket.ambientLightLevel);
          }
        }
      });
    }
  }
});

class SensorManager {
  static setup(isStartID_, isStartTelemetry_, idTags_, telemetrySensors_) {
    isStartID = _.isNil(isStartID_) ? false : isStartID_;
    isStartTelemetry = _.isNil(isStartTelemetry_) ? false : isStartTelemetry_;

    if(isStartID)
      idTags = idTags_;
    
    if(isStartTelemetry)
      telemetrySensors = telemetrySensors_;
  }

  static setIsScanId(isStartID) {
    if(_.isBoolean(isStartID))
      isStartID = isStartID;
  }

  static setIsScanTelemetry(isStartTelemetry) {
    if(_.isBoolean(isStartTelemetry))
      isStartTelemetry = isStartTelemetry;
  }

  static setIdTags(idTags_) {
    if(_.isArray(idTags_) && idTags_.length > 0)
      idTags = idTags_;
  }

  static setTelemetrySensors(telemetrySensors_) {
    if(_.isArray(telemetrySensors_) && telemetrySensors_.length > 0)
      telemetrySensors = telemetrySensors_;
  }

  static setIsFocusMode(b) {
    if(_.isBoolean(b))
      isFocusMode = b;
  }

  static getIsUserMoving(userId) {
    return userMovingMap.get(userId);
  }

  static start() {
    if (!isStartID && !isStartTelemetry)
      return Logger.debug('no task for noble...');

    // iBeacon have fastest broadcast rate (100ms), need to batch process
    myIDBeaconIntervalId = setInterval(() => {
      idBeaconRssiMap.forEach((val, key) => {
        let result = _.sum(val) / val.length;

        if(!isNaN(result)) {
          Mqtt.publish(Mqtt.ID_RSSI(key), result.toString());
        } 
      });
    }, reportRssiInterval);
  }

  static isRuning() {
    return !_.isNil(myIDBeaconIntervalId);
  }

  static stopAll() {
    Logger.info("estimote manager task end.");
    // Mqtt.publish(Mqtt.VB_ILS_CONNECTION, 'false');
    noble.stopScanning();
    setTimeout(() => {
      if (!_.isNil(myIDBeaconIntervalId))
        clearInterval(myIDBeaconIntervalId);
    }, 0);
  }
}

module.exports = SensorManager;