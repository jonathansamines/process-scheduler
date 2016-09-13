'use strict';

class PrimaryMemory {
  constructor(capacity) {
    this.capacity = capacity;
    this.consumedMemory = 0;
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

    this.consumedMemory = resultingMemory < 0 ? 0 : resultingMemory;
  }
}

module.exports = PrimaryMemory;
