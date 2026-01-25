# createBlock 创建 Block

`createBlock` 是编译优化的核心函数，创建带 `dynamicChildren` 的 VNode。它与 `openBlock` 配合，实现 Block Tree 优化。

## 函数签名

```typescript
function createBlock(
  type: VNodeTypes,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
): VNode
```

## 与 createVNode 的区别

普通 `createVNode` 创建的节点可能被收集到父 Block。而 `createBlock` 创建的节点：

1. 自身成为一个 Block
2. 收集其子树中的动态节点
3. 不被父 Block 收集

## 实现

```typescript
function createBlock(
  type: VNodeTypes,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[]
): VNode {
  return setupBlock(
    createVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      true /* isBlockNode */
    )
  )
}

function setupBlock(vnode: VNode): VNode {
  // 将当前收集的动态节点赋给 Block
  vnode.dynamicChildren = 
    isBlockTreeEnabled > 0 ? currentBlock || EMPTY_ARR : null
  
  // 关闭当前 Block，恢复父 Block
  closeBlock()
  
  // Block 自身如果有 patchFlag，需要被父 Block 收集
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

## 使用模式

编译器生成的代码使用 `openBlock()` 和 `createBlock()` 配对：

```typescript
function render() {
  return (openBlock(), createBlock('div', null, [
    createVNode('p', null, 'static'),
    createVNode('p', null, ctx.dynamic, 1 /* TEXT */)
  ]))
}
```

逗号表达式先执行 `openBlock()`，再执行 `createBlock()`，返回 Block VNode。

## 动态节点收集

在 `openBlock()` 和 `createBlock()` 之间创建的动态 VNode 会被收集：

```typescript
openBlock()
// currentBlock = []

createVNode('p', null, 'static')
// 无 patchFlag，不收集

createVNode('p', null, ctx.dynamic, 1)
// 有 patchFlag，收集到 currentBlock
// currentBlock = [dynamicP]

createBlock('div', null, children)
// vnode.dynamicChildren = currentBlock = [dynamicP]
```

## 嵌套 Block

当遇到结构性指令（v-if、v-for），会创建嵌套 Block：

```typescript
function render() {
  return (openBlock(), createBlock('div', null, [
    createVNode('p', null, 'static'),
    condition
      ? (openBlock(), createBlock('span', { key: 0 }, [
          createVNode('b', null, ctx.text, 1)
        ]))
      : createCommentVNode('v-if')
  ]))
}
```

内层 Block 收集自己的动态节点，不会污染外层 Block。

## Block 栈

为支持嵌套，使用栈结构管理：

```typescript
const blockStack: (VNode[] | null)[] = []
let currentBlock: VNode[] | null = null

function openBlock(disableTracking = false) {
  blockStack.push(currentBlock = disableTracking ? null : [])
}

function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}
```

**openBlock**：压入新的收集数组
**closeBlock**：弹出并恢复父 Block

## 禁用追踪

对于结构不稳定的 Block（如 v-for），使用 `openBlock(true)` 禁用收集：

```typescript
// v-for 生成的代码
(openBlock(true), createBlock(Fragment, null, 
  list.map(item => createVNode('li', { key: item.id }, item.name, 1)),
  128 /* KEYED_FRAGMENT */
))
```

`disableTracking = true` 时，`currentBlock = null`，不收集动态节点。这是因为 v-for 的子节点数量可变，需要完整 Diff。

## Block 与 Fragment

当 Block 没有单一根元素时，使用 Fragment：

```typescript
// 多根节点
(openBlock(), createBlock(Fragment, null, [
  createVNode('p', null, 'a'),
  createVNode('p', null, ctx.b, 1)
]))

// v-for
(openBlock(true), createBlock(Fragment, null,
  list.map(item => /* ... */),
  128 /* KEYED_FRAGMENT */
))
```

## patchFlag 与 Block

Block 自身也可以有 patchFlag：

```typescript
// 组件 Block
(openBlock(), createBlock(MyComponent, {
  msg: ctx.msg
}, null, 8 /* PROPS */, ['msg']))
```

`patchFlag = 8` 表示只有 props 中的 `msg` 是动态的。

## createElementBlock

Vue 还提供 `createElementBlock` 用于元素：

```typescript
function createElementBlock(
  type: string,
  props?: Record<string, any> | null,
  children?: any,
  patchFlag?: number,
  dynamicProps?: string[],
  shapeFlag?: number
): VNode {
  return setupBlock(
    createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, true)
  )
}
```

它跳过了 `createVNode` 的某些检查，更高效。

## 开发模式验证

开发模式下验证 Block 结构：

```typescript
if (__DEV__) {
  if (vnode.dynamicChildren) {
    // 验证 dynamicChildren 中的每个节点确实有 patchFlag
    for (const child of vnode.dynamicChildren) {
      if (child.patchFlag <= 0) {
        warn('dynamicChildren contains static node')
      }
    }
  }
}
```

## Patch 时使用

渲染器根据 `dynamicChildren` 选择 Diff 策略：

```typescript
function patchElement(n1, n2) {
  if (n2.dynamicChildren) {
    // 只 Diff 动态节点
    patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, el)
  } else {
    // 完整 Diff
    patchChildren(n1, n2, el)
  }
}
```

## 性能影响

假设模板有 100 个节点，5 个动态：

| 模式 | Diff 次数 |
|------|----------|
| 无 Block | 100 |
| 有 Block | 5 |

Block Tree 将 Diff 复杂度从 O(模板大小) 降到 O(动态节点数)。

## 小结

`createBlock` 与 `openBlock` 配合，实现 Block Tree 优化。Block 收集子树中的动态节点，让渲染器跳过静态内容的 Diff。这是 Vue 3 编译时优化的核心机制。
