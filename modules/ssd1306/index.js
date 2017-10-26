const PythonShell = require('python-shell');
const Logger = require('../../util/logger');
const _ = require('lodash');

var autoOffTimeout = null;

const pythonShellOptions = {
  scriptPath: '/home/pi/vesta/modules/ssd1306', 
  mode: 'json'
}

// oled.stdout.on('data', function (buffer) {
//   let data = buffer.toString();
//   console.log(data)
// });

function command(command, args=null) {
  const oled = new PythonShell('oled.py', pythonShellOptions);

  oled.send({ command: command, args: args }).end((err) => {
    if(err)
      Logger.error(err);
  });
}

/**
 * OLED.writeText('Hello', 2000, 10);
 * OLED.writeText(['Hello', 'World'], 2000);
 * OLED.writeText(['Hello', 'World', 'Lewis']);
 */
module.exports.writeText = (text, autoOffTime, fontSize) => {
  // cancel previous displayer auto off timmer if got new display task
  if(!_.isNil(autoOffTimeout))
    clearTimeout(autoOffTimeout)
  
  let args = [];
  
  if(_.isArray(text)) {
    if(text.length > 0 && text.length <= 3)
      args = _.concat(args, text);
    else
      return Logger.error('Given display text have wrong length: ', text.length);
  } else {
    args = [text];
  }

  if(fontSize)
    args.push(fontSize);
  command('write_text', args);

  if(!_.isNil(autoOffTime)) {
    autoOffTimeout = setTimeout(function() {
      command('turn_off');
    }, autoOffTime);
  }
  
}

module.exports.turnOff = () => {
  command('turn_off');
}