# 函数式组件

并非所有组件都需要响应式状态和生命周期。有些组件只是根据 props 渲染内容，没有自己的状态。

**这就是函数式组件的用武之地——更轻量、更快速。** 本章将分析函数式组件的定义、渲染流程和性能特点。

## 什么是函数式组件

函数式组件就是一个返回 VNode 的函数：

```javascript
function FunctionalButton(props) {
  return h('button', { class: 'btn' }, props.label)
}
```

对比有状态组件：

```javascript
// 有状态组件
const StatefulComponent = {
  setup() {
    const count = ref(0)
    return { count }
  },
  template: '<div>{{ count }}</div>'
}

// 函数式组件
function FunctionalComponent(props) {
  return h('div', props.message)
}
```

关键区别：
- 函数式组件是函数，不是对象
- 没有 setup、data、computed
- 没有生命周期钩子
- 没有组件实例

## 定义方式

### 基础形式

```javascript
function MyComponent(props) {
  return h('div', props.title)
}
```

### 带完整参数

```javascript
function MyComponent(props, context) {
  const { attrs, slots, emit } = context
  
  return h(
    'button',
    {
      class: attrs.class,
      onClick: () => emit('click')
    },
    slots.default?.()
  )
}
```

### 静态属性

```javascript
MyComponent.props = ['title']
MyComponent.emits = ['click']
MyComponent.inheritAttrs = false
MyComponent.displayName = 'MyComponent'
```

### TypeScript 类型

```typescript
import { FunctionalComponent } from 'vue'

interface Props {
  title: string
  count?: number
}

const MyComponent: FunctionalComponent<Props> = (props, { emit }) => {
  return h('div', props.title)
}

MyComponent.props = ['title', 'count']
```

## 判断函数式组件

渲染时如何区分函数式组件和普通组件？

```javascript
function isFunction(val) {
  return typeof val === 'function'
}

function processComponent(vnode, container) {
  const { type } = vnode
  
  if (isFunction(type)) {
    // 函数式组件
    mountFunctionalComponent(vnode, container)
  } else {
    // 有状态组件
    mountStatefulComponent(vnode, container)
  }
}
```

区分规则：
- `type` 是函数 → 函数式组件
- `type` 是对象 → 有状态组件
- `type` 有 `setup` 属性 → 有状态组件

## 渲染流程

函数式组件的渲染比有状态组件简单得多：

```javascript
function mountFunctionalComponent(vnode, container) {
  const { type: Component, props } = vnode
  
  // 准备 context
  const context = {
    attrs: vnode.props || {},
    slots: vnode.children || {},
    emit: (event, ...args) => {
      const handler = props?.[`on${capitalize(event)}`]
      handler?.(...args)
    }
  }
  
  // 直接调用函数获取 VNode
  const subTree = Component(props, context)
  
  // 挂载子树
  patch(null, subTree, container)
  
  vnode.el = subTree.el
}
```

与有状态组件对比：

```javascript
// 有状态组件流程
createComponentInstance()
  ↓
setupComponent()    // 处理 props, slots, setup
  ↓
setupRenderEffect() // 创建响应式 effect
  ↓
render()            // 调用 render 获取 VNode
  ↓
patch()             // 挂载

// 函数式组件流程
Component(props, context)  // 直接调用
  ↓
patch()                     // 挂载
```

函数式组件跳过了实例创建、setup 处理、响应式 effect 等步骤。

## 更新机制

函数式组件没有自己的响应式状态，更新依赖父组件：

```javascript
function updateFunctionalComponent(n1, n2, container) {
  const { type: Component } = n2
  
  // 准备新的 context
  const context = {
    attrs: n2.props || {},
    slots: n2.children || {},
    emit: createEmit(n2.props)
  }
  
  // 重新调用函数
  const nextTree = Component(n2.props, context)
  const prevTree = n1.subTree
  
  // patch 更新
  patch(prevTree, nextTree, container)
  
  n2.subTree = nextTree
  n2.el = nextTree.el
}
```

每次父组件更新，函数式组件都会重新执行。

## 性能特点

函数式组件更轻量：
1. 无实例创建开销
2. 无响应式系统开销
3. 无生命周期管理开销

但也有代价：
1. 无法维护状态
2. 每次父组件更新都会重新执行
3. 无法使用 onMounted 等钩子

### 什么时候用函数式组件？

适合：
- 纯展示组件
- 列表项渲染
- 高阶组件包装
- 简单的 UI 原子组件

不适合：
- 需要维护状态
- 需要生命周期逻辑
- 需要 computed/watch

## 与 Vue 2 的区别

Vue 2 中函数式组件有显著性能优势：

```javascript
// Vue 2 函数式组件
{
  functional: true,
  render(h, context) {
    return h('div', context.props.title)
  }
}
```

Vue 3 中差异变小了：
- Vue 3 有状态组件的初始化已经很快
- 函数式组件的优势不再那么明显
- 官方建议：除非有特殊需求，使用普通组件即可

## 高阶组件模式

函数式组件常用于实现高阶组件（HOC）：

```javascript
function withLoading(WrappedComponent) {
  return function LoadingWrapper(props, { slots }) {
    if (props.loading) {
      return h('div', { class: 'loading' }, 'Loading...')
    }
    return h(WrappedComponent, props, slots)
  }
}

// 使用
const MyComponentWithLoading = withLoading(MyComponent)
```

但在 Vue 3 中，组合式 API 通常是更好的复用方案：

```javascript
// 组合式 API 方式
function useLoading() {
  const loading = ref(false)
  
  const startLoading = () => loading.value = true
  const stopLoading = () => loading.value = false
  
  return { loading, startLoading, stopLoading }
}
```

## 实际示例

### Icon 组件

```javascript
function Icon(props) {
  const { name, size = 16, color = 'currentColor' } = props
  
  return h('svg', {
    class: `icon icon-${name}`,
    style: { width: `${size}px`, height: `${size}px`, color }
  }, [
    h('use', { 'xlink:href': `#icon-${name}` })
  ])
}

Icon.props = ['name', 'size', 'color']
```

### 列表项

```javascript
function ListItem(props, { slots }) {
  return h(
    'li',
    { class: 'list-item' },
    [
      h('span', { class: 'content' }, slots.default?.()),
      props.showArrow && h('span', { class: 'arrow' }, '>')
    ]
  )
}

ListItem.props = ['showArrow']
```

## 本章小结

本章分析了函数式组件：

- **定义**：返回 VNode 的纯函数
- **特点**：无实例、无状态、无生命周期
- **渲染**：直接调用函数，跳过实例创建流程
- **更新**：依赖父组件触发，每次重新执行
- **性能**：更轻量，但 Vue 3 中优势不明显
- **适用场景**：纯展示、无状态的简单组件

函数式组件是 Vue 组件系统的一种轻量级形式。在大多数场景下，普通组件已经足够高效，但理解函数式组件的工作原理有助于深入理解 Vue 的组件系统。

下一章，我们将分析自定义指令系统的实现。
