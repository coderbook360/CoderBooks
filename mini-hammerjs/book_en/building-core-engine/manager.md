# Gesture Manager: The Manager

So far, we have two key modules:

*   `EventEmitter`: Responsible for publishing and subscribing to events, our "nervous system."
*   `InputAdapter`: Responsible for smoothing out device differences and providing a unified input signal, our "sensory system."

Now, we need a "brain" to connect them and direct the entire gesture recognition process. This "brain" is our `Manager` class. It is the main control center of `mini-hammer.js` and the entry point for user interaction.

## 1. The Core Responsibilities of the Manager

The responsibilities of the `Manager` can be summarized in three points:

1.  **Receiving Input**: It creates and holds an `InputAdapter` instance, listening for its published `start`, `move`, `end`, and `cancel` events.
2.  **Managing Recognizers**: It holds a list of gesture recognizers (`Recognizer`). When it receives input, it distributes the input data to all recognizers for processing.
3.  **Publishing Gesture Events**: It listens for gesture events published by each recognizer (such as `tap`, `panstart`) and re-publishes these events externally for the end-user.

In this way, the `Manager` acts like a traffic cop, directing the flow of data in an orderly manner between the `InputAdapter`, the `Recognizers`, and the end-user.

## 2. Coding the Implementation

Let's add the code for the `Manager` class in `index.js`. It also inherits from `EventEmitter` to publish gesture events externally.

```javascript
// === Manager ===
class Manager extends EventEmitter {
  constructor(element, options = {}) {
    super();
    this.element = element;
    this.options = extend({}, options); // Merge user options

    // List of recognizers
    this.recognizers = [];

    // Create an InputAdapter instance
    this.inputAdapter = new InputAdapter(element);

    // Bind the event handler
    this.handleInput = this.handleInput.bind(this);

    // Listen for events from the InputAdapter
    this.inputAdapter.on(INPUT_START, this.handleInput);
    this.inputAdapter.on(INPUT_MOVE, this.handleInput);
    this.inputAdapter.on(INPUT_END, this.handleInput);
    this.inputAdapter.on(INPUT_CANCEL, this.handleInput);
  }

  // Add a recognizer
  add(recognizer) {
    this.recognizers.push(recognizer);
    // Listen for gesture events published by the recognizer
    recognizer.on('recognize', (ev) => {
      // Re-publish the gesture event externally
      this.emit(ev.type, ev);
    });
  }

  // Handle input events from the InputAdapter
  handleInput(inputData) {
    // Distribute the input data to every recognizer
    this.recognizers.forEach(recognizer => {
      recognizer.recognize(inputData);
    });
  }

  // Destroy function
  destroy() {
    // Stop listening to the InputAdapter
    this.inputAdapter.off(INPUT_START, this.handleInput);
    this.inputAdapter.off(INPUT_MOVE, this.handleInput);
    this.inputAdapter.off(INPUT_END, this.handleInput);
    this.inputAdapter.off(INPUT_CANCEL, this.handleInput);

    // Destroy the InputAdapter
    this.inputAdapter.destroy();

    // Clear event listeners
    this.events = {};
  }
}
```

## 3. Code Analysis

1.  **`constructor`**: In the constructor, we create an `InputAdapter` instance and start listening to its four core events. All events are handled by the `handleInput` method.

2.  **`add(recognizer)`**: This is a key method of the `Manager`. It allows us to "register" externally created gesture recognizers with the `Manager`. After registration, the `Manager` will do two things:
    *   Store the recognizer in the `this.recognizers` array.
    *   Listen for any `recognize` events that the recognizer might publish in the future and bubble them up to the `Manager` instance. This way, the user can directly use `on('tap', ...)` on the `Manager` instance.

3.  **`handleInput(inputData)`**: This method is the "distribution hub" for the data flow. When the `InputAdapter` sends standardized input data, `handleInput` iterates through all the recognizers and calls their `recognize` method (which we will implement in the next section), passing the input data to them.

4.  **`destroy()`**: This is responsible for cleanup, destroying the `InputAdapter` and removing all event listeners to prevent memory leaks.

## 4. Putting All the Modules Together

We have now completed all the content for Part Two, "Laying the Foundation: Building the Core Engine." Although we haven't implemented any specific gesture recognizers yet, we have built a complete gesture recognition pipeline.

Let's review the process:

1.  The user creates a `Manager` instance and adds one (or more) gesture recognizers to it (e.g., `TapRecognizer`).

    ```javascript
    const manager = new Manager(myElement);
    manager.add(new TapRecognizer());
    manager.on('tap', (e) => console.log('Tapped!'));
    ```

2.  The `InputAdapter` inside the `Manager` starts listening for the underlying mouse or touch events.

3.  When the user interacts with `myElement`, the `InputAdapter` converts the native event into standardized input data and publishes `start`, `move`, and `end` events.

4.  The `Manager`'s `handleInput` method listens for these events and distributes the input data to the `TapRecognizer`.

5.  The `TapRecognizer` internally uses a series of logic checks. If it determines that the interaction is a `tap` gesture, it publishes a `recognize` event with data like `{ type: 'tap', ... }`.

6.  The listener set up in the `Manager`'s `add` method captures this `recognize` event and re-publishes it externally as a `tap` event.

7.  Finally, the callback function registered by the user in `manager.on('tap', ...)` is executed.

This flow clearly shows how our various modules perform their duties and work together. The `Manager`, like an orchestra conductor, ensures that every step from "sensation" to "response" is in perfect order.

In the next part, we will begin to build the "musicians" of our orchestra—the specific gesture recognizers, starting with the simplest `Tap` gesture. The power of our core engine is about to be revealed!