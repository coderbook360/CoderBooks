# 补丁标记设计

补丁标记（Patch Flags）是 Vue 3 编译器与运行时协作的核心机制。编译器通过分析模板，为每个动态节点生成一个数字标记，告诉运行时"这个节点只有哪些部分可能变化"。运行时据此跳过不必要的比对，只检查可能变化的部分。

## 传统 Diff 的问题

传统虚拟 DOM diff 需要全量比对。给定两个 VNode，算法检查标签名、每个属性、每个子节点，判断是否需要更新 DOM。

```javascript
// 传统 diff
function patchProps(n1, n2, el) {
  const oldProps = n1.props
  const newProps = n2.props
  
  // 检查所有新属性
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      setProperty(el, key, newProps[key])
    }
  }
  
  // 检查被移除的属性
  for (const key in oldProps) {
    if (!(key in newProps)) {
      removeProperty(el, key)
    }
  }
}
```

问题在于：如果模板是 `<div :class="cls">Text</div>`，编译器知道只有 class 可能变化，但运行时不知道，它仍然会检查 div 可能有的所有属性。

## 编译时确定变化范围

Vue 3 编译器在编译时分析每个节点的动态绑定：

```html
<template>
  <div :class="cls" data-id="static">
    {{ text }}
  </div>
</template>
```

编译器识别出：class 是动态绑定（`:class`）、data-id 是静态属性、文本是动态插值。然后为这个节点生成补丁标记，编码这些信息。

## PatchFlags 定义

Vue 定义了一组位标记：

```typescript
export const enum PatchFlags {
  TEXT = 1,                    // 动态文本内容
  CLASS = 1 << 1,              // 动态 class
  STYLE = 1 << 2,              // 动态 style
  PROPS = 1 << 3,              // 动态非 class/style 属性
  FULL_PROPS = 1 << 4,         // 有动态 key 的属性
  HYDRATE_EVENTS = 1 << 5,     // 需要水合事件
  STABLE_FRAGMENT = 1 << 6,    // 子节点顺序稳定的 Fragment
  KEYED_FRAGMENT = 1 << 7,     // 带 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8,   // 不带 key 的 Fragment
  NEED_PATCH = 1 << 9,         // 需要 patch（如 ref 或 hooks）
  DYNAMIC_SLOTS = 1 << 10,     // 动态插槽
  DEV_ROOT_FRAGMENT = 1 << 11, // 开发环境 Fragment 根节点
  HOISTED = -1,                // 静态提升节点
  BAIL = -2                    // 需要完整 diff
}
```

位标记的好处是可以组合。一个节点同时有动态 class 和动态文本，其标记就是 `CLASS | TEXT = 3`。

## 编译生成的代码

编译器生成的 VNode 调用包含 patchFlag 参数：

```javascript
import { createVNode, toDisplayString } from 'vue'

function render(_ctx) {
  return createVNode('div', {
    class: _ctx.cls,
    'data-id': 'static'
  }, toDisplayString(_ctx.text), 3 /* TEXT | CLASS */)
}
```

最后的 `3` 就是 patchFlag，表示这个节点只有文本内容和 class 可能变化。

## 运行时的利用

patchElement 函数根据 patchFlag 决定检查什么：

```typescript
function patchElement(n1, n2) {
  const el = (n2.el = n1.el)
  const patchFlag = n2.patchFlag
  const oldProps = n1.props
  const newProps = n2.props
  
  if (patchFlag > 0) {
    // 有 patchFlag，按标记检查
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        hostPatchProp(el, 'class', null, newProps.class)
      }
    }
    
    if (patchFlag & PatchFlags.STYLE) {
      hostPatchProp(el, 'style', oldProps.style, newProps.style)
    }
    
    if (patchFlag & PatchFlags.PROPS) {
      // 只检查 dynamicProps 列表中的属性
      const propsToUpdate = n2.dynamicProps!
      for (let i = 0; i < propsToUpdate.length; i++) {
        const key = propsToUpdate[i]
        if (oldProps[key] !== newProps[key]) {
          hostPatchProp(el, key, oldProps[key], newProps[key])
        }
      }
    }
    
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        hostSetElementText(el, n2.children)
      }
    }
  } else {
    // 没有 patchFlag，完整 diff
    patchProps(el, oldProps, newProps)
  }
}
```

有了 patchFlag，运行时知道确切要检查什么，避免遍历所有属性。

## dynamicProps 补充信息

PROPS 标记表示"有动态属性"，但哪些属性是动态的呢？这个信息通过 dynamicProps 传递：

```javascript
createVNode('input', {
  type: 'text',
  value: _ctx.inputValue,
  disabled: _ctx.isDisabled
}, null, 8 /* PROPS */, ['value', 'disabled'])
```

最后的数组 `['value', 'disabled']` 是 dynamicProps，告诉运行时只有这两个属性可能变化，type 是静态的不用检查。

## 负数标记的特殊含义

HOISTED（-1）表示静态提升节点，渲染时直接跳过 diff（n1 === n2）。

BAIL（-2）表示放弃优化，进行完整 diff。这发生在编译器无法确定动态范围时，比如使用了 v-bind="obj" 展开。

```javascript
// v-bind="obj" 无法确定有哪些属性
createVNode('div', _ctx.obj, null, -2 /* BAIL */)
```

运行时看到 BAIL 就知道必须做完整比对。

## 与 Block 配合

patchFlag 与 Block Tree 配合形成完整的优化体系。Block 收集动态后代节点形成 dynamicChildren 数组，每个动态节点带有 patchFlag。

```javascript
function patchBlockChildren(oldChildren, newChildren) {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    // 直接 patch，跳过 diff 定位
    patchElement(oldVNode, newVNode)
  }
}
```

Block 让运行时跳过静态节点定位，patchFlag 让每个动态节点的比对最小化。两者结合实现了"只做必要工作"的目标。

## 组合标记的处理

一个节点可能有多种动态性：

```html
<div :class="cls" :style="style" :title="t">{{ text }}</div>
```

编译生成：`patchFlag = CLASS | STYLE | PROPS | TEXT`

运行时按位检测每种情况：

```typescript
if (patchFlag & CLASS) { /* 更新 class */ }
if (patchFlag & STYLE) { /* 更新 style */ }
if (patchFlag & PROPS) { /* 更新其他 props */ }
if (patchFlag & TEXT) { /* 更新文本 */ }
```

这种位操作非常高效，一次比较确定一种情况。

## 开发环境信息

开发环境下，patchFlag 还以注释形式包含可读名称：

```javascript
createVNode('div', { class: _ctx.cls }, null, 2 /* CLASS */)
```

这帮助开发者在调试时理解编译器做了什么优化。生产构建会移除这些注释。

## 小结

补丁标记是编译器向运行时传递优化信息的机制。编译器分析每个节点的动态绑定，用位标记编码变化范围。运行时根据这些标记，只检查可能变化的部分，跳过静态内容的比对。这种编译时分析 + 运行时利用的模式，让 Vue 3 的 diff 效率大幅提升。配合 Block Tree，Vue 实现了接近理论最优的更新性能。
