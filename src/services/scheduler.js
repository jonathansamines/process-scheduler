'use strict';

const EventEmitter = require('events');
const ControlBlock = require('./process-control-block');

class Scheduler {
  constructor() {
    this.states = {
      NEW: {
        name: 'NEW',
        description: 'A new process is created',
        queue: null,
      },
      READY: {
        name: 'READY',
        description: 'Process is ready to be assigned',
        queue: null,
      },
      RUNNING: {
        name: 'RUN',
        description: 'The process is running and its resources have been assigned',
        queue: null,
      },
      WAITING: {
        name: 'WAITING',
        description: 'Process is waiting for an external event to finish',
        queue: null,
      },
      TERMINATED: {
        name: 'TERMINATED',
        description: 'Process finished',
        // this state has no queue
      },
    };

    this.transitions = {
      NEW: [
        {
          name: 'ADMITTED',
          description: 'The new process was admitted by the OS',
          newState: this.states.NEW,
        },
      ],
      READY: [
        {
          name: 'RUN',
          description: 'The process resources assignment is done.',
          newState: this.states.RUNNING,
        },
      ],
      RUNNING: [
        {
          name: 'EXIT',
          description: 'The process has either exited as completed or an error has ocurred',
          newState: this.states.TERMINATED,
        },
        {
          name: 'BLOCK',
          description: 'The process is waiting for an external operation to finish',
          newState: this.states.WAITING,
        },
        {
          name: 'INTERRUPTED',
          description: 'The process execution has been interrupted',
          newState: this.states.READY,
        },
      ],
      WAITING: [
        {
          name: 'RESUMED',
          description: 'The process waiting for an external action has finished',
          newState: this.states.READY,
        },
      ],
      TERMINATED: [],
    };
  }

  scheduleProcess(processToSchedule) {
    const reporter = new EventEmitter();
    const controlBlock = new ControlBlock(processToSchedule);
    controlBlock.pointerControl = 0;
    controlBlock.processor = null;
    controlBlock.priority = 10;
    controlBlock.quatum = 10;
    controlBlock.state = this.states.NEW;
    controlBlock.memoryToAllocate = 10;
    controlBlock.computing = 100;

    const nextState = controlBlock.state;
    const transitionsForState = this.transitions[nextState.name];

    if (nextState.queue === null) {
      nextState.queue = controlBlock;
    } else {
      nextState.queue.nextPCB = controlBlock;
    }

    let pcb = nextState.queue;
    while (pcb != null) {
      const nextTransition = transitionsForState.filter((transition) => {
        return pcb.status[transition.when];
      });

      pcb.state = nextTransition.newState;
      pcb = pcb.nextPCB;

      break;
    }

    reporter.emit('state-changed', {
      name: this.states.NEW.name,
    });
  }
}

module.exports = Scheduler;
