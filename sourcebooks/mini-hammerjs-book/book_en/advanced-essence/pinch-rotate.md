# Implementing Pinch & Rotate: Entering the World of Multi-Touch

So far, all our gestures have been based on a single point of touch. But in modern mobile applications, the most intuitive and powerful interactions often come from multi-touch, such as pinching to zoom on a map or rotating a picture in a photo album.

Handling multi-touch events (the `touches` array) from scratch is a very tedious task. You need to manually track the position of each touch point, and calculate the distance, midpoint, and angle changes between them. This is full of complex mathematical calculations and state management.

Fortunately, the core value of a gesture library is to encapsulate this complexity. In this chapter, we will no longer write recognizers from scratch. Instead, we will stand on the shoulders of giants, learning how to "consume" and "combine" the existing `Pinch` and `Rotate` recognizers to implement a powerful image viewer. This will be our role transition from "builder" to "user," and it is a key step in understanding the design essence of a gesture library.

## 1. Pinch & Rotate Basics

`Pinch` and `Rotate` are two inseparable multi-touch gestures that are often recognized simultaneously.

*   **Pinch**: Triggered by moving two fingers closer together or farther apart. Its most crucial data is `event.scale`, which represents the zoom ratio relative to the start of the gesture. `scale > 1` means zooming in, and `scale < 1` means zooming out.

*   **Rotate**: Triggered by rotating two fingers around a central point. Its most crucial data is `event.rotation`, which represents the angle rotated relative to the start of the gesture (in degrees). Clockwise rotation is a positive value, and counter-clockwise is negative.

## 2. Enabling and Coordinating Pinch and Rotate

In our `mini-hammer.js`, for performance reasons, only the most basic gestures are enabled by default. Multi-touch gestures like `Pinch` and `Rotate`, which require more complex calculations, need to be explicitly enabled by us.

More importantly, we need to tell the `Manager` that `Pinch` and `Rotate` can be **recognized simultaneously**. Otherwise, once the `Manager` recognizes `Pinch`, it will ignore `Rotate`.

The key to achieving this is the `recognizeWith` method we mentioned earlier.

```javascript
const manager = new Manager(myElement);

// 1. Add the Pinch recognizer
const pinch = new PinchRecognizer({ threshold: 0 });
manager.add(pinch);

// 2. Add the Rotate recognizer and make it work with Pinch
manager.add(new RotateRecognizer({ threshold: 0 })).recognizeWith(pinch);
```

These few lines of code are the first core concept of this chapter:
1.  We created instances of `PinchRecognizer` and `RotateRecognizer` and added them both to the `Manager`.
2.  **The most crucial line**: `recognizeWith(pinch)`. We call this on the `RotateRecognizer` and pass in the instance of the `PinchRecognizer`. Its meaning is: "Hey, Rotate recognizer, I allow you to be recognized at the same time as the Pinch recognizer."

This way, when your two fingers are both zooming and rotating on the screen, the `Manager` can trigger both `pinch` and `rotate` events in the same event loop.

## 3. Practice: Image Zoom and Rotate Viewer

Now, let's use what we've learned to build a practical image viewer.

**HTML Structure**

```html
<div id="viewer">
  <img id="image" src="your-image.jpg" alt="Image">
</div>
```

**CSS Styles**

```css
#viewer {
  width: 300px;
  height: 300px;
  overflow: hidden;
  border: 2px solid #ccc;
  /* Key: Prevent the browser's default touch actions, like page scrolling */
  touch-action: none;
}

#image {
  width: 100%;
  height: 100%;
  /* Smooth transition effect */
  transition: transform 0.1s ease-out;
}
```

**JavaScript Logic**

```javascript
const viewer = document.getElementById('viewer');
const image = document.getElementById('image');

// Save the current transformation state
let currentScale = 1;
let currentRotation = 0;

const manager = new Manager(viewer);

// Create and configure Pinch and Rotate
const pinch = new PinchRecognizer({ threshold: 0 });
const rotate = new RotateRecognizer({ threshold: 0 });

// Let Rotate and Pinch be recognized together
rotate.recognizeWith(pinch);

manager.add([pinch, rotate]);

// Listen for the pinch event to handle scaling
manager.on('pinch', (e) => {
  // e.scale is the scaling ratio relative to the start of the gesture
  const newScale = currentScale * e.scale;
  applyTransform(newScale, currentRotation);
});

// Listen for the rotate event to handle rotation
manager.on('rotate', (e) => {
  // e.rotation is the rotation angle relative to the start of the gesture
  const newRotation = currentRotation + e.rotation;
  applyTransform(currentScale, newRotation);
});

// When the gesture ends, update the saved state
manager.on('pinchend rotateend', (e) => {
  currentScale = currentScale * e.scale;
  currentRotation = currentRotation + e.rotation;
});

function applyTransform(scale, rotation) {
  image.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
}
```

**Code Analysis**

1.  We created a `Manager` and correctly configured the cooperative relationship between `Pinch` and `Rotate`.
2.  We use two variables, `currentScale` and `currentRotation`, to "remember" the state at the end of the last gesture.
3.  In the callbacks for the `pinch` and `rotate` events, we calculate the new `transform` value based on `e.scale` and `e.rotation` (which are increments relative to the **start** of the gesture) and our "remembered" current state.
4.  In the `pinchend` and `rotateend` events, we update the final state at the end of the gesture into `currentScale` and `currentRotation`, preparing for the next gesture recognition.

This "record-apply-update" pattern is a core idea when dealing with continuous gestures like `Pan`, `Pinch`, and `Rotate`.

## 4. Summary

In this chapter, we have successfully transitioned from being a "builder" of a gesture library to a "user." We learned how to enable and configure advanced multi-touch gestures and gained a deep understanding of the key role `recognizeWith` plays in handling gesture coordination.

Through a complete practical example, we have mastered how to apply `Pinch` and `Rotate` to real projects to create smooth and natural interaction experiences.

Now, our gesture library not only has a solid core but also the ability to handle complex multi-touch interactions. In the next chapter, we will delve into the other major contributor to gesture coordination—`requireFailure`—to unlock the secrets behind "mutually exclusive" gestures like `Tap` and `Press`.