# Implementing Press

We have conquered the displacement-based `Pan` and the velocity-based `Swipe`. Now, let's enter a whole new dimension: a gesture driven purely by time—`Press` (long press).

The `Press` gesture is very common in interactions, such as long-pressing an app icon on a phone screen to bring up a shortcut menu. Its recognition does not depend on how far the finger has moved, but on how long the finger has stayed in the same position.

To implement `Press`, our core weapons are JavaScript's "timers"—`setTimeout` and `clearTimeout`.

## 1. Recognition Logic for the Press Gesture

The logic of `Press` is like a "time bomb":

1.  **Start the timer**: When the finger presses down (`INPUT_START`), we start a timer, for example, to "explode" after 251 milliseconds.
2.  **Wait**: During these 251 milliseconds, we wait and see.
3.  **Defuse the bomb**: If any of the following situations occur during this period, we "defuse the bomb" (clear the timer) and declare the `Press` to have failed:
    *   The finger is lifted (`INPUT_END`): This means the press was not long enough; it might be a `Tap`.
    *   The finger moves too far: This means the user might have intended to `Pan`.
4.  **Detonate**: If the timer successfully triggers after 251 milliseconds without being "defused" midway, then the "explosion" is successful—the `Press` gesture is recognized!

In addition, `Press` has a paired event, `pressup`. It occurs at the moment the user finally lifts their finger after the `press` event has already been triggered.

## 2. Coding the PressRecognizer

Let's create the `PressRecognizer`.

```javascript
// === PressRecognizer ===
class PressRecognizer extends Recognizer {
  constructor(options) {
    super(options);
    this._timer = null; // To store our "time bomb"
  }

  get defaults() {
    return {
      event: 'press',
      pointers: 1,
      time: 251,      // ms, the minimum time required to recognize a long press
      threshold: 9,   // px, allows for slight finger movement during a long press
    };
  }

  process(inputData) {
    const { pointerLength, type, center } = inputData;
    const { options } = this;

    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        // Clear any timer that might be left over from a previous attempt
        clearTimeout(this._timer);

        this.state = STATE_POSSIBLE;
        this.startCenter = center;

        // Set the "time bomb"
        this._timer = setTimeout(() => {
          this.state = STATE_RECOGNIZED;
          this.emit({ type: options.event, ...inputData });
        }, options.time);
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        const deltaX = center.x - this.startCenter.x;
        const deltaY = center.y - this.startCenter.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // If the movement distance exceeds the threshold, "defuse the bomb"
        if (distance > options.threshold) {
          clearTimeout(this._timer);
          this.state = STATE_FAILED;
        }
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        // As soon as the finger is lifted, "defuse the bomb"
        clearTimeout(this._timer);

        // If the bomb has already "exploded", trigger pressup on finger lift
        if (this.state === STATE_RECOGNIZED) {
          this.emit({ type: `${options.event}up`, ...inputData });
        } else {
          // Otherwise, it means the time was not enough, Press fails
          this.state = STATE_FAILED;
        }
        break;
    }
  }
}
```

## 3. Code Analysis: The Art of Timers

The implementation of `PressRecognizer` is entirely a "timed offense and defense" battle centered around `this._timer`.

*   **`INPUT_START`**: The offense sets the "time bomb" `setTimeout`. We place the core logic for successful recognition (`state = RECOGNIZED`, `emit`) directly in the timer's callback function. If there is no interference after `options.time`, this callback will execute, and `Press` will be recognized.

*   **`INPUT_MOVE`**: The defense interferes. We continuously monitor the finger's movement distance. Once we find that `distance` exceeds the `threshold`, it means the user's intent has changed. The defense immediately uses `clearTimeout` to "defuse the bomb" and declares the `Press` recognition a failure.

*   **`INPUT_END`**: The defense's last line. As soon as the finger is lifted, `clearTimeout` must be called regardless. This handles two scenarios:
    1.  The timer is cleared before it triggers: This means the press duration was not long enough, so it's not a `Press`.
    2.  The timer has already triggered: Calling `clearTimeout` on an already executed timer is harmless.

    Then, we check the current state. If `this.state` is already `STATE_RECOGNIZED`, it means the "bomb" has already successfully "detonated," so the `pressup` event should be triggered at this time.

## 4. The "Natural Enemy" Relationship between Tap and Press

`Tap` and `Press` are natural "enemies." Should a brief click be recognized as a `Tap` or an unfinished `Press`?

In our implementation, the recognition time for `Tap` is 250ms, while for `Press` it is 251ms. When a user lifts their finger at 100ms:
*   The `PressRecognizer`'s timer is cleared, and recognition fails.
*   The `TapRecognizer`'s timer might also be cleared (depending on the specific implementation), but it will determine at `INPUT_END` that the time was short enough, thus succeeding in recognition.

This brings up a classic problem in gesture library design: **how to gracefully handle mutually exclusive gestures?**

Hammer.js's answer is the `requireFailure` mechanism. We can set it up like this:

`TapRecognizer.requireFailure(PressRecognizer);`

This line means: The `Tap` recognizer must wait for the `Press` recognizer to **explicitly fail** before it can be recognized itself. This way, when a user performs a short press and lifts their finger, `Press` fails first, and `Tap` receives this signal, only then daring to confirm itself as a `Tap`.

We will implement this powerful mechanism ourselves in the upcoming advanced section.

## 5. Summary

Congratulations! We have now completed all the core single-touch gestures: `Tap`, `Pan`, `Swipe`, and `Press`. Our `mini-hammer.js` now has a solid foundation.

We have not only implemented these gestures but, more importantly, we have understood the core principles behind them:

*   **Discrete vs. Continuous**: The differences in their state machines.
*   **Displacement, Velocity, and Time**: The three major factors driving gesture recognition.
*   **Synergy and Mutual Exclusion**: The complex coexistence relationships between gestures.

In the next part, "The Leap: Advanced Gestures and Synergy," we will enter the more exciting world of multi-touch, implementing `Pinch` and `Rotate` gestures, and finally unveiling the mysteries of `recognizeWith` and `requireFailure`.