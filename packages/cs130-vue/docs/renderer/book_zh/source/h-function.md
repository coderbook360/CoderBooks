# h 函数实现

`h` 函数是 Vue 的 hyperscript 函数，用于创建 VNode。它是模板编译结果和手写渲染函数的基础。

## 函数签名

`h` 函数支持多种调用形式：

```typescript
// 基础形式
h(type)
h(type, props)
h(type, children)
h(type, props, children)

// children 可以是多个参数
h(type, props, child1, child2, child3)
```

## 类型定义

```typescript
function h(
  type: string | Component,
  propsOrChildren?: object | null,
  children?: any
): VNode

// 带 props 和多个子节点
function h(
  type: string | Component,
  props: object | null,
  ...children: any[]
): VNode
```

## 实现

```typescript
function h(type, propsOrChildren, children) {
  const l = arguments.length
  
  if (l === 2) {
    // h(type, props) 或 h(type, children)
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // 单个 VNode 作为 children
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // 是 props，无 children
      return createVNode(type, propsOrChildren)
    } else {
      // 是 children，无 props
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      // h(type, props, child1, child2, ...)
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      // h(type, props, vnode) -> 包装成数组
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
```

核心逻辑是根据参数数量和类型判断各参数含义，然后委托给 `createVNode`。

## 参数解析

**两个参数时**：

```typescript
// props 是对象且不是数组/VNode
h('div', { class: 'container' })
// -> createVNode('div', { class: 'container' })

// 数组作为 children
h('div', [child1, child2])
// -> createVNode('div', null, [child1, child2])

// 单个 VNode 作为 children
h('div', h('span'))
// -> createVNode('div', null, [h('span')])
```

**三个参数时**：

```typescript
h('div', { id: 'app' }, 'hello')
// -> createVNode('div', { id: 'app' }, 'hello')

h('div', null, [h('span', 'a'), h('span', 'b')])
// -> createVNode('div', null, [span, span])
```

**超过三个参数时**：

```typescript
h('div', { class: 'list' }, 
  h('li', 'item 1'),
  h('li', 'item 2'),
  h('li', 'item 3')
)
// children 收集为数组
// -> createVNode('div', { class: 'list' }, [li, li, li])
```

## 类型推断

Vue 使用 TypeScript 重载让 h 函数有更好的类型推断：

```typescript
// 字符串类型 -> 原生元素
export function h(type: string, children?: RawChildren): VNode
export function h(type: string, props?: RawProps | null, children?: RawChildren): VNode

// 组件类型
export function h<P>(
  type: Component<P>,
  props?: (RawProps & P) | null,
  children?: RawChildren
): VNode

// Fragment
export function h(type: typeof Fragment, children?: VNodeArrayChildren): VNode
export function h(type: typeof Fragment, props?: null, children?: VNodeArrayChildren): VNode

// Teleport
export function h(
  type: typeof Teleport,
  props: TeleportProps,
  children: RawChildren
): VNode

// Suspense
export function h(type: typeof Suspense, children?: RawChildren): VNode
export function h(type: typeof Suspense, props?: null, children?: RawChildren): VNode
```

这让 IDE 能正确提示组件的 props 类型。

## 与模板编译的关系

模板编译为 h 函数（或 createVNode）调用：

```html
<div id="app" :class="cls">
  <span>{{ msg }}</span>
</div>
```

编译为：

```javascript
import { h } from 'vue'

export function render(_ctx) {
  return h('div', { id: 'app', class: _ctx.cls }, [
    h('span', null, _ctx.msg)
  ])
}
```

实际上编译器更多使用 `createVNode` 和 `createBlock`，因为它们支持 PatchFlags 优化。`h` 函数主要用于手写渲染函数。

## 手写渲染函数

```typescript
import { h, defineComponent } from 'vue'

export default defineComponent({
  props: {
    level: Number
  },
  setup(props, { slots }) {
    return () => h(
      `h${props.level}`,  // 动态标签
      {},
      slots.default?.()
    )
  }
})
```

## 使用组件

```typescript
import { h } from 'vue'
import MyComponent from './MyComponent.vue'

// 渲染组件
h(MyComponent, {
  msg: 'Hello',
  onUpdate: (val) => console.log(val)
})

// 带插槽
h(MyComponent, null, {
  default: () => h('span', 'default slot'),
  header: () => h('h1', 'header slot')
})
```

## 使用 Fragment

```typescript
import { h, Fragment } from 'vue'

// 多根节点
h(Fragment, null, [
  h('li', 'item 1'),
  h('li', 'item 2'),
  h('li', 'item 3')
])
```

## 使用 Teleport

```typescript
import { h, Teleport } from 'vue'

h(Teleport, { to: 'body' }, [
  h('div', { class: 'modal' }, 'Modal Content')
])
```

## JSX 与 h 函数

JSX 编译后也是 h 函数调用：

```jsx
// JSX
<div class="container">
  <span>{msg}</span>
</div>

// 编译后
h('div', { class: 'container' }, [
  h('span', null, msg)
])
```

Babel 插件 `@vue/babel-plugin-jsx` 负责这个转换。

## 性能考虑

`h` 函数没有编译时优化——无 PatchFlags、无 Block Tree。如果追求极致性能，应该使用模板。

但 h 函数的灵活性更高，适用于：
- 高度动态的组件
- 需要 JavaScript 完全控制的场景
- 组件库开发

## 小结

`h` 函数是创建 VNode 的核心 API，支持灵活的调用形式。它处理参数变体后委托给 `createVNode` 完成实际创建。理解 h 函数是理解 Vue 渲染机制的基础。
