# PatchFlags 补丁标记设计

PatchFlags 是 Vue 3 编译时优化的核心。这一章分析它如何帮助渲染器跳过不必要的比较。

## 传统 Diff 的问题

传统的 Virtual DOM Diff 需要完整遍历新旧 VNode 树，比较每个节点的每个属性。即使模板中大部分内容是静态的，Diff 算法也无法跳过。

```html
<template>
  <div class="container">
    <header>Static Header</header>
    <main>
      <p>Static paragraph</p>
      <span>{{ dynamicText }}</span>
    </main>
    <footer>Static Footer</footer>
  </div>
</template>
```

这个模板中，只有 `dynamicText` 是动态的，但传统 Diff 会比较所有节点和属性。

## PatchFlags 的解决方案

Vue 3 的编译器分析模板，为每个动态节点生成 PatchFlag。运行时 Diff 只需检查被标记的内容。

```javascript
// 编译后的 render 函数（简化）
function render() {
  return createBlock('div', { class: 'container' }, [
    createVNode('header', null, 'Static Header'),
    createVNode('main', null, [
      createVNode('p', null, 'Static paragraph'),
      createVNode('span', null, dynamicText, PatchFlags.TEXT)
    ]),
    createVNode('footer', null, 'Static Footer')
  ])
}
```

`PatchFlags.TEXT` 告诉渲染器：只需比较文本内容，其他都不需要检查。

## PatchFlags 定义

Vue 3 定义了以下 PatchFlags：

```typescript
export const enum PatchFlags {
  // 动态文本节点
  TEXT = 1,
  
  // 动态 class 绑定
  CLASS = 1 << 1,
  
  // 动态 style 绑定
  STYLE = 1 << 2,
  
  // 动态的非 class/style 属性
  PROPS = 1 << 3,
  
  // 有动态的 key 属性，需要完整 diff
  FULL_PROPS = 1 << 4,
  
  // 有监听事件的节点
  HYDRATE_EVENTS = 1 << 5,
  
  // 稳定的 Fragment（子节点顺序不变）
  STABLE_FRAGMENT = 1 << 6,
  
  // 有 key 的 Fragment
  KEYED_FRAGMENT = 1 << 7,
  
  // 无 key 的 Fragment
  UNKEYED_FRAGMENT = 1 << 8,
  
  // 需要补丁的非 props 属性（ref, 指令）
  NEED_PATCH = 1 << 9,
  
  // 动态插槽
  DYNAMIC_SLOTS = 1 << 10,
  
  // 开发模式专用：模板根节点的 Fragment
  DEV_ROOT_FRAGMENT = 1 << 11,
  
  // 特殊标记：静态提升的节点
  HOISTED = -1,
  
  // 特殊标记：Diff 算法应该退出优化模式
  BAIL = -2
}
```

## 编译时分析

编译器分析模板中的动态绑定，生成对应的 PatchFlags。

**动态文本**：

```html
<span>{{ message }}</span>
```

```javascript
createVNode('span', null, message, PatchFlags.TEXT)
```

**动态 class**：

```html
<div :class="{ active: isActive }">
```

```javascript
createVNode('div', { class: { active: isActive } }, null, PatchFlags.CLASS)
```

**动态 style**：

```html
<div :style="{ color: textColor }">
```

```javascript
createVNode('div', { style: { color: textColor } }, null, PatchFlags.STYLE)
```

**动态属性**：

```html
<input :id="inputId" :disabled="isDisabled">
```

```javascript
createVNode(
  'input',
  { id: inputId, disabled: isDisabled },
  null,
  PatchFlags.PROPS,
  ['id', 'disabled']  // dynamicProps 列表
)
```

**组合标记**：

```html
<div :class="cls" :style="sty">{{ text }}</div>
```

```javascript
createVNode(
  'div',
  { class: cls, style: sty },
  text,
  PatchFlags.CLASS | PatchFlags.STYLE | PatchFlags.TEXT
)
```

## 运行时利用

渲染器根据 patchFlag 执行精确的更新：

```typescript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const patchFlag = n2.patchFlag
  
  if (patchFlag > 0) {
    // 有 patchFlag，执行优化路径
    
    if (patchFlag & PatchFlags.CLASS) {
      if (oldProps.class !== newProps.class) {
        patchClass(el, newProps.class)
      }
    }
    
    if (patchFlag & PatchFlags.STYLE) {
      patchStyle(el, oldProps.style, newProps.style)
    }
    
    if (patchFlag & PatchFlags.PROPS) {
      // 只比较 dynamicProps 中列出的属性
      const propsToUpdate = n2.dynamicProps!
      for (let i = 0; i < propsToUpdate.length; i++) {
        const key = propsToUpdate[i]
        const prev = oldProps[key]
        const next = newProps[key]
        if (prev !== next) {
          patchProp(el, key, prev, next)
        }
      }
    }
    
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        el.textContent = n2.children
      }
    }
  } else if (patchFlag !== PatchFlags.HOISTED) {
    // 没有 patchFlag，执行完整比较
    patchProps(el, oldProps, newProps)
  }
  
  // 处理子节点
  patchChildren(n1, n2, el)
}
```

## dynamicProps 的作用

当使用 `PatchFlags.PROPS` 时，需要配合 `dynamicProps` 数组指明哪些属性是动态的：

```html
<div :id="id" :title="title" class="static">
```

```javascript
createVNode(
  'div',
  { id: id, title: title, class: 'static' },
  null,
  PatchFlags.PROPS,
  ['id', 'title']  // 只有这两个需要比较
)
```

渲染器只比较 dynamicProps 中的属性，跳过静态的 `class`。

## FULL_PROPS 的场景

某些情况下编译器无法静态分析动态属性，需要完整比较：

```html
<!-- 动态属性名 -->
<div :[dynamicKey]="value">

<!-- v-bind 绑定对象 -->
<div v-bind="attrs">
```

此时使用 `PatchFlags.FULL_PROPS`，渲染器执行完整的属性比较。

## 特殊标记

**HOISTED (-1)**：静态提升的节点，渲染器跳过整个节点。

```javascript
// 提升到模块作用域
const _hoisted_1 = createVNode('div', null, 'Static')

function render() {
  return createVNode('div', null, [
    _hoisted_1,  // patchFlag = -1，完全跳过
    createVNode('span', null, dynamic, PatchFlags.TEXT)
  ])
}
```

**BAIL (-2)**：告诉渲染器退出优化模式，执行完整 Diff。用于手写 render 函数等场景。

## 性能提升

PatchFlags 带来的性能提升是显著的：

```html
<template>
  <div>
    <header><!-- 100 个静态元素 --></header>
    <main>{{ message }}</main>
    <footer><!-- 100 个静态元素 --></footer>
  </div>
</template>
```

传统 Diff：需要比较 200+ 个节点。

Vue 3 优化后：只比较一个带 `PatchFlags.TEXT` 的节点。

这就是编译时优化的威力——通过静态分析，让运行时只做必要的工作。
