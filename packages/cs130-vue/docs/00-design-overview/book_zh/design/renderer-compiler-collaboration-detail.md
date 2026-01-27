# 渲染器与编译器的协作（详细）

渲染器和编译器是 Vue 性能优化的关键。编译器在构建时分析模板，生成带有优化提示的渲染代码；渲染器在运行时利用这些提示跳过不必要的工作。

## 编译产物

模板编译的结果是渲染函数。Vue 3 的编译器生成的渲染函数包含丰富的优化信息：

```vue
<template>
  <div class="container">
    <span>静态文本</span>
    <p>{{ dynamic }}</p>
  </div>
</template>
```

编译结果：

```javascript
import { createElementVNode as _createElementVNode, toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "container" }
const _hoisted_2 = /*#__PURE__*/_createElementVNode("span", null, "静态文本", -1 /* HOISTED */)

export function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _hoisted_2,
    _createElementVNode("p", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
  ]))
}
```

这段代码包含了几个重要的优化特征：静态提升、Block Tree、PatchFlags。

## 静态提升

纯静态的节点被提升到渲染函数外部：

```javascript
// 静态节点只创建一次
const _hoisted_1 = { class: "container" }
const _hoisted_2 = _createElementVNode("span", null, "静态文本", -1)
```

`_hoisted_1` 是静态的 props 对象，`_hoisted_2` 是完全静态的 VNode。它们在模块初始化时创建，后续的每次渲染都复用这些引用。

渲染器在 patch 时会检查 VNode 的引用。如果新旧 VNode 是同一个对象，直接跳过比较：

```javascript
function patch(n1, n2, container) {
  // 引用相同，完全跳过
  if (n1 === n2) return
  
  // ... 继续 patch 逻辑
}
```

这个优化对于包含大量静态内容的页面效果显著。

## Block Tree

编译器将模板分解为 Block。每个 Block 记录其中的动态节点，形成一个扁平的数组：

```javascript
return (_openBlock(), _createElementBlock("div", _hoisted_1, [
  _hoisted_2,
  _createElementVNode("p", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
]))
```

`openBlock()` 开始收集动态节点，`createElementBlock` 结束收集并创建 Block VNode。Block VNode 有一个 `dynamicChildren` 数组：

```javascript
{
  type: 'div',
  children: [...],
  dynamicChildren: [
    { type: 'p', patchFlag: 1 }  // 只有动态节点
  ]
}
```

渲染器在更新 Block 时，只遍历 `dynamicChildren`，跳过静态节点：

```javascript
function patchBlockChildren(n1, n2, container) {
  // 只 patch 动态子节点
  const dynamicChildren = n2.dynamicChildren
  for (let i = 0; i < dynamicChildren.length; i++) {
    patchElement(n1.dynamicChildren[i], dynamicChildren[i], container)
  }
}
```

传统的虚拟 DOM diff 需要遍历整棵树。Block Tree 优化让复杂度从 O(节点总数) 降低到 O(动态节点数)。

## PatchFlags

PatchFlags 是编译器为动态节点添加的位标记，告诉渲染器这个节点哪些部分可能变化：

```javascript
_createElementVNode("p", null, _toDisplayString(_ctx.dynamic), 1 /* TEXT */)
```

`1` 是 PatchFlags.TEXT，表示只有文本内容是动态的。渲染器只需要更新文本：

```javascript
function patchElement(n1, n2, container) {
  const el = n2.el = n1.el
  const patchFlag = n2.patchFlag
  
  if (patchFlag & PatchFlags.TEXT) {
    // 只更新文本
    if (n1.children !== n2.children) {
      el.textContent = n2.children
    }
  }
  
  if (patchFlag & PatchFlags.CLASS) {
    // 只更新 class
    if (n1.props.class !== n2.props.class) {
      el.className = n2.props.class
    }
  }
  
  // ... 其他 flag 处理
}
```

PatchFlags 的值定义：

```javascript
const PatchFlags = {
  TEXT: 1,           // 动态文本
  CLASS: 2,          // 动态 class
  STYLE: 4,          // 动态 style
  PROPS: 8,          // 动态 props（非 class/style）
  FULL_PROPS: 16,    // 有动态 key 的 props
  HYDRATE_EVENTS: 32,// 有事件监听器（用于水合）
  STABLE_FRAGMENT: 64,
  KEYED_FRAGMENT: 128,
  UNKEYED_FRAGMENT: 256,
  NEED_PATCH: 512,   // 有 ref 或 hooks
  DYNAMIC_SLOTS: 1024,
  HOISTED: -1,       // 静态提升的节点
  BAIL: -2           // 退出优化
}
```

使用位运算可以组合多个标记：`TEXT | CLASS` 表示文本和 class 都是动态的。

## 事件缓存

编译器还会缓存事件处理器，避免不必要的更新：

```vue
<template>
  <button @click="handleClick">点击</button>
</template>
```

编译结果：

```javascript
_createElementVNode("button", {
  onClick: _cache[0] || (_cache[0] = $event => (_ctx.handleClick($event)))
}, "点击")
```

`_cache[0]` 存储事件处理器。后续渲染复用缓存的函数引用，不会触发 props 更新。

## v-once 与 v-memo

`v-once` 让节点只渲染一次：

```vue
<span v-once>{{ expensive }}</span>
```

编译后的节点被标记为 HOISTED，后续更新完全跳过。

`v-memo` 提供更细粒度的缓存控制：

```vue
<div v-memo="[item.id]">
  {{ expensiveCompute(item) }}
</div>
```

只有当 `item.id` 变化时才重新渲染，否则复用缓存的 VNode。

## 编译器提示的限制

Block Tree 优化在某些情况下失效。包含 v-if 或 v-for 的结构会破坏 Block 的稳定性：

```vue
<div>
  <span v-if="show">A</span>
  <span v-else>B</span>
</div>
```

条件渲染导致 dynamicChildren 的结构不稳定，无法简单地按索引对应。编译器会为这些情况生成 Fragment，使用 key 进行匹配：

```javascript
show
  ? _createElementVNode("span", { key: 0 }, "A")
  : _createElementVNode("span", { key: 1 }, "B")
```

## 手写渲染函数

使用 JSX 或手写渲染函数时，无法享受编译器的优化。所有节点都被视为动态节点：

```javascript
// 手写渲染函数 - 无优化
export default {
  render() {
    return h('div', [
      h('span', '静态文本'),
      h('p', this.dynamic)
    ])
  }
}
```

如果性能敏感，可以手动添加 PatchFlags：

```javascript
import { h, PatchFlags } from 'vue'

h('p', null, this.dynamic, PatchFlags.TEXT)
```

但更推荐的做法是使用模板，让编译器自动优化。

## 运行时与编译时的平衡

Vue 3 的设计在运行时和编译时之间取得平衡。编译器尽可能多地做静态分析，生成优化代码；运行时保持足够的灵活性，支持动态特性。

这种设计让 Vue 既保持了模板的简洁性，又获得了接近手写优化代码的性能。开发者可以专注于业务逻辑，性能优化由框架自动处理。
