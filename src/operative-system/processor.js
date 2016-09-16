'use strict';

const debug = require('debug')('process-scheduler:/operative-system/processor');

class Processor {
  constructor(capacity) {
    const humanReadableCapacity = capacity / Math.pow(1024, 3);

    this.id = Date.now();
    this.capacity = capacity;

    debug('creating processor [%s] with %s ghz of total capacity', this.id, humanReadableCapacity);
  }

  /**
   * Requires the processor to use certain computing time
   * @param {Number} computingTime number of milliseconds to use the processor
   */
  compute(computingTime, callback) {
    debug('using %s of computing time from processor [%s]', computingTime, this.id);

    const resultingCapacity = this.capacity - computingTime;

    if (resultingCapacity > 0) {
      this.capacity -= computingTime;
      return setTimeout(() => {
        this.capacity += computingTime;
        return callback();
      }, computingTime);
    }

    throw new Error('There are no enough computing resources for processor.');
  }

  /**
   * Indicates the current workload for this processor instance
   * @return {Number} a percentage (between 1 and 100) indicating the work load
   */
  workLoad() {
    return this.capacity;
  }
}

module.exports = Processor;
