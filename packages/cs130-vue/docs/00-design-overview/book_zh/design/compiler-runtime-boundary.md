# 编译器与运行时的边界

Vue3 的架构将功能划分为编译时和运行时两个领域。编译器负责分析和转换，运行时负责执行和更新。这种划分不是随意的，而是经过深思熟虑的设计决策。理解这条边界有助于我们更好地理解 Vue3 的整体架构。

## 边界的意义

为什么需要划分边界？核心原因是优化时机的不同：

**编译时**可以进行静态分析、代码转换、优化提示生成。这些工作只做一次（构建时），成本可以忽略。

**运行时**需要执行渲染、响应变化、更新 DOM。这些工作每次交互都会发生，成本需要最小化。

边界的原则是：**能在编译时做的，不要留到运行时**。

## 编译器的职责范围

编译器负责的工作包括：

**模板解析**：将模板字符串转换为 AST。

```javascript
// 编译器：模板 → AST
const ast = parse('<div :class="cls">{{ msg }}</div>')

// 运行时不需要再解析模板
```

**静态分析**：识别静态节点、动态绑定、表达式依赖。

```javascript
// 编译器分析并标记
{
  type: 'Element',
  tag: 'div',
  isStatic: false,
  dynamicProps: ['class'],
  children: [
    { type: 'Interpolation', isStatic: false }
  ]
}
```

**代码生成**：生成可执行的 JavaScript 代码。

```javascript
// 编译器生成渲染函数
function render(_ctx) {
  return createVNode('div', { class: _ctx.cls }, toDisplayString(_ctx.msg), 3)
}
```

**优化标记**：生成 PatchFlags、dynamicChildren 等优化信息。

```javascript
// 编译器添加优化标记
createVNode('div', props, children, 
  PatchFlags.CLASS | PatchFlags.TEXT,  // 优化标记
  ['class']  // 动态属性列表
)
```

## 运行时的职责范围

运行时负责的工作包括：

**响应式系统**：追踪依赖、触发更新。

```javascript
// 运行时：响应式追踪
const state = reactive({ count: 0 })

effect(() => {
  console.log(state.count)  // 追踪 count 的访问
})

state.count++  // 触发 effect 重新执行
```

**组件生命周期**：创建、挂载、更新、卸载。

```javascript
// 运行时：管理组件生命周期
function mountComponent(vnode, container) {
  const instance = createComponentInstance(vnode)
  setupComponent(instance)
  setupRenderEffect(instance, container)
}
```

**虚拟 DOM 操作**：Diff、Patch、DOM 更新。

```javascript
// 运行时：VNode Diff 和 Patch
function patch(n1, n2, container) {
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1)
    n1 = null
  }
  
  if (n2.shapeFlag & ShapeFlags.ELEMENT) {
    processElement(n1, n2, container)
  } else if (n2.shapeFlag & ShapeFlags.COMPONENT) {
    processComponent(n1, n2, container)
  }
}
```

**事件处理**：绑定和响应用户交互。

```javascript
// 运行时：事件处理
function patchEvent(el, key, prevValue, nextValue) {
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[key]
  
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue
  } else {
    const eventName = key.slice(2).toLowerCase()
    if (nextValue) {
      const invoker = createInvoker(nextValue)
      el.addEventListener(eventName, invoker)
      invokers[key] = invoker
    } else {
      el.removeEventListener(eventName, existingInvoker)
      invokers[key] = undefined
    }
  }
}
```

## 边界处的协作

编译器和运行时在边界处通过约定的接口协作：

**VNode 结构**：编译器生成 VNode，运行时消费 VNode。

```javascript
// 编译器生成
createVNode('div', { class: 'container' }, children)

// 运行时使用
function processElement(n1, n2, container) {
  if (n1 == null) {
    mountElement(n2, container)
  } else {
    patchElement(n1, n2)
  }
}
```

**运行时帮助函数**：编译器生成对运行时函数的调用。

```javascript
// 编译器生成的代码调用运行时帮助函数
import {
  createVNode,
  toDisplayString,
  renderList,
  withDirectives,
  resolveComponent
} from 'vue'
```

**优化标记**：编译器生成标记，运行时解释执行。

```javascript
// 编译器：生成 patchFlag
createVNode('div', null, ctx.msg, 1 /* TEXT */)

// 运行时：根据 patchFlag 优化更新
if (patchFlag & PatchFlags.TEXT) {
  if (n1.children !== n2.children) {
    hostSetElementText(el, n2.children)
  }
}
```

## 边界案例分析

某些功能需要在边界两侧都有实现：

**v-model**：编译器转换语法，运行时处理事件。

```vue
<!-- 模板 -->
<input v-model="text">
```

```javascript
// 编译器转换
createVNode('input', {
  value: _ctx.text,
  onInput: $event => _ctx.text = $event.target.value
})

// 运行时：实际绑定 value 和处理 input 事件
```

**v-for**：编译器生成循环代码，运行时执行 Diff。

```vue
<!-- 模板 -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

```javascript
// 编译器生成
renderList(_ctx.items, (item) => {
  return createVNode('li', { key: item.id }, item.name, 1)
})

// 运行时 renderList 实现
function renderList(source, renderItem) {
  const result = []
  for (let i = 0; i < source.length; i++) {
    result.push(renderItem(source[i], i))
  }
  return result
}
```

**组件解析**：编译器生成解析调用，运行时实际解析。

```vue
<!-- 模板 -->
<MyComponent />
```

```javascript
// 编译器生成
const _component_MyComponent = resolveComponent('MyComponent')
createVNode(_component_MyComponent)

// 运行时解析
function resolveComponent(name) {
  return currentInstance.components[name] || 
         currentInstance.appContext.components[name]
}
```

## 没有编译器时

Vue3 支持纯运行时使用（手写渲染函数）：

```javascript
// 不使用模板，直接写渲染函数
const Component = {
  setup() {
    const count = ref(0)
    
    return () => h('div', [
      h('span', count.value),
      h('button', { onClick: () => count.value++ }, '+1')
    ])
  }
}
```

这种情况下：

- 没有编译时优化（静态提升、PatchFlags）
- VNode 在运行时动态构建
- Diff 使用完整比较模式

框架仍然正确工作，只是失去了编译优化带来的性能收益。

## 边界的灵活性

边界不是绝对的，可以根据场景调整：

**运行时编译**：在浏览器中包含编译器。

```javascript
// 完整版 Vue 包含运行时编译器
import { createApp } from 'vue'

createApp({
  template: '<div>{{ msg }}</div>',
  data() {
    return { msg: 'Hello' }
  }
})
```

这对于动态模板很有用，但会增加包体积。

**更激进的编译**：Vapor Mode 探索将更多工作移到编译时。

```javascript
// Vapor Mode：编译生成直接的 DOM 操作
function render(ctx) {
  const div = document.createElement('div')
  const text = document.createTextNode(ctx.msg)
  div.appendChild(text)
  
  effect(() => {
    text.textContent = ctx.msg
  })
  
  return div
}
```

这进一步模糊了编译与运行的边界，但获得更好的性能。

## 设计原则

边界设计遵循几个原则：

**正确性优先**：即使没有编译优化，运行时也必须正确工作。

**优化是增量的**：编译优化提供加速，但不是必须的。

**接口稳定**：编译器输出的格式是运行时 API 的一部分，不会轻易变化。

**关注点分离**：编译器不需要知道响应式如何工作，运行时不需要知道模板如何解析。

## 边界的演进

Vue3 的边界设计允许未来的演进：

- 编译器可以生成更多优化信息
- 运行时可以利用新的优化信息
- 新的编译目标（如 Vapor Mode）可以渐进引入
- 保持向后兼容

这种设计使 Vue3 能够持续优化，同时保持稳定的使用体验。

理解编译器与运行时的边界，是理解 Vue3 架构的关键。它解释了为什么 Vue3 能够同时提供开发时的便利性和运行时的高性能：编译器承担分析和优化的复杂性，运行时专注于高效执行。
