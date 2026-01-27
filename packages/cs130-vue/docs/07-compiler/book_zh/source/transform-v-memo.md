# transformVMemo 缓存节点

v-memo 是 Vue 3.2 引入的指令，用于有条件地缓存组件或元素的渲染结果，提供比 v-once 更灵活的缓存控制。

## 核心实现

```typescript
export const transformMemo: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT) {
    const dir = findDir(node, 'memo', true)
    if (!dir || seen.has(node)) {
      return
    }
    seen.add(node)
    
    return () => {
      const codegenNode = node.codegenNode || context.currentNode.codegenNode
      
      if (codegenNode && codegenNode.type === NodeTypes.VNODE_CALL) {
        // 非组件使用 withMemo
        if (node.tagType !== ElementTypes.COMPONENT) {
          makeBlock(codegenNode, context)
        }
        node.codegenNode = createCallExpression(context.helper(WITH_MEMO), [
          dir.exp!,
          createFunctionExpression(undefined, codegenNode),
          `_cache`,
          String(context.cached++)
        ])
      }
    }
  }
}
```

## 生成代码

```html
<div v-memo="[valueA, valueB]">
  {{ expensiveComputation }}
</div>
```

```typescript
_withMemo([valueA, valueB], () => {
  return (_openBlock(), _createElementBlock("div", null, [
    _toDisplayString(expensiveComputation)
  ]))
}, _cache, 0)
```

withMemo 接收依赖数组、渲染函数、缓存数组和缓存索引。

## withMemo 运行时

```typescript
export function withMemo(
  memo: any[],
  render: () => VNode,
  cache: any[],
  index: number
): VNode {
  const cached = cache[index] as MemoizedVNode | undefined
  
  if (cached && isMemoSame(cached, memo)) {
    // 依赖未变化，返回缓存
    return cached
  }
  
  // 依赖变化，重新渲染
  const ret = render() as MemoizedVNode
  ret.memo = memo.slice()  // 保存当前依赖快照
  return (cache[index] = ret)
}

function isMemoSame(cached: MemoizedVNode, memo: any[]): boolean {
  const prev = cached.memo!
  if (prev.length !== memo.length) {
    return false
  }
  for (let i = 0; i < prev.length; i++) {
    if (hasChanged(prev[i], memo[i])) {
      return false
    }
  }
  return true
}
```

## 与 v-once 的区别

```typescript
// v-once - 永远不更新
_cache[0] || (_cache[0] = renderOnce())

// v-memo - 依赖变化时更新
_withMemo([dep1, dep2], () => render(), _cache, 0)
```

v-memo 提供了依赖追踪的缓存，比 v-once 更灵活。

## 空依赖数组

```html
<div v-memo="[]">Content</div>
```

空数组表示永不更新，等价于 v-once。

## 与 v-for 配合

```html
<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
  <p>ID: {{ item.id }} - selected: {{ item.id === selected }}</p>
</div>
```

这是 v-memo 最常见的使用场景，只有选中状态变化的项才重新渲染。

```typescript
// 生成代码（简化）
_renderList(list, (item) => {
  return _withMemo([item.id === selected], () => {
    return _createVNode("div", { key: item.id }, [
      _createVNode("p", null, "ID: " + item.id)
    ])
  }, _cache, item.id)
})
```

## 缓存键

```typescript
// 静态位置使用索引
_withMemo([...], render, _cache, 0)
_withMemo([...], render, _cache, 1)

// v-for 中使用 key 作为缓存键
_withMemo([...], render, _cache, item.id)
```

在循环中使用 key 作为缓存键，确保正确缓存每个项。

## 性能优化场景

```typescript
// 长列表优化
// 只有可见项重新渲染

// 复杂计算优化
// 依赖不变时跳过计算

// 条件渲染优化
// 状态不变时复用缓存
```

v-memo 特别适合大型列表和复杂渲染场景。

## 组件上的 v-memo

```html
<MyComponent v-memo="[prop1, prop2]" :prop1="prop1" :prop2="prop2" />
```

组件上使用 v-memo 时需要注意：只有 memo 依赖变化才会触发组件更新，即使 props 变化。

## 注意事项

```typescript
// v-memo 依赖必须覆盖所有动态值
// 否则更新可能被错误跳过

// 正确
<div v-memo="[a, b]">{{ a }} {{ b }}</div>

// 错误 - b 的变化会被忽略
<div v-memo="[a]">{{ a }} {{ b }}</div>
```

依赖数组应该包含所有可能变化的值。

## Block 处理

```typescript
if (node.tagType !== ElementTypes.COMPONENT) {
  makeBlock(codegenNode, context)
}
```

非组件元素需要转为 Block 以确保正确的更新行为。

## 小结

transformVMemo 的机制：

1. **依赖追踪**：通过数组比较判断是否需要更新
2. **条件缓存**：依赖变化时重新渲染，否则复用
3. **v-for 优化**：使用 key 作为缓存键
4. **性能提升**：减少不必要的渲染开销

下一章将分析 generate 代码生成入口的实现。
