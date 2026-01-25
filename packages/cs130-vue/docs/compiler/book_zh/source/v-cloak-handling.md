# v-cloak 处理机制

v-cloak 用于隐藏未编译的模板，防止用户看到原始的 Vue 模板语法。

## 基本用法

```html
<!-- CSS -->
<style>
[v-cloak] {
  display: none;
}
</style>

<!-- 模板 -->
<div id="app" v-cloak>
  {{ message }}
</div>
```

## 工作原理

v-cloak 是一个特殊的指令，它不需要编译器处理，而是通过以下机制工作：

1. 初始时元素带有 `v-cloak` 属性
2. CSS 规则隐藏带有该属性的元素
3. Vue 挂载后自动移除该属性
4. 元素变为可见

## 运行时移除

```typescript
// 组件挂载后
function mounted(el: Element) {
  // Vue 核心在挂载完成后移除 v-cloak
  el.removeAttribute('v-cloak')
}

// 实际实现在 runtime-dom
const vCloak: ObjectDirective = {
  mounted(el) {
    el.removeAttribute('v-cloak')
  }
}
```

## 编译处理

```typescript
// v-cloak 在编译阶段被识别但不转换
function transformElement(node: ElementNode, context: TransformContext) {
  const { props } = node

  for (let i = 0; i < props.length; i++) {
    const prop = props[i]

    if (prop.type === NodeTypes.DIRECTIVE) {
      if (prop.name === 'cloak') {
        // 移除指令，转换为普通属性
        props[i] = {
          type: NodeTypes.ATTRIBUTE,
          name: 'v-cloak',
          value: undefined,
          loc: prop.loc
        }
      }
    }
  }
}
```

## 代码生成

```vue
<template>
  <div v-cloak>{{ message }}</div>
</template>
```

```typescript
// 生成普通属性
_createElementVNode("div", { "v-cloak": "" }, 
  _toDisplayString(_ctx.message), 1)
```

## 与 SFC 的关系

在单文件组件中，通常不需要 v-cloak，因为：

```vue
<!-- SFC 模板在构建时编译 -->
<template>
  <div>{{ message }}</div>
</template>
```

构建后的代码直接是渲染函数，没有模板闪烁问题。

## 使用场景

```html
<!-- 1. 直接在 HTML 中使用 Vue -->
<script src="vue.global.js"></script>
<div id="app" v-cloak>
  <p>{{ greeting }}</p>
</div>

<!-- 2. SSR hydration 期间 -->
<div id="app" v-cloak>
  <!-- 服务端渲染的内容 -->
</div>
```

## 样式变体

```css
/* 基本隐藏 */
[v-cloak] {
  display: none;
}

/* 或使用透明度 */
[v-cloak] {
  opacity: 0;
}

/* 带过渡效果 */
[v-cloak] {
  opacity: 0;
  transition: opacity 0.3s;
}
```

## 局部应用

```html
<div id="app">
  <header>Always visible</header>
  <main v-cloak>
    {{ dynamicContent }}
  </main>
  <footer>Always visible</footer>
</div>
```

只在需要的部分使用 v-cloak。

## 调试技巧

```css
/* 开发时查看未编译内容 */
[v-cloak] {
  background: yellow !important;
  display: block !important;
}
```

## SSR 考虑

```typescript
// SSR 时 v-cloak 应该被保留
// 客户端 hydration 完成后移除
function hydrateNode(vnode: VNode, container: Element) {
  // hydration 完成
  container.removeAttribute('v-cloak')
}
```

## 与 v-if 对比

```html
<!-- v-cloak：编译后显示 -->
<div v-cloak>{{ msg }}</div>

<!-- v-if：条件渲染 -->
<div v-if="loaded">{{ msg }}</div>
```

v-cloak 仅用于解决编译延迟问题，不控制渲染逻辑。

## 小结

v-cloak 处理的关键点：

1. **CSS 配合**：需要样式规则隐藏元素
2. **自动移除**：Vue 挂载后删除属性
3. **编译时保留**：作为普通属性输出
4. **SFC 不需要**：构建时编译无闪烁

这个指令主要用于非 SFC 场景下的用户体验优化。
