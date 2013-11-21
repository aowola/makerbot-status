module.exports = (function MakerStatusModule() {
  'use strict';
  var events     = require('events'),
      q          = require('Q'),
      serialport = require('serialport'),
      util       = require('./util'),
      Serial     = require('./serial');

  var MakerStatus = function() {};

  MakerStatus.prototype.init = function(portname, config) {
    this.port = new serialport.SerialPort(portname, config.serial, false);
    this.timeout_ms = config.promise.timeout_ms;
    this.serial = new Serial(this.port);
  };

  MakerStatus.prototype.reset = function() {
    var d = q.defer();
    if (this.port) {
      this.port.close();
      this.port.open(function() {
        d.resolve(port);
      });
    } else {
      d.reject({name:"Reset Exception", message:"Port is not defined."});
    }
    return d.promise;
  };

  MakerStatus.prototype.open = function() {
    var d = q.defer();
    this.port.open(function() {
      d.resolve();
    });
    return d.promise;
  };

  MakerStatus.prototype.close = function() {
    if (this.port) {
      this.port.close();
    }
  };

  MakerStatus.prototype.getBuildName = function() {
    var d = q.defer();
    var packet = util.query(util.CONSTANTS.HOST.QUERY.GET_BUILD_NAME);

    if (!this.serial) {
      d.reject({name:"Init Exception", message:"Serial not initialized"});
    } else {
      this.serial["write"](packet)
        .then(function(res) {
          if(res[0] === util.CONSTANTS.RESPONSE_CODE.SUCCESS) {
            var name = "";
            for(var i = 1; i < res.byteLength; i++) {
              if (res[i] != 0) name = name + String.fromCharCode(res[i]);
            }
            d.resolve({buildname:name});
          } else {
            d.reject(res[0]);
          }
        });
    }
    return q.timeout(d.promise, this.timeout_ms,  "Get Build Name Timeout Occured.");
  }

  MakerStatus.prototype.getToolheadTemperature = function(tool) {
    var d = q.defer();
    tool = tool === null || tool === undefined ? 0 : tool;
    var packet = util.query(util.CONSTANTS.HOST.QUERY.TOOL_QUERY, tool, 
                            util.CONSTANTS.TOOL.QUERY.GET_TOOLHEAD_TEMP);
    
    if (!this.serial) {
      d.reject({name:"Init Exception", message:"Serial not initialized"});
    } else {
      this.serial["write"](packet)
        .done(function(res) {
          if(res[0] === util.CONSTANTS.RESPONSE_CODE.SUCCESS) {
             var celsius = ((res[1] | ((res[2] & 0xFF) << 8)));
            d.resolve({celsius:celsius});
          } else {
            d.reject(res[0]);
          }
        });
    }
    return q.timeout(d.promise, this.timeout_ms, "Get Toolhead Temperature Timeout Occured.");
  };

  MakerStatus.prototype.getBuildStatistics = function() {
    var d = q.defer();
    var packet = util.query(util.CONSTANTS.HOST.QUERY.GET_BUILD_STATS);
    
    if (!this.serial) {
      d.reject({name:"Init Exception", message:"Serial not initialized"});
    } else {
      this.serial["write"](packet)
        .done(function(res) {
          if(res[0] === util.CONSTANTS.RESPONSE_CODE.SUCCESS) {
            var stats = {
              state:"",
              hours: 0,
              minutes: 0
            },
            build_state_consts = util.CONSTANTS.BUILD_STATE;
            for(var state in build_state_consts) {
              if(build_state_consts.hasOwnProperty(state)) {
                if(build_state_consts[state] === res[1]) {
                  stats.state = util.CONSTANTS.BUILD_STATE_DESC[state];
                  break;
                }
              }
            }
            stats.hours = res[2];
            stats.minutes = res[3];
            d.resolve(stats);
          } else {
            d.reject(res[0]);
          }
        });
    }
    return q.timeout(d.promise, this.timeout_ms, "Get Build Statistics Timeout Occured.");
  };

return MakerStatus;
})();