# isSameVNodeType 类型判断

`isSameVNodeType` 判断两个 VNode 是否是"同一个"节点，决定是否可以复用。

## 函数签名

```typescript
function isSameVNodeType(n1: VNode, n2: VNode): boolean
```

## 实现

```typescript
function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  if (
    __DEV__ &&
    n2.shapeFlag & ShapeFlags.COMPONENT &&
    hmrDirtyComponents.has(n2.type as ConcreteComponent)
  ) {
    // HMR：组件变化时强制更新
    return false
  }
  return n1.type === n2.type && n1.key === n2.key
}
```

核心逻辑只有一行：

```typescript
return n1.type === n2.type && n1.key === n2.key
```

## 判断条件

### type 相同

```typescript
// 元素
n1.type === 'div' && n2.type === 'div'  // true

// 组件
n1.type === MyComponent && n2.type === MyComponent  // true

// 不同类型
n1.type === 'div' && n2.type === 'span'  // false
```

### key 相同

```typescript
// 都无 key
n1.key === undefined && n2.key === undefined  // true

// key 相同
n1.key === 'item-1' && n2.key === 'item-1'  // true

// key 不同
n1.key === 'item-1' && n2.key === 'item-2'  // false
```

## 使用场景

### patch 入口

```typescript
const patch = (n1, n2, container, ...) => {
  // 类型不同，完全替换
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1, ...)
    n1 = null  // 变为挂载
  }
  // ...
}
```

### patchKeyedChildren

在 keyed diff 中匹配节点：

```typescript
// 头部同步
while (i <= e1 && i <= e2) {
  if (isSameVNodeType(c1[i], c2[i])) {
    patch(c1[i], c2[i], ...)
  } else {
    break
  }
  i++
}
```

### patchUnkeyedChildren

无 key 时查找匹配：

```typescript
for (j = s2; j <= e2; j++) {
  if (
    newIndexToOldIndexMap[j - s2] === 0 &&
    isSameVNodeType(prevChild, c2[j])
  ) {
    newIndex = j
    break
  }
}
```

## 为什么需要 key

### 无 key 的问题

```typescript
// 旧: [<div>A</div>, <div>B</div>]
// 新: [<div>B</div>, <div>A</div>]

// 都是 div，type 相同，key 都是 undefined
isSameVNodeType(old[0], new[0])  // true
isSameVNodeType(old[1], new[1])  // true

// 结果：直接 patch，不移动
// old[0] 的内容从 A 变成 B
// old[1] 的内容从 B 变成 A
```

### 有 key 的正确行为

```typescript
// 旧: [<div key="a">A</div>, <div key="b">B</div>]
// 新: [<div key="b">B</div>, <div key="a">A</div>]

isSameVNodeType(old[0], new[0])  // false (key 不同)
// 识别出需要移动
```

## type 的可能值

```typescript
// 字符串（元素）
type: 'div'
type: 'span'
type: 'svg'

// Symbol（内置类型）
type: Text      // Symbol('Text')
type: Comment   // Symbol('Comment')
type: Fragment  // Symbol('Fragment')
type: Static    // Symbol('Static')

// 对象（组件）
type: { name: 'MyComponent', setup() {...} }

// 函数（函数式组件）
type: (props) => h('div', props.msg)
```

## key 的可能值

```typescript
// undefined（无 key）
key: undefined

// 字符串
key: 'item-1'
key: 'header'

// 数字
key: 0
key: 1

// Symbol
key: Symbol('unique')
```

## HMR 处理

开发模式下，热更新的组件强制不匹配：

```typescript
if (__DEV__ && hmrDirtyComponents.has(n2.type)) {
  return false
}
```

这确保组件变化后完全重新挂载。

## 边界情况

### null key vs undefined key

```typescript
// 都视为无 key，相等
n1.key === null
n2.key === undefined
// null === undefined -> false

// 但实际 Vue 中 key 为 null 时规范化为 undefined
```

### 同一个组件实例

```typescript
const comp = defineComponent({ ... })

// 相同引用，type 相同
n1.type === comp
n2.type === comp  // true
```

### 动态组件

```typescript
// 组件切换时 type 变化
<component :is="currentComponent">

// currentComponent 变化会导致 type 变化
isSameVNodeType(oldVNode, newVNode)  // false
```

## 性能考虑

`isSameVNodeType` 是 O(1) 操作：
- `n1.type === n2.type`：引用比较
- `n1.key === n2.key`：通常是原始值比较

## 与 React 的对比

React 的 reconciler 使用类似逻辑：

```javascript
// React
function shouldConstruct(Component) {
  return Component.prototype && Component.prototype.isReactComponent
}
```

Vue 的实现更简洁，依赖 type 和 key 两个属性。

## 小结

`isSameVNodeType` 通过比较 type 和 key 判断节点是否"相同"。相同的节点可以复用 DOM，只需更新属性和子节点；不同的节点需要卸载旧的、挂载新的。key 是区分同类型节点的关键，特别是在列表渲染中。
