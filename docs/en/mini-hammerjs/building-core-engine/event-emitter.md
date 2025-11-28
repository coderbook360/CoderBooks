# Core Event System: EventEmitter

When building any vibrant JavaScript application, we face a core problem: how to allow different modules to communicate efficiently while maintaining their independence, avoiding the predicament where a change in one place causes a ripple effect of failures?

The answer is an **Event-Driven Architecture**, and its core implementation is the well-known **Publish-Subscribe Pattern**. In `mini-hammer.js`, we will build a class called `EventEmitter`, which will serve as the "event bus" and communication cornerstone for our entire system.

## 1. What is the Publish-Subscribe Pattern?

Imagine a real-life scenario:

*   **Publisher**: A magazine publisher that regularly releases new issues (publishes events). It doesn't care who will read them; it just publishes.
*   **Subscriber**: You, me, and others. We are interested in a certain magazine, so we go to a newsstand to "subscribe" (register a callback function).
*   **Broker/Event Bus**: The newsstand. It is responsible for recording who subscribed to which magazine and notifying all subscribers to pick up the new issue when it's published.

In our code, `EventEmitter` is this "newsstand." It allows one part of the code (the subscriber) to express interest in a specific event (like `panstart`), while another part of the code (the publisher) triggers this event at the appropriate time. The `EventEmitter` is then responsible for notifying all subscribers to execute their registered callback functions.

This pattern greatly reduces the coupling between modules. The publisher and subscriber do not know of each other's existence; they only interact with the event center.

## 2. Designing Our `EventEmitter`

A basic `EventEmitter` needs to have three core methods:

*   `on(event, handler)`: **Subscribe** to an event. `event` is the event name (a string), and `handler` is the callback function to be executed when the event is triggered.
*   `off(event, handler)`: **Unsubscribe** from an event. Both the event name and the originally registered callback function must be provided to accurately unsubscribe.
*   `emit(event, data)`: **Publish** (or trigger) an event. `event` is the event name, and `data` is the data object to be passed to all subscribers.

## 3. Coding the Implementation

Let's add the code for the `EventEmitter` class in our `index.js` file, after the `Utils` section.

```javascript
// === EventEmitter ===
class EventEmitter {
  constructor() {
    // Use an object to store all events and their corresponding callback functions
    // Format: { eventName: [handler1, handler2, ...], ... }
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {String} event The event name
   * @param {Function} handler The callback function
   */
  on(event, handler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(handler);
  }

  /**
   * Unsubscribe from an event
   * @param {String} event The event name
   * @param {Function} handler The callback function
   */
  off(event, handler) {
    if (!this.events[event]) {
      return;
    }
    // Find and remove the specified callback function from the array
    this.events[event] = this.events[event].filter(h => h !== handler);
  }

  /**
   * Publish an event
   * @param {String} event The event name
   * @param {Object} data The data to be passed to the callback functions
   */
  emit(event, data) {
    if (!this.events[event]) {
      return;
    }
    // Call all callback functions subscribed to this event in order
    this.events[event].forEach(handler => handler(data));
  }
}
```

Let's break down this code piece by piece:

1.  **`constructor`**: In the constructor, we initialize a `this.events` object. It will serve as our "ledger" for storing all subscription relationships. The `key` is the event name, and the `value` is an array containing all the callback functions subscribed to that event.

2.  **`on(event, handler)`**: The implementation is very straightforward. First, it checks if a "ledger" for the event already exists in `this.events`. If not, it creates an empty array. Then, it simply pushes the new `handler` into this array.

3.  **`off(event, handler)`**: Unsubscribing is a bit more complex. We again first check if the "ledger" exists. If it does, we use the array's `filter` method to create a new array that **does not contain** the `handler` to be removed, and then we overwrite the old array with it. It's important to note that the `handler` must be the exact same function reference that was passed to the `on` method to be successfully removed.

4.  **`emit(event, data)`**: When publishing an event, we find the corresponding "ledger" array, then simply iterate through it, executing each `handler` in turn and passing the `data` object as an argument to them.

## 4. How to Use It?

Let's look at a simple usage example:

```javascript
const emitter = new EventEmitter();

function onUserLogin(data) {
  console.log(`Welcome back, ${data.username}!`);
}

// Subscribe to the 'login' event
emitter.on('login', onUserLogin);

// At some point in the future, publish the 'login' event
setTimeout(() => {
  emitter.emit('login', { username: 'Alex' });
}, 2000);

// Output: (after 2 seconds) Welcome back, Alex!

// Unsubscribe
emitter.off('login', onUserLogin);
```

With this, we now have a fully functional event center. In the upcoming chapters, you will see that both `Manager` (our main control class) and `Recognizer` (the gesture recognizer) will inherit from `EventEmitter`, thereby gaining the ability to publish and subscribe to events. This will be the core mechanism for building our entire gesture recognition flow.

We have now equipped our engine with a "nervous system." Next, we will install its "sensory system"—the input adapter layer.