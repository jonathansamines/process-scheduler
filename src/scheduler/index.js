'use strict';

const EventEmitter = require('eventemitter2');
const debug = require('debug')('process-scheduler:scheduler');
const states = require('./states');
const ControlBlock = require('./process-control-block');

const internals = {
  SCHEDULE_INTERVAL: 1000 * 5,
  queues: {
    NEW: [],
    READY: [],
    RUNNING: [],
    WAITING: [],
    TERMINATED: [],
  },
};

internals.transitionTo = (options) => {
  debug('processing queue [%s]', options.origin.name);

  const evalTransition = options.evalTransition || (() => true);

  const nextProcess = () => {
    const originQueue = internals.queues[options.origin.name];
    const targetQueue = internals.queues[options.target.name];
    const pcb = originQueue[originQueue.length - 1];

    if (pcb !== undefined) {
      if (evalTransition(pcb, options.origin, options.target)) {
        debug('moving process [%s] from [%s] to [%s]', pcb.PID, options.origin.name, options.target.name);

        targetQueue.push(originQueue.pop());
        options.reporter.emit(`transition:${options.target.name.toLowerCase()}`, pcb, options.target);
        options.reporter.emit('transition', pcb, options.target);
      }

      setTimeout(nextProcess, options.interval);
    }
  };

  setTimeout(nextProcess, 0);
};

class Scheduler extends EventEmitter {
  constructor(options) {
    super();

    options = options || {};
    this.scheduleInterval = options.scheduleInterval || internals.SCHEDULE_INTERVAL;
    this.id = Date.now();

    debug('creating scheduler [%s] with interval of %ds', this.id, this.scheduleInterval / 1000);

    internals.transitionTo({
      reporter: this,
      origin: states.NEW,
      target: states.READY,
      interval: 100,
      evalTransition(pcb) {
        pcb.admit();

        return true;
      },
    });
  }

  /**
   * Schedule a new process
   * @return {PCB} Returns the new PCB allocated for the provided process.
   */
  schedule(meta, processToSchedule) {
    const controlBlock = new ControlBlock(meta, processToSchedule);

    debug('new PCB created with ID %s and quantum duration of %dms', controlBlock.PID, controlBlock.quantum);

    this.emit(`transition:${controlBlock.state.name.toLowerCase()}`, controlBlock);
    internals.queues[controlBlock.state.name].push(controlBlock);
  }

  run(processor, memory) {
    const self = this;

    const processTransaction = (p, origin, target) => {
      internals.transitionTo({
        origin,
        target,
        reporter: self,
        interval: self.scheduleInterval,
      });
    };

    internals.transitionTo({
      reporter: this,
      origin: states.READY,
      target: states.RUNNING,
      interval: this.scheduleInterval,
      evalTransition(pcb, origin, target) {
        try {
          debug('trying to allocate computing resources for process [%s](%s bytes)', pcb.PID, pcb.memoryConsumption);

          pcb.assignProcessor(processor);
          pcb.assignMemory(memory);
          pcb.start();

          memory.allocate(pcb.memoryConsumption);
          processor.compute(pcb.process.computingTime, () => {
            pcb.deAssignProcessor();
            pcb.deAssignMemory();

            memory.deAllocate(pcb.memoryConsumption);
          });

          pcb.removeListener('state-changed', processTransaction);
          pcb.on('state-changed', processTransaction);

          return true;
        } catch (e) {
          pcb.deAssignProcessor();
          pcb.deAssignMemory();
          memory.deAllocate(pcb.memoryConsumption);

          debug('Disallowing process [%s] transition to %s due insufficient resorces', pcb.PID, target.name);
          debug(e);

          return false;
        }
      },
    });
  }
}

module.exports = Scheduler;
