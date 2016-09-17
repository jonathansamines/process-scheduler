'use strict';

const paper = require('paper/dist/paper-core');
const System = require('./operative-system');
const PrimaryMemory = require('./operative-system/memory');
const Process = require('./operative-system/process');
const Processor = require('./operative-system/processor');
const Scheduler = require('./scheduler');

const PRIMARY_MEMORY_CAPACITY = Math.pow(1024, 3) * 1; // 1GB
const PRIMARY_PROCESSOR_CAPACITY = Math.pow(1024, 3) * 1.3; // 1.3GHZ
const primaryProcessor = new Processor(PRIMARY_PROCESSOR_CAPACITY);
const primaryMemory = new PrimaryMemory(PRIMARY_MEMORY_CAPACITY);
const scheduler = new Scheduler({
  // scheduleInterval: 5,
});
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
});


const view = {
  baseColor: '#0070ba',
  lineColor: '#f0f0f0',
  contrastColor: '#de0063',
  stateSize: 30,
};

const states = {
  NEW: () => {
    const container = new paper.Path.Circle({
      center: [50, 50],
      radius: view.stateSize,
      fillColor: view.baseColor,
    });

    const text = new paper.PointText(new paper.Point(50 - 12, 50 + 5));
    text.fillColor = 'white';
    text.fontWeight = 'bold';
    text.content = 'New';

    return container;
  },

  READY: () => {
    const container = new paper.Path.Circle({
      center: [200, 200],
      radius: view.stateSize,
      fillColor: view.baseColor,
    });

    const text = new paper.PointText(new paper.Point(200 - 18, 200 + 5));
    text.fillColor = 'white';
    text.fontWeight = 'bold';
    text.content = 'Ready';

    return container;
  },

  RUNNING: () => {
    const stateRunning = new paper.Path.Circle({
      center: [500, 200],
      radius: view.stateSize,
      fillColor: view.baseColor,
    });

    const textRunning = new paper.PointText(new paper.Point(500 - 25, 200 + 5));
    textRunning.fillColor = 'white';
    textRunning.fontWeight = 'bold';
    textRunning.content = 'Running';
    textRunning.fontSize = 12;

    return stateRunning;
  },

  WAITING: () => {
    const stateWaiting = new paper.Path.Circle({
      center: [350, 350],
      radius: view.stateSize,
      fillColor: view.baseColor,
    });

    const textWaiting = new paper.PointText(new paper.Point(350 - 20, 350 + 5));
    textWaiting.fillColor = 'white';
    textWaiting.fontWeight = 'bold';
    textWaiting.content = 'Waiting';

    return stateWaiting;
  },

  TERMINATED: () => {
    const stateTerminated = new paper.Path.Circle({
      center: [550, 50],
      radius: view.stateSize,
      fillColor: view.baseColor,
    });

    const textTerminated = new paper.PointText(new paper.Point(550 - 32, 50 + 5));
    textTerminated.fillColor = 'white';
    textTerminated.fontWeight = 'bold';
    textTerminated.content = 'Terminated';

    return stateTerminated;
  },
};

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('myCanvas');

	// Create an empty project and a view for the canvas:
  paper.setup(canvas);

  const path = new paper.Path({
    strokeColor: view.lineColor,
    strokeWidth: 6,
    center: [0, 0],
    strokeCap: 'square',
  });

  const statesMap = {};
  Object.keys(states).forEach((state) => {
    const createState = states[state];

    statesMap[state] = createState();
  });

  const map = [
    {
      from: statesMap.NEW.position,
      to: statesMap.READY.position,
      direction: {
        x: +1,
        y: +1,
      },
    },
    {
      from: statesMap.READY.position,
      to: statesMap.RUNNING.position,
      direction: {
        x: +1,
        y: +1,
      },
    },
    {
      from: statesMap.RUNNING.position,
      to: statesMap.WAITING.position,
      direction: {
        x: -1,
        y: +1,
      },
    },
    {
      from: statesMap.RUNNING.position,
      to: statesMap.TERMINATED.position,
      direction: {
        x: +1,
        y: -1,
      },
    },
    {
      from: statesMap.RUNNING.position,
      to: statesMap.READY.position,
      direction: {
        x: -1,
        y: +1,
      },
    },
    {
      from: statesMap.WAITING.position,
      to: statesMap.READY.position,
      direction: {
        x: -1,
        y: +1,
      },
    },
  ];

  // Add 5 segment points to the path spread out
  // over the width of the view:
  map.forEach((step) => {
    path.add([step.from.x, step.from.y], [step.to.x, step.to.y]);
  });

  // path.simplify();
  // path.smooth();

  let process;
  const processQueue = [];

  statesMap.NEW.onFrame = function onFrame() {
    // get the next process
    if (process === undefined) {
      process = processQueue[processQueue.length - 1];

      return;
    }

    // no next transition yet
    if (process.meta.nextTransition === null) {
      processQueue.push(process);
      process = undefined;
      return;
    }

    const directionX = Math.sign(process.meta.nextTransition.direction.x);
    const directionY = Math.sign(process.meta.nextTransition.direction.y);

    // move in x
    if (process.position.x * directionX <= process.meta.nextTransition.position.x) {
      process.position.x += directionX * 10;
    }

    // move in y
    if (process.position.y * directionY <= process.meta.nextTransition.position.y) {
      process.position.y += directionY * 10;
    }

    // at this point reach the next state node
    if (process.position.y * directionY > process.meta.nextTransition.position.y
       && process.position.x * directionX > process.meta.nextTransition.position.x) {
      // current = list.shift();
      console.log('reached target state...');
    }
  };

  scheduler.on('transition:new', (pcb) => {
    console.log('New process [%s] created with (time=%sms, memory=%sbytes, quantum=%sms)',
      pcb.PID,
      pcb.process.computingTime,
      pcb.memoryConsumption,
      pcb.quantum);

    // const currentStateNode = statesMap[pcb.state.name];
    // const processNode = new paper.Path.Circle({
    //   center: [currentStateNode.position.x, currentStateNode.position.y],
    //   radius: 10,
    //   fillColor: view.contrastColor,
    // });
    //
    // processNode.meta = {};
    // processNode.meta.pcb = pcb;
    // processNode.meta.nextTransition = statesMap[target.name];
    // processNode.meta.nextTransition.direction = {
    //   x: +1,
    //   y: +1,
    // };
    // processQueue.push(processNode);
  });

  scheduler.on('transition:ready', (pcb, origin, target) => {
    console.log('Process [%s] ready to be allocated with (time=%sms, memory=%sbytes, quantum=%sms)',
      pcb.PID,
      pcb.process.computingTime,
      pcb.memoryConsumption,
      pcb.quantum);

    const currentStateNode = statesMap[origin.name];
    let processNode = processQueue.find((node) => node.meta.pcb.PID === pcb.PID);

    if (!processNode) {
      processNode = new paper.Path.Circle({
        center: [currentStateNode.position.x, currentStateNode.position.y],
        radius: 10,
        fillColor: view.contrastColor,
      });
    }

    if (processNode) {
      console.log(target);
      processNode.meta = {};
      processNode.meta.pcb = pcb;
      processNode.meta.nextTransition = statesMap[target.name];
      processNode.meta.nextTransition.direction = {
        x: target.name === 'READY' ? -1 : +1,
        y: +1,
      };

      processQueue.push(processNode);
    }
  });

  scheduler.on('transition:running', (pcb, origin, target) => {
    console.log('Process [%s] running with (time=%sms, memory=%sbytes, quantum=%sms)',
      pcb.PID,
      pcb.process.computingTime,
      pcb.memoryConsumption,
      pcb.quantum);

    const processNode = processQueue.find((node) => node.meta.pcb.PID === pcb.PID);
    if (processNode) {
      processNode.meta.pcb = pcb;
      processNode.meta.nextTransition = statesMap[target.name];
      processNode.meta.nextTransition.direction = {
        x: target.name === 'READY' ? -1 : +1,
        y: +1,
      };
    }
  });

  scheduler.on('transition:waiting', (pcb, origin, target) => {
    console.log('Process [%s] waiting for external event with (time=%sms, memory=%sbytes, quantum=%sms)',
      pcb.PID,
      pcb.process.computingTime,
      pcb.memoryConsumption,
      pcb.quantum);

    const processNode = processQueue.find((node) => node.meta.pcb.PID === pcb.PID);
    if (processNode) {
      processNode.meta.pcb = pcb;
      processNode.meta.nextTransition = statesMap[target.name];
      processNode.meta.nextTransition.direction = {
        x: +1,
        y: +1,
      };
    }
  });

  scheduler.on('transition:terminated', (pcb, origin, target) => {
    console.log('Process [%s] completed.', pcb.PID);

    const processNode = processQueue.find((node) => node.meta.pcb.PID === pcb.PID);
    if (processNode) {
      processNode.meta.pcb = pcb;
      processNode.meta.nextTransition = statesMap[target.name];
      processNode.meta.nextTransition.direction = {
        x: +1,
        y: +1,
      };
    }
  });

  const processCounter = new Array(1);
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
      compute(cb) {
        return setTimeout(cb, this.computingTime);
      },
    });

    scheduler.schedule({ PID, quantum, priority }, newProcess);
  }
});
