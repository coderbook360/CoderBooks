# Input Adapter Layer: Compatibility for Mouse and Touch

When building a cross-device gesture library, the first challenge we face is: **How to gracefully handle events from different input devices?**

*   On a PC, users operate with a **mouse**, and the events are `mousedown`, `mousemove`, and `mouseup`.
*   On mobile devices, users operate with **touch**, and the events are `touchstart`, `touchmove`, and `touchend`.

These events have significant differences in their API design. If our gesture recognition logic directly depends on these native events, the code will be filled with numerous `if (isTouch) { ... } else { ... }` branches, making it difficult to maintain and extend.

The mission of the `InputAdapter` is to solve this problem. It acts like a "translator," converting the varied "dialect" events from different devices into a common "standard language" signal that our system can understand.

## 1. Design Idea: Unified Input Model

Our goal is that, regardless of whether the underlying input is from a mouse or touch, the upper-level gesture recognition logic only needs to care about one unified input type. Recall the input event constants we defined in Chapter 4:

*   `INPUT_START`: Input begins
*   `INPUT_MOVE`: Input is moving
*   `INPUT_END`: Input ends
*   `INPUT_CANCEL`: Input is canceled (e.g., an incoming call interrupts the touch)

The core responsibility of the `InputAdapter` is to listen for the underlying mouse or touch events and then convert them into our four defined unified input types, along with standardized data such as the number of fingers, coordinates, timestamps, etc.

## 2. Coding the Implementation

Let's create the `InputAdapter` class in `index.js`. It will inherit from `EventEmitter` so that it can notify external listeners when an internal input event occurs.

```javascript
// === InputAdapter ===
class InputAdapter extends EventEmitter {
  constructor(element) {
    super(); // Call the parent EventEmitter's constructor
    this.element = element; // The DOM element to listen for gestures on

    // Store the currently active pointers (mouse or touch points)
    this.pointers = [];

    // Bind event handler functions to ensure `this` is correctly referenced
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleCancel = this.handleCancel.bind(this);

    // Initialize: start listening for events
    this.init();
  }

  init() {
    // Listen for mouse events
    this.element.addEventListener('mousedown', this.handleStart);
    document.addEventListener('mousemove', this.handleMove); // Note: mousemove is usually listened for on the document
    document.addEventListener('mouseup', this.handleEnd);

    // Listen for touch events
    this.element.addEventListener('touchstart', this.handleStart);
    this.element.addEventListener('touchmove', this.handleMove);
    this.element.addEventListener('touchend', this.handleEnd);
    this.element.addEventListener('touchcancel', this.handleCancel);
  }

  // Destroy function to clean up event listeners
  destroy() {
    this.element.removeEventListener('mousedown', this.handleStart);
    document.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);

    this.element.removeEventListener('touchstart', this.handleStart);
    this.element.removeEventListener('touchmove', this.handleMove);
    this.element.removeEventListener('touchend', this.handleEnd);
    this.element.removeEventListener('touchcancel', this.handleCancel);
  }

  // Handle the input start event
  handleStart(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_START : INPUT_START;
    // Convert the native event to our unified input data format
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // Handle the input move event
  handleMove(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_MOVE : INPUT_MOVE;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // Handle the input end event
  handleEnd(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_END : INPUT_END;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // Handle the input cancel event
  handleCancel(ev) {
    const type = ev.type.startsWith('touch') ? INPUT_CANCEL : INPUT_CANCEL;
    const inputData = this.normalizeInput(ev);
    this.emit(type, inputData);
  }

  // Standardize the native event (MouseEvent or TouchEvent) into a unified input data format
  normalizeInput(ev) {
    // Get all currently active pointers (fingers or mouse)
    const pointers = this.getPointers(ev);
    // Get the center point of the first pointer
    const center = this.getCenter(pointers);

    return {
      // Event type
      type: ev.type,
      // Timestamp
      timeStamp: now(),
      // Number of pointers (fingers)
      pointerLength: pointers.length,
      // Center point of the first pointer
      center,
      // Detailed data for all pointers
      pointers,
      // The native event object, for possible future use
      srcEvent: ev,
    };
  }

  // Get all currently active pointers
  getPointers(ev) {
    const pointers = [];
    if (ev.type.startsWith('touch')) {
      // Handle TouchEvent
      const touchEvent = ev;
      for (let i = 0; i < touchEvent.touches.length; i++) {
        const touch = touchEvent.touches[i];
        pointers.push({
          id: touch.identifier, // Unique ID for each touch point
          x: touch.pageX,
          y: touch.pageY,
        });
      }
    } else if (ev.type.startsWith('mouse')) {
      // Handle MouseEvent
      const mouseEvent = ev;
      // The mouse has only one pointer, we give it a fixed ID
      pointers.push({
        id: 1,
        x: mouseEvent.pageX,
        y: mouseEvent.pageY,
      });
    }
    // Update the internal pointer list
    this.pointers = pointers;
    return pointers;
  }

  // Calculate the center point of a set of pointers
  getCenter(pointers) {
    if (pointers.length === 0) {
      return { x: 0, y: 0 };
    }
    if (pointers.length === 1) {
      return { x: pointers[0].x, y: pointers[0].y };
    }
    // Calculate the average of all pointer coordinates
    const sum = pointers.reduce((acc, pointer) => {
      acc.x += pointer.x;
      acc.y += pointer.y;
      return acc;
    }, { x: 0, y: 0 });

    return {
      x: sum.x / pointers.length,
      y: sum.y / pointers.length,
    };
  }
}
```

## 3. Code Analysis

The core idea of this code is "standardization":

1.  **Event Listening**: In the `init()` method, we listen for both mouse and touch events. Note that for `mousemove` and `mouseup`, we listen on the `document` object. This is to handle cases where the mouse continues to be tracked after moving off the target element.

2.  **Event Handling**: `handleStart`, `handleMove`, `handleEnd`, and `handleCancel` are the four event handler functions. They all call `normalizeInput(ev)` to standardize the data and publish our unified input events via `this.emit()`.

3.  **Data Standardization**: `normalizeInput(ev)` is the core. It extracts the data we care about from the native event, such as the number of pointers, coordinates, and timestamp, and encapsulates it into a uniformly formatted object. Whether the underlying event is a `TouchEvent` or a `MouseEvent`, the data structure received by the upper layer is consistent.

4.  **Pointer Management**: `getPointers(ev)` is responsible for extracting the coordinate information of all active pointers (fingers or mouse) from the native event. For touch events, we use the `touchEvent.touches` array; for mouse events, we treat it as a single pointer and assign it a fixed ID.

5.  **Center Point Calculation**: `getCenter(pointers)` is used to calculate the center point for multi-touch gestures, which is crucial for gestures like `Pinch` and `Rotate`.

With this, we now have a powerful "sensory system." It shields us from device differences, allowing the upper-level gesture recognition logic to focus on judging "intent" without worrying about whether the underlying input is from a mouse or a finger. In the next chapter, we will use this system to build our first gesture recognizer—the `TapRecognizer`.