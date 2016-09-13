'use strict';

class System {
  constructor(processors, memorySlots) {
    this.processors = processors || [];
    this.memorySlots = memorySlots || [];
    this.devices = [];
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
      throw new Error('Not processors are available to be assigned. The workload has been exceeded.');
    }
  }

  getAvailableMemorySlot() {
    const availableMemory = this.memorySlots.filter((memory) => (
      memory.availableMemory() > 0
    )).pop();

    if (!availableMemory) {
      throw new Error('There is no memory available.');
    }
  }

  getTotalMemory() {
    return this.memorySlots.reduce((totalMemory, memory) => (
      totalMemory + memory.availableMemory()
    ), 0);
  }

  /**
   *
   * Allocates the specified memory if there is still memory available,
   * if not throws an error
   *
   * @param {Number} memoryToAllocate totalMemory in bytes to allocate
   */
  allocateMemory(memoryToAllocate) {
    const memory = this.getAvailableMemorySlot();
    memory.allocate(memoryToAllocate);
  }

  /**
   * De-Allocates the specified memory
   *
   * @param {Number} memoryToDeAllocate total memory in bytes to deallocate
   */
  deAllocateMemory(memoryToDeAllocate) {
    const memory = this.getAvailableMemorySlot();
    memory.deAllocate(memoryToDeAllocate);
  }
}

module.exports = System;
