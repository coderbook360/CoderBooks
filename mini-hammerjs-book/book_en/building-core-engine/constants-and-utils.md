# Preparation: Constants and Utility Functions

Starting from this chapter, we will officially embark on our coding journey. As the saying goes, "The troops and horses have not moved, but the food and grass go first." Before building a complex system, let's first define some "units of measurement" that will run through the entire project—core constants, and create a few handy "small tools"—practical utility functions. This will make our codebase more standardized, consistent, and easy to maintain.

## 1. Project Initialization

First, let's create a new project directory, for example, `mini-hammerjs`. Inside the directory, we create an `index.js` file, which will be the main battlefield for all our future code.

```bash
$ mkdir mini-hammerjs
$ cd mini-hammerjs
$ touch index.js
```

## 2. Defining Core Constants

In gesture recognition, there are many "magic strings" that represent states, directions, and event types. If these strings are hard-coded in various corners of the code, it will become a nightmare if they need to be modified. Therefore, a good practice is to extract them uniformly as constants.

In `index.js`, we first define the following constants:

```javascript
// Recognizer States
const STATE_POSSIBLE = 'possible';
const STATE_BEGAN = 'began';
const STATE_CHANGED = 'changed';
const STATE_ENDED = 'ended';
const STATE_RECOGNIZED = 'recognized';
const STATE_CANCELLED = 'cancelled';
const STATE_FAILED = 'failed';

// Input Event Types
const INPUT_START = 'start';
const INPUT_MOVE = 'move';
const INPUT_END = 'end';
const INPUT_CANCEL = 'cancel';

// Directions
const DIRECTION_NONE = 'none';
const DIRECTION_LEFT = 'left';
const DIRECTION_RIGHT = 'right';
const DIRECTION_UP = 'up';
const DIRECTION_DOWN = 'down';
const DIRECTION_HORIZONTAL = 'horizontal';
const DIRECTION_VERTICAL = 'vertical';
const DIRECTION_ALL = 'all';
```

Let's briefly interpret the role of these constants:

*   **Recognizer States**: This is the core state machine of our gesture recognizer. A gesture goes from "possible" to "began," "changed," "ended," and finally either "recognized," "failed," or "cancelled." We will delve into this state machine in subsequent chapters.
*   **Input Event Types**: We will abstract the underlying mouse events (`mousedown`, `mousemove`, `mouseup`) and touch events (`touchstart`, `touchmove`, `touchend`) into four unified input types. This is the core idea of our Adapter layer.
*   **Directions**: Used to describe the direction of gestures such as Pan and Swipe. With these constants, we can easily perform direction judgment and locking.

## 3. Creating Utility Functions (Utils)

Next, we write some small and beautiful utility functions. During the construction process, we will find that these functions can be used in many places.

### `extend(dest, src)`

This is a simple shallow copy function for objects, used to copy the properties of the `src` object to the `dest` object. We will use it to merge configurations.

```javascript
/**
 * Shallow copy the properties of an object
 * @param {Object} dest The destination object
 * @param {Object} src The source object
 * @returns {Object} The destination object
 */
function extend(dest, src) {
  for (const prop in src) {
    dest[prop] = src[prop];
  }
  return dest;
}
```

### `now()`

Get the current timestamp. To maintain consistency and for possible subsequent optimizations (for example, using `performance.now()`), we encapsulate it into a function.

```javascript
/**
 * Get the current timestamp
 * @returns {Number} The timestamp
 */
function now() {
  return Date.now();
}
```

### `uniqueId()`

Generate a simple unique ID. This is very useful when we need to assign a unique identifier to each recognizer instance.

```javascript
let _uniqueId = 1;
/**
 * Generate a unique ID
 * @returns {Number} The unique ID
 */
function uniqueId() {
  return _uniqueId++;
}
```

## The Final `index.js`

So far, our `index.js` file looks like this:

```javascript
// === Constants ===
// Recognizer States
const STATE_POSSIBLE = 'possible';
// ... (other constants)

// === Utils ===
/**
 * Shallow copy the properties of an object
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object}
 */
function extend(dest, src) {
  // ...
}

/**
 * Get the current timestamp
 * @returns {Number}
 */
function now() {
  // ...
}

let _uniqueId = 1;
/**
 * Generate a unique ID
 * @returns {Number}
 */
function uniqueId() {
  // ...
}

// The following code will be added here...
```

Although we have only written a few constants and functions, this is the first step in building a robust system. These "supplies" are ready. Starting from the next chapter, we will use them to build the first module of our core engine—the event system `EventEmitter`.