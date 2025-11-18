# Advanced Application: The Art of Resolving Gesture Conflicts

In the previous chapter, we learned how to use `recognizeWith` and `requireFailure` to coordinate multiple gestures on the same element, allowing gestures like `Tap`, `DoubleTap`, and `Pan` to coexist harmoniously. It seems we have mastered the secret of gesture collaboration. But the challenges of the real world are far more complex.

Let's imagine a trickier scenario, an app you might use every day: a card-style news reader that scrolls horizontally. You can swipe left and right to switch between news cards, much like watching short videos. Inside each card is a long article that can be scrolled vertically. Now, here's the problem: when the user's finger slides across the screen, how does the program "guess" the user's intent? Do they want to "switch to the next news story" (horizontal swipe), or "read the rest of the current article" (vertical scroll)?

This is no longer a simple matter of "who recognizes first." It's a systematic engineering problem involving gesture direction, DOM hierarchy, and event propagation between parent and child elements. In this chapter, we will dive deep into these advanced waters, turning you into an expert who can skillfully resolve complex gesture conflicts.

## Classification and Diagnosis of Gesture Conflicts

Before we start solving problems, we must first learn how to "diagnose" them. Gesture conflicts can be broadly divided into two categories:

1.  **Sibling Gesture Conflicts**
    *   **Definition**: Multiple gestures that can be triggered simultaneously on the same DOM element.
    *   **Typical Example**: `Pan` (dragging) vs. `Swipe` (a quick flick). Is the user's intention a fast swipe, or do they want to press and hold for a continuous drag?
    *   **Solution**: `requireFailure`, which we learned in the last chapter, is the primary weapon for resolving this type of conflict. By establishing a clear failure dependency (e.g., `swipe.requireFailure(pan)`), we can define a clear priority.

2.  **Nested Gesture Conflicts (Parent-Child Conflicts)**
    *   **Definition**: This is the focus of this chapter. A parent element containing gestures has a nested child element that also contains gestures.
    *   **Typical Example**: The "horizontal carousel (parent) vs. vertical scrolling list (child)" mentioned in our introduction.
    *   **Diagnosis**: The core of the conflict is direction. Is the user's initial movement more horizontal or more vertical? Should the gesture be handled by the parent element, or should it be delegated to the child?
    *   **Solution Preview**: `direction` locking and event propagation control will be our key tools for solving this type of problem.

## The Arsenal for Conflict Resolution

To handle complex conflict scenarios, we need a powerful arsenal. Here are the most effective tools for resolving gesture conflicts, especially nested ones.

### Weapon 1: Direction Locking (`direction`)

This is the simplest and most effective first line of defense for resolving nested scrolling conflicts. By locking a recognizer (especially `Pan` and `Swipe`) to a specific direction, you can greatly simplify the conflict logic.

*   **API**: Set it via the `direction` option when creating a recognizer.
    ```javascript
    // Create a Pan recognizer that only responds to the horizontal direction
    const horizontalPan = new Hammer.Pan({ 
        direction: Hammer.DIRECTION_HORIZONTAL 
    });

    // Create a Pan recognizer that only responds to the vertical direction
    const verticalPan = new Hammer.Pan({ 
        direction: Hammer.DIRECTION_VERTICAL 
    });
    ```
*   **Principle**: When a `Pan` recognizer is locked to `DIRECTION_HORIZONTAL`, it ignores all displacement components in the vertical direction. It will only be activated if the angle of the user's initial finger movement is small enough relative to the horizontal axis (within 45 degrees by default in Hammer.js). This naturally "yields" control to recognizers for other directions.

### Weapon 2: Event Propagation Control (`event.stopPropagation`)

In the standard DOM event model, an event "bubbles up" from the deepest element that triggered it, level by level, to the parent elements, up to the document root. In gesture interactions, we can leverage this: when a child element's gesture is successfully recognized and begins processing, we can immediately stop the event from continuing to bubble up. This "cuts off" the path for the parent element to receive the event, preventing its own gestures from being triggered.

*   **API**: In the gesture event's callback function, manipulate the original DOM event object, `srcEvent`.
    ```javascript
    childHammer.on('panstart', function(event) {
        // When the child's pan starts, stop the event from bubbling up
        event.srcEvent.stopPropagation();
    });
    ```
*   **Key Point**: You must operate on `event.srcEvent`. The `event` object itself is a wrapper created by Hammer.js, while `srcEvent` is the native DOM event object.

### Weapon 3: Building Complex Dependency Chains (`requireFailure`)

We are already familiar with this. When multiple discrete gestures (like `Tap`, `DoubleTap`, `Press`) coexist, you can create a clear priority chain with `requireFailure`. For example, `A.requireFailure(B); B.requireFailure(C);` forms a trigger priority of `C > B > A`. This is very useful for handling complex sibling conflicts among click-type gestures.

## Ultimate Practice: Building a Nested Scrolling View

Now, let's combine the weapons above to perfectly solve the "news reader" nested scrolling problem from the introduction, from scratch.

**1. HTML Structure**

```html
<div class="wrapper">
    <div class="slide">
        <!-- A lot of content to make it vertically scrollable -->
        <p>...</p><p>...</p><p>...</p>
    </div>
    <div class="slide">
        <!-- A lot of content -->
    </div>
    <div class="slide">
        <!-- A lot of content -->
    </div>
</div>
```

**2. CSS Styles**

```css
.wrapper {
    width: 100vw;
    height: 100vh;
    display: flex;
    overflow: hidden; /* Key: Parent container hides overflow */
}

.slide {
    width: 100%;
    height: 100%;
    flex-shrink: 0;
    overflow-y: scroll; /* Key: Child element allows vertical scrolling */
    -webkit-overflow-scrolling: touch; /* Optimize mobile scrolling experience */
}
```

**3. JavaScript Logic**

```javascript
const wrapper = document.querySelector('.wrapper');
const slides = document.querySelectorAll('.slide');

// --- Key Step 1: Set up horizontal Pan gesture for the parent container ---
const wrapperHammer = new Hammer(wrapper);

// Recognize only horizontal Pan and set a small threshold
wrapperHammer.add(new Hammer.Pan({
    direction: Hammer.DIRECTION_HORIZONTAL,
    threshold: 10
}));

let currentSlide = 0;
wrapperHammer.on('panend', function(ev) {
    // After pan ends, decide whether to switch cards based on velocity and displacement
    if (Math.abs(ev.deltaX) > 100 || Math.abs(ev.velocityX) > 0.5) {
        if (ev.deltaX > 0 && currentSlide > 0) {
            currentSlide--;
        } else if (ev.deltaX < 0 && currentSlide < slides.length - 1) {
            currentSlide++;
        }
    }
    // Animate scroll to the target card
    wrapper.style.transform = `translateX(${-currentSlide * 100}vw)`;
});

// --- Key Step 2: Set up vertical Pan gesture for child elements ---
slides.forEach(slide => {
    const slideHammer = new Hammer(slide);

    // Recognize only vertical Pan
    slideHammer.add(new Hammer.Pan({
        direction: Hammer.DIRECTION_VERTICAL,
        threshold: 10
    }));

    // Listen for vertical pan events to manually scroll content
    let lastDeltaY = 0;
    slideHammer.on('panstart', () => lastDeltaY = 0);
    slideHammer.on('panmove', function(ev) {
        slide.scrollTop -= (ev.deltaY - lastDeltaY);
        lastDeltaY = ev.deltaY;
    });
});
```

**Logic Analysis**:

In this implementation, we didn't even need to use event propagation control. We elegantly solved the problem relying solely on **direction locking**.

When the user's finger starts moving on the screen, Hammer.js internally calculates the initial angle of movement. If this angle is more horizontal, only the `wrapperHammer` set to `DIRECTION_HORIZONTAL` will be activated, allowing the user to swipe left and right to switch cards. Meanwhile, the `slideHammer` remains silent because the direction doesn't match.

Conversely, if the user's initial movement is more vertical, only the `slideHammer` set to `DIRECTION_VERTICAL` will be activated, allowing the user to scroll the content of the current card up and down. The `wrapperHammer` will ignore this input because the direction doesn't match.

The two do not interfere with each other, perfectly achieving a separation of concerns and providing the user with a silky-smooth interaction experience, just like a native app.

## Summary and Sublimation

The process of resolving complex gesture conflicts is like an art form. It requires us to establish a systematic paradigm for solutions, rather than blindly piling up code. Through this chapter, we can summarize a "three-step process" for resolving gesture conflicts:

1.  **Diagnose the Conflict Type**: First, clarify whether the conflict is between sibling elements or nested parent-child elements.
2.  **Choose the Right Weapon**: Based on the conflict type, select the most appropriate tool. Do you need `requireFailure` to define priority, or should you use `direction` locking to separate responsibilities? Is `stopPropagation` needed as a final safeguard?
3.  **Implement and Debug**: Translate the design into code and continuously refine the interaction details through testing.

Please remember that "direction locking" holds an irreplaceable core position in resolving nested scrolling conflicts. It is often the simplest and most efficient solution we should consider first. I hope you can apply this mindset of analyzing, deconstructing, and solving problems to many more complex interaction design challenges in the future.