module.exports = (function SerialModule() {
  'use strict';
  var events = require('events'),
      q      = require('Q'),
      util   = require('./util');

  var Serial = function(port) {
    this.port = port;
    this.port.on('error', this.err.bind(this));
    this.port.on('data', this.process.bind(this));
    this.decoder = new util.PacketStreamDecoder();
  }

  Serial.prototype = Object.create(events.EventEmitter.prototype);

  Serial.prototype.process = function(buffer) {
    try {
      for (var i = 0; i < buffer.length; ++i) {
        this.decoder.parseByte(buffer[i]);
        if(this.decoder.isPayloadReady()) {
          var payload = this.decoder.payload;
          this.decoder.reset();
          this.emit('payload', payload);
        }
      }
    } catch(err) {
      this.decoder.reset();
      this.emit('error', err);
    }
  };

  Serial.prototype.write = function(buffer) {
    var d = q.defer();
    try {
      this.once('payload', function(payload) {
        d.resolve(payload);
      });
      this.once('error', function(err) {
        d.reject(err);
      });
      this.decoder.reset();
      if (!Buffer.isBuffer(buffer)) {
        throw { name:"Argument Exception", message: 'buffer not of type Buffer' };
      }
      this.port.write(buffer, function(err) {
        if (err) this.emit('error', err);
      }.bind(this));
    } catch(err) {
      this.emit('error', err);
    }
    return d.promise;
  };

  Serial.prototype.err = function(err) {
    this.decoder.reset();
    this.emit('error', err);
  };

return Serial;
})();