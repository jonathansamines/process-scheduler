'use strict';

const EventEmitter = require('events');
const debug = require('debug')('process-scheduler:pcb');
const states = require('./states');

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
    this.pointerControl = 0;
    this.process = processToSchedule;
    this.state = states.NEW;
    this.processor = null;

    // allocate random memory
    this.memory = Math.ceil(Math.random() * 1000);

    // next PCB in the queue set to null
    this.next = null;

    let isComputingAllowed = true;
    const conditionalCompute = () => {
      return (cb) => {
        if (isComputingAllowed) {
          isComputingAllowed = false;
          this.process.compute(cb);
        }
      };
    };

    this.once('started', () => {
      if (this.process.needsResource) {
        const externalEventTimeout = Math.ceil(Math.random() * 4000);

        this.block(); // put process to wait

        debug('scheduling process [%s] blocking to %s ms', this.PID, externalEventTimeout);

        this._waitToResume = setTimeout(() => {
          clearTimeout(this._waitToInterrupt);

          this.process.needsResource = false;
          this.resume();

          conditionalCompute(this.finish.bind(this));
        }, externalEventTimeout);
      }

      debug('scheduling process [%s] interruption in %s ms', this.PID, this.quantum);

      this._waitToInterrupt = setTimeout(() => {
        clearTimeout(this._waitToResume);

        this.interrupt();
        isComputingAllowed = false;
      }, this.quantum);

      debug('scheduling process [%s] termination', this.PID);

      conditionalCompute(() => {
        clearTimeout(this._waitToInterrupt);
        clearTimeout(this._waitToResume);

        this.finish();
      });
    });
  }

  interrupt() {
    debug('trying to interrupt the process [%s]', this.PID);

    if (this.state === states.RUNNING) {
      debug('process [%s] interrupted', this.PID);

      const previousState = this.state;
      this.state = states.NEW;
      this.emit('interrupted', this, previousState, this.state);
      this.emit('state-changed', this, previousState, this.state);

      return;
    }

    this.emit('error', new Error('Cannot interrupt a non-running process.'));
  }

  start() {
    debug('trying to start the process [%s]', this.PID);

    if (this.state === states.NEW) {
      debug('process [%s] running', this.PID);

      const previousState = this.state;
      this.state = states.RUNNING;
      this.emit('started', this, previousState, this.state);
      this.emit('state-changed', this, previousState, this.state);

      return;
    }

    this.emit('error', new Error('Cannot start a non-new process.'));
  }

  block() {
    debug('trying to block the process [%s]', this.PID);

    if (this.state === states.RUNNING) {
      debug('process [%s] blocked', this.PID);

      const previousState = this.state;
      this.state = states.WAITING;
      this.emit('blocked', this, previousState, this.state);
      this.emit('state-changed', this, previousState, this.state);

      return;
    }

    this.emit('error', new Error('Cannot block a non-running proces.'));
  }

  resume() {
    debug('trying to resume the process [%s]', this.PID);

    if (this.state === states.WAITING) {
      debug('process [%s] resumed', this.PID);

      const previousState = this.state;
      this.state = states.NEW;
      this.emit('resumed', this, previousState, this.state);
      this.emit('state-changed', this, previousState, this.state);

      return;
    }

    this.emit('error', new Error('Cannot resume a non-blocked process.'));
  }

  finish() {
    debug('trying to terminate the process [%s]', this.PID);

    if (this.state === states.RUNNING) {
      debug('process [%s] completed', this.PID);

      const previousState = this.state;
      this.state = states.TERMINATED;
      this.emit('finished', this, previousState, this.state);
      this.emit('state-changed', this, previousState, this.state);

      return;
    }

    this.emit('error', new Error('Cannot finish a non-running process'));
  }
}

module.exports = ProcessControlBlock;
