'use strict';

const debug = require('debug')('process-scheduler:scheduler');
const EventEmitter = require('events');
const states = require('./states');
const ControlBlock = require('./process-control-block');

const internals = {
  SCHEDULE_INTERVAL: 10000,
  queues: {
    NEW: [],
    TERMINATED: [],
    RUNNING: [],
    READY: [],
    WAITING: [],
  },
};

internals.processQueue = (options) => {
  debug('processing queue [%s]', options.origin.name);

  const nextProcess = () => {
    const originQueue = internals.queues[options.origin.name];
    const pcb = originQueue[originQueue.length - 1];

    if (pcb !== undefined) {
      if (options.shouldTransition(options.origin, options.target, pcb)) {
        debug('moving process [%s] from [%s] to [%s]', pcb.PID, options.origin.name, options.target.name);

        internals.queues[options.target.name].push(originQueue.pop());
        options.reporter.emit(`transition:${options.target.name.toLowerCase()}`, pcb, options.target);
        options.reporter.emit('transition', pcb, options.target);
      }

      setTimeout(nextProcess, internals.SCHEDULE_INTERVAL);
    }
  };

  process.nextTick(nextProcess);
};

class Scheduler extends EventEmitter {
  constructor() {
    super();

    this.id = Date.now();

    debug('creating scheduler [%s]', this.id);

    internals.processQueue({
      reporter: this,
      origin: states.NEW,
      target: states.READY,
      shouldTransition: () => true,
    });

    this.once('transition:running', (pcbAllowedToRun) => {
      pcbAllowedToRun.on('state-changed', (pcb, origin, target) => {
        if (target === states.TERMINATED) return;
        internals.processQueue({
          origin,
          target,
          reporter: this,
          shouldTransition: () => true,
        });
      });

      pcbAllowedToRun.start();
    });
  }

  /**
   * Schedule a new process
   * @return {PCB} Returns the new PCB allocated for the provided process.
   */
  schedule(meta, processToSchedule) {
    const controlBlock = new ControlBlock(meta, processToSchedule);

    debug('new PCB created with ID %s and quantum duration of %dms', controlBlock.PID, controlBlock.quantum);

    internals.queues[controlBlock.state.name].push(controlBlock);
  }

  run(processor, memory) {
    internals.processQueue({
      reporter: this,
      origin: states.READY,
      target: states.RUNNING,
      shouldTransition(origin, target, pcb) {
        try {
          debug('trying to allocate computing resources for process [%s](%s bytes)', pcb.PID, pcb.memoryConsumption);

          pcb.assignProcessor(processor);
          pcb.assignMemory(memory);

          memory.allocate(pcb.memoryConsumption);
          processor.compute(pcb.process.computingTime, () => {
            pcb.deAssignProcessor();
            pcb.deAssignMemory();

            memory.deAllocate(pcb.memory);
          });

          return true;
        } catch (e) {
          debug('Disallowing process [%s] transition to %s due insufficient resorces', pcb.PID, target.name);
          debug(e);

          return false;
        }
      },
    });
  }
}

module.exports = Scheduler;
