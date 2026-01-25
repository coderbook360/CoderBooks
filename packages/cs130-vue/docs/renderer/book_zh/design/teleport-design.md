# Teleport 设计

Teleport 是 Vue 3 的内置组件，用于将子节点渲染到 DOM 树的其他位置。它解决了模态框、通知、下拉菜单等组件的定位问题。

## 问题背景

考虑一个模态框组件：

```vue
<template>
  <div class="container">
    <button @click="showModal = true">打开</button>
    <Modal v-if="showModal" @close="showModal = false">
      内容...
    </Modal>
  </div>
</template>
```

Modal 在组件树中是 container 的子节点，但我们希望它渲染到 body 下，因为：

1. **z-index 问题**：父元素的 z-index 层叠上下文会限制子元素
2. **overflow 问题**：父元素的 `overflow: hidden` 会裁剪子元素
3. **定位问题**：`position: fixed` 相对于 viewport，但如果父元素有 transform，定位会出问题

## Teleport 用法

```vue
<template>
  <div class="container">
    <button @click="showModal = true">打开</button>
    <Teleport to="body">
      <Modal v-if="showModal" @close="showModal = false">
        内容...
      </Modal>
    </Teleport>
  </div>
</template>
```

`to` 属性指定目标容器，可以是选择器字符串或 DOM 元素。

## VNode 结构

Teleport 是一种特殊的 VNode 类型：

```javascript
const TeleportVNode = {
  type: Teleport,
  props: {
    to: 'body',
    disabled: false
  },
  children: [/* 要传送的内容 */],
  shapeFlag: ShapeFlags.TELEPORT
}
```

渲染器通过 shapeFlag 识别 Teleport：

```javascript
function patch(n1, n2, container) {
  const { shapeFlag } = n2
  
  if (shapeFlag & ShapeFlags.TELEPORT) {
    processTeleport(n1, n2, container)
  }
  // ...
}
```

## 挂载流程

```javascript
function processTeleport(n1, n2, container, internals) {
  const { mount, patch, unmount, move } = internals
  
  if (n1 == null) {
    // 挂载
    const target = resolveTarget(n2.props.to)
    
    if (n2.props.disabled) {
      // disabled 时渲染到原位置
      mountChildren(n2.children, container)
    } else {
      // 渲染到目标容器
      mountChildren(n2.children, target)
    }
    
    n2.target = target
  } else {
    // 更新
    patchTeleport(n1, n2, container, internals)
  }
}
```

`resolveTarget` 解析目标容器：

```javascript
function resolveTarget(to) {
  if (typeof to === 'string') {
    return document.querySelector(to)
  }
  return to
}
```

## 更新流程

Teleport 更新时需要处理几种情况：

```javascript
function patchTeleport(n1, n2, container, internals) {
  const { patch, move } = internals
  
  // 继承目标
  n2.target = n1.target
  
  const target = n2.props.disabled ? container : n2.target
  
  // 1. 目标容器变化
  if (n2.props.to !== n1.props.to) {
    const newTarget = resolveTarget(n2.props.to)
    // 移动所有子节点到新目标
    n2.children.forEach(child => {
      move(child, newTarget)
    })
    n2.target = newTarget
  }
  
  // 2. disabled 状态变化
  if (n2.props.disabled !== n1.props.disabled) {
    if (n2.props.disabled) {
      // 移回原位置
      n2.children.forEach(child => {
        move(child, container)
      })
    } else {
      // 移到目标位置
      n2.children.forEach(child => {
        move(child, n2.target)
      })
    }
  }
  
  // 3. patch 子节点内容
  patchChildren(n1.children, n2.children, target)
}
```

## disabled 属性

`disabled` 可以动态控制是否传送：

```vue
<Teleport to="body" :disabled="isMobile">
  <Modal />
</Teleport>
```

移动端可能希望模态框留在原位置，桌面端才传送到 body。

## 与组件逻辑的关系

虽然 Teleport 的内容渲染到了 DOM 的其他位置，但它在 Vue 组件树中的逻辑位置不变：

1. **Props 传递**：正常工作
2. **事件冒泡**：在 Vue 组件树中冒泡，而非 DOM 树
3. **Provide/Inject**：正常工作
4. **生命周期**：与父组件正常关联

```vue
<template>
  <Teleport to="body">
    <!-- 这里的 $emit 会冒泡到父组件 -->
    <button @click="$emit('close')">关闭</button>
  </Teleport>
</template>
```

## 多个 Teleport 到同一目标

多个 Teleport 可以指向同一个目标容器：

```vue
<Teleport to="#modals">
  <Modal1 />
</Teleport>

<Teleport to="#modals">
  <Modal2 />
</Teleport>
```

它们会按顺序追加到目标容器中。

实现上，每次挂载都是往目标容器追加：

```javascript
function mountChildren(children, target) {
  children.forEach(child => {
    mount(child, target, null)  // anchor 为 null，追加到末尾
  })
}
```

## 卸载处理

卸载 Teleport 时需要从正确的容器中移除节点：

```javascript
function unmountTeleport(vnode) {
  const { children, target, props } = vnode
  const container = props.disabled ? originalContainer : target
  
  children.forEach(child => {
    unmount(child, container)
  })
}
```

## 与 Transition 配合

Teleport 可以包含 Transition：

```vue
<Teleport to="body">
  <Transition name="fade">
    <Modal v-if="show" />
  </Transition>
</Teleport>
```

动画会正常工作，因为 Transition 的逻辑在 Vue 层面处理。

## 服务端渲染

SSR 时，Teleport 内容不会渲染到目标位置（服务端没有 DOM），而是渲染到一个特殊的占位符：

```html
<!--teleport start-->
<div class="modal">...</div>
<!--teleport end-->
```

客户端 hydrate 时会将内容移动到正确位置。

## 边界情况

**目标不存在**：

```javascript
function resolveTarget(to) {
  const target = document.querySelector(to)
  if (!target) {
    console.warn(`Teleport target "${to}" not found`)
  }
  return target
}
```

如果目标在 Teleport 挂载时不存在，内容不会渲染。目标出现后需要重新触发渲染。

**同一组件内多次切换**：

```vue
<Teleport :to="currentTarget">
  <Content />
</Teleport>
```

`currentTarget` 变化时，会触发内容移动，可能有性能开销。

## 实现简化版

```javascript
const Teleport = {
  __isTeleport: true,
  
  process(n1, n2, container, anchor, internals) {
    const { mount, patch, unmount, move } = internals
    
    if (n1 == null) {
      // 挂载
      const target = typeof n2.props.to === 'string'
        ? document.querySelector(n2.props.to)
        : n2.props.to
      
      const actualContainer = n2.props.disabled ? container : target
      
      if (Array.isArray(n2.children)) {
        n2.children.forEach(child => mount(child, actualContainer))
      } else {
        mount(n2.children, actualContainer)
      }
      
      n2.target = target
    } else {
      // 更新
      n2.target = n1.target
      
      // 目标变化，移动节点
      if (n1.props.to !== n2.props.to) {
        const newTarget = typeof n2.props.to === 'string'
          ? document.querySelector(n2.props.to)
          : n2.props.to
        
        n2.children.forEach(child => move(child, newTarget))
        n2.target = newTarget
      }
      
      // patch 子节点
      const actualContainer = n2.props.disabled ? container : n2.target
      patchChildren(n1.children, n2.children, actualContainer)
    }
  }
}
```

## 小结

Teleport 通过将内容渲染到 DOM 树的其他位置，解决了模态框等组件的 CSS 定位问题。它在 DOM 层面改变了渲染位置，但保持了 Vue 组件树中的逻辑关系。

理解 Teleport 的关键是区分"DOM 位置"和"组件逻辑位置"——前者是 Teleport 控制的，后者保持不变。
