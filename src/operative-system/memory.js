'use strict';

const debug = require('debug')('process-scheduler:operative-system/memory');

class PrimaryMemory {
  constructor(capacity) {
    this.capacity = capacity;
    this.consumedMemory = 0;
    this.id = Date.now();

    const humanReadableCapacity = capacity / Math.pow(1024, 3);
    debug('creating memory [%s] with %s gb of capacity', this.id, humanReadableCapacity);
  }

  /**
   * Get the primary available memory
   * @return {Number}
   */
  get availableMemory() {
    return this.capacity - this.consumedMemory;
  }

  /**
   *
   * Allocates the specified memory if there is still memory available,
   * if not throws an error
   *
   * @param {Number} memoryToAllocate totalMemory in bytes to allocate
   */
  allocate(memoryToAllocate) {
    const realMemoryToAllocate = Math.abs(memoryToAllocate);
    const resultingMemory = this.consumedMemory + realMemoryToAllocate;
    if (resultingMemory <= this.capacity) {
      this.consumedMemory += realMemoryToAllocate;

      debug('allocated %s bytes on memory [%s]', realMemoryToAllocate, this.id);

      return;
    }

    throw new Error('The available memory has been exceeded. The memory was not allocated.');
  }

  /**
   * De-Allocates the specified memory
   *
   * @param {Number} memoryToDeAllocate total memory in bytes to deallocate
   */
  deAllocate(memoryToDeAllocate) {
    const resultingMemory = this.consumedMemory - Math.abs(memoryToDeAllocate);

    debug('deallocating %s bytes on memory [%s]', memoryToDeAllocate, this.id);

    this.consumedMemory = resultingMemory < 0 ? 0 : resultingMemory;
  }
}

module.exports = PrimaryMemory;
