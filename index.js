var q           = require('Q');
var serialport  = require('serialport');
var util        = require('./util');
var MakerStatus = require('./makerstatus');

var config = {
  promise: { timeout_ms: 250 },
  serial: { baudrate: 115200 }
};

var makerbot = new MakerStatus();

// List Serial Ports
serialport.list(function(err, ports) {
  if(err) throw err;
  for(var i = 0; i < ports.length; ++i) {
    var port = ports[i];
    if(port.pnpId.indexOf('MakerBot') !== -1 || port.manufacturer.indexOf('MakerBot Industries') !== -1) {
      console.log("Found MakerBot", port.comName);
      
      makerbot.init(port.comName, config);
      makerbot.open()
        .then(makerbot.getBuildName.bind(makerbot))
        .then(function(name) { console.log('getBuildName:', name); })
        .then(makerbot.getBuildStatistics.bind(makerbot))
        .then(function(stats) { console.log('getBuildStatistics:', stats); })
        .then(makerbot.getToolheadTemperature.bind(makerbot))
        .then(function(temp) { console.log('getToolheadTemperature:', temp); })
        .fail(function(err) { 
          makerbot.close();
          console.log("Closing Serial Port.");
          throw err;
        }).done(makerbot.close.bind(makerbot));
    }
  }
});