# Process Scheduler
A simple process scheduling simulator. The goal for this project is to get a basic but complete simulation of the process scheduling algorithm used by modern *Operative Systems*.

```bash
  npm install --save process-scheduler-simulator
```

## Domain
- Hardware Resources
  - `Processor` - Represents the hardware CPU.
    - `speed` - Processor computation speed.
    - `compute` - Computes a given operation.

  - `Memory` - Represents the RAM
    - `availableMemory` - in bytes
    - `speed` - Memory allocation speed.
  - `Disc` - Represents the available secondary memory. (HDD)
    - `availableSpace` - in bytes
  - `Devices` - Represents an external device the computer can interact with.

- System
  - `processors` - Available processors on the machine.
  - `primaryMemory` - All RAM resources available.
  - `devices` - All available devices to the operating system (those which have a running driver).
  - `generatePID` - Generates a new unique PID.
  - `getAvailableProcessor` - Returns an available processor (the one with less work load). If there are not available processors, then this throws an error indicating there are not resources.
  - `allocateMemory(memory)` - Allocates a given amount of memory ram. If there is not enough memory to allocate, an error is thrown indicating it.
  - `deallocateMemory(memory)` - Deallocates a given amount of memory ram.

- Scheduler
  - `states` - Process possible states - New, Ready, Running, Waiting or Terminated.
    - `queue` - Each state process queue.
  - `_transitions` - Possible transitions between process states (Accepted, Run, Block, Exit)
  - `scheduleProcess(pid, process)` - Schedule a new process. The process starts at `New` state (added to the new queue). Emits the event `transition`, with a property `transition.name` set to `STATE` on each state transition.
    - `NEW`:
      - The process is added to the `NEW` queue.
      - The new process waits until is ready to be allocated. If there are enough resources the process transition to the `READY` state. If there are not enough resources, then the process is kept on the NEW queue until more resources are available.
    - `READY`
      - If the computation is done before the process quantum expiration, the process transition to the `TERMINATED` state.
      - If the computation takes more time than the quantum expiration, the process transition to the `READY` state and the resources are deallocated.
      - If the computation requires some external resource (device) or needs to wait for other resource to end its computation, the process transition to the `WAITING` state and the resources are deallocated.
    - `TERMINATED`
      - The process lifecycle has ended. The resources are deallocated.
    - `WAITING`
      - The process is waiting for some external operation to end.
      - Once the external operation is finished, the process is moved to the `READY` state.


- Process - the running entity of a given program.
  - `fileName` - path to file which contains the program code.
  - `name` - process name
  - `stack` - Stack of functions or procedures calls made by the program.
  - `heap` - Memory segment used to allocate values.

- Process Control Block - One per process running on the operative system. Handles the operations that can be achieved for the process.
  - `PID` - Collision free number autogenerated by the operative system.
  - `nextPCB` - Pointer to the next process in the PCB queues.
  - `pointerControl` - The actual process state.
  - `processor` - The assigned processor.
  - `priority` - Process priority. Taken in account on process scheduling queues.
  - `quantum` - Maximum amount of time allowed to be assigned to a processor.
  - `state` - Process current state. See `scheduler.states`.
  - Resources Allocation
    - `memoryToAllocate` - Amount of memory this process will allocate.
    - `data` - Available data space
  - `computing` - The time this process requires to ends its computation.
  - `resources` - Indicates the resources the process requires.
    - time: Since this is simulator, is just a delay of the time the resource waiting signal would delay.
    - name: One of the available devices.
  - The process emits a `finished` event when its computation is done.
