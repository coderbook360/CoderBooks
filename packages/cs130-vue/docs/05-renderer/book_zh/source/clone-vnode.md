# cloneVNode 克隆

`cloneVNode` 创建 VNode 的浅拷贝，用于复用现有 VNode 结构同时添加额外属性。

## 函数签名

```typescript
function cloneVNode<T extends VNode>(
  vnode: T,
  extraProps?: Data | null,
  mergeRef?: boolean
): T
```

参数说明：
- `vnode`：要克隆的源 VNode
- `extraProps`：要合并的额外属性
- `mergeRef`：是否合并 ref（默认 false）

## 实现

```typescript
function cloneVNode<T extends VNode>(
  vnode: T,
  extraProps?: Data | null,
  mergeRef = false
): T {
  const { props, ref, patchFlag, children } = vnode
  
  // 合并 props
  const mergedProps = extraProps
    ? mergeProps(props || {}, extraProps)
    : props
  
  // 创建克隆
  const cloned: T = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref: extraProps && extraProps.ref
      ? mergeRef && ref
        ? isArray(ref)
          ? ref.concat(normalizeRef(extraProps))
          : [ref, normalizeRef(extraProps)]
        : normalizeRef(extraProps)
      : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children: children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    patchFlag: extraProps && vnode.type !== Fragment
      ? patchFlag === -1
        ? PatchFlags.FULL_PROPS
        : patchFlag | PatchFlags.FULL_PROPS
      : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition: vnode.transition,
    
    // 重要：不复制 DOM 引用
    el: null,
    anchor: null,
    
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
  }
  
  return cloned
}
```

## 克隆策略

### 浅拷贝

只复制第一层属性，children 和 props 是引用：

```typescript
const cloned = cloneVNode(original)
cloned.children === original.children // true
cloned.props === original.props // false（如果有 extraProps）
```

### 清除实例引用

克隆时清除与 DOM 相关的引用：

```typescript
el: null,
anchor: null,
component: null,
suspense: null,
```

这确保克隆的 VNode 是"干净"的，可以独立挂载。

### patchFlag 处理

添加 extraProps 时更新 patchFlag：

```typescript
patchFlag: extraProps && vnode.type !== Fragment
  ? patchFlag === -1
    ? PatchFlags.FULL_PROPS
    : patchFlag | PatchFlags.FULL_PROPS
  : patchFlag,
```

如果是静态节点（-1），变为 FULL_PROPS。否则添加 FULL_PROPS 标记。

## 使用场景

### cloneIfMounted

规范化时避免复用已挂载的 VNode：

```typescript
function cloneIfMounted(child: VNode): VNode {
  return child.el === null ? child : cloneVNode(child)
}
```

### v-for 与 key

编译器为 v-for 中的元素添加 key：

```typescript
// 模板
<div v-for="item in list" :key="item.id">

// 编译为
_renderList(list, (item) => {
  return _cloneVNode(_hoisted_1, { key: item.id })
})
```

### 动态组件

动态组件切换时克隆 VNode：

```typescript
function renderDynamicComponent(comp: Component, props: Data) {
  const vnode = createVNode(comp)
  if (props) {
    return cloneVNode(vnode, props)
  }
  return vnode
}
```

### 静态提升

静态 VNode 复用时需要克隆：

```typescript
const _hoisted_1 = createVNode('div', null, 'static')

function render() {
  // 每次渲染返回克隆
  return cloneVNode(_hoisted_1)
}
```

## ref 合并

当 mergeRef 为 true 时，合并新旧 ref：

```typescript
const vnode = h('div', { ref: ref1 })
const cloned = cloneVNode(vnode, { ref: ref2 }, true)
// cloned.ref = [ref1, ref2]
```

实现逻辑：

```typescript
ref: extraProps && extraProps.ref
  ? mergeRef && ref
    ? isArray(ref)
      ? ref.concat(normalizeRef(extraProps))
      : [ref, normalizeRef(extraProps)]
    : normalizeRef(extraProps)
  : ref,
```

## 与 createVNode 的区别

| 特性 | createVNode | cloneVNode |
|------|-------------|------------|
| 创建新结构 | 是 | 否 |
| 规范化 children | 是 | 否 |
| 计算 shapeFlag | 是 | 复制 |
| 用途 | 初始创建 | 复用修改 |

## 性能优势

克隆比创建新 VNode 更快：

1. **跳过 children 处理**：直接复制引用
2. **跳过 shapeFlag 计算**：直接复制
3. **跳过类型检测**：已知是 VNode

```typescript
// 创建新的 - 较慢
createVNode('div', newProps, children)

// 克隆修改 - 较快
cloneVNode(existingVNode, newProps)
```

## 开发模式检查

```typescript
if (__DEV__ && vnode.el) {
  warn(
    `VNode is already mounted. Clone it if you want to reuse.`
  )
}
```

## 不可变原则

克隆体现了 VNode 的不可变原则：

```typescript
// 错误：直接修改
vnode.props.class = 'new'

// 正确：克隆修改
const newVnode = cloneVNode(vnode, { class: 'new' })
```

## 小结

`cloneVNode` 是复用 VNode 结构的关键函数，通过浅拷贝创建独立副本。它清除 DOM 引用确保安全复用，支持 props 合并和 ref 合并，是静态提升和 v-for 优化的基础。
