# initSlots 插槽初始化

插槽是 Vue 组件内容分发的机制。`initSlots` 负责解析父组件传入的插槽内容，规范化为统一的格式，供组件渲染时使用。

## 插槽的使用方式

父组件可以通过多种方式传递插槽内容：

```vue
<!-- 默认插槽 -->
<MyComponent>
  <p>默认内容</p>
</MyComponent>

<!-- 具名插槽 -->
<MyComponent>
  <template #header>头部</template>
  <template #footer>底部</template>
</MyComponent>

<!-- 作用域插槽 -->
<MyComponent>
  <template #default="{ item }">
    {{ item.name }}
  </template>
</MyComponent>
```

## 源码分析

`initSlots` 在 `runtime-core/src/componentSlots.ts`：

```typescript
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // 对象形式的插槽
    const type = (children as RawSlots)._
    if (type) {
      // 已编译的插槽
      instance.slots = toRaw(children as InternalSlots)
      def(children as InternalSlots, '_', type)
    } else {
      // 手写的插槽对象
      normalizeObjectSlots(children as RawSlots, (instance.slots = {}))
    }
  } else {
    // 非对象形式，当作默认插槽
    instance.slots = {}
    if (children) {
      normalizeVNodeSlots(instance, children)
    }
  }
  
  // 标记为内部对象
  def(instance.slots, InternalObjectKey, 1)
}
```

## 插槽类型判断

通过 `shapeFlag` 判断子节点是否是插槽对象：

```typescript
if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
  // 对象形式的插槽 { header: () => [...], default: () => [...] }
} else {
  // 直接的子节点，当作默认插槽
}
```

编译后的模板会生成带有 `_` 标记的插槽对象：

```javascript
// 编译结果
{
  _: 1,  // 稳定插槽标记
  header: () => [createVNode('div', null, 'Header')],
  default: () => [createVNode('p', null, 'Content')]
}
```

## 编译插槽 vs 手写插槽

编译器生成的插槽有特殊标记：

```typescript
const type = (children as RawSlots)._
if (type) {
  // 已编译的插槽，直接使用
  instance.slots = toRaw(children as InternalSlots)
} else {
  // 手写的插槽对象，需要规范化
  normalizeObjectSlots(children as RawSlots, (instance.slots = {}))
}
```

`_` 标记表示插槽的稳定性：
- `1` (STABLE): 稳定插槽，内容不会变化
- `2` (DYNAMIC): 动态插槽，需要强制更新
- `3` (FORWARDED): 转发的插槽

## normalizeObjectSlots

规范化手写的插槽对象：

```typescript
const normalizeObjectSlots = (
  rawSlots: RawSlots,
  slots: InternalSlots
) => {
  const ctx = rawSlots._ctx
  
  for (const key in rawSlots) {
    if (isInternalKey(key)) continue
    
    const value = rawSlots[key]
    if (isFunction(value)) {
      // 函数形式的插槽
      slots[key] = normalizeSlot(key, value, ctx)
    } else if (value != null) {
      // 静态内容，包装成函数
      const normalized = normalizeSlotValue(value)
      slots[key] = () => normalized
    }
  }
}
```

## normalizeSlot

规范化单个插槽函数：

```typescript
const normalizeSlot = (
  key: string,
  rawSlot: Function,
  ctx: ComponentInternalInstance | null | undefined
): Slot => {
  const normalized = withCtx((...args: any[]) => {
    // 警告：插槽返回的不是数组
    return normalizeSlotValue(rawSlot(...args))
  }, ctx)
  
  // 标记为非响应式
  normalized._c = false
  
  return normalized
}
```

`withCtx` 包装函数，确保在正确的组件上下文中执行。

## normalizeSlotValue

确保插槽内容是数组：

```typescript
const normalizeSlotValue = (value: unknown): VNode[] =>
  isArray(value)
    ? value.map(normalizeVNode)
    : [normalizeVNode(value as VNodeChild)]
```

插槽返回值必须是 VNode 数组。

## normalizeVNodeSlots

处理直接的子节点（当作默认插槽）：

```typescript
const normalizeVNodeSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}
```

如果子节点不是插槽对象，整体作为默认插槽处理。

## 插槽的访问

组件内通过 `slots` 访问插槽：

```javascript
// setup 中
setup(props, { slots }) {
  return () => h('div', [
    slots.header?.(),
    slots.default?.(),
    slots.footer?.()
  ])
}

// 模板中
<slot name="header"></slot>
<slot></slot>  <!-- 默认插槽 -->
```

## 作用域插槽

作用域插槽允许子组件向插槽传递数据：

```vue
<!-- 子组件 -->
<template>
  <slot :item="item" :index="index"></slot>
</template>

<!-- 父组件 -->
<ChildComponent>
  <template #default="{ item, index }">
    {{ index }}: {{ item.name }}
  </template>
</ChildComponent>
```

编译后：

```javascript
// 子组件渲染
slots.default({ item: item, index: index })

// 父组件提供的插槽函数
default: ({ item, index }) => [
  createTextVNode(index + ': ' + item.name)
]
```

## 插槽更新

插槽内容变化时需要更新。`updateSlots` 处理这个逻辑：

```typescript
export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren,
  optimized: boolean
) => {
  const { vnode, slots } = instance
  let needDeletionCheck = true
  let deletionComparisonTarget = EMPTY_OBJ
  
  if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    const type = (children as RawSlots)._
    if (type) {
      if (optimized && type === SlotFlags.STABLE) {
        // 稳定插槽，无需更新
        needDeletionCheck = false
      } else {
        // 更新插槽
        extend(slots, children as InternalSlots)
        if (!optimized && type !== SlotFlags.STABLE) {
          deletionComparisonTarget = children as RawSlots
        }
      }
    } else {
      // 手写插槽，全量更新
      needDeletionCheck = !(children as RawSlots).$stable
      normalizeObjectSlots(children as RawSlots, slots)
    }
  } else if (children) {
    normalizeVNodeSlots(instance, children)
  }
  
  // 删除不再存在的插槽
  if (needDeletionCheck) {
    for (const key in slots) {
      if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
        delete slots[key]
      }
    }
  }
}
```

## SlotFlags

插槽稳定性标记：

```typescript
export const enum SlotFlags {
  STABLE = 1,      // 静态插槽，内容固定
  DYNAMIC = 2,     // 动态插槽，依赖响应式数据
  FORWARDED = 3    // 转发的插槽
}
```

稳定插槽可以跳过更新检查，优化性能。

## 插槽的响应式

插槽函数本身不是响应式的，但它们会在父组件更新时重新生成：

```vue
<!-- 父组件 -->
<template>
  <Child>
    <template #default>
      {{ count }}  <!-- 依赖响应式数据 -->
    </template>
  </Child>
</template>
```

当 `count` 变化时：
1. 父组件重新渲染
2. 生成新的插槽对象
3. 子组件接收到新的 `children`
4. 调用 `updateSlots`
5. 子组件的插槽渲染新内容

## 插槽的类型

TypeScript 类型：

```typescript
type Slot<T extends any = any> = (...args: T[]) => VNode[]

type InternalSlots = {
  [name: string]: Slot | undefined
}
```

使用 `defineSlots` 可以获得更好的类型推导：

```vue
<script setup lang="ts">
const slots = defineSlots<{
  default(props: { item: Item }): any
  header(): any
}>()
</script>
```

## 小结

`initSlots` 完成了插槽的规范化和设置：

1. **类型判断**：区分对象插槽和直接子节点
2. **规范化**：确保所有插槽是返回 VNode 数组的函数
3. **稳定性标记**：编译器添加标记，优化更新
4. **上下文绑定**：通过 `withCtx` 确保正确的渲染上下文

插槽系统支持默认插槽、具名插槽和作用域插槽，提供了灵活的内容分发机制。

在下一章中，我们将详细分析 `normalizeSlots`——插槽的规范化过程。
