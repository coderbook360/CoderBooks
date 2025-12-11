# Block Tree 与动态节点收集

PatchFlags 解决了“比什么”的问题，**但没解决“比哪些节点”的问题。** 传统 Diff 仍需遍历整棵树找到动态节点。

**Block Tree 将动态节点收集到扁平数组，直接遍历。** 这是一个非常精妙的设计，将复杂度从 O(节点总数) 降为 O(动态节点数)。

## 问题场景

```html
<div>
  <header>
    <nav>
      <a :href="link">{{ title }}</a>  <!-- 动态，嵌套很深 -->
    </nav>
  </header>
  <main>
    <p>静态内容</p>
    <p>静态内容</p>
    <p>{{ content }}</p>  <!-- 动态 -->
  </main>
  <footer>
    <span>静态</span>
  </footer>
</div>
```

传统 Diff：需要遍历整棵树，复杂度 O(节点总数)。

期望：直接访问动态节点，复杂度 O(动态节点数)。

## Block 的数据结构

Block 是一个带有 `dynamicChildren` 数组的 VNode：

```javascript
const blockVNode = {
  type: 'div',
  children: [
    { type: 'header', children: [...] },
    { type: 'main', children: [...] },
    { type: 'footer', children: [...] }
  ],
  // 扁平化的动态节点
  dynamicChildren: [
    { type: 'a', patchFlag: 9 /* TEXT, PROPS */ },
    { type: 'p', patchFlag: 1 /* TEXT */ }
  ]
}
```

更新时只遍历 `dynamicChildren`，跳过整棵静态子树。

## 动态节点收集

使用栈结构收集动态节点：

```javascript
const blockStack = []
let currentBlock = null

function openBlock(disableTracking = false) {
  blockStack.push(currentBlock = disableTracking ? null : [])
}

function closeBlock() {
  blockStack.pop()
  currentBlock = blockStack[blockStack.length - 1] || null
}
```

创建元素时收集：

```javascript
function createElementVNode(type, props, children, patchFlag) {
  const vnode = {
    type,
    props,
    children,
    patchFlag,
    dynamicChildren: null
  }
  
  // 有 patchFlag 且当前有活动 block，则收集
  if (currentBlock !== null && patchFlag > 0) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

创建 Block：

```javascript
function createBlock(type, props, children, patchFlag) {
  const vnode = createElementVNode(type, props, children, patchFlag)
  
  // 附加收集到的动态节点
  vnode.dynamicChildren = currentBlock
  
  closeBlock()
  
  // 如果还有父 block，将此 block 也收集进去
  if (currentBlock) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

## 编译输出

```html
<div>
  <span>静态</span>
  <span>{{ msg }}</span>
</div>
```

```javascript
function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _createElementVNode("span", null, "静态"),
    _createElementVNode("span", null, _toDisplayString(_ctx.msg), 1 /* TEXT */)
  ]))
}
```

执行流程：
1. `openBlock()` 初始化空数组 `currentBlock = []`
2. 创建第一个 span，无 patchFlag，不收集
3. 创建第二个 span，patchFlag=1，收集到 currentBlock
4. `createElementBlock` 创建 div，附加 dynamicChildren

最终 div 的 dynamicChildren = [第二个 span]。

## Block 边界

不是所有元素都是 Block。只有**结构型指令**会创建新的 Block：

- `v-if` / `v-else-if` / `v-else`
- `v-for`
- 组件根节点

为什么？

因为这些指令可能改变子节点的结构。如果子节点结构变了，扁平数组就不能直接按索引比对了。

```html
<div>
  <span v-if="show">A</span>
  <span v-else>B</span>
</div>
```

v-if 和 v-else 分别是不同的 Block，各自维护自己的 dynamicChildren。

## 嵌套 Block

```html
<div>
  <span>{{ msg }}</span>
  <div v-if="show">
    <span>{{ inner }}</span>
  </div>
</div>
```

结构：
- 外层 div 是 Block，dynamicChildren 包含第一个 span 和 v-if Block
- v-if Block 的 dynamicChildren 包含内层 span

```javascript
{
  type: 'div',
  dynamicChildren: [
    { type: 'span', patchFlag: 1 },  // {{ msg }}
    { 
      type: Fragment,  // v-if
      dynamicChildren: [
        { type: 'span', patchFlag: 1 }  // {{ inner }}
      ]
    }
  ]
}
```

更新时：
1. 遍历外层 dynamicChildren
2. 遇到 Block，递归遍历其 dynamicChildren

## patchBlockChildren

```javascript
function patchBlockChildren(oldChildren, newChildren, parentEl) {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    
    // 直接 patch，不需要遍历查找
    patch(
      oldVNode,
      newVNode,
      // 父元素从 oldVNode.el 获取
      oldVNode.el.parentNode
    )
  }
}
```

复杂度：O(dynamicChildren.length)，而不是 O(整棵树)。

## STABLE_FRAGMENT

如果 Fragment 的子节点结构稳定，标记 `STABLE_FRAGMENT`：

```html
<template v-if="show">
  <span>A</span>
  <span>B</span>
</template>
```

子节点数量和顺序固定，可以直接按索引比对。

## KEYED_FRAGMENT vs UNKEYED_FRAGMENT

v-for 的 Fragment：

```html
<div v-for="item in list" :key="item.id">{{ item.name }}</div>
```

有 key → KEYED_FRAGMENT，使用带 key 的 Diff 算法。

```html
<div v-for="item in list">{{ item.name }}</div>
```

无 key → UNKEYED_FRAGMENT，使用简单的 Diff 算法。

## Block 的限制

**结构不稳定时**

```html
<div>
  <span v-if="show">A</span>
  <span>B</span>
</div>
```

如果 show 从 true 变为 false，dynamicChildren 的结构就变了。

解决：v-if 创建自己的 Block，与外层隔离。

**组件边界**

组件内部的 dynamicChildren 对外部不可见。每个组件是独立的 Block。

## 本章小结

本章分析了 Block Tree 的实现：

- **Block 结构**：带有 dynamicChildren 的 VNode
- **收集机制**：openBlock、createBlock、栈结构
- **Block 边界**：v-if、v-for、组件根节点
- **更新优化**：只遍历 dynamicChildren

Block Tree 将 Diff 复杂度从 O(树节点数) 降到 O(动态节点数)。下一章我们将分析事件缓存——避免不必要的子组件更新。
