# createVNode 创建虚拟节点

`createVNode` 是 Vue 3 创建 VNode 的核心函数。它被 `h` 函数调用，也被编译器生成的代码直接使用。

## 函数签名

```typescript
function createVNode(
  type: VNodeTypes,
  props?: (Data & VNodeProps) | null,
  children?: unknown,
  patchFlag?: number,
  dynamicProps?: string[] | null,
  isBlockNode?: boolean
): VNode
```

后三个参数是编译优化相关的，手写渲染函数通常不传。

## VNode 结构

```typescript
interface VNode {
  __v_isVNode: true
  type: VNodeTypes
  props: VNodeProps | null
  key: Key | null
  ref: VNodeNormalizedRef | null
  scopeId: string | null
  slotScopeIds: string[] | null
  children: VNodeNormalizedChildren
  component: ComponentInternalInstance | null
  dirs: DirectiveBinding[] | null
  el: HostElement | null
  anchor: HostNode | null  // Fragment 的结束锚点
  target: HostElement | null  // Teleport 的目标
  shapeFlag: number
  patchFlag: number
  dynamicProps: string[] | null
  dynamicChildren: VNode[] | null
  appContext: AppContext | null
}
```

## 实现分析

```typescript
function _createVNode(
  type: VNodeTypes,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  // 1. 处理无效类型
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (__DEV__ && !type) {
      warn('Invalid vnode type when creating vnode')
    }
    type = Comment
  }
  
  // 2. 如果 type 已经是 VNode，克隆它
  if (isVNode(type)) {
    const cloned = cloneVNode(type, props)
    if (children) {
      normalizeChildren(cloned, children)
    }
    return cloned
  }
  
  // 3. 类组件处理
  if (isClassComponent(type)) {
    type = type.__vccOpts
  }
  
  // 4. 规范化 props
  if (props) {
    props = guardReactiveProps(props)
    let { class: klass, style } = props
    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass)
    }
    if (isObject(style)) {
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
      props.style = normalizeStyle(style)
    }
  }
  
  // 5. 确定 shapeFlag
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isSuspense(type)
      ? ShapeFlags.SUSPENSE
      : isTeleport(type)
        ? ShapeFlags.TELEPORT
        : isObject(type)
          ? ShapeFlags.STATEFUL_COMPONENT
          : isFunction(type)
            ? ShapeFlags.FUNCTIONAL_COMPONENT
            : 0
  
  // 6. 创建 VNode 对象
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode
  )
}
```

## createBaseVNode

实际创建 VNode 对象的函数：

```typescript
function createBaseVNode(
  type,
  props,
  children,
  patchFlag,
  dynamicProps,
  shapeFlag,
  isBlockNode,
  needFullChildrenNormalization
) {
  const vnode: VNode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null
  }
  
  // 规范化 children
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children)
  } else if (children) {
    // 快速路径：children 已知类型
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }
  
  // Block 收集
  if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock && patchFlag > 0) {
    currentBlock.push(vnode)
  }
  
  return vnode
}
```

## ShapeFlag 计算

ShapeFlag 标记 VNode 的类型，用于后续渲染时快速判断：

```typescript
// 元素
type = 'div' -> ShapeFlags.ELEMENT (1)

// 有状态组件
type = { setup() {} } -> ShapeFlags.STATEFUL_COMPONENT (4)

// 函数式组件
type = (props) => h('div') -> ShapeFlags.FUNCTIONAL_COMPONENT (2)

// Teleport
type = Teleport -> ShapeFlags.TELEPORT (64)

// Suspense
type = Suspense -> ShapeFlags.SUSPENSE (128)
```

children 类型也会合并到 shapeFlag：

```typescript
children = 'text' -> shapeFlag |= ShapeFlags.TEXT_CHILDREN (8)
children = [vnode1, vnode2] -> shapeFlag |= ShapeFlags.ARRAY_CHILDREN (16)
children = { default: () => [] } -> shapeFlag |= ShapeFlags.SLOTS_CHILDREN (32)
```

## Props 规范化

class 和 style 需要规范化处理：

```typescript
// class 规范化
normalizeClass(['a', { b: true, c: false }])
// -> 'a b'

// style 规范化
normalizeStyle([{ color: 'red' }, { fontSize: '14px' }])
// -> { color: 'red', fontSize: '14px' }
```

响应式 props 需要解包：

```typescript
function guardReactiveProps(props) {
  if (!props) return null
  return isProxy(props) || InternalObjectKey in props
    ? extend({}, props)
    : props
}
```

## Key 提取

key 从 props 中提取并单独存储：

```typescript
function normalizeKey({ key }) {
  return key != null ? key : null
}

// 同时从 props 中删除
if (props) {
  // key 和 ref 不传递给元素
  delete props.key
  delete props.ref
}
```

## Ref 规范化

ref 可以是字符串、函数或 Ref 对象：

```typescript
function normalizeRef({ ref, ref_key, ref_for }) {
  return ref != null
    ? isString(ref) || isRef(ref) || isFunction(ref)
      ? { i: currentRenderingInstance, r: ref, k: ref_key, f: !!ref_for }
      : ref
    : null
}
```

`i` 是当前渲染的组件实例，`r` 是 ref 值，`k` 是 ref_key（v-for 中使用），`f` 标记是否在 v-for 中。

## Block 收集

当 Block 追踪开启且有 patchFlag 时，VNode 会被收集：

```typescript
if (
  isBlockTreeEnabled > 0 &&  // Block 追踪已开启
  !isBlockNode &&            // 不是 Block 自身
  currentBlock &&            // 当前有 Block
  patchFlag > 0              // 有动态标记
) {
  currentBlock.push(vnode)
}
```

这是 Block Tree 优化的关键——动态节点自动收集到最近的 Block。

## 开发模式验证

开发模式下会验证 VNode：

```typescript
if (__DEV__) {
  // 检查无效的 props key
  for (const key in props) {
    if (!isReservedProp(key) && !isValidPropKey(key)) {
      warn(`Invalid prop name: "${key}"`)
    }
  }
  
  // 检查组件类型
  if (isObject(type) && !type.setup && !type.render && !type.template) {
    warn('Component is missing template or render function')
  }
}
```

## 与 h 函数的关系

`h` 函数处理参数变体后调用 `createVNode`：

```typescript
function h(type, propsOrChildren, children) {
  // ... 参数处理
  return createVNode(type, props, children)
}
```

编译器生成的代码直接使用 `createVNode` 并传入优化参数：

```typescript
// 编译生成
createVNode('div', { id: 'app' }, toDisplayString(msg), 1 /* TEXT */)
```

## 小结

`createVNode` 是 VNode 创建的核心，它：
1. 验证和规范化输入
2. 计算 shapeFlag
3. 规范化 props（class、style）
4. 提取 key 和 ref
5. 参与 Block 收集（如有 patchFlag）

理解 VNode 的创建过程，有助于理解后续的 patch 和 diff 流程。
