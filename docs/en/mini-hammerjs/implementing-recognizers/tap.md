# Implementing Tap

Welcome to Part Three! In the previous part, we successfully built the "skeleton" of our gesture library—the core engine. Now, it's time to add the first "organ" to this skeleton. We will start with the most basic and common gesture: `Tap`.

Before implementing `Tap`, we first need to design a "blueprint" that all gesture recognizers must follow—the `Recognizer` base class. This base class will define the common properties and methods for all recognizers, ensuring they can be uniformly managed by the `Manager`.

## 1. The Recognizer Base Class

`Recognizer` is the parent class for all concrete gesture recognizers (like `TapRecognizer`, `PanRecognizer`). It inherits from `EventEmitter`, so each recognizer instance can emit its own events.

Let's add the code for the `Recognizer` class in `index.js`:

```javascript
// === Recognizer ===
class Recognizer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = uniqueId(); // Each recognizer instance has a unique ID
    this.options = extend({}, this.defaults, options); // Merge default and user options
    this.state = STATE_POSSIBLE; // Initial state
    this.enabled = true; // Whether it's enabled
  }

  // Default options, can be overridden by subclasses
  get defaults() {
    return {};
  }

  // Core method: called by Manager to process input data
  recognize(inputData) {
    if (!this.enabled) {
      return;
    }
    // Call the process method implemented by the subclass
    this.process(inputData);
  }

  // Subclasses must implement this method to define specific recognition logic
  process(inputData) {
    // to be implemented by sub-classes
  }

  // Emit a gesture event
  emit(data) {
    // Inject recognizer information
    data.recognizer = this;
    // Call the emit method of the parent EventEmitter
    super.emit('recognize', data);
  }
}
```

The core ideas of the `Recognizer` base class are to define a common workflow:

*   **Configuration Merging**: In the constructor, `extend({}, this.defaults, options)` allows subclasses to define their own `defaults` and lets users override them by passing in `options`.
*   **Unified Entry Point**: The `Manager` will only call the public method `recognize(inputData)`.
*   **Template Method Pattern**: The `recognize` method internally calls `process(inputData)`. This is a "template method" that defines the skeleton of the algorithm, deferring the concrete implementation to subclasses. Each subclass only needs to focus on implementing its own `process` method.
*   **Event Emission**: The `emit` method is overridden to automatically inject the recognizer instance `this` into the event data before emitting the `recognize` event.

## 2. Implementing TapRecognizer

With the `Recognizer` base class, implementing `TapRecognizer` becomes very clear. What conditions must a `Tap` gesture satisfy?

1.  It must be a single-finger operation (`pointerLength === 1`).
2.  The time from finger down (`INPUT_START`) to finger up (`INPUT_END`) must be short enough (e.g., less than 250ms).
3.  During this period, the finger's movement distance must be small enough (e.g., less than 10px).

Let's implement it in code:

```javascript
// === TapRecognizer ===
class TapRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this.tapCount = 0; // Used to support multi-taps, like doubletap
  }

  // Override default options
  get defaults() {
    return {
      event: 'tap',       // Gesture event name
      pointers: 1,      // Number of required pointers
      time: 250,        // Maximum press time (ms)
      threshold: 10,    // Maximum movement distance (px)
    };
  }

  // Implement the core recognition logic
  process(inputData) {
    const { pointerLength, type, timeStamp, center } = inputData;
    const { options } = this;

    if (type === INPUT_START) {
      // Record the start time and position
      this.startTime = timeStamp;
      this.startCenter = center;
      this.state = STATE_POSSIBLE;
      return;
    }

    if (type === INPUT_END) {
      const deltaTime = timeStamp - this.startTime;
      const deltaX = center.x - this.startCenter.x;
      const deltaY = center.y - this.startCenter.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Check if all conditions are met
      if (
        deltaTime < options.time &&
        distance < options.threshold &&
        pointerLength === options.pointers
      ) {
        // Conditions met, recognition successful!
        this.state = STATE_RECOGNIZED;
        this.emit({ type: options.event, ...inputData });
      } else {
        // Conditions not met, recognition failed
        this.state = STATE_FAILED;
      }
    }
  }
}
```

## 3. Code Analysis

1.  **Configuration**: In `defaults`, we define the three core parameters required to recognize a `Tap` gesture: `pointers`, `time`, and `threshold`.

2.  **`process(inputData)`**: This is the core of the recognition logic.
    *   On `INPUT_START`, we don't perform any checks; we simply record the start time and position and set the state to `STATE_POSSIBLE`.
    *   On `INPUT_END`, we perform the actual calculations and checks. We calculate the press duration `deltaTime` and the movement `distance`.
    *   Then, in an `if` statement, we check if the three conditions—**time, distance, and number of pointers**—are all met simultaneously.
    *   If all are met, we set the state to `STATE_RECOGNIZED` and call `this.emit()` to publish the `tap` event!
    *   If not, we set the state to `STATE_FAILED`.

## 4. The Moment of Magic

Now we have our first complete gesture recognizer. Let's combine it with the `Manager` we built earlier and see what happens.

In your `index.html`, import `index.js` and add the following test code:

```html
<script type="module">
  // Assuming all your classes are in index.js
  import { Manager, TapRecognizer } from './index.js'; // (You need to export the classes)

  const card = document.getElementById('card');
  const manager = new Manager(card);

  // Create and add TapRecognizer
  const tap = new TapRecognizer();
  manager.add(tap);

  // Listen for the tap event
  manager.on('tap', (e) => {
    console.log('Card was tapped!');
    card.style.backgroundColor = card.style.backgroundColor === 'red' ? '#42a5f5' : 'red';
  });
</script>
```

*(To make the `import` work, you need to `export` the classes from `index.js`)*

Now, when you click the card with your mouse or finger, you will see "Card was tapped!" printed in the console, and the card's color will toggle between blue and red!

Congratulations! You have successfully completed the entire flow from low-level input to a high-level gesture event. This seemingly simple `Tap` gesture encapsulates the intelligence of all the modules we've built so far. From this moment on, building more complex gestures will no longer be a mystery to you.