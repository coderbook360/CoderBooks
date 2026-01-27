# patchUnkeyedChildren 无 key 子节点更新

`patchUnkeyedChildren` 处理没有 key 的子节点列表更新。它按索引一一对应更新。

## 函数签名

```typescript
const patchUnkeyedChildren = (
  c1: VNode[],
  c2: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => { ... }
```

## 实现

```typescript
const patchUnkeyedChildren = (
  c1,
  c2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized
) => {
  c1 = c1 || EMPTY_ARR
  c2 = c2 || EMPTY_ARR
  const oldLength = c1.length
  const newLength = c2.length
  const commonLength = Math.min(oldLength, newLength)
  
  let i
  // 1. 更新公共部分
  for (i = 0; i < commonLength; i++) {
    const nextChild = (c2[i] = optimized
      ? cloneIfMounted(c2[i] as VNode)
      : normalizeVNode(c2[i]))
    patch(
      c1[i],
      nextChild,
      container,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  }
  
  // 2. 处理长度差异
  if (oldLength > newLength) {
    // 旧的多，卸载多余的
    unmountChildren(
      c1,
      parentComponent,
      parentSuspense,
      true,
      false,
      commonLength
    )
  } else {
    // 新的多，挂载新增的
    mountChildren(
      c2,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized,
      commonLength
    )
  }
}
```

## 算法流程

### 步骤 1：更新公共部分

```typescript
// 旧: [A, B, C]
// 新: [A', B', D, E]

// commonLength = 3
// 更新 A→A', B→B', C→D
for (i = 0; i < commonLength; i++) {
  patch(c1[i], c2[i], ...)
}
```

### 步骤 2：处理差异

```typescript
if (oldLength > newLength) {
  // 卸载多余的旧节点
  unmountChildren(c1, ..., commonLength)
} else {
  // 挂载新增的节点
  mountChildren(c2, ..., commonLength)
}
```

## 示例分析

### 新增节点

```typescript
// 旧: [A, B]
// 新: [A, B, C, D]

// 1. 更新公共部分 (0, 1)
patch(A, A', ...)
patch(B, B', ...)

// 2. 挂载新增 (2, 3)
mount(C, ...)
mount(D, ...)
```

### 删除节点

```typescript
// 旧: [A, B, C, D]
// 新: [A, B]

// 1. 更新公共部分 (0, 1)
patch(A, A', ...)
patch(B, B', ...)

// 2. 卸载多余 (2, 3)
unmount(C)
unmount(D)
```

### 替换节点

```typescript
// 旧: [A, B, C]
// 新: [D, E, F]

// 全部更新（类型可能不同，会触发替换）
patch(A, D, ...)  // 如果类型不同，unmount A, mount D
patch(B, E, ...)
patch(C, F, ...)
```

## 无 key 的问题

### 无法识别移动

```typescript
// 期望：在开头插入 X
// 旧: [A, B, C]
// 新: [X, A, B, C]

// 实际执行：
patch(A, X, ...)  // A 变成 X
patch(B, A, ...)  // B 变成 A
patch(C, B, ...)  // C 变成 B
mount(C, ...)     // 新增 C

// 导致 4 次 DOM 操作，而有 key 只需要 1 次（插入 X）
```

### 状态丢失

组件状态绑定在 VNode 实例上：

```typescript
// 旧: [CompA, CompB]
// 新: [CompB, CompA]

// 按索引更新，CompA 的状态会"转移"到 CompB
patch(CompA, CompB, ...)  // CompA 实例更新为 CompB 的 props
```

## 使用场景

### 适合无 key

- 静态列表，不会重排
- 简单内容，无组件状态

```html
<li v-for="item in items">{{ item }}</li>
<!-- 如果 items 只在末尾增删，无 key 可以 -->
```

### 必须有 key

- 列表可能重排
- 包含有状态组件
- 需要过渡动画

```html
<li v-for="item in items" :key="item.id">
  <ItemComponent :item="item" />
</li>
```

## 性能特性

| 操作 | 时间复杂度 |
|------|------------|
| 更新公共部分 | O(min(m, n)) |
| 卸载多余 | O(m - n) |
| 挂载新增 | O(n - m) |
| 总体 | O(max(m, n)) |

算法简单但可能产生不必要的 DOM 操作。

## 与 keyed 对比

```typescript
// 列表：[A, B, C] -> [C, A, B]

// Unkeyed：3 次 patch（每个位置都变了）
patch(A, C, ...)  // 位置 0: A → C
patch(B, A, ...)  // 位置 1: B → A
patch(C, B, ...)  // 位置 2: C → B

// Keyed：只需移动 C
// 识别出 C 需要移动到开头
move(C, container, A.el)
```

## 编译器标记

编译器为无 key 的 v-for 添加 UNKEYED_FRAGMENT：

```typescript
// 模板: <div v-for="item in list">
createVNode(Fragment, null, children, PatchFlags.UNKEYED_FRAGMENT)
```

## 开发模式警告

```typescript
if (__DEV__) {
  // v-for 无 key 警告（仅当含组件时）
  if (hasComponent) {
    warn(
      `v-for with no key may cause issues when working with components`
    )
  }
}
```

## 小结

`patchUnkeyedChildren` 是简单的按索引更新算法。它处理公共部分后，增删末尾差异。算法简单但无法识别移动，可能导致多余操作和状态问题。建议给 v-for 添加 key 以使用更高效的 keyed diff。
