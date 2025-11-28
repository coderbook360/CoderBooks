# Recognizer Base Class: Recognizer

In the previous chapter, we delved into the soul of gesture recognition—the state machine. We know that behind every gesture recognition, there is a state machine working silently. Now, an obvious question lies before us: `Tap`, `Pan`, `Swipe`, `Press`... with so many gestures, do we have to write a complete state machine management logic from scratch for each one?

Of course not. An elegant software design always pursues the "Don't Repeat Yourself" (DRY) principle. We will find that although the recognition patterns of these gestures vary greatly, they have much in common as "recognizers":

*   They all need to manage their own **state** (`state`), such as `POSSIBLE`, `BEGAN`, `FAILED`, etc.
*   They all need a unified entry method to receive **input data** from the `Manager`.
*   They all need to merge user's **custom options** with default options.
*   They all need to **emit events** at specific times to notify the outside world.

This is where the power of object-oriented programming shines. We will create a "parent class" for all specific gesture recognizers—the `Recognizer` base class. This base class will contain the common logic and properties shared by all recognizers, while each specific gesture recognizer (subclass) will inherit from this base class and focus on implementing its own unique recognition logic.

## Why Have a Base Class?

The design of introducing a `Recognizer` base class brings at least three major benefits:

1.  **Code Reuse (DRY)**: By encapsulating common logic such as state management, option merging, and event emission in the base class, we only need to write it once to be reused by all subclasses, greatly reducing code redundancy.

2.  **Unified Interface (Consistency)**: As a manager, the `Manager` does not need to care whether it is managing a `TapRecognizer` or a `PanRecognizer`. It only needs to know that every object it manages is a "descendant" of `Recognizer` and has a common `.process(inputData)` method. When new input arrives, the `Manager` simply iterates through its list of recognizers and calls `.process()` on each one. This is the power of "polymorphism," which gives our system great flexibility and scalability.

3.  **Enforcing Contract**: The base class defines a set of "interface specifications." It acts like a contract, clearly stipulating which methods all subclasses wanting to be a `Recognizer` must implement (e.g., the core `recognize` method), and which methods can be overridden. This ensures that all recognizers follow the same behavior pattern, making the entire system coordinated and consistent.

## Creating `recognizer.js`: Designing the Base Class Skeleton

Let's start by creating the `src/recognizer.js` file and designing the basic structure of the `Recognizer` class.

The constructor of this base class will be responsible for initializing the instance properties shared by all recognizers.

```javascript
import { STATE_POSSIBLE } from './constants.js';

// A simple auto-incrementing ID to uniquely identify each recognizer instance
let recognizerId = 1;

export class Recognizer {
  constructor(options = {}) {
    // Unique ID
    this.id = recognizerId++;
    
    // Reference to the Manager, set when added to the Manager
    this.manager = null;
    
    // Core property: the current state of the state machine, initially POSSIBLE
    this.state = STATE_POSSIBLE;
    
    // Whether the recognizer is enabled
    this.enabled = true;

    // Merge default options with user-provided options
    // this.defaults() is a virtual method to be implemented by subclasses
    this.options = Object.assign({}, this.defaults(), options);
  }

  /**
   * @virtual
   * Defines default options, subclasses must override this method
   * @returns {Object}
   */
  defaults() {
    return {};
  }

  /**
   * @virtual
   * Core recognition logic, subclasses must implement this
   * @param {Object} inputData 
   */
  recognize(inputData) {
    // The base class is only responsible for emitting events after recognition is successful
    // The specific judgment logic is implemented in the subclass
    this.manager.emit(`${this.options.event}:${this.state}`, inputData);
  }

  /**
   * @virtual
   * The entry method called by the Manager
   * @param {Object} inputData 
   */
  process(inputData) {
    if (!this.enabled) {
      return;
    }
    // Here, we will call different methods based on inputData.eventType
    // to drive the state machine
    // ... the specific scheduling logic will be implemented in subsequent chapters
  }

  // ... other state management helper methods
}
```

In the skeleton code above, we have defined the core structure of the `Recognizer`:

*   **Constructor**: Responsible for initializing basic properties like `id`, `state`, `enabled`, and cleverly merging default and user options using `Object.assign`. Note the `this.defaults()` method; we expect each subclass to provide its own default configuration.
*   **`recognize` method**: This is a "pseudo-abstract" method. In the base class, its role is to help emit formatted events like `tap:start`, `pan:move` after the state has been changed by a subclass. The actual recognition logic—that is, deciding whether the state should change—will be implemented by the subclass when it overrides this method.
*   **`process` method**: This is the sole entry point for interaction between the `Manager` and the `Recognizer`. It acts as a dispatch center, responsible for receiving input and, based on the input type (`INPUT_START`, `INPUT_MOVE`, `INPUT_END`) and the current state, calling different handler functions to drive the entire state machine.

## Defining the Interface: "Homework" for Subclasses

The `Recognizer` base class, by defining a series of "virtual methods," leaves a clear "homework list" for all subclasses. A subclass must complete this homework to become a qualified recognizer.

*   `defaults()`: **Must be implemented**. Each subclass needs to provide its own unique default options, such as the number of taps for `Tap`, the trigger time for `Press`, etc.
*   `recognize(inputData)`: **Must be implemented**. This is where the subclass implements its core recognition logic. The subclass needs to decide whether to transition to a new state based on the input data and the current state, and finally call `super.recognize()` to emit the event.
*   `process(inputData)`: **Can be optionally overridden**. Although the base class will provide a general processing flow, some complex subclasses (like `Pinch` for handling multi-touch) may need to override this method to implement more customized input processing logic.
*   `emit(inputData)`: **Can be optionally overridden**. Subclasses can override this method to customize the data object carried by the emitted event, for example, by adding unique properties like `deltaX` and `deltaY` to the `Pan` event.

## Chapter Summary

In this chapter, from a design perspective, we have successfully created a unified, reusable, and extensible template for all gesture recognizers by creating a `Recognizer` base class. We have applied powerful object-oriented design principles such as inheritance, abstraction, and polymorphism to lay a solid and elegant foundation for the architecture of the entire gesture library.

At this point, all the foundational work of the initial phase is complete! We have set the stage, defined the rules, and prepared the blueprint. Starting from the next part, the real protagonists—the specific gesture recognizers like `Tap`, `Pan`, `Swipe`, `Press`—will make their appearance one by one. We will witness firsthand how, by simply inheriting from the `Recognizer` base class and implementing its core `recognize` method, we can easily create a variety of rich gesture interactions.