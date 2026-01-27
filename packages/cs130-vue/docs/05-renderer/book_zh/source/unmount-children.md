# unmountChildren 子节点卸载

`unmountChildren` 遍历子节点数组，逐个调用 unmount 进行卸载。

## 函数签名

```typescript
const unmountChildren: UnmountChildrenFn = (
  children: VNode[],
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  doRemove: boolean = false,
  optimized: boolean = false,
  start: number = 0
) => { ... }
```

## 实现

```typescript
const unmountChildren: UnmountChildrenFn = (
  children,
  parentComponent,
  parentSuspense,
  doRemove = false,
  optimized = false,
  start = 0
) => {
  for (let i = start; i < children.length; i++) {
    unmount(children[i], parentComponent, parentSuspense, doRemove, optimized)
  }
}
```

## 参数说明

### children

子节点数组，已规范化为 VNode[]。

### doRemove

是否移除 DOM：
- `true`：父节点不会被移除，子节点需要单独移除
- `false`：父节点会被移除，子节点随之消失

```typescript
// 场景1：替换子节点
unmountChildren(oldChildren, ..., true)  // 需要移除旧子节点
mountChildren(newChildren, container, ...)

// 场景2：卸载父元素
unmount(parentVNode, ..., true)  // 移除父
// 子节点内部调用
unmountChildren(children, ..., false)  // 子不需要单独移除
```

### optimized

是否使用 Block 优化：
- `true`：配合 dynamicChildren
- `false`：遍历所有子节点

### start

起始索引，用于部分卸载：

```typescript
// patchUnkeyedChildren 中
if (oldLength > newLength) {
  unmountChildren(c1, ..., true, false, commonLength)
  // 只卸载 commonLength 之后的节点
}
```

## 使用场景

### patchChildren

子节点类型变化时：

```typescript
// 数组 -> 文本
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    unmountChildren(c1, parentComponent, parentSuspense)
  }
  hostSetElementText(container, c2)
}

// 数组 -> 空
if (i > e2) {
  while (i <= e1) {
    unmount(c1[i], ...)
    i++
  }
}
```

### patchUnkeyedChildren

卸载多余的旧节点：

```typescript
if (oldLength > newLength) {
  unmountChildren(
    c1,
    parentComponent,
    parentSuspense,
    true,   // doRemove
    false,  // optimized
    commonLength  // 从 commonLength 开始
  )
}
```

### unmount 内部

元素有数组子节点时：

```typescript
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  unmountChildren(
    children as VNode[],
    parentComponent,
    parentSuspense,
    false,  // 父节点会移除，子不需要
    optimized
  )
}
```

### processFragment

Fragment 卸载：

```typescript
// Fragment 的子节点
unmountChildren(
  vnode.children as VNode[],
  parentComponent,
  parentSuspense,
  true  // Fragment 子节点需要单独移除
)
// 然后移除边界标记
hostRemove(vnode.el!)
hostRemove(vnode.anchor!)
```

## 递归卸载

unmountChildren 通过 unmount 递归处理嵌套结构：

```typescript
// 父元素
unmount(div)
  └── unmountChildren([span, p])
        ├── unmount(span)
        │     └── unmountChildren([text])
        └── unmount(p)
              └── unmountChildren([...])
```

## 性能考虑

### 避免重复 DOM 操作

```typescript
// 错误：每个子节点都 removeChild
for (child of children) {
  parent.removeChild(child.el)
}

// 正确：只移除父节点
parent.removeChild(el)
// 子节点随之消失，无需单独操作
```

### Block 优化

使用 dynamicChildren 时只卸载动态节点：

```typescript
if (dynamicChildren) {
  unmountChildren(dynamicChildren, ..., false, true)
}
```

静态节点随父节点一起移除。

## 生命周期触发

每个子节点的卸载都会触发相应的生命周期：

```typescript
// 遍历过程
children[0] -> unmount -> beforeUnmount, unmounted
children[1] -> unmount -> beforeUnmount, unmounted
children[2] -> unmount -> beforeUnmount, unmounted
```

顺序保证：
1. 所有 beforeUnmount 先执行（同步）
2. DOM 移除
3. 所有 unmounted 后执行（异步）

## 错误处理

单个子节点卸载失败不阻塞其他：

```typescript
for (let i = start; i < children.length; i++) {
  try {
    unmount(children[i], ...)
  } catch (e) {
    // 错误处理
  }
}
```

实际 Vue 使用 callWithAsyncErrorHandling 统一处理。

## 与 mountChildren 对称

```typescript
// 挂载
mountChildren(children, container, anchor, ...)

// 卸载
unmountChildren(children, parentComponent, parentSuspense, ...)
```

参数略有不同但结构对称。

## 小结

`unmountChildren` 是简单但关键的函数，遍历子节点调用 unmount。通过 doRemove 参数避免重复 DOM 操作，通过 start 参数支持部分卸载。它是卸载流程中处理数组子节点的基础。
