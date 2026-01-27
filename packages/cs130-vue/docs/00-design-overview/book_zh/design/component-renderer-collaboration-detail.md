# 组件与渲染器的协作（详细）

组件系统管理组件的创建、更新和销毁，渲染器负责将虚拟 DOM 转换为实际的 DOM 操作。两者的协作是 Vue 渲染流程的核心。

## 组件的渲染入口

当应用挂载时，渲染器接收根组件的 VNode，开始渲染流程：

```javascript
// 简化的挂载流程
function render(vnode, container) {
  if (vnode.type is Component) {
    mountComponent(vnode, container)
  } else if (vnode.type is Element) {
    mountElement(vnode, container)
  }
}
```

组件 VNode 与元素 VNode 的处理逻辑不同。元素 VNode 直接创建 DOM 节点，组件 VNode 需要先创建组件实例、执行 setup、调用 render 获取子 VNode。

```javascript
function mountComponent(vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 执行 setup
  setupComponent(instance)
  
  // 建立渲染 effect
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  const effect = new ReactiveEffect(
    () => {
      // 执行组件的 render 函数
      const subTree = instance.render.call(instance.proxy)
      // 递归渲染子树
      patch(null, subTree, container)
      instance.subTree = subTree
    },
    () => queueJob(instance.update)
  )
  
  instance.update = effect.run.bind(effect)
  instance.update()
}
```

## 更新流程

当响应式数据变化时，组件的更新 effect 被调度执行：

```javascript
function updateComponent(instance) {
  const prevTree = instance.subTree
  const nextTree = instance.render.call(instance.proxy)
  
  // patch 对比新旧子树，执行必要的 DOM 更新
  patch(prevTree, nextTree, container)
  
  instance.subTree = nextTree
}
```

渲染器通过 patch 函数对比新旧 VNode 树，确定需要的 DOM 操作。这个过程递归进行，直到处理完整棵树。

## Props 的传递

父组件通过 VNode 的 props 传递数据给子组件：

```javascript
// 父组件的 render 函数产出
const childVNode = h(ChildComponent, { count: 1, name: 'test' })
```

渲染器在挂载或更新子组件时，将 VNode 的 props 设置到子组件实例：

```javascript
function updateComponentProps(instance, newProps) {
  const prevProps = instance.props
  
  for (const key in newProps) {
    instance.props[key] = newProps[key]
  }
  
  // 移除旧的 props
  for (const key in prevProps) {
    if (!(key in newProps)) {
      delete instance.props[key]
    }
  }
}
```

由于 `instance.props` 是响应式的，props 变化会触发子组件的依赖更新。

## Slots 的实现

Slots 是通过特殊的 props 传递的函数：

```javascript
// 父组件
const vnode = h(ChildComponent, null, {
  default: () => h('span', 'default slot content'),
  header: () => h('h1', 'header content')
})

// 子组件访问 slots
instance.slots.default()  // 渲染 default slot
instance.slots.header()   // 渲染 header slot
```

Slots 是函数而不是 VNode，这让 slot 内容可以访问子组件的作用域（scoped slots）：

```javascript
// 作用域插槽
const vnode = h(ChildComponent, null, {
  default: (scope) => h('span', scope.text)  // 接收子组件传递的数据
})
```

## 生命周期的调用时机

渲染器在特定时机调用组件的生命周期钩子：

```javascript
function mountComponent(vnode, container) {
  const instance = createComponentInstance(vnode)
  
  // beforeCreate
  callHook(instance, 'beforeCreate')
  
  setupComponent(instance)
  
  // created
  callHook(instance, 'created')
  
  // beforeMount
  callHook(instance, 'beforeMount')
  
  setupRenderEffect(instance, container)
  
  // mounted（在 effect 执行后）
  queuePostFlushCb(() => callHook(instance, 'mounted'))
}

function updateComponent(instance) {
  // beforeUpdate
  callHook(instance, 'beforeUpdate')
  
  // ... patch 逻辑
  
  // updated
  queuePostFlushCb(() => callHook(instance, 'updated'))
}

function unmountComponent(instance) {
  // beforeUnmount
  callHook(instance, 'beforeUnmount')
  
  // ... 卸载逻辑
  
  // unmounted
  callHook(instance, 'unmounted')
}
```

钩子的调用顺序是精心设计的。mounted 和 updated 在 DOM 操作完成后调用，确保钩子中可以安全访问 DOM。

## Suspense 的协作

Suspense 组件需要渲染器的特殊支持：

```javascript
function mountSuspense(vnode, container) {
  const { default: defaultSlot, fallback: fallbackSlot } = vnode.children
  
  // 先渲染 fallback
  patch(null, fallbackSlot(), container)
  
  // 异步加载 default 内容
  Promise.resolve(defaultSlot())
    .then(content => {
      // 替换 fallback 为实际内容
      patch(fallbackSlot(), content, container)
    })
}
```

Suspense 的实现涉及渲染器对异步组件的处理、错误边界、以及切换动画等复杂逻辑。

## KeepAlive 的缓存

KeepAlive 组件通过渲染器的特殊处理实现组件缓存：

```javascript
function deactivateComponent(instance) {
  // 不执行 unmount，只是从 DOM 移除
  move(instance.subTree, hiddenContainer)
  
  // 调用 deactivated 钩子
  callHook(instance, 'deactivated')
}

function activateComponent(instance, container) {
  // 从隐藏容器移回目标容器
  move(instance.subTree, container)
  
  // 调用 activated 钩子
  callHook(instance, 'activated')
}
```

KeepAlive 维护一个缓存 Map，存储被"失活"的组件实例。当组件再次被激活时，直接复用缓存的实例，跳过创建和销毁过程。

## 边界的清晰性

组件系统和渲染器的边界体现在：

组件系统负责：
- 管理组件实例的创建和生命周期
- 处理 props、slots、emits 等组件间通信
- 提供组件级的 API（如 expose、provide/inject）

渲染器负责：
- 将 VNode 转换为 DOM 操作
- 执行 diff 算法确定最小更新
- 管理 DOM 节点的创建、更新、移动、删除

这种分离让渲染器可以替换为不同的平台实现（如 SSR、weex），组件系统的逻辑保持不变。

## 自定义渲染器

Vue 3 的架构支持自定义渲染器：

```javascript
import { createRenderer } from '@vue/runtime-core'

const renderer = createRenderer({
  createElement(type) { ... },
  insert(el, parent) { ... },
  patchProp(el, key, prev, next) { ... },
  // ... 其他平台特定操作
})

const app = renderer.createApp(RootComponent)
```

通过提供不同的节点操作实现，Vue 可以渲染到 Canvas、WebGL、原生 App 等非 DOM 环境。组件系统的代码完全复用。
