'use strict';

const EventEmitter = require('events');
const debug = require('debug')('process-scheduler:pcb');
const states = require('./states');

const internals = {
  transitionsMap: {
    ADMIT: {
      event: 'admitted',
      name: 'admit',
      description: 'The new process was admitted by the OS',
      from: states.NEW,
      to: states.READY,
    },
    START: {
      event: 'running',
      name: 'start',
      description: 'The process resources assignment is done.',
      from: states.READY,
      to: states.RUNNING,
    },
    WAIT: {
      event: 'waiting',
      name: 'wait',
      description: 'The process is waiting for an external operation to finish',
      from: states.RUNNING,
      to: states.WAITING,
    },
    RESUME: {
      event: 'resumed',
      name: 'resume',
      description: 'The process waiting for an external action has finished',
      from: states.WAITING,
      to: states.READY,
    },
    INTERRUPT: {
      event: 'interrupted',
      name: 'interrupt',
      description: 'The process execution has been interrupted by the scheduler',
      from: states.RUNNING,
      to: states.READY,
    },
    TERMINATE: {
      event: 'terminated',
      name: 'terminate',
      description: 'The process has either exited as completed or an error has ocurred',
      from: states.RUNNING,
      to: states.TERMINATED,
    },
  },
};

internals.transitionTo = (pcb, transition) => {
  debug('trying to %s the process [%s]', transition.name, pcb.PID);

  if (pcb.state === transition.from) {
    debug('process [%s] %s', pcb.PID, transition.event);

    const previousState = pcb.state;
    pcb.state = transition.to;
    pcb.emit(transition.event, pcb, previousState, pcb.state);
    pcb.emit('state-changed', pcb, previousState, pcb.state);

    return;
  }

  pcb.emit('error', new Error(`Cannot move to ${transition.to.name} from ${pcb.state.name}`));
};

class ProcessControlBlock extends EventEmitter {

  /**
   * ProcessControlBlock
   * @constructor
   * @param {Number} meta.PID process id
   * @param {Nuber} meta.quantum process quantum
   * @param {Number} meta.priority
   * @param {Process} processToSchedule
   */
  constructor(meta, processToSchedule) {
    super();

    this.PID = meta.PID;
    this.quantum = meta.quantum || 0;
    this.priority = meta.priority || 0;
    this.process = processToSchedule;
    this.state = states.NEW;

    // allocate random memory
    this.memoryConsumption = Math.ceil(Math.random() * 10000);

    // internal state
    this._assignedProcessor = null;
    this._assignedMemory = null;

    this.on('running', () => {
      if (this.process.needsResource) {
        const externalEventTimeout = Math.ceil(Math.random() * 4000);

        this.wait();

        debug('scheduling process [%s] blocking to %s ms', this.PID, externalEventTimeout);

        this._waitToResume = setTimeout(() => {
          this.process.cancel();
          clearTimeout(this._waitToInterrupt);

          this.process.needsResource = false;
          this.resume();
        }, externalEventTimeout);
      }

      debug('scheduling process [%s] interruption in %s ms', this.PID, this.quantum);

      this._waitToInterrupt = setTimeout(() => {
        this.process.cancel();
        clearTimeout(this._waitToResume);

        this.interrupt();
      }, this.quantum);

      debug('starting process [%s] computing', this.PID);

      this.process.run(() => {
        clearTimeout(this._waitToInterrupt);
        clearTimeout(this._waitToResume);

        this.terminate();
      });
    });
  }

  assignProcessor(processor) {
    debug('assigned processor [%s] to process [%s]', processor.id, this.PID);

    this._assignedProcessor = processor;
  }

  deAssignProcessor() {
    debug('de-assigned processor [%s] to process [%s]', this._assignedProcessor.id, this.PID);

    this._assignedProcessor = null;
  }

  assignMemory(primaryMemory) {
    debug('assigned memory [%s] to process [%s]', primaryMemory.id, this.PID);

    this._assignedMemory = primaryMemory;
  }

  deAssignMemory() {
    debug('de-assigned memory [%s] to process [%s]', this._assignedMemory.id, this.PID);

    this._assignedMemory = null;
  }

  admit() {
    internals.transitionTo(this, internals.transitionsMap.ADMIT);
  }

  start() {
    internals.transitionTo(this, internals.transitionsMap.START);
  }

  interrupt() {
    internals.transitionTo(this, internals.transitionsMap.INTERRUPT);
  }

  wait() {
    internals.transitionTo(this, internals.transitionsMap.WAIT);
  }

  resume() {
    internals.transitionTo(this, internals.transitionsMap.RESUME);
  }

  terminate() {
    internals.transitionTo(this, internals.transitionsMap.TERMINATE);
  }
}

module.exports = ProcessControlBlock;
