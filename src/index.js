'use strict';

const System = require('./services/system');
const PrimaryMemory = require('./services/memory');
const Process = require('./services/process.js');
const Processor = require('./services/processor');
const Scheduler = require('./services/scheduler');

const PRIMARY_MEMORY_CAPACITY = 4096;
const scheduler = new Scheduler();
const system = new System({
  processors: [new Processor()],
  memorySlots: [new PrimaryMemory(PRIMARY_MEMORY_CAPACITY)],
});

system.on('state:insufficient-resources', (err) => {
  console.log('No enough resources? ', err);
});

// this event is emitted when there are resources available
// to allocate at least one of the process in the READY queue
system.on('state:resources-available', (processor, memory) => {
  console.log('Resources available to be allocated.');

  // try to move something to running
  scheduler.run(processor, memory);

  scheduler.on('transition:terminated', () => {
    console.log('Process finished...');
  }); // if the process finish (error or completion)
  scheduler.on('transition:waiting', () => {
    console.log('Process waiting for external event');
  }); // if the process is waiting for something?

  scheduler.on('transition:running', () => {
    console.log('A process is running');
  });
  scheduler.on('transition:ready', () => {
    console.log('Resources allocated for process');
  }); // if was resumed from waiting or interrupted by quatum expiration
});

for (const number of [1, 2, 3]) {
  const PID = system.generatePID();
  const newProcess = new Process({
    fileName: `/path/to/the-file-${number}`,
    name: `the-process-${number}`,
  });

  scheduler.schedule(PID, Math.ceil(Math.random() * 100), newProcess);
  scheduler.on('transition:new', () => {
    console.log('New process created.');
  }); // process just scheduled
}
