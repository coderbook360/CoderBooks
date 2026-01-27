# 模板编译 vs JSX 编译

Vue 支持两种方式编写视图层：模板语法和 JSX。两者最终都编译成渲染函数，但编译过程和设计理念有显著差异。理解这些差异有助于选择合适的方案，也能更好地理解 Vue 编译器的设计决策。

## 模板的本质

Vue 模板本质上是带扩展的 HTML。它看起来像标记语言，但被 Vue 编译器解析后会转换成 JavaScript 渲染函数。

```html
<template>
  <div class="container">
    <span>{{ message }}</span>
  </div>
</template>
```

这个模板会编译成大致这样的渲染函数：

```javascript
function render(_ctx) {
  return _createVNode("div", { class: "container" }, [
    _createVNode("span", null, _toDisplayString(_ctx.message))
  ])
}
```

模板的优势在于它对 Vue 编译器是完全透明的。编译器可以解析、分析、优化模板的每一个部分，因为模板语法是 Vue 定义的，规则完全可控。

## JSX 的本质

JSX 是 JavaScript 的语法扩展，让你可以在 JavaScript 中写类似 HTML 的结构：

```jsx
export default {
  render() {
    return (
      <div class="container">
        <span>{this.message}</span>
      </div>
    )
  }
}
```

JSX 本身不是 Vue 特有的——它最早由 React 引入。JSX 的编译通常由 Babel 的 JSX 插件完成，转换后调用 createElement（或 Vue 的 h）函数。

## 编译时分析能力的差异

这是两种方案最根本的区别。

模板是"静态"的——编译器在编译时就能完全理解模板的结构。它知道哪些是静态节点、哪些属性会变化、事件处理器的形式等。这些信息让深度优化成为可能。

JSX 是"动态"的——它是普通 JavaScript，表达式可以是任意的。考虑这个 JSX：

```jsx
<div class={getClass()} onClick={handleClick()}>
  {items.map(item => <span>{item.name}</span>)}
</div>
```

`getClass()` 返回什么？`handleClick()` 是否每次都返回新函数？`items` 有多少项？这些在编译时无法确定。JSX 编译器只能做简单的语法转换，无法进行语义分析。

## Vue 模板的静态分析优化

Vue 3 编译器利用静态分析实现了多种优化：

静态提升将不变的 VNode 提升到渲染函数外部，每次渲染复用同一个对象。这在 JSX 中很难自动实现，因为无法确定表达式是否纯粹。

补丁标记（Patch Flags）告诉运行时"这个节点只有 class 可能变"。运行时只检查 class，跳过其他属性的比对。JSX 无法生成这种细粒度的提示。

静态节点整体提升可以将整个静态子树序列化为 HTML 字符串，首次渲染时直接 innerHTML。这需要编译器确认整个子树都是静态的，在 JSX 中做不到。

## JSX 的灵活性优势

JSX 的动态性虽然限制了优化，但也带来了灵活性。

在 JSX 中可以使用完整的 JavaScript 控制流。条件渲染用三元表达式或 `&&`，循环用 `map`，中间结果可以存入变量。这对于复杂的渲染逻辑很自然。

```jsx
const items = this.loading 
  ? <Loading /> 
  : this.items.length 
    ? this.items.map(item => <Item key={item.id} {...item} />)
    : <Empty />

return <div>{items}</div>
```

模板虽然也能表达这些逻辑，但需要用 v-if、v-for 等指令，对于复杂场景可能不够直观。

## 类型推导的差异

在 TypeScript 环境下，JSX 天然具有更好的类型支持。JSX 就是 JavaScript，TypeScript 直接理解它。组件的 props 类型、事件处理器类型都能得到推导。

Vue 模板的类型支持需要额外的工具支持。Volar 通过将模板转译为 TypeScript 可理解的形式来实现类型检查，但这增加了复杂性，某些边界情况可能处理不完美。

Vue 3.3 引入的 generic 组件在模板中的支持就比 JSX 中复杂。模板需要特殊语法，而 JSX 直接使用 TypeScript 的泛型语法。

## 编译产物的差异

Vue 模板和 JSX 最终都生成渲染函数调用，但具体形式不同。

模板编译的产物使用 Vue 内部的辅助函数：

```javascript
import { createVNode as _createVNode, toDisplayString as _toDisplayString } from 'vue'

function render(_ctx) {
  return _createVNode("div", { class: "container" }, 
    _toDisplayString(_ctx.message)
  )
}
```

JSX 编译使用 h 函数（或配置的其他函数）：

```javascript
import { h } from 'vue'

function render() {
  return h("div", { class: "container" }, this.message)
}
```

两者语义相同，但模板产物包含更多元数据（PatchFlags 等），JSX 产物更简洁。

## 运行时编译

Vue 支持运行时编译模板——将模板字符串在浏览器中编译成渲染函数。这需要包含编译器的完整构建版本，体积更大。

JSX 必须在构建时编译，无法运行时处理（浏览器不理解 JSX 语法）。这意味着 JSX 方案总是需要构建步骤。

运行时编译在某些场景有用：动态模板、用户自定义模板等。但对于大多数应用，构建时编译是更好的选择。

## 何时选择哪种方案

模板适合大多数场景，特别是当你希望最大化利用 Vue 的编译时优化时。对于团队协作，模板的约束性也是优点——它强制执行一定的结构，降低了代码评审的难度。

JSX 适合需要高度动态渲染逻辑的场景，或者团队成员对 JSX 更熟悉的情况。函数式组件、render props 模式在 JSX 中更自然。

一个项目中可以混用两种方案——某些组件用模板，某些用 JSX。Vue 对此没有限制。但保持一致性通常是更好的实践。

## 小结

模板和 JSX 代表了两种不同的权衡：模板牺牲一些灵活性换取编译时优化能力，JSX 保持 JavaScript 的全部表达力但限制了编译器的分析能力。Vue 的选择是将模板作为主要方案并投入大量精力优化其编译，同时保留 JSX 作为替代选项。理解两者的差异有助于在具体场景下做出合适的选择。
