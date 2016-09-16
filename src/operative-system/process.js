'use strict';

const debug = require('debug')('process-scheduler:operative-system/process');

class Process {
  constructor(options) {
    debug('creating process [%s] for [%s]', options.name, options.fileName);

    this.fileName = options.fileName;
    this.name = options.name;
    this.heap = {};
    this.stack = [];
    this.needsResource = false;

    if (typeof options.compute !== 'function') {
      throw new Error('A "compute" function was expected to be specified.');
    }

    if (options.compute.length < 1) {
      throw new Error('The "compute" function was expected to receive a callback');
    }

    this._compute = options.compute;
  }

  run() {
    this._computeCancellation = this._compute.apply(this.compute, arguments);
    return this._computeCancellation;
  }

  cancel() {
    clearTimeout(this._computeCancellation);
  }
}

module.exports = Process;
