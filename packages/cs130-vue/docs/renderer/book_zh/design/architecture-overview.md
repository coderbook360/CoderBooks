# 架构概览

这一章从全局视角审视 Vue 3 渲染器的架构。理解整体设计，才能在后续源码分析中不迷失方向。

## 核心模块

Vue 3 的渲染相关代码主要分布在三个包：

**@vue/runtime-core**：平台无关的渲染器核心
- VNode 定义和创建
- 组件模型
- Diff 算法
- 调度器
- 内置组件（KeepAlive、Teleport、Suspense）

**@vue/runtime-dom**：浏览器 DOM 平台实现
- DOM 操作封装
- 事件处理
- 属性 / 特性处理
- 样式处理

**@vue/compiler-dom**：模板编译（与渲染器协作）
- 模板解析
- 优化标记生成
- 代码生成

## 依赖关系

```
@vue/compiler-dom
       |
       v
@vue/runtime-dom
       |
       v
@vue/runtime-core
       |
       v
@vue/reactivity
```

渲染器依赖响应式系统追踪依赖、触发更新。编译器独立于运行时，生成的代码在运行时执行。

## createRenderer 入口

`createRenderer` 是渲染器的工厂函数，接收平台操作配置，返回渲染器实例：

```javascript
function createRenderer(options) {
  const {
    createElement,
    insert,
    remove,
    patchProp,
    // ...
  } = options
  
  // 内部实现
  function render(vnode, container) { /* ... */ }
  function patch(n1, n2, container) { /* ... */ }
  function mount(vnode, container) { /* ... */ }
  // ...
  
  return {
    render,
    createApp(rootComponent) {
      return {
        mount(container) {
          const vnode = createVNode(rootComponent)
          render(vnode, container)
        }
      }
    }
  }
}
```

`@vue/runtime-dom` 调用 `createRenderer` 并传入 DOM 操作：

```javascript
const renderer = createRenderer(nodeOps)
export const createApp = renderer.createApp
```

## 渲染流程

一次完整的渲染流程：

```
1. createApp(App).mount('#app')
       |
       v
2. 创建根组件 VNode
       |
       v
3. render(vnode, container)
       |
       v
4. patch(null, vnode, container)
       |
       v
5. 根据 VNode 类型分发处理
       |
   +---+---+
   |       |
   v       v
元素节点   组件节点
   |       |
   v       v
mountElement  mountComponent
   |           |
   v           v
创建 DOM    创建组件实例
插入容器    设置响应式 effect
            调用 render 获取子 VNode
            递归 patch
```

## VNode 类型分发

`patch` 函数是渲染器的核心分发器：

```javascript
function patch(n1, n2, container, anchor) {
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1)
    n1 = null
  }
  
  const { type, shapeFlag } = n2
  
  switch (type) {
    case Text:
      processText(n1, n2, container)
      break
    case Comment:
      processComment(n1, n2, container)
      break
    case Fragment:
      processFragment(n1, n2, container)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        type.process(n1, n2, container, anchor, internals)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        type.process(n1, n2, container, anchor, internals)
      }
  }
}
```

## 组件渲染

组件渲染涉及：

1. **创建组件实例**：包含 props、slots、生命周期等
2. **设置渲染 effect**：响应式追踪，数据变化时重新渲染
3. **调用 setup/render**：获取子 VNode 树
4. **递归 patch 子树**

```javascript
function mountComponent(vnode, container, anchor) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)
  vnode.component = instance
  
  // 设置组件（执行 setup，编译模板等）
  setupComponent(instance)
  
  // 设置渲染 effect
  setupRenderEffect(instance, vnode, container, anchor)
}

function setupRenderEffect(instance, vnode, container, anchor) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 挂载
      const subTree = renderComponentRoot(instance)
      patch(null, subTree, container, anchor)
      instance.subTree = subTree
      instance.isMounted = true
    } else {
      // 更新
      const prevTree = instance.subTree
      const nextTree = renderComponentRoot(instance)
      patch(prevTree, nextTree, container, anchor)
      instance.subTree = nextTree
    }
  }
  
  const effect = new ReactiveEffect(componentUpdateFn, () => {
    queueJob(instance.update)
  })
  
  instance.update = effect.run.bind(effect)
  instance.update()
}
```

## 元素处理

元素的挂载和更新：

```javascript
function processElement(n1, n2, container, anchor) {
  if (n1 == null) {
    mountElement(n2, container, anchor)
  } else {
    patchElement(n1, n2)
  }
}

function mountElement(vnode, container, anchor) {
  const el = vnode.el = createElement(vnode.type)
  
  // 处理 children
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    setElementText(el, vnode.children)
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode.children, el)
  }
  
  // 处理 props
  if (vnode.props) {
    for (const key in vnode.props) {
      patchProp(el, key, null, vnode.props[key])
    }
  }
  
  insert(el, container, anchor)
}

function patchElement(n1, n2) {
  const el = n2.el = n1.el
  
  // patch props
  patchProps(el, n1.props, n2.props)
  
  // patch children
  patchChildren(n1, n2, el)
}
```

## 子节点 Diff

`patchChildren` 根据新旧子节点类型选择策略：

```javascript
function patchChildren(n1, n2, container) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  // 新 children 是文本
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      setElementText(container, c2)
    }
  } else {
    // 新 children 是数组或空
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 两边都是数组，核心 Diff
        patchKeyedChildren(c1, c2, container)
      } else {
        unmountChildren(c1)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        setElementText(container, '')
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, container)
      }
    }
  }
}
```

## 调度器集成

调度器收集更新任务，在微任务中批量执行：

```javascript
const queue = []
let isFlushing = false

function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  queue.sort((a, b) => a.id - b.id)
  for (const job of queue) {
    job()
  }
  queue.length = 0
  isFlushing = false
}
```

## 卸载流程

卸载需要清理组件实例、DOM 节点、事件监听等：

```javascript
function unmount(vnode) {
  const { type, shapeFlag, el, component } = vnode
  
  if (shapeFlag & ShapeFlags.COMPONENT) {
    unmountComponent(component)
  } else {
    // 元素节点
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(vnode.children)
    }
    remove(el)
  }
}

function unmountComponent(instance) {
  // 调用生命周期
  callHook(instance, 'beforeUnmount')
  
  // 停止 effect
  instance.effect.stop()
  
  // 卸载子树
  unmount(instance.subTree)
  
  callHook(instance, 'unmounted')
}
```

## 内置组件处理

内置组件（Teleport、KeepAlive、Suspense）有特殊的处理逻辑，通过 `type.process` 委托：

```javascript
// Teleport
if (shapeFlag & ShapeFlags.TELEPORT) {
  type.process(n1, n2, container, anchor, internals)
}
```

`internals` 包含渲染器内部方法的引用，让内置组件可以调用 patch、mount、unmount 等。

## 平台抽象层

渲染器核心不直接调用 DOM API，而是通过传入的平台操作：

```javascript
// 创建渲染器时传入平台操作
const renderer = createRenderer({
  createElement: (tag) => document.createElement(tag),
  insert: (el, parent, anchor) => parent.insertBefore(el, anchor),
  remove: (el) => el.parentNode?.removeChild(el),
  patchProp: (el, key, prev, next) => { /* ... */ }
})
```

这让 runtime-core 可以用于任何渲染目标。

## 代码组织

在实际源码中，渲染器代码分布在多个文件：

- `renderer.ts`：createRenderer 和 patch 逻辑
- `componentRenderUtils.ts`：组件渲染辅助
- `vnode.ts`：VNode 创建和辅助函数
- `scheduler.ts`：调度器实现
- `apiLifecycle.ts`：生命周期钩子

## 小结

Vue 3 渲染器的架构围绕几个核心概念：

1. **VNode**：Virtual DOM 的节点描述
2. **Patch**：对比新旧 VNode，最小化更新
3. **组件模型**：实例、生命周期、响应式 effect
4. **调度器**：批量异步更新
5. **平台抽象**：与具体平台解耦

理解了这个架构，后续深入源码分析就有了地图。每个具体实现都是这个架构的组成部分。
