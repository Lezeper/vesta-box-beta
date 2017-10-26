'use strict';
/**
 * @moduleName Logger
 * @moduleVersion 1.0.0
 * @moduleGroup Util
 * @moduleDescription 
 * Write to local file. Support SocketIO.
 * 
 * @moduleDependency /
 * 
 * @moduleUsage
 * const Logger = require('./util/logger');
 * Logger.info(...);
 */
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const os = require('os');

function write(filePath, content, logType, io){
  var now = moment().format('YYYY-MM-DD HH:mm:ss');
  var json = {};
  json.time = now;
  json.triggerFile = filePath;
  json.logType = logType;
  json.content = content;
  fs.appendFile(__dirname + '/logger.log', JSON.stringify(json) + "," + os.EOL, {}, (err)=>{
    
  });
  
  if(!_.isNil(io) && _.isFunction(io.emit)) {
    io.emit(logType, now + ' ' + '[' + logType + '] ' + content + ' | ' + filePath);
  }
}

class Logger {
  /**
   * @moduleApiName setSocketIO
   * @moduleApiReturns /
   * @moduleApiDescription 
   * Enable emit socketIO event, it is optional.
   * 
   * @moduleApiParam
   * {"param": "io", "type": "socketIO", "description": "socketIO Object"}
   * 
   * @moduleApiExample
   * const io = require('socket.io')(http);
   * logger.setSocketIO(io);
   */
  static setSocketIO(io) {
    if(_.isNil(io))
      return write(module.parent.filename, 'io is not given...', 'ERROR');
    this.io = io;
  }
  /**
   * @moduleApiName info
   * @moduleApiReturns /
   * @moduleApiDescription
   * Write Info level logger
   * 
   * @moduleApiParam
   * {"param": "content", "type": "string", "description": "logger content"}
   * 
   * @moduleApiExample
   * logger.info(content);
   */
  static info(content) {
    console.info(content);
    write(module.parent.filename, content, 'INFO', this.io);
  }
  /**
   * @moduleApiName debug
   * @moduleApiReturns /
   * @moduleApiDescription
   * Write debug level logger
   * 
   * @moduleApiParam
   * {"param": "content", "type": "string", "description": "logger content"}
   * 
   * @moduleApiExample
   * logger.debug(content);
   */
  static debug(content) {
    console.log(content);
    write(module.parent.filename, content, 'DEBUG', this.io);
  }
  /**
   * @moduleApiName error
   * @moduleApiReturns /
   * @moduleApiDescription
   * Write Error level logger
   * 
   * @moduleApiParam
   * {"param": "content", "type": "string", "description": "logger content"}
   * 
   * @moduleApiExample
   * logger.error(content);
   */
  static error(content) {
    console.error(content);
    write(module.parent.filename, content, 'ERROR', this.io);
  }
  /**
   * @moduleApiName getStrLogger
   * @moduleApiReturns Return log file as string format
   * @moduleApiParam /
   * 
   * @moduleApiExample
   * logger.getStrLogger();
   */
  static getStrLogger() {
    return fs.readFileSync(__dirname + '/logger.log', 'utf8')
  }
  /**
   * @moduleApiName getJSONLogger
   * @moduleApiReturns Return log file as JSON format
   * @moduleApiParam /
   * 
   * @moduleApiExample
   * var obj = JSON.parse(logger.getJSONLogger());
   * console.log(obj[0].time)
   */
  static getJSONLogger() {
    var content = fs.readFileSync(__dirname + '/logger.log', 'utf8')
    var index = content.lastIndexOf('},')
    var JSONContent = null
    if(index > 0) {
      JSONContent = content.substr(0, index+1)
      JSONContent += content.substr(index+2, content.length)
    }
    return '[' + JSONContent + ']'
  }
  /**
   * @moduleApiName clear
   * @moduleApiReturns /
   * @moduleApiParam /
   * 
   * @moduleApiExample
   * logger.clear();
   */
  static clear() {
    return fs.writeFileSync(__dirname + '/logger.log', '')
  }
}

module.exports = Logger;