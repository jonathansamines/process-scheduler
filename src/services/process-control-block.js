'use strict';

class ProcessControlBlock {
  constructor(PID, processToSchedule) {
    this.PID = PID;
    this.process = processToSchedule;
    this.pointerControl = 0;

    // the initial resources are null
    // since they are not set until the process is set to RUNNING
    this.processor = null;
    this.memory = null;
    this.state = null;

    // next PCB in the queue set to null
    this.next = null;
  }
}

module.exports = ProcessControlBlock;
