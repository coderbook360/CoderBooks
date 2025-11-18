# Hammer.js Quick Start

Before we officially start building our own `mini-hammer.js`, let's first get a feel for how a mature gesture library like `Hammer.js` works through a quick example. This will help us clarify the development goals for the following chapters.

This example will be very simple: we will create a card and add "Pan" and "Swipe" gestures to it. When the user drags the card, it will follow the finger's movement; when the user quickly swipes the card, it will fly off the screen with an animation.

## 1. Preparation

First, we need a basic HTML file and to include `Hammer.js`. You can download the latest version from its official website or use a CDN service.

Create an `index.html` file with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hammer.js Quick Start</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f0f0;
      overflow: hidden; /* Prevent scrollbars when the card moves out */
    }
    #card {
      width: 200px;
      height: 250px;
      background-color: #42a5f5;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 24px;
      font-family: sans-serif;
      cursor: grab;
      /* Key: Prevents default browser touch behaviors like image dragging or text selection */
      touch-action: none;
      user-select: none;
    }
  </style>
</head>
<body>

<div id="card">Drag Me!</div>

<!-- Include Hammer.js -->
<script src="https://unpkg.com/hammerjs@2.0.8/hammer.min.js"></script>
<script>
  // We will write our JavaScript code here
</script>

</body>
</html>
```

## 2. Writing the JavaScript Code

Now, let's write the core interaction logic. We will do this in three steps:

1.  Get the card element and create a `Hammer` instance.
2.  Listen for the `pan` event to make the card follow the finger's movement.
3.  Listen for the `swipe` event to make the card fly out when swiped.

Add the following code to the `<script>` tag:

```javascript
// 1. Get the element and create a Hammer instance
const card = document.getElementById('card');
const hammer = new Hammer(card);

// Store the initial position of the card
let initialX = 0;
let initialY = 0;

// 2. Listen for the "pan" event (dragging)
hammer.on('panstart', (e) => {
  // When dragging starts, record the current position
  const transform = window.getComputedStyle(card).getPropertyValue('transform');
  if (transform && transform !== 'none') {
    const matrix = new DOMMatrix(transform);
    initialX = matrix.m41;
    initialY = matrix.m42;
  }
});

hammer.on('panmove', (e) => {
  // During the drag, update the card's position in real-time
  // e.deltaX and e.deltaY are the displacement relative to the starting point of the drag
  const newX = initialX + e.deltaX;
  const newY = initialY + e.deltaY;
  card.style.transform = `translate(${newX}px, ${newY}px)`;
});

hammer.on('panend', (e) => {
  // When dragging ends, we can do nothing, or let the card snap back to its original position
  // Here, for simplicity, we'll keep it at the position where the drag ended
});

// 3. Listen for the "swipe" event
hammer.on('swipeleft swiperight', (e) => {
  // For visual effect, we only trigger the fly-out on horizontal swipes
  card.style.transition = 'transform 0.5s ease-out'; // Add a transition animation

  // Calculate a target position off-screen based on the swipe direction
  const flyOutX = (e.type === 'swipeleft' ? -1 : 1) * (window.innerWidth + card.offsetWidth);
  card.style.transform = `translate(${flyOutX}px, ${e.deltaY}px)`;

  // After the animation, you can reset the card's position (optional)
  setTimeout(() => {
    card.style.transition = '';
    card.style.transform = 'translate(0px, 0px)';
    initialX = 0;
    initialY = 0;
  }, 500);
});
```

## 3. Experience the Effect

Now, open the `index.html` file in your browser. You can try:

*   Dragging the card slowly with your mouse or finger; it will follow your pointer closely.
*   Swiping the card quickly to the left or right; it will fly off the screen with a cool animation and then reset to its original position after half a second.

See? With just a few dozen lines of code, we have achieved a pretty neat interactive effect. `Hammer.js` handles all the complex calculations and judgments internally, allowing us to simply write our business logic on events with clear "intent" like `pan` and `swipe`.

This simple example is precisely what we are going to build ourselves. Through this journey, you will fully understand how data like `e.deltaX` and `e.type` are calculated from the underlying `touch` events, and how gestures like `pan` and `swipe` are distinguished and recognized.

Now that we have a clear understanding of our goal, let's roll up our sleeves and prepare to lay the first cornerstone of our own gesture library!