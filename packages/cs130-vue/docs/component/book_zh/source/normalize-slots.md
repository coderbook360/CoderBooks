# normalizeSlots 插槽规范化

编译器产出的插槽对象有特定结构，而手写的 render 函数可能传入各种形式的插槽内容。`normalizeSlots` 负责将这些不同形式统一规范化为标准格式。

## 插槽的多种形式

插槽可以有多种写法：

```javascript
// 形式一：函数形式（推荐）
h(Comp, null, {
  default: () => h('span', 'Hello'),
  header: () => h('div', 'Header')
})

// 形式二：直接内容
h(Comp, null, {
  default: h('span', 'Hello')  // 不是函数
})

// 形式三：数组内容
h(Comp, null, {
  default: [h('p', 'Line 1'), h('p', 'Line 2')]
})

// 形式四：默认插槽简写
h(Comp, null, () => h('span', 'Hello'))

// 形式五：直接子节点
h(Comp, null, [h('span', 'Child 1'), h('span', 'Child 2')])
```

## 规范化目标

无论输入形式如何，最终规范化为：

```typescript
interface NormalizedSlots {
  [name: string]: Slot
}

type Slot = (...args: any[]) => VNode[]
```

每个插槽都是一个返回 VNode 数组的函数。

## normalizeObjectSlots

处理对象形式的插槽：

```typescript
const normalizeObjectSlots = (
  rawSlots: RawSlots,
  slots: InternalSlots,
  instance: ComponentInternalInstance
) => {
  const ctx = rawSlots._ctx
  
  for (const key in rawSlots) {
    // 跳过内部属性
    if (isInternalKey(key)) continue
    
    const value = rawSlots[key]
    
    if (isFunction(value)) {
      // 已经是函数，规范化包装
      slots[key] = normalizeSlot(key, value, ctx)
    } else if (value != null) {
      // 静态内容，转换为函数
      const normalized = normalizeSlotValue(value)
      slots[key] = () => normalized
    }
  }
}
```

这里的关键是区分函数和非函数形式。非函数形式需要包装成函数。

## isInternalKey

判断是否是内部属性：

```typescript
const isInternalKey = (key: string) => key[0] === '_' || key === '$stable'
```

以 `_` 开头的属性和 `$stable` 是内部使用的：
- `_`: 插槽类型标记
- `_ctx`: 上下文引用
- `$stable`: 稳定性标记

## normalizeSlot

包装插槽函数：

```typescript
const normalizeSlot = (
  key: string,
  rawSlot: Function,
  ctx: ComponentInternalInstance | null | undefined
): Slot => {
  if ((rawSlot as any)._n) {
    // 已经规范化过
    return rawSlot as Slot
  }
  
  const normalized = withCtx((...args: any[]) => {
    // 开发环境警告
    if (__DEV__ && currentInstance) {
      warn(
        `Slot "${key}" invoked outside of the render function: ` +
          `this will not track dependencies used in the slot. ` +
          `Invoke the slot function inside the render function instead.`
      )
    }
    return normalizeSlotValue(rawSlot(...args))
  }, ctx) as Slot
  
  // 标记已规范化
  ;(normalized as any)._n = true
  
  return normalized
}
```

`withCtx` 确保插槽在正确的组件上下文中渲染。

## withCtx

上下文包装器：

```typescript
export function withCtx(
  fn: Function,
  ctx: ComponentInternalInstance | null = currentRenderingInstance,
  isNonScopedSlot?: boolean
) {
  if (!ctx) return fn
  
  if ((fn as any)._n) {
    return fn
  }
  
  const renderFnWithContext = (...args: any[]) => {
    if (renderFnWithContext._d) {
      // 禁用依赖收集
      setBlockTracking(-1)
    }
    
    const prevInstance = setCurrentRenderingInstance(ctx)
    let res: any
    try {
      res = fn(...args)
    } finally {
      setCurrentRenderingInstance(prevInstance)
      if (renderFnWithContext._d) {
        setBlockTracking(1)
      }
    }
    
    return res
  }
  
  // 标记为已编译
  ;(renderFnWithContext as any)._n = true
  // 保存原始函数
  ;(renderFnWithContext as any)._c = true
  // 标记禁用依赖收集
  ;(renderFnWithContext as any)._d = isNonScopedSlot
  
  return renderFnWithContext
}
```

关键逻辑：
1. 保存当前渲染实例
2. 设置为插槽所属的组件实例
3. 执行插槽函数
4. 恢复之前的渲染实例

## normalizeSlotValue

确保返回值是 VNode 数组：

```typescript
const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChild)]
```

如果返回单个 VNode，包装成数组。每个元素通过 `normalizeVNode` 处理。

## normalizeVNode

规范化单个 VNode：

```typescript
export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // null, undefined, boolean -> 注释节点
    return createVNode(Comment)
  } else if (isArray(child)) {
    // 数组 -> Fragment
    return createVNode(Fragment, null, child.slice())
  } else if (typeof child === 'object') {
    // 已经是 VNode
    return cloneIfMounted(child as VNode)
  } else {
    // 字符串或数字 -> 文本节点
    return createVNode(Text, null, String(child))
  }
}
```

各种类型转换为 VNode：
- `null/undefined/boolean` → 注释节点
- 数组 → Fragment
- 对象 → 克隆 VNode
- 字符串/数字 → 文本节点

## 默认插槽的规范化

当子节点不是对象时，作为默认插槽：

```typescript
const normalizeVNodeSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}
```

直接把子节点包装为默认插槽函数。

## 编译器生成的插槽

编译器会生成规范化的插槽对象：

```vue
<template>
  <Comp>
    <template #header>Header</template>
    <template #default>Content</template>
  </Comp>
</template>
```

编译为：

```javascript
_createVNode(Comp, null, {
  header: _withCtx(() => [_createTextVNode("Header")]),
  default: _withCtx(() => [_createTextVNode("Content")]),
  _: 1 /* STABLE */
})
```

编译器直接使用 `_withCtx` 包装，已经是规范化的格式。

## 稳定性标记的作用

`$stable` 和 `_` 标记影响更新策略：

```typescript
// 手写时可以标记稳定
h(Comp, null, {
  default: () => h('div', 'Static'),
  $stable: true  // 表示插槽内容不会变
})
```

稳定插槽在更新时可以跳过对比：

```typescript
if (optimized && type === SlotFlags.STABLE) {
  // 稳定插槽，无需更新
  needDeletionCheck = false
}
```

## 插槽更新时的规范化

更新时也需要规范化：

```typescript
export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren,
  optimized: boolean
) => {
  const { slots } = instance
  
  // ... 省略类型判断
  
  if (type) {
    // 编译的插槽，直接复制
    extend(slots, children as InternalSlots)
  } else {
    // 手写插槽，重新规范化
    normalizeObjectSlots(children as RawSlots, slots, instance)
  }
}
```

## 开发环境的警告

在渲染函数外调用插槽会触发警告：

```javascript
// 错误用法
setup(props, { slots }) {
  const content = slots.default()  // 警告！
  return () => h('div', content)
}

// 正确用法
setup(props, { slots }) {
  return () => h('div', slots.default?.())
}
```

插槽应该在渲染时调用，这样才能正确收集依赖。

## 性能考虑

规范化过程的优化：

```typescript
// 1. 避免重复规范化
if ((rawSlot as any)._n) {
  return rawSlot as Slot
}

// 2. 编译时完成规范化
// 编译器生成的插槽已经用 _withCtx 包装

// 3. 静态内容只规范化一次
const normalized = normalizeSlotValue(value)
slots[key] = () => normalized  // 闭包缓存
```

## 实际应用

理解规范化有助于正确使用插槽：

```javascript
// 推荐：函数形式的插槽
h(Comp, null, {
  default: (props) => h('div', props.item.name)
})

// 可以：静态内容
h(Comp, null, {
  default: h('div', 'Static')  // 会被包装成函数
})

// 避免：在 setup 中立即调用
setup(_, { slots }) {
  // 不要这样做
  const rendered = slots.default()
  
  // 正确做法
  return () => slots.default?.()
}
```

## 小结

`normalizeSlots` 的规范化确保了：

1. **统一格式**：所有插槽都是返回 VNode 数组的函数
2. **上下文正确**：通过 `withCtx` 绑定组件上下文
3. **类型转换**：非函数形式包装为函数
4. **性能优化**：编译时规范化和稳定性标记

规范化让插槽系统可以处理多种输入形式，同时保持内部实现的一致性。

下一章将深入分析作用域插槽的实现，看看父子组件如何通过插槽传递数据。
