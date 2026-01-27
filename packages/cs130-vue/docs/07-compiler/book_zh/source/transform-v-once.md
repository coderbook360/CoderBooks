# transformVOnce 一次性渲染

v-once 指令用于标记元素只渲染一次，后续更新时跳过，可以优化静态内容的性能。

## 核心实现

```typescript
export const transformOnce: NodeTransform = (node, context) => {
  if (node.type === NodeTypes.ELEMENT && findDir(node, 'once', true)) {
    if (seen.has(node) || context.inVOnce) {
      return
    }
    seen.add(node)
    context.inVOnce = true
    context.helper(SET_BLOCK_TRACKING)
    
    return () => {
      context.inVOnce = false
      const cur = context.currentNode as ElementNode
      if (cur.codegenNode) {
        cur.codegenNode = context.cache(cur.codegenNode, true)
      }
    }
  }
}
```

transformVOnce 将节点的 codegenNode 包装为缓存表达式。

## 缓存表达式

```typescript
interface CacheExpression extends Node {
  type: NodeTypes.JS_CACHE_EXPRESSION
  index: number
  value: JSChildNode
  isVNode: boolean
}

function cache(exp: JSChildNode, isVNode = false): CacheExpression {
  return {
    type: NodeTypes.JS_CACHE_EXPRESSION,
    index: context.cached++,
    value: exp,
    isVNode
  }
}
```

## 生成代码

```html
<div v-once>Static Content</div>
```

```typescript
// 生成代码
_cache[0] || (
  _setBlockTracking(-1),
  _cache[0] = _createElementVNode("div", null, "Static Content"),
  _setBlockTracking(1),
  _cache[0]
)
```

首次渲染时创建 VNode 并缓存，后续直接使用缓存值。

## setBlockTracking

```typescript
export function setBlockTracking(value: number) {
  isBlockTreeEnabled += value
}

// 在 v-once 渲染时
setBlockTracking(-1)  // 禁用 Block 追踪
// ... 渲染 v-once 内容
setBlockTracking(1)   // 恢复 Block 追踪
```

禁用 Block 追踪可以防止 v-once 内容被加入动态子节点列表。

## 嵌套处理

```typescript
// 检测嵌套的 v-once
if (context.inVOnce) {
  return  // 已在 v-once 中，跳过处理
}

// 标记进入 v-once 作用域
context.inVOnce = true
// ... 处理
context.inVOnce = false
```

嵌套的 v-once 不需要额外处理，外层的缓存已经涵盖了内层内容。

## 与组件配合

```html
<MyComponent v-once :data="staticData" />
```

```typescript
_cache[0] || (
  _setBlockTracking(-1),
  _cache[0] = _createVNode(MyComponent, { data: staticData }),
  _setBlockTracking(1),
  _cache[0]
)
```

组件上的 v-once 会缓存整个组件 VNode，组件不会重新渲染。

## 包含动态内容

```html
<div v-once>
  {{ message }}
  <span :class="cls">Text</span>
</div>
```

即使内部有动态内容，v-once 也只渲染一次。这是一种明确的优化选择，开发者需要确保这些值在首次渲染后不需要更新。

## 条件与循环

```html
<!-- v-once 与 v-if 配合 -->
<div v-if="show" v-once>Content</div>

<!-- v-once 与 v-for 配合 -->
<div v-for="item in list" v-once :key="item.id">
  {{ item.name }}
</div>
```

v-once 在这些场景下也会缓存渲染结果，但需要注意列表变化时的行为。

## 缓存索引

```typescript
// 编译时分配缓存索引
context.cached++

// 运行时缓存数组
const _cache = instance.renderCache

// 访问缓存
_cache[0]  // 第一个 v-once
_cache[1]  // 第二个 v-once
```

每个 v-once 都有唯一的缓存索引。

## 性能考虑

```typescript
// 适用场景
// - 大量静态内容
// - 初始化后不变的数据
// - 复杂但稳定的计算结果

// 不适用场景
// - 需要响应式更新的内容
// - 依赖于变化的 props
```

v-once 是一种显式的优化手段，使用时需要确保内容确实不需要更新。

## 小结

transformVOnce 的机制：

1. **缓存包装**：将 codegenNode 转为 CacheExpression
2. **Block 追踪控制**：渲染时禁用追踪
3. **运行时缓存**：使用组件实例的 renderCache
4. **一次性语义**：明确表示内容不会更新

下一章将分析 transformVMemo 缓存节点转换。
