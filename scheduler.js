'use strict';

function Scheduler(config) {
    const self = this;
    self._timeoutId = null;
    self._totalPostponingSeconds = 0;
    self.config = config;
};

Scheduler.prototype.schedule = function(callback) {
    const self = this;
    
    if (self.config.buffer_max_seconds && (self.config.buffer_max_seconds <= self._totalPostponingSeconds + self.config.buffer_seconds)) {
        return;
    }
    
    if (self._timeoutId) {
        clearTimeout(this._timeoutId);
    }

    self._timeoutId = setTimeout(function() {
        self._timeoutId = null;
        self._totalPostponingSeconds = 0;
        
        callback();
    }, self.config.buffer_seconds * 1000);
    self._totalPostponingSeconds += this.config.buffer_seconds;
    
};
    

module.exports = Scheduler;
