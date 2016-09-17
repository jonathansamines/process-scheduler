'use strict';

const EventEmitter = require('eventemitter2');
const debug = require('debug')('process-scheduler:operative-system/index');

const internals = {
  MONITOR_INTERVAL: 2000,
};

class System extends EventEmitter {
  constructor(options) {
    super();

    this.processors = options.processors || [];
    this.memorySlots = options.memorySlots || [];
    this.devices = [];

    debug('setting operative system with [%s] primary memories and [%s] processors', this.processors.length, this.memorySlots.length);

    let availableProcessor;
    let availableMemory;

    const monitorResources = () => {
      try {
        availableMemory = this.getAvailableMemorySlot();
        availableProcessor = this.getAvailableProcessor();

        debug('resources are available on system');

        return this.emit('state:resources-available', availableProcessor, availableMemory);
      } catch (error) {
        this.emit('state:insufficient-resources', error);
        return setTimeout(monitorResources, internals.MONITOR_INTERVAL);
      }
    };

    setTimeout(monitorResources, 0);
  }

  /**
   * Generates a unique identifier for a new process.
   * @return {Number}
   */
  generatePID() {
    return Date.now();
  }

  /**
   * Get an available processor or throws an error if the system processors capacity was exceeded.
   * @return {Processor}
   */
  getAvailableProcessor() {
    const availableProcessor = this.processors
      .sort((processor, nextProcessor) => (
        processor.workLoad() - nextProcessor.workLoad()
      )).pop();

    if (!availableProcessor) {
      throw new Error('No processors are available to be assigned. The workload has been exceeded.');
    }

    return availableProcessor;
  }

  getAvailableMemorySlot() {
    const availableMemory = this.memorySlots.filter((memory) => (
      memory.availableMemory > 0
    )).pop();

    if (!availableMemory) {
      throw new Error('There is no memory available.');
    }

    return availableMemory;
  }

  getTotalMemory() {
    return this.memorySlots.reduce((totalMemory, memory) => (
      totalMemory + memory.availableMemory
    ), 0);
  }
}

module.exports = System;
