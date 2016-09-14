'use strict';

const EventEmitter = require('events');
const debug = require('debug')('process-scheduler:pcb');
const states = require('./states');

class ProcessControlBlock extends EventEmitter {
  constructor(PID, quantum, processToSchedule) {
    super();

    this.PID = PID;
    this.process = processToSchedule;
    this.pointerControl = 0;
    this.quantum = quantum;
    this.state = states.NEW;

    // the initial resources are null
    // since they are not set until the process is set to RUNNING
    this.processor = null;
    this.priority = Math.ceil(Math.random() * 10);

    // allocate random memory
    this.memory = Math.ceil(Math.random() * 1000);

    // next PCB in the queue set to null
    this.next = null;

    let allowComputing = true;
    const conditionalCompute = () => {
      return (cb) => {
        if (allowComputing) {
          allowComputing = false;
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
        allowComputing = false;
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

      this.state = states.NEW;
      this.emit('interrupted', this);

      return;
    }

    this.emit('error', new Error('Cannot interrupt a non-running process.'));
  }

  start() {
    debug('trying to start the process [%s]', this.PID);

    if (this.state === states.NEW) {
      debug('process [%s] running', this.PID);

      this.state = states.RUNNING;
      this.emit('started', this);

      return;
    }

    this.emit('error', new Error('Cannot start a non-new process.'));
  }

  block() {
    debug('trying to block the process [%s]', this.PID);

    if (this.state === states.RUNNING) {
      debug('process [%s] blocked', this.PID);
      this.state = states.WAITING;
      this.emit('blocked', this);

      return;
    }

    this.emit('error', new Error('Cannot block a non-running proces.'));
  }

  resume() {
    debug('trying to resume the process [%s]', this.PID);

    if (this.state === states.WAITING) {
      debug('process [%s] resumed', this.PID);

      this.state = states.NEW;
      this.emit('resumed', this);

      return;
    }

    this.emit('error', new Error('Cannot resume a non-blocked process.'));
  }

  finish() {
    debug('trying to terminate the process [%s]', this.PID);

    console.log(this.state);

    if (this.state === states.RUNNING) {
      debug('process [%s] completed', this.PID);

      this.state = states.TERMINATED;
      this.emit('finished', this);

      return;
    }

    this.emit('error', new Error('Cannot finish a non-running process'));
  }
}

module.exports = ProcessControlBlock;
