# 缓存事件处理函数

事件处理函数看起来是小事，**但如果处理不当，会导致不必要的子组件更新。**

**这是一个很容易忽略的性能问题。** 本章将分析 Vue 3 的事件缓存机制，理解它如何避免“函数引用不稳定”导致的不必要更新。

## 问题场景

```html
<!-- 父组件 -->
<ChildComponent @click="() => handleClick(item)" />
```

未优化的渲染：

```javascript
function render() {
  return h(ChildComponent, {
    onClick: () => handleClick(item)  // 每次都是新函数
  })
}
```

每次父组件更新：
1. 创建新的 onClick 函数
2. newProps.onClick !== oldProps.onClick
3. 子组件被标记为需要更新
4. 子组件执行 render（即使内部状态没变）

这就是"函数引用不稳定"导致的不必要更新。

## 解决方案：缓存

```javascript
function render(_ctx, _cache) {
  return h(ChildComponent, {
    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.handleClick(_ctx.item))
  })
}
```

每次父组件更新：
1. `_cache[0]` 已存在，直接使用
2. newProps.onClick === oldProps.onClick
3. 子组件 props 未变化，跳过更新

## 编译时缓存索引分配

编译器为每个需要缓存的表达式分配唯一索引：

```javascript
function createTransformContext() {
  return {
    cached: 0,
    
    cache(exp, isVNode = false) {
      return createCacheExpression(++this.cached, exp, isVNode)
    }
  }
}
```

CacheExpression 节点：

```javascript
{
  type: NodeTypes.JS_CACHE_EXPRESSION,
  index: 1,
  value: { /* 要缓存的表达式 */ },
  isVNode: false
}
```

## 判断是否需要缓存

并非所有事件处理都需要缓存：

```javascript
function transformOn(dir, node, context) {
  const { exp } = dir
  
  // 判断是否是内联处理
  const isInlineHandler = isInlineHandlerExp(exp)
  
  if (isInlineHandler) {
    // 需要缓存
    let handlerExp = createCompoundExpression([
      `$event => (`,
      exp,
      `)`
    ])
    handlerExp = context.cache(handlerExp)
  }
  
  // 方法引用不需要缓存
  // @click="handleClick" -> _ctx.handleClick 已经是稳定引用
}

function isInlineHandlerExp(exp) {
  const content = exp.content
  // 函数调用或箭头函数
  return /\(.*\)|=>/.test(content)
}
```

区分：
- `@click="handleClick"` → 方法引用，不缓存
- `@click="handleClick()"` → 方法调用，缓存
- `@click="() => doSomething()"` → 箭头函数，缓存

## 代码生成

```javascript
function genCacheExpression(node, context) {
  const { push } = context
  const { index, value } = node
  
  push(`_cache[${index}] || (`)
  push(`_cache[${index}] = `)
  genNode(value, context)
  push(`)`)
}
```

输出：

```javascript
_cache[1] || (_cache[1] = ($event) => _ctx.handleClick())
```

## _cache 数组的初始化

组件实例上有一个 cache 数组：

```javascript
function setupComponent(instance) {
  // 根据编译信息确定 cache 大小
  const cacheSize = instance.type.render?.cacheSize || 0
  instance.renderCache = new Array(cacheSize)
}
```

渲染时传入：

```javascript
function renderComponentRoot(instance) {
  const { render, renderCache } = instance
  return render(instance.proxy, renderCache)
}
```

## 缓存失效问题

缓存有个问题：如果闭包中的变量变化了怎么办？

```html
<button @click="() => handleClick(item.id)">Click</button>
```

如果 `item.id` 变化了，缓存的函数用的还是旧值。

Vue 3 的处理：

```javascript
_cache[0] || (_cache[0] = ($event) => _ctx.handleClick(_ctx.item.id))
```

函数内部访问的是 `_ctx.item.id`，而不是闭包捕获的值。每次执行时都会读取最新的 `_ctx.item`。

## 何时不缓存

**v-once 区域内**

v-once 的内容只渲染一次，没必要缓存事件处理。

```html
<div v-once>
  <button @click="() => handleClick()">Click</button>
</div>
```

**动态事件名**

```html
<button @[eventName]="handler">Click</button>
```

事件名本身是动态的，缓存意义不大。

## 性能影响

在有大量子组件的场景下，事件缓存的效果非常明显：

```html
<div v-for="item in list" :key="item.id">
  <ChildComponent @click="() => select(item)" />
</div>
```

未缓存：每次父组件更新，所有 ChildComponent 都会重新渲染。

缓存后：只有真正需要更新的 ChildComponent 才会重新渲染。

## 与 React useCallback 的对比

React 需要手动使用 `useCallback`：

```jsx
const handleClick = useCallback(() => {
  select(item)
}, [item])
```

Vue 3 在编译时自动处理，开发者无需关心。

## 本章小结

本章分析了事件缓存的实现：

- **问题**：内联事件处理导致函数引用不稳定
- **解决**：使用 _cache 数组缓存函数
- **编译时**：分配缓存索引，生成缓存代码
- **运行时**：首次创建，后续复用

事件缓存是编译优化的又一体现——编译器自动处理，开发者无感知。下一章我们将分析 v-once 和 v-memo——手动控制的优化指令。
