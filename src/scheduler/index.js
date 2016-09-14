'use strict';

const debug = require('debug')('process-scheduler:scheduler');
const EventEmitter = require('events');
const states = require('./states');
const ControlBlock = require('./process-control-block');

const internals = {
  SCHEDULE_INTERVAL: 10000,
};

internals.processQueue = (opts) => {
  let queueProcessingEnabled = true;

  opts.reporter.emit(`transition:${opts.from.name.toLowerCase()}`, opts.from.queue);

  const nextProcess = () => {
    if (queueProcessingEnabled && opts.from.queue !== null) {
      if (opts.allowTransition(opts.from.queue, opts.from.queue.next)) {
        debug('transitioning to state %s', opts.to.name);

        opts.to.queue = internals.dequeue(opts.from);
        opts.reporter.emit(`transition:${opts.to.name.toLowerCase()}`, opts.to.queue);
      }

      debug('retrying transition');
      setTimeout(nextProcess, internals.SCHEDULE_INTERVAL);
    }
  };

  process.nextTick(nextProcess);

  return function stop() {
    debug('disabling queue processing on stop call');

    queueProcessingEnabled = false;
  };
};

internals.dequeue = (from) => {
  const top = from.queue;
  if (top !== null) {
    from.queue = top.next;

    return top;
  }

  return null;
};

internals.queue = (from, controlBlock) => {
  if (from.queue === null) {
    from.queue = controlBlock;
  } else {
    from.queue.next = controlBlock;
  }
};

class Scheduler extends EventEmitter {

  /**
   * Schedule a new process
   * @return {PCB} Returns the new PCB allocated for the provided process.
   */
  schedule(PID, quantum, processToSchedule) {
    const controlBlock = new ControlBlock(PID, quantum, processToSchedule);

    debug('new PCB created with ID %s and quantum duration of %dms', PID, controlBlock.quantum);

    const from = states.NEW;
    const to = states.READY;

    internals.queue(from, controlBlock);
    internals.processQueue({
      from,
      to,
      allowTransition: () => true,
      reporter: this,
    });
  }

  run(processor, memory) {
    const from = states.READY;
    const to = states.RUNNING;

    internals.processQueue({
      from,
      to,
      allowTransition: (proc) => {
        try {
          debug('trying to allocate computing resources for process [%s, %s]', proc.memory, proc.computingTime);

          memory.allocate(proc.memory);
          processor.compute(proc.computingTime);

          // assign resources to pcb
          proc.processor = processor;

          this.once('transition:running', (runningProcess) => {
            if (runningProcess !== proc) {
              return;
            }

            runningProcess.start();

            // schedule to waiting once the quantum expires
            runningProcess.on('interrupted', () => {
              debug('moving process to ', states.WAITING.name);
              internals.queue(states.WAITING, proc);
            });
          });

          return true;
        } catch (e) {
          debug('Disallowing transition to %s due insufficient resorces', to.name);
          debug(e);

          return false;
        }
      },
      reporter: this,
    });
  }
}

module.exports = Scheduler;
