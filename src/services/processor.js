'use strict';

class Processor {
  compute() {
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
