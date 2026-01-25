# mountChildren 子节点挂载

`mountChildren` 遍历子节点数组，逐个挂载到容器中。这是处理多子节点的基础函数。

## 函数签名

```typescript
const mountChildren: MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  start: number = 0
) => { ... }
```

## 实现

```typescript
const mountChildren: MountChildrenFn = (
  children,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized,
  start = 0
) => {
  for (let i = start; i < children.length; i++) {
    // 规范化 child
    const child = (children[i] = optimized
      ? cloneIfMounted(children[i] as VNode)
      : normalizeVNode(children[i]))
    
    // 递归 patch（挂载）
    patch(
      null,        // n1 为 null，表示挂载
      child,
      container,
      anchor,
      parentComponent,
      parentSuspense,
      isSVG,
      slotScopeIds,
      optimized
    )
  }
}
```

## 执行流程

```typescript
const children = [vnode1, vnode2, vnode3]
mountChildren(children, container, null, ...)

// 循环执行：
// patch(null, vnode1, container) -> 挂载 vnode1
// patch(null, vnode2, container) -> 挂载 vnode2
// patch(null, vnode3, container) -> 挂载 vnode3
```

## 规范化处理

### 非优化模式

使用 `normalizeVNode` 处理各种类型：

```typescript
const child = (children[i] = normalizeVNode(children[i]))
```

支持的类型：
- VNode：直接使用
- string/number：转为 Text VNode
- null/undefined/boolean：转为 Comment VNode
- 数组：转为 Fragment VNode

### 优化模式

使用 `cloneIfMounted` 处理已挂载的 VNode：

```typescript
const child = (children[i] = cloneIfMounted(children[i] as VNode))
```

```typescript
function cloneIfMounted(child: VNode): VNode {
  return child.el === null ? child : cloneVNode(child)
}
```

已挂载的 VNode 有 el 引用，需要克隆避免状态污染。

## 就地修改

注意数组是就地修改的：

```typescript
children[i] = normalizeVNode(children[i])
```

这避免了创建新数组的开销。

## start 参数

从指定索引开始挂载：

```typescript
mountChildren(children, container, anchor, ..., 3)
// 从 children[3] 开始挂载
```

用于 patchChildren 中跳过已处理的节点。

## 使用场景

### mountElement

挂载元素的数组子节点：

```typescript
const mountElement = (vnode, container, ...) => {
  const el = hostCreateElement(vnode.type)
  
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(
      vnode.children,
      el,        // 父元素作为容器
      null,      // 无锚点，appendChild
      ...
    )
  }
  
  hostInsert(el, container, anchor)
}
```

### processFragment

挂载 Fragment 子节点：

```typescript
const processFragment = (n1, n2, container, ...) => {
  if (n1 == null) {
    hostInsert(fragmentStartAnchor, container, anchor)
    hostInsert(fragmentEndAnchor, container, anchor)
    
    mountChildren(
      n2.children,
      container,
      fragmentEndAnchor,  // end 锚点前插入
      ...
    )
  }
}
```

### patchChildren

新增子节点时：

```typescript
const patchKeyedChildren = (c1, c2, container, ...) => {
  // ... diff 算法 ...
  
  if (i > e1) {
    // 有新增节点
    if (i <= e2) {
      const anchor = c2[e2 + 1]?.el
      while (i <= e2) {
        patch(null, c2[i], container, anchor, ...)
        i++
      }
    }
  }
}
```

## 锚点的作用

锚点决定插入位置：

```typescript
// anchor 为 null
mountChildren(children, container, null, ...)
// 每个 child appendChild 到 container 末尾

// anchor 有值
mountChildren(children, container, anchorNode, ...)
// 每个 child insertBefore(anchorNode)
```

## 递归深度

mountChildren 通过 patch 递归处理嵌套结构：

```typescript
// 父元素
mountElement(div)
  └── mountChildren([span, p])
        ├── patch(null, span)
        │     └── mountElement(span)
        │           └── mountChildren([text])
        │                 └── patch(null, text)
        └── patch(null, p)
              └── mountElement(p)
```

## 错误处理

单个子节点挂载失败不阻塞其他：

```typescript
for (let i = start; i < children.length; i++) {
  try {
    const child = normalizeVNode(children[i])
    patch(null, child, container, ...)
  } catch (e) {
    // 错误处理，不中断循环
    handleError(e, parentComponent, ErrorCodes.RENDER_FUNCTION)
  }
}
```

实际上 Vue 使用 errorHandling 模块统一处理。

## 性能考虑

### 避免频繁 DOM 操作

元素在内存中构建完整后一次插入：

```typescript
// mountElement 中
const el = hostCreateElement(type)
mountChildren(children, el, ...)  // 子节点挂载到 el（内存）
hostInsert(el, container)         // el 插入到真实 DOM
```

### 大量子节点

大量子节点时考虑使用 Fragment 或虚拟滚动：

```typescript
// 1000 个子节点
mountChildren(hugeChildren, container, ...)
// 会阻塞主线程
```

## 类型定义

```typescript
type VNodeArrayChildren = Array<VNodeChild>

type VNodeChild =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | VNodeArrayChildren

type MountChildrenFn = (
  children: VNodeArrayChildren,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean,
  start?: number
) => void
```

## 小结

`mountChildren` 遍历子节点数组，规范化后逐个调用 patch 挂载。它是处理多子节点的基础，被 mountElement、processFragment 等函数使用。通过就地修改数组和规范化处理，支持多种类型的子节点。
