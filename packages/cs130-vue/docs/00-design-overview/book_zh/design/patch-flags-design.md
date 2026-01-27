# PatchFlags 补丁标记设计

PatchFlags 是 Vue3 编译时优化策略中的关键机制，它通过位掩码的方式标记 VNode 的动态部分，让运行时能够进行精确的靶向更新。这种设计将编译时的静态分析结果传递给运行时，实现了跨阶段的优化协作。

## 为什么需要 PatchFlags

在传统的虚拟 DOM Diff 中，比较两个节点需要检查所有可能变化的属性：

```javascript
function patchElement(n1, n2) {
  const el = n1.el
  
  // 需要逐一比较所有属性
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      hostPatchProp(el, key, newProps[key])
    }
  }
  
  for (const key in oldProps) {
    if (!(key in newProps)) {
      hostPatchProp(el, key, null)
    }
  }
  
  // 还需要比较子节点
  patchChildren(n1, n2, el)
}
```

这种全量比较在大多数情况下是浪费的。如果编译器能告诉运行时「这个节点只有 class 是动态的」，运行时就可以只检查 class，跳过其他所有属性。

## PatchFlags 的定义

Vue3 使用位掩码来定义不同类型的动态内容：

```javascript
// packages/shared/src/patchFlags.ts
export const enum PatchFlags {
  // 动态文本内容
  TEXT = 1,                    // 1 << 0
  
  // 动态 class
  CLASS = 1 << 1,              // 2
  
  // 动态 style
  STYLE = 1 << 2,              // 4
  
  // 动态 props（不包括 class 和 style）
  PROPS = 1 << 3,              // 8
  
  // 具有动态 key 的 props，需要完整 diff
  FULL_PROPS = 1 << 4,         // 16
  
  // 有事件监听器
  HYDRATE_EVENTS = 1 << 5,     // 32
  
  // Fragment 的子节点顺序稳定
  STABLE_FRAGMENT = 1 << 6,    // 64
  
  // Fragment 有 key 或部分子节点有 key
  KEYED_FRAGMENT = 1 << 7,     // 128
  
  // Fragment 没有任何 key
  UNKEYED_FRAGMENT = 1 << 8,   // 256
  
  // 只需要非 props 的 patch（如 ref）
  NEED_PATCH = 1 << 9,         // 512
  
  // 动态 slot
  DYNAMIC_SLOTS = 1 << 10,     // 1024
  
  // 特殊标记：开发模式热更新
  DEV_ROOT_FRAGMENT = 1 << 11, // 2048
  
  // 静态节点，永远不会变化
  HOISTED = -1,
  
  // diff 算法应该退出优化模式
  BAIL = -2
}
```

位掩码的优势在于可以组合多个标记，使用位运算进行高效检查。

## 编译时标记的生成

编译器在分析模板时，会识别每个节点的动态部分，生成相应的 PatchFlags：

```javascript
// 模板
<div :class="cls" :style="styles" :id="id">{{ text }}</div>

// 编译结果
createVNode(
  'div',
  {
    class: _ctx.cls,
    style: _ctx.styles,
    id: _ctx.id
  },
  toDisplayString(_ctx.text),
  PatchFlags.TEXT | PatchFlags.CLASS | PatchFlags.STYLE | PatchFlags.PROPS,
  ['id']  // 动态 props 列表
)
```

注意最后一个参数是动态 props 的 key 列表。当 `patchFlag` 包含 `PROPS` 时，只有这些属性需要被检查。

## 运行时的靶向更新

有了 PatchFlags，运行时可以进行精确的靶向更新：

```javascript
function patchElement(n1, n2, parentComponent, optimized) {
  const el = (n2.el = n1.el)
  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ
  const patchFlag = n2.patchFlag

  if (patchFlag > 0) {
    // 进入优化路径
    if (patchFlag & PatchFlags.FULL_PROPS) {
      // 动态 key，需要完整 diff
      patchProps(el, oldProps, newProps)
    } else {
      // 有针对性的更新
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          hostPatchProp(el, 'class', newProps.class)
        }
      }
      
      if (patchFlag & PatchFlags.STYLE) {
        hostPatchProp(el, 'style', newProps.style, oldProps.style)
      }
      
      if (patchFlag & PatchFlags.PROPS) {
        // 只检查标记的动态 props
        const dynamicProps = n2.dynamicProps!
        for (let i = 0; i < dynamicProps.length; i++) {
          const key = dynamicProps[i]
          const prev = oldProps[key]
          const next = newProps[key]
          if (next !== prev) {
            hostPatchProp(el, key, next, prev)
          }
        }
      }
    }
    
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children)
      }
    }
  } else if (!optimized) {
    // 没有 patchFlag，回退到完整 diff
    patchProps(el, oldProps, newProps)
  }
  
  // 处理子节点
  patchChildren(n1, n2, el, null, parentComponent, optimized)
}
```

这个优化的效果是显著的。假设一个节点有 10 个属性，但只有 class 是动态的，传统方案需要比较 10 个属性，而使用 PatchFlags 只需要比较 1 个。

## 特殊标记的处理

某些 PatchFlags 需要特殊处理：

**HOISTED (-1)**：表示静态提升的节点，永远不会变化。

```javascript
// 静态节点会被提升
const _hoisted_1 = createVNode('div', null, 'Static Content', -1 /* HOISTED */)

function render() {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,  // 直接复用
    createVNode('span', null, ctx.dynamic, 1)
  ]))
}
```

**BAIL (-2)**：表示应该退出优化模式，使用完整 Diff。这通常发生在运行时生成的 VNode（如手写渲染函数）。

```javascript
// 当无法确定动态性时
const vnode = {
  type: 'div',
  props: dynamicallyGeneratedProps,
  patchFlag: PatchFlags.BAIL
}
```

## Fragment 的标记

Fragment 使用特殊的 PatchFlags 来指导子节点的 Diff 策略：

```javascript
// STABLE_FRAGMENT：子节点顺序稳定
// v-for with stable key
<div v-for="item in items" :key="item.id">{{ item.name }}</div>

// 编译结果
createVNode(
  Fragment,
  null,
  renderList(items, item => /* ... */),
  PatchFlags.STABLE_FRAGMENT
)

// KEYED_FRAGMENT：子节点有 key
// 需要根据 key 进行移动检测

// UNKEYED_FRAGMENT：子节点没有 key
// 只能按索引进行比较
```

不同的标记决定了运行时使用哪种 Diff 算法：

```javascript
function patchChildren(n1, n2, container) {
  const patchFlag = n2.patchFlag
  
  if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
    // 使用完整的 keyed diff
    patchKeyedChildren(c1, c2, container)
  } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
    // 使用简化的 unkeyed diff
    patchUnkeyedChildren(c1, c2, container)
  } else {
    // 一般情况
    // ...
  }
}
```

## 动态 Props 列表

当 PatchFlags 包含 `PROPS` 时，还需要知道具体是哪些 props 是动态的。这通过额外的 `dynamicProps` 数组来传递：

```javascript
// 模板
<div :id="id" :title="title" class="static">Content</div>

// 编译结果
createVNode(
  'div',
  {
    id: _ctx.id,
    title: _ctx.title,
    class: 'static'
  },
  'Content',
  PatchFlags.PROPS,
  ['id', 'title']  // 只有 id 和 title 是动态的
)
```

运行时只遍历这个列表，而不是遍历所有 props：

```javascript
const dynamicProps = vnode.dynamicProps
for (const key of dynamicProps) {
  // 只检查动态 props
}
```

## 与其他优化的配合

PatchFlags 与 Block Tree 紧密配合。Block 的 `dynamicChildren` 收集了所有带有 PatchFlags 的节点，而 PatchFlags 告诉运行时每个节点需要检查什么。

```javascript
// Block Diff 过程
function patchBlockChildren(n1, n2) {
  for (let i = 0; i < n2.dynamicChildren.length; i++) {
    const oldVNode = n1.dynamicChildren[i]
    const newVNode = n2.dynamicChildren[i]
    
    // 根据 patchFlag 进行靶向更新
    patchElement(oldVNode, newVNode)
  }
}
```

这种分层优化的设计是 Vue3 性能提升的关键：Block Tree 决定「比较哪些节点」，PatchFlags 决定「比较节点的哪些部分」。

## 设计的智慧

PatchFlags 的设计体现了几个重要的工程思想：

**编译时与运行时的信息传递**：编译器拥有完整的模板信息，通过 PatchFlags 将分析结果编码传递给运行时。

**位掩码的高效性**：位运算比对象属性访问快得多，且多个标记可以组合在一个数字中。

**渐进式降级**：当无法确定动态性时（如 `BAIL`），可以安全地回退到完整 Diff，保证正确性。

**最小化运行时负担**：运行时只需要进行简单的位运算检查，复杂的分析工作在编译时完成。

这种「用编译时复杂度换取运行时性能」的策略，是 Vue3 设计哲学的典型体现。
