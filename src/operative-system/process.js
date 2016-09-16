'use strict';

const debug = require('debug')('process-scheduler:operative-system/process');

class Process {
  constructor(options) {
    debug('creating process [%s] for [%s]', options.name, options.fileName);

    this.fileName = options.fileName;
    this.name = options.name;
    this.heap = {};
    this.stack = [];
    this.computingTime = options.computingTime;
    this.needsResource = false;

    if (typeof options.compute !== 'function') {
      throw new Error('A "compute" function was expected to be specified.');
    }

    if (options.compute.length < 1) {
      throw new Error('The "compute" function was expected to receive a callback');
    }

    this._compute = options.compute;
  }

  run(callback) {
    this._processStartTime = Date.now();

    debug('starting logical process with computing time %s', this.computingTime);

    this._computeCancellation = this._compute(() => {
      this.computingTime = Date.now() - this._processStartTime;
      return callback();
    });

    return this._computeCancellation;
  }

  cancel() {
    this.computingTime -= Date.now() - this._processStartTime;
    this._processStartTime = null;

    debug('cancelling logical process. Remaining computing time %s ms', this.computingTime);

    clearTimeout(this._computeCancellation);
  }
}

module.exports = Process;
