# Ramda Design and Implementation: A Deep Dive into JavaScript Functional Programming

This book aims to open the door to functional programming for front-end developers. We will start with the core concepts of functional programming and delve into the implementation details of each function in the Ramda library, enabling you not only to use Ramda proficiently but also to deeply understand the design philosophy and implementation principles behind it.

- [Preface](preface.md)

---

### Part 1: Foundations of Functional Programming

1. [Introduction to Functional Programming: A Front-End Developer's Perspective](foundations/intro-to-fp.md)
2. [Pure Functions and Side Effects: The Cornerstone of Reliable Code](foundations/pure-functions-and-side-effects.md)
3. [Immutability: Ramda's Philosophy of Data Manipulation](foundations/immutability.md)
4. [Ramda Overview: Function-First and Data-Last](foundations/ramda-overview.md)

---

### Part 2: Core Mechanics: Currying and Composition

5. [Currying: The "Magical" Core of Ramda](core-mechanics/currying.md)
6. [Deep Dive into `curry` Implementation: From `_curry1` to `_curryN`](core-mechanics/curry-implementation.md)
7. [Function Composition: Building Declarative Data Flows](core-mechanics/function-composition.md)
8. [Dissecting `compose` and `pipe`: The Implementation of Function Composition](core-mechanics/compose-pipe-implementation.md)

---

### Part 3: List Operations: Basics

9. [Iteration and Transformation: Implementation of `map` and `forEach`](list-operations/map-and-foreach.md)
10. [Filtering and Finding: `filter`, `find`, and `reject`](list-operations/filter-and-find.md)
11. [Data Reduction: The Power and Implementation of `reduce`](list-operations/reduce.md)
12. [List Slicing: `slice`, `take`, and `drop`](list-operations/slicing.md)
13. [List Transformation: `adjust`, `update`, and `insert`](list-operations/transforming.md)
14. [Sorting and Deduplication: `sort` and `uniq`](list-operations/sorting-and-deduping.md)
15. [Grouping and Aggregation: `groupBy` and `countBy`](list-operations/grouping.md)

---

### Part 4: Object Operations

16. [Property Access: `prop`, `path`, and `pick`](object-operations/property-access.md)
17. [Object Updates and Evolution: `assoc`, `dissoc`, and `evolve`](object-operations/updating-objects.md)
18. [Object Merging: `merge` and `mergeDeep`](object-operations/merging.md)
19. [Structure Conversion: `toPairs` and `fromPairs`](object-operations/structure-conversion.md)

---

### Part 5: Logic and Control Flow

20. [Conditional Logic: Functional Expressions with `ifElse` and `cond`](logic-flow/conditional-logic.md)
21. [Predicate Function Composition: `allPass` and `anyPass`](logic-flow/predicate-composition.md)
22. [Boolean and Comparison Operations: `and`, `or`, `not`, and `equals`](logic-flow/boolean-and-comparison.md)

---

### Part 6: The Transducer Protocol: The Secret to High-Performance Composition

23. [The Transducer Concept: From Data Flow to Operation Flow](transducers/intro-to-transducers.md)
24. [Implementing a `map` Transducer: Refactoring the `map` Function](transducers/map-transducer.md)
25. [Transducer Composition and `sequence` Implementation](transducers/composition-and-sequence.md)

---

### Part 7: Lenses: Focusing on Any Part of a Data Structure

26. [The Lens Concept: Functional Getters/Setters](lenses/intro-to-lenses.md)
27. [Deep Dive into the Implementation of `lens`, `view`, `set`, and `over`](lenses/lens-implementation.md)
28. [Lens Composition: Navigating Deeply Nested Data](lenses/lens-composition.md)

---

### Part 8: Unveiling Ramda's Internal Architecture

29. [Architecture Overview: The Core Role of the `internal` Directory](internal-architecture/overview.md)
30. [Analysis of Core Utilities: `_curryN`, `_dispatchable`, `_xfrm`](internal-architecture/core-helpers.md)
31. [From Internal Functions to Public API: The Complete Construction of `map`](internal-architecture/building-a-public-api.md)

---

### Part 9: Summary and Outlook

32. [A Recap of Functional Programming Thinking](summary/fp-thinking-recap.md)
33. [From Ramda to Your Own Functional Utility Library](summary/building-your-own-library.md)
