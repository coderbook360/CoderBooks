# openBlock 与 closeBlock

`openBlock` 和 `closeBlock` 是 Block Tree 机制的基础设施，管理动态节点的收集过程。

## 核心数据结构

```typescript
// Block 栈
const blockStack: (VNode[] | null)[] = []

// 当前正在收集的 Block
let currentBlock: VNode[] | null = null

// Block 追踪是否启用（支持嵌套禁用）
let isBlockTreeEnabled = 1
```

## openBlock 实现

```typescript
function openBlock(disableTracking = false) {
  blockStack.push((currentBlock = disableTracking ? null : []))
}
```

**作用**：
1. 创建新的收集数组（或 null）
2. 设为当前 Block
3. 压入栈中保存

**disableTracking 参数**：

当为 `true` 时，`currentBlock = null`，后续创建的动态节点不会被收集。用于 v-for 等结构不稳定的场景。

```typescript
// 正常模式
openBlock()      // currentBlock = []

// 禁用追踪
openBlock(true)  // currentBlock = null
```

## closeBlock 实现

```typescript
function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}
```

**作用**：
1. 弹出当前 Block
2. 恢复父 Block

## 使用流程

典型的 Block 创建流程：

```typescript
function render() {
  // 1. openBlock 开始收集
  openBlock()
  // currentBlock = [], blockStack = [[]]
  
  // 2. 创建子节点，动态节点被收集
  const child1 = createVNode('p', null, 'static')    // 不收集
  const child2 = createVNode('p', null, ctx.msg, 1)  // 收集
  // currentBlock = [child2]
  
  // 3. createBlock 结束收集，创建 Block VNode
  const block = createBlock('div', null, [child1, child2])
  // block.dynamicChildren = [child2]
  // closeBlock() 被调用
  // currentBlock = null, blockStack = []
  
  return block
}
```

## 嵌套 Block 流程

```typescript
function render() {
  openBlock()  // 外层 Block
  // blockStack = [[]]
  
  const static1 = createVNode('p', null, 'static')
  
  // 内层 Block (v-if)
  openBlock()  // 内层 Block
  // blockStack = [[], []]
  
  const innerChild = createVNode('span', null, ctx.text, 1)
  // currentBlock (内层) = [innerChild]
  
  const innerBlock = createBlock('div', { key: 0 }, [innerChild])
  // innerBlock.dynamicChildren = [innerChild]
  // closeBlock() 恢复外层
  // currentBlock (外层) = []
  // blockStack = [[]]
  
  // 内层 Block 被收集到外层
  // currentBlock (外层) = [innerBlock]
  
  return createBlock('div', null, [static1, innerBlock])
  // outerBlock.dynamicChildren = [innerBlock]
}
```

## setBlockTracking

有时需要临时禁用 Block 追踪：

```typescript
function setBlockTracking(value: number) {
  isBlockTreeEnabled += value
}
```

用于 v-once 等优化：

```typescript
// v-once 生成的代码
setBlockTracking(-1)  // 禁用
const cached = _cache[0] || (_cache[0] = createVNode(...))
setBlockTracking(1)   // 恢复
```

这样 v-once 内的节点不会被收集到 Block，因为它们缓存后不再变化。

## 收集时机

动态节点在 `createVNode` / `createBaseVNode` 中被收集：

```typescript
function createBaseVNode(...) {
  const vnode = { /* ... */ }
  
  // 收集条件
  if (
    isBlockTreeEnabled > 0 &&  // 追踪已启用
    !isBlockNode &&            // 不是 Block 自身
    currentBlock &&            // 当前有 Block
    (vnode.patchFlag > 0 || shapeFlag & ShapeFlags.COMPONENT)
  ) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

**收集条件**：
1. Block 追踪已启用
2. 不是 Block 节点自身
3. 当前有活跃的 Block
4. 有 patchFlag 或是组件

## 为什么组件总被收集

组件即使没有 patchFlag 也会被收集：

```typescript
shapeFlag & ShapeFlags.COMPONENT
```

因为组件的子树可能变化，需要进入组件内部 Diff。

## 与编译器的配合

编译器分析模板，决定是否需要 Block：

```html
<!-- 需要 Block -->
<div>
  <p>{{ msg }}</p>
</div>

<!-- 结构性指令创建新 Block -->
<div v-if="show">...</div>
<div v-for="item in list">...</div>
```

生成代码：

```typescript
// 普通模板
return (openBlock(), createBlock('div', null, [
  createVNode('p', null, toDisplayString(_ctx.msg), 1)
]))

// v-if
return (openBlock(), createBlock('div', null, [
  _ctx.show
    ? (openBlock(), createBlock('div', { key: 0 }, ...))
    : createCommentVNode('v-if')
]))

// v-for
return (openBlock(), createBlock('div', null, [
  (openBlock(true), createBlock(Fragment, null,
    renderList(_ctx.list, item => createVNode('div', { key: item.id }, ...)),
    128 /* KEYED_FRAGMENT */
  ))
]))
```

## createElementBlock 优化

对于纯元素 Block，使用 `createElementBlock` 更高效：

```typescript
export function createElementBlock(
  type: string,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
): VNode {
  return setupBlock(
    createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      true /* isBlockNode */
    )
  )
}
```

跳过了 `createVNode` 中的类型检查和规范化，因为编译器已保证输入正确。

## 调试技巧

开发时可以检查 Block 结构：

```typescript
// 渲染函数中
const block = (openBlock(), createBlock('div', null, children))
console.log('Dynamic children:', block.dynamicChildren)
```

或使用 Vue DevTools 查看组件的 VNode 树。

## 小结

`openBlock` 和 `closeBlock` 通过栈结构管理动态节点的收集。这个机制让编译器生成的代码能够标记动态内容，渲染器在 Diff 时跳过静态部分，实现性能优化。
