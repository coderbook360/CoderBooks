# Implementing Swipe

We have already implemented `Tap` (a discrete gesture) and `Pan` (a continuous gesture). Now, let's explore a third type of gesture: `Swipe`. In terms of interaction, a `Swipe` is a quick flick, like rapidly switching photos in a mobile album or the "swipe left, swipe right" card effect in Tinder.

From a technical perspective, `Swipe` is very interesting. Its motion is similar to `Pan`—a finger moving across the screen—but its recognition logic is more like `Tap`, a "discrete gesture" that is only confirmed at the end of the action.

The recognition of a `Swipe` depends on two key factors:

1.  **Distance**: The finger must move a sufficient distance to be distinguished from minor jitters.
2.  **Velocity**: The finger's movement speed must be fast enough to be distinguished from a slow `Pan`.

Only when the user lifts their finger (`INPUT_END`), and both the minimum distance and minimum velocity requirements are met, is a `Swipe` gesture successfully recognized.

## 1. Coding the SwipeRecognizer

The structure of `SwipeRecognizer` is very similar to `PanRecognizer`, so we can start by copying and modifying it.

```javascript
// === SwipeRecognizer ===
class SwipeRecognizer extends Recognizer {
  constructor(options) {
    super(options);
  }

  get defaults() {
    return {
      event: 'swipe',       // Event name
      pointers: 1,
      threshold: 10,      // Minimum movement distance (same as Pan)
      direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL, // Supports all directions by default
      velocity: 0.3       // Minimum velocity (px/ms)
    };
  }

  // Core recognition logic
  process(inputData) {
    const { pointerLength, type, center, timeStamp } = inputData;
    const { options } = this;

    if (pointerLength !== options.pointers) {
      return;
    }

    switch (type) {
      case INPUT_START:
        this.state = STATE_POSSIBLE;
        this.startCenter = center;
        this.startTime = timeStamp;
        break;

      case INPUT_MOVE:
        if (!this.startCenter) return;

        // During the move phase, we only update data, not the state
        // A Swipe is always possible until it ends
        this.lastCenter = center;
        this.lastTime = timeStamp;
        break;

      case INPUT_END:
      case INPUT_CANCEL:
        if (!this.lastCenter) return;

        const endTime = timeStamp;
        const deltaTime = endTime - this.startTime;
        const endDeltaX = this.lastCenter.x - this.startCenter.x;
        const endDeltaY = this.lastCenter.y - this.startCenter.y;
        const endDistance = Math.sqrt(endDeltaX * endDeltaX + endDeltaY * endDeltaY);

        // Calculate the final velocity
        const velocity = endDistance / deltaTime;
        const direction = getDirection(endDeltaX, endDeltaY);

        // "Final Judgment"
        if (
          endDistance > options.threshold &&
          velocity > options.velocity &&
          (direction & options.direction)
        ) {
          this.state = STATE_RECOGNIZED;
          this.emit({ type: options.event, direction, velocity, ...inputData });
        } else {
          this.state = STATE_FAILED;
        }
        
        this.startCenter = null;
        this.lastCenter = null;
        break;
    }
  }
}
```

## 2. Code Analysis: The Sole "Moment of Judgment"

The essence of `SwipeRecognizer` lies in its `process` method, whose logic is completely different from `Pan`:

1.  **`INPUT_START`**: Similar to `Pan`, it records the starting point `startCenter` and start time `startTime`. The state is set to `STATE_POSSIBLE`.

2.  **`INPUT_MOVE`**: This is the biggest difference from `Pan`. During the `move` process, `SwipeRecognizer` **does not change its state**. It silently records the last position `lastCenter` and time `lastTime`. No matter how long or how far the user's finger moves on the screen, as long as it is not lifted, the state of `SwipeRecognizer` remains `STATE_POSSIBLE`.

3.  **`INPUT_END`**: This is the sole "moment of judgment." When the finger is lifted, we make a one-time "final judgment."
    *   Calculate the total displacement `endDistance` and total time elapsed `deltaTime`.
    *   Calculate the average velocity of the entire gesture `velocity` using `endDistance / deltaTime`.
    *   Calculate the final `direction`.
    *   **Key Condition**: `if (endDistance > options.threshold && velocity > options.velocity && (direction & options.direction))`. This condition simultaneously checks if the distance, velocity, and direction all meet the preset options.
    *   If all conditions are met, the recognizer's state changes to `STATE_RECOGNIZED`, and it triggers a `swipe` event, attaching `direction` and `velocity` data.
    *   If not, the state changes to `STATE_FAILED`, and nothing happens.

## 3. Synergy between Pan and Swipe

Now, an interesting question arises: what happens if I bind both `Pan` and `Swipe` recognizers to an element?

When you drag the element:
*   `PanRecognizer` will enter the `began` state immediately after the movement exceeds the `threshold` and start triggering `panmove` events.
*   `SwipeRecognizer` will remain in the `possible` state.

When you lift your finger:
*   `PanRecognizer` triggers a `panend` event.
*   `SwipeRecognizer` makes its "final judgment." If the velocity and distance are sufficient, it triggers a `swipe` event.

This is exactly the effect we want! A smooth dragging process, and at the end, if the speed is fast enough, a `swipe` event is included. This allows us to implement interactions like "drag to sort, swipe to delete" in our applications.

In Hammer.js, this synergistic relationship is explicitly defined through `recognizeWith`. We will delve into this mechanism in the advanced section. For now, our simple implementation naturally supports this synergy.

## 4. Refactoring and Outlook

In the implementations of `Pan` and `Swipe`, there is logic for calculating `distance` and `direction`. We can extract this common calculation logic into the `Recognizer` base class or a separate utility file to make the code more DRY (Don't Repeat Yourself).

So far, we have mastered the implementation of three core gestures:
*   `Tap`: A simple discrete gesture.
*   `Pan`: A state machine-based continuous gesture.
*   `Swipe`: A discrete gesture combining distance and velocity.

Next, we will tackle a brand new type of gesture that is only related to time—`Press` (long press).