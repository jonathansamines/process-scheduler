'use strict';

const System = require('./operative-system');
const PrimaryMemory = require('./operative-system/memory');
const Process = require('./operative-system/process');
const Processor = require('./operative-system/processor');
const Scheduler = require('./scheduler');

const PRIMARY_MEMORY_CAPACITY = Math.pow(1024, 3) * 1; // 1GB
const PRIMARY_PROCESSOR_CAPACITY = Math.pow(1024, 3) * 1.3; // 1.3GHZ
const primaryProcessor = new Processor(PRIMARY_PROCESSOR_CAPACITY);
const primaryMemory = new PrimaryMemory(PRIMARY_MEMORY_CAPACITY);
const scheduler = new Scheduler();
const system = new System({
  processors: [primaryProcessor],
  memorySlots: [primaryMemory],
});

system.on('state:insufficient-resources', (err) => {
  console.log('There are no enough resources available.');
  console.error(err);
});

system.on('state:resources-available', (processor, memory) => {
  console.log('Resources available to be allocated.');

  scheduler.run(processor, memory);

  // scheduler.on('transition:terminated', (pcb, reason) => {
  //   console.log('Process completed. Reason: %s', reason.state);
  // });
  //
  // scheduler.on('transition:waiting', (pcb) => {
  //   console.log('Process [%s] waiting for external event', pcb.PID);
  // });
  //
  // scheduler.on('transition:running', (pcb) => {
  //   console.log('Process [%s] running ', pcb.PID);
  // });
  //
  // scheduler.on('transition:ready', (pcb) => {
  //   console.log('Process [%s] ready to be allocated', pcb.PID);
  // });
});

const processCounter = new Array(20);
for (const pair of processCounter.entries()) {
  const number = pair[0];
  const PID = system.generatePID();
  const quantum = Math.ceil(Math.random() * 50) * 100;
  const computingTime = Math.ceil(Math.random() * 10) * quantum;
  const priority = Math.ceil(Math.random() * 10);

  const newProcess = new Process({
    computingTime,
    fileName: `/path/to/the-file-${number}`,
    name: `the-process-${number}`,
    compute: (cb) => {
      return setTimeout(cb, this.computingTime);
    },
  });

  scheduler.schedule({ PID, quantum, priority }, newProcess);
  // scheduler.on('transition:new', (pcb) => {
  //   console.log('New process [%s] created.', pcb.PID);
  // });
}
