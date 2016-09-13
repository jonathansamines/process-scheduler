'use strict';

const EventEmitter = require('events');
const ControlBlock = require('./process-control-block');

const SCHEDULE_INTERVAL = 10000;

const processQueue = (opts) => {
  let queueProcessingEnabled = true;

  opts.reporter.emit(`transition:${opts.from.name.toLowerCase()}`, opts.from);

  const nextProcess = () => {
    if (queueProcessingEnabled && opts.from.queue !== null) {
      if (opts.allowTransition(opts.from.queue, opts.from.queue.next)) {
        opts.to.queue = opts.from.queue;
        opts.from.queue = opts.from.queue.next;
        opts.reporter.emit(`transition:${opts.to.name.toLowerCase()}`, opts.to.queue);
      }

      // try again later
      setTimeout(nextProcess, SCHEDULE_INTERVAL);
    }
  };

  process.nextTick(nextProcess);

  return function stop() {
    queueProcessingEnabled = false;
  };
};

const dequeue = (from) => {
  const top = from.queue;
  if (top !== null) {
    from.queue = top.next;

    return top;
  }

  return null;
};

const queue = (from, controlBlock) => {
  if (from.queue === null) {
    from.queue = controlBlock;
  } else {
    from.queue.next = controlBlock;
  }
};

class Scheduler extends EventEmitter {
  constructor() {
    super();

    this.states = {
      NEW: {
        name: 'NEW',
        description: 'A new process is created',
        transitions: [
          {
            name: 'ADMITTED',
            description: 'The new process was admitted by the OS',
            // newState: this.states.READY,
          },
        ],
        queue: null,
      },
      READY: {
        name: 'READY',
        description: 'Process is ready to be assigned',
        transitions: [
          {
            name: 'RUN',
            description: 'The process resources assignment is done.',
            // newState: this.states.RUNNING,
          },
        ],
        queue: null,
      },
      RUNNING: {
        name: 'RUNNING',
        description: 'The process is running and its resources have been assigned',
        transitions: [
          {
            name: 'EXIT',
            description: 'The process has either exited as completed or an error has ocurred',
            // newState: this.states.TERMINATED,
          },
          {
            name: 'BLOCK',
            description: 'The process is waiting for an external operation to finish',
            // newState: this.states.WAITING,
          },
          {
            name: 'INTERRUPTED',
            description: 'The process execution has been interrupted',
            // newState: this.states.READY,
          },
        ],
        queue: null,
      },
      WAITING: {
        name: 'WAITING',
        description: 'Process is waiting for an external event to finish',
        queue: null,
        transitions: [
          {
            name: 'RESUMED',
            description: 'The process waiting for an external action has finished',
            // newState: this.states.READY,
          },
        ],
      },
      TERMINATED: {
        name: 'TERMINATED',
        description: 'Process finished',
        transitions: [],
        // this state has no queue
      },
    };
  }

  /**
   * Schedule a new process
   * @return {PCB} Returns the new PCB allocated for the provided process.
   */
  schedule(PID, quantum, processToSchedule) {
    const controlBlock = new ControlBlock(PID, processToSchedule);
    controlBlock.priority = 10;
    controlBlock.quatum = quantum;

    const from = this.states.NEW;
    const to = this.states.READY;

    controlBlock.state = from;

    queue(from, controlBlock);
    processQueue({
      from,
      to,
      allowTransition: () => true,
      reporter: this,
    });
  }

  run(processor, memory) {
    const from = this.states.READY;
    const to = this.states.RUNNING;

    processQueue({
      from,
      to,
      allowTransition: (top) => {
        try {
          console.log('trying to allocate memory');
          memory.allocate(top.memory);
          processor.compute(top.computingTime);

          top.processor = processor;

          this.once('transition:running', (current) => {
            if (current !== top) {
              return;
            }

            setTimeout(() => {
              console.log('movign to waiting');
              queue(this.states.WAITING, top);
            }, top.quantum);
          });

          return true;
        } catch (e) {
          console.log(e);
          // no enough resources
          return false;
        }
      },
      reporter: this,
    });
  }
}

module.exports = Scheduler;
