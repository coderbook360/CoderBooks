# 渲染器与编译器协作

Vue 的高性能来自编译器和渲染器的紧密协作。编译器在构建时分析模板、提取优化信息；渲染器在运行时利用这些信息跳过不必要的工作。

## 协作模式

传统 Virtual DOM 框架的运行时需要处理一切情况，因为它不知道 VNode 的结构。Vue 的编译器提供了"线索"：

```
模板 -> 编译器 -> 带优化标记的渲染函数 -> 渲染器
```

编译器生成的代码包含 PatchFlags、Block Tree、静态提升等信息，渲染器根据这些信息优化 Diff 过程。

## PatchFlags 协作

编译器分析属性是静态还是动态，生成 PatchFlag：

```html
<div :class="cls" id="static">{{ text }}</div>
```

编译为：

```javascript
createVNode('div', {
  class: _ctx.cls,
  id: 'static'
}, _toDisplayString(_ctx.text), 3 /* TEXT | CLASS */)
```

PatchFlag `3` 告诉渲染器：只有 text 和 class 可能变化，id 是静态的。

渲染器据此优化：

```javascript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const patchFlag = n2.patchFlag
  
  if (patchFlag & PatchFlags.TEXT) {
    if (n1.children !== n2.children) {
      el.textContent = n2.children
    }
  }
  
  if (patchFlag & PatchFlags.CLASS) {
    if (n1.props.class !== n2.props.class) {
      el.className = n2.props.class
    }
  }
  
  // id 是静态的，根本不检查
}
```

## Block Tree 协作

编译器识别动态节点，将它们收集到 Block：

```html
<div>
  <p>静态段落</p>
  <p>{{ dynamicText }}</p>
  <p>另一个静态段落</p>
</div>
```

编译为：

```javascript
function render() {
  return (openBlock(), createBlock('div', null, [
    createVNode('p', null, '静态段落'),
    createVNode('p', null, _ctx.dynamicText, 1 /* TEXT */),
    createVNode('p', null, '另一个静态段落')
  ]))
}
```

渲染器直接遍历 `dynamicChildren`，跳过静态节点：

```javascript
function patchBlock(n1, n2) {
  const dynamicChildren1 = n1.dynamicChildren
  const dynamicChildren2 = n2.dynamicChildren
  
  for (let i = 0; i < dynamicChildren2.length; i++) {
    patch(dynamicChildren1[i], dynamicChildren2[i])
  }
}
```

## 静态提升协作

编译器将静态节点提升到渲染函数外：

```javascript
// 提升到模块顶层
const _hoisted_1 = createVNode('p', null, '静态段落')
const _hoisted_2 = createVNode('p', null, '另一个静态段落')

function render() {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,  // 复用
    createVNode('p', null, _ctx.dynamicText, 1),
    _hoisted_2   // 复用
  ]))
}
```

静态 VNode 只创建一次，后续渲染直接复用。渲染器 patch 时发现是同一个对象引用，可以跳过：

```javascript
function patch(n1, n2) {
  if (n1 === n2) {
    return  // 同一个对象，无需 patch
  }
  // ...
}
```

## 静态属性提升

不只是整个节点，静态属性也可以提升：

```html
<div :id="dynamicId" class="static-class" data-type="info">
  {{ content }}
</div>
```

编译为：

```javascript
const _hoisted_props = {
  class: 'static-class',
  'data-type': 'info'
}

function render() {
  return createVNode('div', {
    id: _ctx.dynamicId,
    ..._hoisted_props
  }, _ctx.content, 9 /* TEXT | PROPS */, ['id'])
}
```

`dynamicProps: ['id']` 告诉渲染器只需要 diff `id` 属性。

## 预字符串化

对于大段静态内容，编译器可以直接生成 HTML 字符串：

```html
<div>
  <section>
    <h1>标题</h1>
    <p>第一段</p>
    <p>第二段</p>
    <p>第三段</p>
  </section>
</div>
```

如果这一块完全静态，编译器生成：

```javascript
const _hoisted_html = `<section><h1>标题</h1><p>第一段</p><p>第二段</p><p>第三段</p></section>`

function render() {
  return createStaticVNode(_hoisted_html, 1)
}
```

渲染器使用 `innerHTML` 一次性插入，比逐个创建节点快得多。

## 事件处理缓存

编译器缓存事件处理函数，避免不必要的更新：

```html
<button @click="count++">点击</button>
```

编译为：

```javascript
function render() {
  return createVNode('button', {
    onClick: _cache[0] || (_cache[0] = $event => _ctx.count++)
  }, '点击')
}
```

函数引用被缓存，不会每次渲染都创建新函数。这避免了子组件因 props 变化而重新渲染。

## v-once 优化

`v-once` 指令告诉编译器内容只渲染一次：

```html
<div v-once>{{ expensiveComputation() }}</div>
```

编译器生成缓存逻辑：

```javascript
function render() {
  return _cache[1] || (
    setBlockTracking(-1),
    _cache[1] = createVNode('div', null, _ctx.expensiveComputation()),
    setBlockTracking(1),
    _cache[1]
  )
}
```

首次渲染后缓存 VNode，后续直接返回缓存。

## v-memo 优化

`v-memo` 允许条件性缓存：

```html
<div v-memo="[item.id, selected === item.id]">
  <!-- 复杂内容 -->
</div>
```

只有当依赖数组变化时才重新渲染：

```javascript
function render() {
  return withMemo([item.id, selected === item.id], () => {
    return createVNode('div', null, /* 复杂内容 */)
  }, _cache, 0)
}
```

## SSR 优化

服务端渲染时，编译器生成不同的代码：

```javascript
// 客户端
function render() {
  return createVNode('div', { class: cls }, text)
}

// 服务端
function ssrRender(push) {
  push(`<div class="${cls}">${text}</div>`)
}
```

服务端直接拼接字符串，不创建 VNode，性能更好。

## 编译器配置传递

编译器的配置影响生成代码的优化级别：

```javascript
const { code } = compile(template, {
  mode: 'module',           // 启用静态提升
  hoistStatic: true,        // 提升静态节点
  cacheHandlers: true,      // 缓存事件处理
  prefixIdentifiers: true,  // 前缀标识符
})
```

不同配置生成不同优化程度的代码。

## 运行时与编译时的边界

并非所有情况都能在编译时优化。动态组件、动态指令、v-for 生成的内容需要运行时处理：

```html
<!-- 编译时可优化 -->
<div :class="cls">{{ text }}</div>

<!-- 需要运行时处理 -->
<component :is="currentComponent" />
<div v-for="item in list" :key="item.id">{{ item }}</div>
```

渲染器需要同时处理优化和非优化的情况：

```javascript
function patch(n1, n2) {
  if (n2.patchFlag) {
    // 有优化标记，使用快速路径
    patchWithFlags(n1, n2)
  } else {
    // 无优化标记，完整 diff
    patchFull(n1, n2)
  }
}
```

## 渐进增强

这种协作是"渐进增强"的：

1. **纯运行时**：h() 函数手写 VNode，无优化，完整 Diff
2. **基础编译**：模板编译为渲染函数，无优化标记
3. **完整优化**：PatchFlags、Block Tree、静态提升全开

用户可以根据需求选择。使用模板自动获得完整优化，使用 JSX 或 h() 则无优化。

## 小结

编译器与渲染器的协作是 Vue 3 性能优势的来源。编译器在构建时做静态分析，渲染器在运行时利用分析结果。这种分工让 Vue 在保持灵活性的同时达到接近手写的性能。

理解这个协作机制，有助于理解为什么使用模板通常比 JSX 性能更好，以及如何在需要时利用这些优化特性。
