# 缓存事件处理器

事件处理器的缓存是 Vue 3 编译器的一项细节优化。它解决了每次渲染都创建新函数导致的不必要更新问题。虽然看起来是小事，但对于包含大量事件绑定的应用，这项优化的累积效果相当可观。

## 问题的来源

考虑这样的模板：

```vue
<template>
  <button @click="handleClick">Click</button>
</template>
```

如果不做优化，编译结果可能是：

```javascript
function render(_ctx) {
  return h('button', {
    onClick: _ctx.handleClick
  }, 'Click')
}
```

每次渲染，都会创建新的 props 对象。虽然 `_ctx.handleClick` 可能是同一个方法引用，但 `{ onClick: _ctx.handleClick }` 是新对象。

更糟糕的是内联处理器：

```vue
<button @click="count++">Increment</button>
```

编译为：

```javascript
function render(_ctx) {
  return h('button', {
    onClick: () => _ctx.count++  // 每次渲染都是新函数！
  }, 'Increment')
}
```

每次渲染创建新的箭头函数。函数引用变化会触发 diff 认为需要更新事件监听器。

## 缓存的解决方案

Vue 3 编译器在组件实例上缓存处理器函数：

```javascript
function render(_ctx, _cache) {
  return h('button', {
    onClick: _cache[0] || (_cache[0] = () => _ctx.count++)
  }, 'Increment')
}
```

第一次渲染时，`_cache[0]` 为空，创建函数并存入缓存。后续渲染直接使用缓存的函数，引用保持稳定。

## _cache 的来源

_cache 是组件实例上的数组，在 setup 阶段初始化：

```typescript
function createComponentInstance(vnode) {
  const instance = {
    // ...
    renderCache: []
  }
  return instance
}
```

render 函数被调用时，renderCache 作为第二个参数传入。这样缓存与组件实例生命周期绑定，组件销毁时自动清理。

## 编译器的处理

编译器分析事件处理器的形式，决定是否需要缓存：

方法引用（`@click="handleClick"`）通常不需要缓存，因为方法引用本身是稳定的。但如果启用了 cacheHandlers 选项，也会被缓存以避免 props 对象变化。

内联表达式（`@click="count++"`）需要缓存，因为它们会被编译为箭头函数。

内联函数（`@click="() => doSomething()"`）同样需要缓存。

## 复杂场景的处理

带参数的处理器：

```vue
<button @click="handleClick(item)">Click</button>
```

编译为：

```javascript
onClick: _cache[0] || (_cache[0] = ($event) => _ctx.handleClick(_ctx.item))
```

注意这里有个问题：`item` 可能变化。如果 item 变了，使用缓存的旧函数会捕获旧的 item 值。

Vue 的处理方式是确保 `_ctx` 始终指向最新的上下文。由于使用了 Proxy，`_ctx.item` 的访问会获取最新值。

## 修饰符的处理

事件修饰符需要特殊处理：

```vue
<button @click.stop.prevent="handleClick">Click</button>
```

编译为：

```javascript
onClick: _cache[0] || (_cache[0] = withModifiers((...args) => _ctx.handleClick(...args), ['stop', 'prevent']))
```

withModifiers 包装函数，添加 stopPropagation 和 preventDefault 调用。包装后的函数被缓存。

## 缓存键的分配

每个需要缓存的处理器分配一个唯一的索引：

```vue
<button @click="a">A</button>
<button @click="b">B</button>
<button @click="a">C</button>
```

编译为：

```javascript
h('button', { onClick: _cache[0] || (_cache[0] = () => _ctx.a) }, 'A')
h('button', { onClick: _cache[1] || (_cache[1] = () => _ctx.b) }, 'B')
h('button', { onClick: _cache[2] || (_cache[2] = () => _ctx.a) }, 'C')
```

即使处理逻辑相同（第一和第三个按钮都调用 a），也分配不同的缓存槽。这是因为它们可能在不同的条件分支中，需要独立缓存。

## v-for 中的处理器

v-for 中的处理器需要特别注意：

```vue
<li v-for="item in items" @click="select(item)">{{ item.name }}</li>
```

这里不能简单缓存，因为每个 li 需要不同的 item。编译器生成：

```javascript
items.map((item, index) => 
  h('li', {
    onClick: () => select(item)  // 不使用全局缓存
  }, item.name)
)
```

对于 v-for，每次迭代都创建新函数是必要的。优化需要在更上层考虑，比如使用 key 来复用 DOM 元素。

## 缓存失效的情况

某些情况下缓存会"失效"——不是缓存被清除，而是缓存的函数内部行为变化：

```vue
<button @click="flag ? a() : b()">Click</button>
```

编译为：

```javascript
onClick: _cache[0] || (_cache[0] = () => _ctx.flag ? _ctx.a() : _ctx.b())
```

函数被缓存，但执行时会读取最新的 flag、a、b。这是通过 _ctx Proxy 实现的——每次访问都获取当前值。

## 性能收益

缓存事件处理器的收益来自几个方面：

减少函数创建。每次渲染创建函数有 CPU 和内存开销，虽然单个函数开销很小，但大量累积不可忽视。

减少 GC 压力。不创建新函数意味着没有需要回收的旧函数。

避免不必要的 DOM 操作。函数引用不变，diff 不会认为需要更新事件监听器，省去了 removeEventListener 和 addEventListener 调用。

## 编译选项

可以通过编译选项控制这个行为：

```javascript
compile(template, {
  cacheHandlers: true  // 默认开启
})
```

通常没有理由关闭。某些边缘情况（如需要每次渲染都是新函数引用）可能需要，但这种情况极少见。

## 小结

事件处理器缓存是一个典型的"小优化，大收益"案例。通过在组件实例上缓存函数，Vue 避免了每次渲染创建新函数的开销，保持了事件监听器的引用稳定。编译器负责识别哪些处理器需要缓存、分配缓存槽、生成正确的缓存代码。这种编译器与运行时的配合，让开发者写出清晰的模板代码，同时享受优化的运行时性能。
