const TpBulb = require('./tplink-bulb');
const _ = require('lodash');
const async = require('async');
const Logger = require('../../../util/logger');

var _turnOffLight = function(bulb, transition, callback) {
  bulb.send(
    {
      'smartlife.iot.smartbulb.lightingservice': {
        'transition_light_state': {
          'on_off': 0,
          'transition_period': transition
        }
      }
    }
  ).then(response => {
    // client.publish('light/on/'+addr, 'false');
    return callback(null, response);
  }).catch(err => {
    return callback(err, null); 
  });
}

var _turnOnLight = function(bulb, transition, callback) {
  bulb.send(
    {
      'smartlife.iot.smartbulb.lightingservice': {
        'transition_light_state': {
          'on_off': 1,
          'brightness': 100,
          'transition_period': transition
        }
      }
    }
  ).then(response => {
    // client.publish('light/on/'+addr, 'on');
    return callback(null, response);
  }).catch(err => {
    return callback(err, null); 
  });
}

class MyBulb {
  constructor(addr, brand, timeout=1000) {
    if(_.isNil(addr))
      return console.error('addr is not given...');
    this.addr = addr;
    this.timeout = timeout;

    if(brand === 'tplink') {
      this.bulb = new TpBulb(addr);
    } else {
      Logger.error('Bulb brand: ' + brand + ' NOT FOUND...');
    }
  }

  turnOffLight(transition = 0) {
    let p = async.timeout(_turnOffLight, this.timeout);
    return new Promise((resolve, reject) => {
      p(this.bulb, transition, (err, data)=>{
        if(err) {
          // console.error(1, err);
          this.bulb.close();
          reject(
            {
              ip: this.addr,
              err: err
            }
          );
        }
        resolve(
          {
            ip: this.addr,
            data: data
          }
        );
      });
    });
  }

  turnOnLight(transition = 0) {
    let p = async.timeout(_turnOnLight, this.timeout);
    return new Promise((resolve, reject) => {
      p(this.bulb, transition, (err, data)=>{
        if(err) {
          // console.error(2, err);
          this.bulb.close();
          reject(
            {
              ip: this.addr,
              err: err
            }
          );
        }
        resolve(
          {
            ip: this.addr,
            data: data
          }
        );
      });
    });
  }

  // changeBrightness(brightness) {
  //   return new Promise((resolve, reject) => {
  //     if(isNaN(brightness)) {
  //       reject('brightness is not a number')
  //     }
  //     new ..(addr).send({
  //       'smartlife.iot.smartbulb.lightingservice': {
  //         'transition_light_state': {
  //           'brightness': brightness
  //         }
  //     }}).then(()=>{ resolve('Done') }, (err)=>{ reject(err) })
  //   })
  // }
}

module.exports = MyBulb;