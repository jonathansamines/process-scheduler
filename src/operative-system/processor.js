'use strict';

const debug = require('debug')('process-scheduler:/operative-system/processor');

class Processor {
  compute() {
    debug('computing process');
  }

  /**
   * Indicates the current workload for this processor instance
   * @return {Number} a percentage (between 1 and 100) indicating the work load
   */
  workLoad() {
    return 10;
  }
}

module.exports = Processor;
