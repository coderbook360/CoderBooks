# 模板编译 vs JSX 编译

Vue3 同时支持模板和 JSX 两种编写渲染逻辑的方式，它们背后的编译策略有本质差异。模板编译可以进行深度的静态分析和优化，而 JSX 编译则保留了 JavaScript 的完全动态性。理解这种差异，有助于我们在实际开发中做出正确的选择。

## 模板的静态性

Vue 模板是一种受限的 DSL（领域特定语言），这种「受限」恰恰是优化的来源。

```vue
<template>
  <div class="container">
    <header>
      <h1>{{ title }}</h1>
    </header>
    <main>
      <article v-for="post in posts" :key="post.id">
        <h2>{{ post.title }}</h2>
        <p>{{ post.summary }}</p>
      </article>
    </main>
    <footer>
      <p>Copyright 2024</p>
    </footer>
  </div>
</template>
```

在这个模板中，编译器可以确定：

- `<div class="container">`、`<header>`、`<footer>` 完全静态
- `{{ title }}` 只有文本是动态的
- `v-for` 循环的结构是稳定的
- `<footer>` 及其子节点永远不变

基于这些信息，编译器可以：

1. 将静态节点提升
2. 为动态节点生成精确的 patchFlag
3. 使用 Block Tree 优化 Diff

## JSX 的动态性

JSX 是 JavaScript 的语法扩展，它继承了 JavaScript 的完全动态性：

```jsx
function MyComponent({ title, posts, showFooter }) {
  const header = (
    <header>
      <h1>{title}</h1>
    </header>
  );
  
  return (
    <div className="container">
      {header}
      <main>
        {posts.map(post => (
          <article key={post.id}>
            <h2>{post.title}</h2>
            <p>{post.summary}</p>
          </article>
        ))}
      </main>
      {showFooter && (
        <footer>
          <p>Copyright 2024</p>
        </footer>
      )}
    </div>
  );
}
```

在 JSX 中：

- `header` 变量可以是任何东西，编译器无法假设
- `posts.map(...)` 可能返回任意结构
- `showFooter && ...` 是 JavaScript 表达式，编译时无法确定结果

JSX 编译器只能做简单的语法转换，无法进行深度优化：

```javascript
// JSX 编译后
function MyComponent({ title, posts, showFooter }) {
  const header = createElement('header', null,
    createElement('h1', null, title)
  );
  
  return createElement('div', { className: 'container' },
    header,
    createElement('main', null,
      posts.map(post =>
        createElement('article', { key: post.id },
          createElement('h2', null, post.title),
          createElement('p', null, post.summary)
        )
      )
    ),
    showFooter && createElement('footer', null,
      createElement('p', null, 'Copyright 2024')
    )
  );
}
```

每次渲染都会重新执行整个函数，创建新的 VNode 树，运行时需要完整 Diff。

## 编译输出对比

让我们看一个具体例子的编译输出对比：

```vue
<!-- Vue 模板 -->
<template>
  <div>
    <span class="label">Name:</span>
    <span>{{ name }}</span>
  </div>
</template>
```

Vue 模板编译输出：

```javascript
const _hoisted_1 = createVNode('span', { class: 'label' }, 'Name:', -1)

function render(_ctx) {
  return (openBlock(), createBlock('div', null, [
    _hoisted_1,  // 静态节点复用
    createVNode('span', null, toDisplayString(_ctx.name), 1 /* TEXT */)
  ]))
}
```

等价的 JSX：

```jsx
function MyComponent({ name }) {
  return (
    <div>
      <span className="label">Name:</span>
      <span>{name}</span>
    </div>
  );
}
```

标准 JSX 编译输出：

```javascript
function MyComponent({ name }) {
  return createElement('div', null,
    createElement('span', { className: 'label' }, 'Name:'),
    createElement('span', null, name)
  );
}
```

关键差异：

1. Vue 模板的静态 `<span class="label">` 被提升，JSX 每次都重新创建
2. Vue 模板的动态节点有 patchFlag，JSX 没有优化信息
3. Vue 模板使用 Block，可以跳过静态节点的 Diff

## Vue 的 JSX 支持

Vue3 也支持 JSX，但通过 `@vue/babel-plugin-jsx` 可以获得部分优化：

```jsx
// Vue JSX
import { defineComponent } from 'vue'

export default defineComponent({
  setup() {
    const name = ref('Alice')
    
    return () => (
      <div>
        <span class="label">Name:</span>
        <span>{name.value}</span>
      </div>
    )
  }
})
```

Vue 的 JSX 插件会做一些基本的优化，但由于 JSX 的动态性，无法达到模板的优化程度。

## 表达能力对比

JSX 的优势在于表达能力。某些模式在 JSX 中更自然：

**高阶组件**：

```jsx
// JSX 中的高阶组件
function withLogging(WrappedComponent) {
  return function LoggingComponent(props) {
    console.log('Rendering:', props);
    return <WrappedComponent {...props} />;
  };
}
```

**渲染函数组合**：

```jsx
function ComplexList({ items, renderItem, renderEmpty }) {
  if (items.length === 0) {
    return renderEmpty();
  }
  
  return (
    <ul>
      {items.map((item, index) => (
        <li key={item.id}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
```

**动态组件选择**：

```jsx
const componentMap = {
  text: TextInput,
  select: SelectInput,
  checkbox: CheckboxInput
};

function DynamicField({ type, ...props }) {
  const Component = componentMap[type];
  return <Component {...props} />;
}
```

这些模式在模板中需要更多的样板代码或不那么直观。

## 模板的优势场景

模板在以下场景更有优势：

**声明式结构**：

```vue
<template>
  <TransitionGroup name="list">
    <div v-for="item in items" :key="item.id">
      <slot :item="item" />
    </div>
  </TransitionGroup>
</template>
```

**指令系统**：

```vue
<template>
  <input
    v-model.trim="searchQuery"
    v-focus
    @keyup.enter="search"
  />
</template>
```

**团队协作**：模板更容易被不熟悉 JavaScript 的团队成员理解。

## 编译时间对比

模板编译更复杂，但这个成本在构建时支付：

| 方面 | 模板编译 | JSX 编译 |
|------|----------|---------|
| 编译时间 | 较长 | 较短 |
| 编译复杂度 | 高 | 低 |
| 运行时性能 | 更好 | 一般 |
| 包体积 | 可能更小 | 一般 |

## 混合使用策略

Vue3 允许在同一项目中混合使用模板和 JSX：

```vue
<script setup lang="tsx">
import { ref } from 'vue'

const count = ref(0)

// JSX 渲染函数用于复杂逻辑
function renderComplexList(items) {
  return items.map(item => (
    <div key={item.id} class={item.active ? 'active' : ''}>
      {item.name}
    </div>
  ))
}
</script>

<template>
  <div>
    <h1>Count: {{ count }}</h1>
    <!-- 模板用于主结构 -->
    <component :is="() => renderComplexList(items)" />
  </div>
</template>
```

最佳实践：

1. **默认使用模板**：获得最佳的编译优化
2. **复杂渲染逻辑使用 JSX**：更灵活的表达能力
3. **组件库可以使用 JSX**：便于高度定制化
4. **避免在模板中嵌入过多逻辑**：保持模板的声明性

## 设计哲学的体现

模板 vs JSX 的选择体现了不同的设计哲学：

**模板**：约束带来优化。通过限制表达能力，编译器获得了优化的空间。这是 Vue 的默认选择，符合「渐进式框架」的理念——大多数场景下，声明式模板既足够表达又获得最佳性能。

**JSX**：灵活性优先。完全的 JavaScript 表达能力，但优化空间有限。这是 React 的选择，符合「JavaScript 优先」的理念。

Vue3 通过同时支持两者，让开发者可以根据具体场景做出选择。这种务实的态度是 Vue 设计哲学的核心体现。
