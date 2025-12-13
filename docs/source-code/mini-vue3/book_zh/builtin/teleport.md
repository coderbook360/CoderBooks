# Teleport 实现

模态框被父元素的 `overflow: hidden` 裁剪了。下拉菜单被 `z-index` 层级困扰。**这些都是 CSS 层叠上下文带来的经典问题。**

**Teleport 提供了一种将 DOM 节点“传送”到组件外部位置的能力。** 本章将分析其实现原理。

## 问题场景

```vue
<div style="overflow: hidden; height: 100px;">
  <Modal v-if="show">
    <!-- 模态框内容被裁剪！ -->
  </Modal>
</div>
```

模态框受限于父元素的 CSS 属性，无法正常显示。

使用 Teleport 解决：

```vue
<div style="overflow: hidden; height: 100px;">
  <Teleport to="body">
    <Modal v-if="show">
      <!-- 渲染到 body，不再受限 -->
    </Modal>
  </Teleport>
</div>
```

## 基本用法

```vue
<!-- 传送到 body -->
<Teleport to="body">
  <div class="modal">内容</div>
</Teleport>

<!-- 传送到指定选择器 -->
<Teleport to="#modal-container">
  <div class="modal">内容</div>
</Teleport>

<!-- 条件禁用 -->
<Teleport to="body" :disabled="isMobile">
  <div class="modal">移动端就地渲染</div>
</Teleport>
```

## Teleport VNode 结构

```javascript
// Teleport 类型标记
const Teleport = Symbol(__DEV__ ? 'Teleport' : undefined)

// 创建 Teleport VNode
h(Teleport, { to: 'body' }, [
  h('div', { class: 'modal' }, '内容')
])

// VNode 结构
{
  type: Teleport,
  props: { to: 'body', disabled: false },
  children: [/* 子节点 */],
  shapeFlag: ShapeFlags.TELEPORT,
  // ...
}
```

## Teleport 实现

Teleport 通过 `TeleportImpl` 对象定义：

```javascript
const TeleportImpl = {
  __isTeleport: true,
  
  process(n1, n2, container, anchor, parentComponent, parentSuspense, 
          isSVG, slotScopeIds, optimized, internals) {
    const { mc: mountChildren, pc: patchChildren, pbc: patchBlockChildren,
            o: { insert, querySelector, createText, createComment } } = internals
    
    const disabled = n2.props?.disabled
    const { shapeFlag, children } = n2
    
    if (n1 == null) {
      // 挂载
      
      // 创建锚点
      const placeholder = n2.el = createComment('teleport start')
      const mainAnchor = n2.anchor = createComment('teleport end')
      
      // 在原位置插入锚点
      insert(placeholder, container, anchor)
      insert(mainAnchor, container, anchor)
      
      // 解析目标容器
      const target = n2.target = resolveTarget(n2.props, querySelector)
      const targetAnchor = n2.targetAnchor = createText('')
      
      if (target) {
        insert(targetAnchor, target)
      }
      
      // 挂载子节点
      const mount = (container, anchor) => {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(children, container, anchor, parentComponent,
                        parentSuspense, isSVG, slotScopeIds, optimized)
        }
      }
      
      if (disabled) {
        // 禁用时就地挂载
        mount(container, mainAnchor)
      } else if (target) {
        // 挂载到目标容器
        mount(target, targetAnchor)
      }
    } else {
      // 更新
      n2.el = n1.el
      const mainAnchor = n2.anchor = n1.anchor
      const target = n2.target = n1.target
      const targetAnchor = n2.targetAnchor = n1.targetAnchor
      
      const wasDisabled = n1.props?.disabled
      const currentContainer = wasDisabled ? container : target
      const currentAnchor = wasDisabled ? mainAnchor : targetAnchor
      
      // patch 子节点
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        patchChildren(n1, n2, currentContainer, currentAnchor,
                      parentComponent, parentSuspense, isSVG, slotScopeIds, optimized)
      }
      
      // 处理 disabled 变化
      if (disabled) {
        if (!wasDisabled) {
          // 从目标移动回原位置
          moveTeleport(n2, container, mainAnchor, internals, TeleportMoveTypes.TOGGLE)
        }
      } else {
        // 目标变化
        if (n2.props?.to !== n1.props?.to) {
          const nextTarget = n2.target = resolveTarget(n2.props, querySelector)
          if (nextTarget) {
            moveTeleport(n2, nextTarget, null, internals, TeleportMoveTypes.TARGET_CHANGE)
          }
        } else if (wasDisabled) {
          // 从禁用变为启用
          moveTeleport(n2, target, targetAnchor, internals, TeleportMoveTypes.TOGGLE)
        }
      }
    }
  },
  
  remove(vnode, parentComponent, parentSuspense, optimized, { um: unmount, o: { remove } }, doRemove) {
    const { shapeFlag, children, anchor, targetAnchor, target, props } = vnode
    
    if (target) {
      remove(targetAnchor)
    }
    
    if (doRemove || !props?.disabled) {
      remove(anchor)
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        for (let i = 0; i < children.length; i++) {
          unmount(children[i], parentComponent, parentSuspense, true, optimized)
        }
      }
    }
  }
}
```

## 解析目标容器

```javascript
function resolveTarget(props, select) {
  const targetSelector = props?.to
  
  if (isString(targetSelector)) {
    if (!select) {
      __DEV__ && warn('Teleport requires querySelector')
      return null
    }
    
    const target = select(targetSelector)
    
    if (!target) {
      __DEV__ && warn(`Failed to locate Teleport target: ${targetSelector}`)
    }
    
    return target
  } else {
    // 直接是 DOM 元素
    return targetSelector
  }
}
```

`to` 属性可以是：
- CSS 选择器字符串
- DOM 元素引用

## 移动子节点

```javascript
function moveTeleport(vnode, container, parentAnchor, { o: { insert }, m: move }, moveType) {
  // 移动目标锚点
  if (moveType === TeleportMoveTypes.TARGET_CHANGE) {
    insert(vnode.targetAnchor, container, parentAnchor)
  }
  
  const { el, anchor, shapeFlag, children } = vnode
  const isReorder = moveType === TeleportMoveTypes.REORDER
  
  if (isReorder) {
    insert(el, container, parentAnchor)
  }
  
  // 移动子节点
  if (!isReorder || isTeleportDisabled(vnode.props)) {
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      for (let i = 0; i < children.length; i++) {
        move(children[i], container, parentAnchor, MoveType.REORDER)
      }
    }
  }
  
  if (isReorder) {
    insert(anchor, container, parentAnchor)
  }
}
```

## disabled 属性

`disabled` 控制是否传送：

```vue
<Teleport to="body" :disabled="isMobile">
  <Modal />
</Teleport>
```

当 `disabled` 为 true：
- 子节点在原位置渲染
- 逻辑位置与实际位置一致

当 `disabled` 变化时：
- true → false：子节点移动到目标位置
- false → true：子节点移回原位置

## 多个 Teleport 到同一目标

```vue
<Teleport to="#container">
  <div>First</div>
</Teleport>

<Teleport to="#container">
  <div>Second</div>
</Teleport>

<!-- 结果：#container 内按顺序包含两个 div -->
```

多个 Teleport 到同一目标时，按照渲染顺序追加。

## 与其他组件配合

### 与 Transition 配合

```vue
<Teleport to="body">
  <Transition name="modal">
    <div v-if="show" class="modal">内容</div>
  </Transition>
</Teleport>
```

Transition 正常工作，因为它操作的是 Teleport 的子节点。

### 与 KeepAlive 配合

```vue
<KeepAlive>
  <Teleport to="body">
    <component :is="currentModal" />
  </Teleport>
</KeepAlive>
```

KeepAlive 缓存整个 Teleport，包括其子节点。

## defer 属性（Vue 3.5+）

```vue
<Teleport to="#target" defer>
  <div>内容</div>
</Teleport>
```

`defer` 延迟挂载，等待目标容器存在后再传送。适用于目标容器在 Teleport 之后渲染的场景。

## 本章小结

本章分析了 Teleport 的实现：

- **核心作用**：将子节点渲染到 DOM 树的其他位置
- **to 属性**：CSS 选择器或 DOM 元素
- **disabled 属性**：控制是否传送
- **锚点系统**：在原位置保留注释节点作为锚点
- **移动机制**：disabled 变化或 to 变化时移动子节点

Teleport 解决了 CSS 层叠上下文带来的布局限制问题，是构建模态框、下拉菜单、通知等组件的利器。

下一章，我们将分析 Transition 的实现。
