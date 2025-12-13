# v-once 与 v-memo 的优化实现

编译器的自动优化覆盖了大部分场景。**但有时候开发者比编译器更了解业务逻辑，需要手动控制优化。**

`v-once` 和 `v-memo` 就是这样的手动优化指令。**理解它们的原理，能帮你在性能关键场景中做出正确决策。**

## v-once：渲染一次，永不更新

```html
<h1 v-once>欢迎，{{ username }}</h1>
```

即使 `username` 后来变化了，这个元素也不会更新。适用于：
- 初始化后永不变化的内容
- 纯展示性的静态数据

## v-once 编译输出

```javascript
function render(_ctx, _cache) {
  return (_openBlock(), _createElementBlock("div", null, [
    _cache[0] || (
      _setBlockTracking(-1),
      _cache[0] = _createElementVNode("h1", null, 
        "欢迎，" + _toDisplayString(_ctx.username), 
        1 /* TEXT */
      ),
      _setBlockTracking(1),
      _cache[0]
    )
  ]))
}
```

关键点：
1. 整个节点缓存到 `_cache[0]`
2. 首次渲染正常执行，结果存入缓存
3. 后续渲染直接返回缓存的 VNode

## setBlockTracking

`setBlockTracking(-1)` 的作用：禁止将 v-once 节点收集到 dynamicChildren。

```javascript
let shouldTrack = 1

function setBlockTracking(value) {
  shouldTrack += value
}

// createElementVNode 中
if (shouldTrack > 0 && currentBlock !== null && patchFlag > 0) {
  currentBlock.push(vnode)
}
```

如果 v-once 节点被收集了，每次更新还是会被 patch，就失去了优化效果。

## v-once 编译转换

```javascript
function transformOnce(node, context) {
  // 为整个节点分配缓存索引
  const cached = context.cache(node.codegenNode, true)
  
  // 包装：禁用追踪 + 缓存 + 恢复追踪
  node.codegenNode = createSequenceExpression([
    createCallExpression(context.helper(SET_BLOCK_TRACKING), ['-1']),
    cached,
    createCallExpression(context.helper(SET_BLOCK_TRACKING), ['1']),
    cached
  ])
}
```

## v-memo：条件性记忆化

v-once 太极端——完全不更新。有时候需要"某些条件变化时才更新"。

```html
<div v-for="item in list" :key="item.id" v-memo="[item.id, item.selected]">
  <p>{{ item.name }}</p>
  <span>{{ item.selected ? '选中' : '未选中' }}</span>
</div>
```

只有当 `item.id` 或 `item.selected` 变化时，这个 div 才会更新。即使 `item.name` 变了也不会更新。

## v-memo 的工作原理

1. 维护一个依赖数组
2. 每次渲染比较新旧依赖
3. 依赖相同时复用旧 VNode

```javascript
function isMemoSame(prev, next) {
  if (prev.length !== next.length) return false
  
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) return false  // 浅比较
  }
  return true
}
```

## withMemo 运行时辅助

```javascript
function withMemo(memo, render, cache, index) {
  const cached = cache[index]
  
  if (cached && isMemoSame(cached.memo, memo)) {
    // 依赖没变，返回缓存
    return cached
  }
  
  // 依赖变了，重新渲染
  const vnode = render()
  
  // 存储依赖用于下次比较
  vnode.memo = memo.slice()
  
  // 更新缓存
  return (cache[index] = vnode)
}
```

## v-memo 编译输出

```javascript
function render(_ctx, _cache) {
  return _withMemo(
    [_ctx.item.id, _ctx.item.selected],  // 依赖数组
    () => {
      // 渲染函数
      return _createElementVNode("div", ...)
    },
    _cache,
    0  // 缓存索引
  )
}
```

## v-memo 在 v-for 中的优化

```html
<div v-for="item in list" :key="item.id" v-memo="[item.selected]">
  {{ item.name }}
</div>
```

假设列表有 1000 项，用户选中了第一项。

无 v-memo：更新时需要比对 1000 个 VNode。

有 v-memo：只有第一项的 `item.selected` 变了，只比对 1 个 VNode。

性能提升可达 1000 倍。

## v-memo 的注意事项

**依赖要完整**

```html
<!-- 错误：item.name 变化时不会更新 -->
<div v-memo="[item.selected]">{{ item.name }}</div>
```

如果模板中用到了 `item.name`，但依赖数组中没有，更新就会丢失。

**不要过度使用**

```html
<!-- 不必要：简单节点不需要 v-memo -->
<span v-memo="[value]">{{ value }}</span>
```

v-memo 本身有开销（依赖比较）。只在复杂模板 + 频繁更新的场景使用。

## v-memo + 空数组 = v-once

```html
<div v-memo="[]">永不更新</div>
```

空数组永远相等，效果等同于 v-once。

## 编译转换

```javascript
function transformMemo(node, context) {
  const dir = findDir(node, 'memo')
  
  // 创建 withMemo 调用
  node.codegenNode = createCallExpression(
    context.helper(WITH_MEMO),
    [
      dir.exp,  // 依赖数组
      createFunctionExpression([], node.codegenNode),  // 渲染函数
      createSimpleExpression('_cache'),
      createSimpleExpression(String(context.cached++))
    ]
  )
}
```

## v-once vs v-memo 对比

| 特性 | v-once | v-memo |
|------|--------|--------|
| 更新频率 | 永不更新 | 依赖变化时更新 |
| 灵活性 | 低 | 高 |
| 使用场景 | 纯静态内容 | 条件性优化 |
| 心智负担 | 低 | 需要正确指定依赖 |

## 本章小结

本章分析了 v-once 和 v-memo 的实现：

- **v-once**：缓存 VNode，永不更新
- **setBlockTracking**：防止 v-once 节点被收集
- **v-memo**：依赖数组比较，条件性缓存
- **withMemo**：运行时依赖比较和缓存管理

这两个指令让开发者可以手动控制更新粒度，在特定场景下获得极大的性能提升。

至此，我们完成了编译优化部分。下一部分将进入代码生成——看编译器如何生成最终的渲染函数。
