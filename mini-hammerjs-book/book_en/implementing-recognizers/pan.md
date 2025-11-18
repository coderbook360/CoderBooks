# Implementing Pan

In the previous chapter, we successfully implemented the `Tap` gesture. `Tap` is a "Discrete Gesture," which triggers only once at the moment the action is completed. Now, we will take on a more common and interesting type of gesture—a "Continuous Gesture," represented by `Pan` (dragging).

Unlike `Tap`, `Pan` has a complete lifecycle:

*   `panstart`: Dragging begins
*   `panmove`: During the drag
*   `panend`: Dragging ends

To implement this kind of gesture, we must introduce the concept of a "state machine," allowing our recognizer to switch between states like `possible`, `began`, `changed`, and `ended`.

## 1. Recognition Conditions for Pan Gesture

How is a `Pan` gesture recognized?

1.  When the finger presses down (`INPUT_START`), we don't know if the user wants to tap or drag. At this point, the recognizer is in the `possible` state.
2.  When the finger starts to move (`INPUT_MOVE`) and the movement distance exceeds a specific "threshold," we consider the drag to have started. At this point, the recognizer enters the `began` state and triggers the `panstart` event.
3.  As long as the finger continues to move, the recognizer remains in the `changed` state and continuously triggers `panmove` events.
4.  When the finger is lifted (`INPUT_END`), the drag ends. The recognizer enters the `ended` state and triggers the `panend` event.

This "threshold" is very important. It helps us distinguish between unintentional minor jitters and intentional dragging operations. Without it, a user might just want to tap but could be misinterpreted as dragging due to a slight finger movement.

## 2. Coding the PanRecognizer

Let's create the `PanRecognizer` class in `index.js`.

```javascript
// === PanRecognizer ===
class PanRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this.panning = false; // An internal flag to indicate if dragging is in progress
  }

  get defaults() {
    return {
      event: 'pan',       // Event name prefix
      pointers: 1,      // Number of required pointers
      threshold: 10,    // Minimum movement distance to trigger a drag (px)
    };
  }

  // Implement the core recognition logic
  process(inputData) {
    const { pointerLength, type, center } = inputData;
    const { options } = this;

    // Check if the number of pointers matches
    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        this.panning = false;
        this.state = STATE_POSSIBLE;
        this.startCenter = center; // Record the starting point
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        const deltaX = center.x - this.startCenter.x;
        const deltaY = center.y - this.startCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!this.panning && distance > options.threshold) {
          // First time exceeding the threshold, drag starts!
          this.panning = true;
          this.state = STATE_BEGAN;
          this.emit({ type: `${options.event}start`, ...inputData });
        } else if (this.panning) {
          // Dragging has already started, continuously trigger move events
          this.state = STATE_CHANGED;
          this.emit({ type: `${options.event}move`, ...inputData });
        }
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        if (this.panning) {
          // If dragging, trigger the end event
          this.state = STATE_ENDED;
          this.emit({ type: `${options.event}end`, ...inputData });
        }
        this.panning = false;
        this.startCenter = null; // Reset the starting point
        break;
    }
  }
}
```

## 3. Code Analysis

The `process` method of `PanRecognizer` is much more complex than that of `TapRecognizer` because it needs to handle a complete state flow:

1.  **`INPUT_START`**: At the beginning of the input, we reset the `panning` flag, set the state to `possible`, and record the starting point `startCenter`. This prepares for the recognition.

2.  **`INPUT_MOVE`**: This is the most critical part.
    *   We first calculate the displacement `distance` of the current point relative to the starting point.
    *   **Key Condition**: `if (!this.panning && distance > options.threshold)`. This condition checks "if not currently panning and the movement distance has exceeded the threshold," then the drag officially begins.
    *   Once dragging starts, we set `this.panning` to `true`, switch the state to `STATE_BEGAN`, and trigger the first event: `panstart`.
    *   In subsequent `move` events, since `this.panning` is already `true`, the program enters the `else if (this.panning)` branch, switches the state to `STATE_CHANGED`, and continuously triggers `panmove` events.

3.  **`INPUT_END` / `INPUT_CANCEL`**: When the finger is lifted or the input is canceled, we check the `this.panning` flag. If it is `true`, it means a drag did occur, so we trigger the `panend` event. Finally, we reset the `panning` flag and `startCenter` to prepare for the next recognition.

## 4. Direction Detection

A complete `Pan` gesture usually also includes direction information. We can calculate the instantaneous direction by comparing the current point with the previous point.

Let's extend `PanRecognizer` to add direction detection logic.

First, we need a utility function to calculate the direction:

```javascript
// Add in the Utils section
function getDirection(x, y) {
  if (x === y) {
    return DIRECTION_NONE;
  }
  if (Math.abs(x) >= Math.abs(y)) {
    return x > 0 ? DIRECTION_RIGHT : DIRECTION_LEFT;
  } else {
    return y > 0 ? DIRECTION_DOWN : DIRECTION_UP;
  }
}
```

Then, we modify the `process` method of `PanRecognizer` to inject direction information into the `move` and `end` events.

```javascript
// ... in the process method of PanRecognizer ...
case INPUT_MOVE:
  // ... (previous code)
  if (this.panning) {
    // ...
    const deltaX = center.x - this.startCenter.x;
    const deltaY = center.y - this.startCenter.y;
    const direction = getDirection(deltaX, deltaY);
    this.emit({ type: `${options.event}move`, direction, ...inputData });
  }
  break;

case INPUT_END:
case INPUT_CANCEL:
  if (this.panning) {
    // ...
    const deltaX = center.x - this.startCenter.x;
    const deltaY = center.y - this.startCenter.y;
    const direction = getDirection(deltaX, deltaY);
    this.emit({ type: `${options.event}end`, direction, ...inputData });
  }
  // ...
  break;
```

Now, our `panmove` and `panend` events will contain a `direction` property, which can be one of `left`, `right`, `up`, or `down`.

Through the implementation of `PanRecognizer`, we have not only mastered how to recognize a continuous gesture but, more importantly, we have gained a deep understanding of the core role of a "state machine" in gesture recognition. This pattern will be used throughout our implementation of all subsequent complex gestures.