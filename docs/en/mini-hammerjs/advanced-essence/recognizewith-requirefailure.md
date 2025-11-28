# The Art of Gesture Coordination: recognizeWith & requireFailure

Have you ever encountered a scenario where you want to implement both a "single tap" and a "double tap" on an element? But when you quickly tap twice, you find that the "single tap" event is triggered twice, while the "double tap" event doesn't respond at all.

Or, on a slidable list item, you want the user to be able to "swipe left or right" to delete, and also "pan up and down" to reorder. But when you try to pan up and down, a slight horizontal displacement might be misinterpreted as a "swipe."

These "ambiguity" problems with gestures are challenges that gesture libraries must face when handling complex interactions. The user's intent is singular, but their actions may simultaneously meet the initial conditions for multiple gestures. How can a gesture library act like an understanding butler, accurately judging what the user really wants to do?

The answer lies in establishing a clear set of "traffic rules."

In mini-hammer.js, we provide two powerful tools to define these rules, and they are the protagonists of this article: `recognizeWith` and `requireFailure`. One is responsible for "coordination," and the other for "yielding," together forming an elegant collaboration mechanism in the world of gestures.

## `recognizeWith`: Making Gestures Work Together

The role of `recognizeWith` is very intuitive: it allows one gesture recognizer to be recognized **simultaneously** with one or more other recognizers. When one of them successfully recognizes a gesture, it does not prevent another recognizer that is "coordinating" with it from continuing to recognize.

We have already seen its power in the previous chapter with `Pinch` and `Rotate`.

```javascript
// Review: Making pinch and rotate work together
const pinch = new PinchRecognizer({ threshold: 0 });
const rotate = new RotateRecognizer({ threshold: 0 });

// Key: Allow rotate and pinch to be recognized simultaneously
// When the user's fingers move on the screen, they can change both distance (Pinch) and angle (Rotate)
rotate.recognizeWith(pinch);

manager.add([pinch, rotate]);
```

These two gestures are naturally meant to happen at the same time. A user might be rotating an image while also scaling it. `recognizeWith` is like issuing a "pass" to these two recognizers, allowing them to perform in parallel on the stage of gesture recognition, jointly parsing the user's complex actions into two independent events: `pinch` and `rotate`.

Its API is very concise: `A.recognizeWith(B)` means that A and B can be recognized at the same time.

## `requireFailure`: Establishing Gesture Priority

Unlike the "coordination" idea of `recognizeWith`, `requireFailure` establishes a dependency relationship of "yielding."

The line of code `A.requireFailure(B)` means that gesture A must wait until gesture B has **explicitly failed** before it has a chance to be recognized. This is equivalent to setting a priority for the gestures: B has a higher priority than A. Only when the high-priority "contestant" B is confirmed to have withdrawn from the competition can the low-priority "contestant" A take the stage.

This mechanism perfectly solves the two problems we raised at the beginning.

### Scenario 1: Distinguishing Between Tap and DoubleTap

A `DoubleTap` is essentially two quick `Taps`. If we don't handle it, the first tap of a double tap will always trigger a `Tap` event first, which is clearly not what we want.

The correct logic should be: after the first tap occurs, the system needs to "wait and see" if a second tap will occur within a short period of time (e.g., 250ms).

*   If it does, then this is a `DoubleTap` gesture.
*   If there is no second tap after waiting for a while, then the recognition of `DoubleTap` has failed, and only then should it be confirmed as a `Tap` gesture.

`requireFailure` was born for this.

```javascript
// A.requireFailure(B); -> A needs B to fail
const singleTap = new TapRecognizer({ event: 'singletap' });
const doubleTap = new TapRecognizer({ event: 'doubletap', taps: 2 });

// Key: singleTap can only be recognized when doubleTap recognition fails
singleTap.requireFailure(doubleTap);

manager.add([singleTap, doubleTap]);

manager.on('singletap', () => {
  console.log('Single tap detected!');
});

manager.on('doubletap', () => {
  console.log('Double tap detected!');
});
```

With `singleTap.requireFailure(doubleTap)`, we establish a clear rule: `singleTap` must "yield" to `doubleTap`. Only after the `doubleTap` recognizer enters the `STATE_FAILED` state due to a timeout (or other reasons) is the `singleTap` recognizer qualified to say, "Okay, it looks like a second tap isn't coming, this should be a `singletap`."

### Scenario 2: Distinguishing Between Pan and Swipe

A `Swipe` is a fast, short drag, while a `Pan` is a continuous drag. In many scenarios, `Swipe` should have a higher priority than `Pan`. For example, on a card element, we might want a "swipe" to delete and a "pan" to reposition.

When the user's finger presses down and starts to move, this action could be the beginning of a `Pan` or part of a `Swipe`.

The solution is also to use `requireFailure`.

```javascript
const pan = new PanRecognizer({ direction: Hammer.DIRECTION_ALL });
const swipe = new SwipeRecognizer({ direction: Hammer.DIRECTION_ALL });

// Key: pan can only be recognized when swipe recognition fails
pan.requireFailure(swipe);

manager.add([pan, swipe]);
```

The recognition conditions for `Swipe` are usually stricter than for `Pan`; it requires reaching a certain speed and distance in a short amount of time. When the user's finger moves on the screen:

1.  The `Swipe` recognizer will first start to evaluate.
2.  If the user's action is fast and short enough to meet the conditions for `Swipe`, the `Swipe` recognizer will succeed, and the `Pan` recognizer, because it depends on the failure of `Swipe`, will not be triggered.
3.  If the user's action is slow and continuous, not meeting the speed requirement for `Swipe`, the `Swipe` recognizer will eventually fail because the conditions are not met. Once `Swipe` fails, the `Pan` recognizer's opportunity arrives, and it will take over and begin to recognize this continuous dragging action.

## Practice: Building a Draggable and Swipable List

Now, let's combine `recognizeWith` and `requireFailure` to solve a more complex real-world problem.

**Scenario Description**: We want to create a vertical list. The list items need to support three interactions:
1.  **Pan up and down**: To reorder the list items.
2.  **Swipe left**: To trigger a "delete" action.
3.  **Tap**: To trigger a "view details" action.

**Conflict Analysis**:
*   `Pan` and `Swipe` are both based on movement and need to be clearly distinguished.
*   There is also a conflict between `Tap` and `Pan` (does the user want to tap or start dragging?).

**Solution Design**:
1.  Create three recognizers: `Pan`, `Swipe`, and `Tap`.
2.  `Swipe` is a fast action and should have a higher priority. Therefore, `Pan` should depend on the failure of `Swipe`.
3.  To avoid interference from horizontal swipes during vertical panning, we can use the `direction` property for constraint. Set `Pan` to the vertical direction and `Swipe` to the horizontal direction.
4.  `Tap` has the lowest priority; it should only be considered after both `Pan` and `Swipe` have failed.

```html
<!-- HTML Structure -->
<ul id="list">
  <li>List Item 1</li>
  <li>List Item 2</li>
  <li>List Item 3</li>
  <li>List Item 4</li>
</ul>
```

```css
/* CSS Styles */
#list {
  list-style: none;
  padding: 0;
  width: 300px;
}
#list li {
  padding: 15px;
  border: 1px solid #ccc;
  margin-bottom: 5px;
  background-color: #f9f9f9;
  user-select: none; /* Prevent text selection during drag */
  transition: background-color 0.2s;
}
#list li.swiped {
  background-color: #ffdddd;
  transform: translateX(-100%);
  transition: transform 0.3s ease-out, background-color 0.3s;
}
#list li.tapped {
  background-color: #e0f7fa;
}
```

```javascript
// JavaScript Logic
const list = document.getElementById('list');
const manager = new Manager(list);

// 1. Create recognizers and set directions
const pan = new PanRecognizer({ direction: Hammer.DIRECTION_VERTICAL });
const swipe = new SwipeRecognizer({ direction: Hammer.DIRECTION_HORIZONTAL });
const tap = new TapRecognizer();

// 2. Define the "traffic rules" between gestures
// Pan needs to wait for Swipe to fail
pan.requireFailure(swipe);
// Tap needs to wait for Pan to fail
tap.requireFailure(pan);

// 3. Add recognizers to the Manager
manager.add([pan, swipe, tap]);

// 4. Listen for events
manager.on('swipeleft', (e) => {
  console.log('Swiped left:', e.target);
  e.target.classList.add('swiped'); // Add delete animation effect
});

manager.on('panmove', (e) => {
  console.log('Panning up/down:', e.target, `deltaY: ${e.deltaY}`);
  // Logic for reordering list items can be implemented here
});

manager.on('tap', (e) => {
  console.log('Tapped:', e.target);
  e.target.classList.toggle('tapped'); // Toggle tap effect
});
```

In this example, through the `direction` property and the `requireFailure` method, we have built a clear and conflict-free interaction model:
*   When the user's finger moves quickly horizontally, the `Swipe` recognizer will respond immediately, triggering a delete.
*   When the user's finger moves vertically, `Swipe` will not be activated because the direction does not match, and `Pan` can be recognized smoothly for reordering.
*   When the user just taps briefly, neither `Pan` nor `Swipe` will succeed, and eventually the `Tap` event is triggered.

## Summary

`recognizeWith` and `requireFailure` are the essence of implementing complex gesture interactions in mini-hammer.js.

*   `recognizeWith` is used for **coordination**. It allows multiple gestures to be recognized in parallel, suitable for operations that can naturally occur at the same time, such as `Pinch` and `Rotate`.
*   `requireFailure` is used for **yielding**. It establishes dependencies and priorities between gestures, ensuring that when there are multiple possibilities, the gesture that the user is most likely to want to perform is recognized first, resolving classic conflicts like `Tap` / `DoubleTap` and `Pan` / `Swipe`.

By mastering these two tools, you have the ability to orchestrate complex gesture interactions. When designing interactions, you might first think about whether these gestures should "work together" or "yield to each other." Then, use these tools to define a clear and efficient set of "traffic rules" for the gestures in your application.