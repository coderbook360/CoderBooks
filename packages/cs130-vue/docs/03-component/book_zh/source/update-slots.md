# updateSlots 插槽更新

updateSlots 负责在组件更新时同步插槽内容的变化。

## 函数签名

```typescript
// packages/runtime-core/src/componentSlots.ts
export const updateSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren,
  optimized: boolean
)
```

## 完整实现

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
    // ⭐ 插槽对象形式
    const type = (children as RawSlots)._

    if (type) {
      if (__DEV__ && isHmrUpdating) {
        // HMR 强制更新
        extend(slots, children as Slots)
      } else if (optimized && type === SlotFlags.STABLE) {
        // ⭐ 稳定插槽，无需更新
        needDeletionCheck = false
      } else {
        // ⭐ 编译后的插槽
        extend(slots, children as Slots)
        if (!optimized && type === SlotFlags.STABLE) {
          deletionComparisonTarget = children as RawSlots
        }
      }
    } else {
      needDeletionCheck = !(children as RawSlots).$stable

      // 规范化插槽
      normalizeObjectSlots(
        children as RawSlots,
        slots,
        instance
      )
    }
    deletionComparisonTarget = children as RawSlots
  } else if (children) {
    // ⭐ 默认插槽简写
    normalizeVNodeSlots(instance, children)
    deletionComparisonTarget = { default: 1 }
  }

  // ⭐ 删除不存在的插槽
  if (needDeletionCheck) {
    for (const key in slots) {
      if (
        !isInternalKey(key) &&
        !(key in deletionComparisonTarget)
      ) {
        delete slots[key]
      }
    }
  }
}
```

## SlotFlags 标记

```typescript
export const enum SlotFlags {
  STABLE = 1,      // 静态插槽
  DYNAMIC = 2,     // 动态插槽
  FORWARDED = 3    // 转发插槽
}

// 编译器生成的插槽带有 _ 标记
const slots = {
  default: () => createVNode('div'),
  _: SlotFlags.STABLE
}
```

## 稳定插槽优化

```typescript
if (optimized && type === SlotFlags.STABLE) {
  // 稳定插槽无需更新
  needDeletionCheck = false
}

// 稳定插槽示例（静态内容）
// <template #default>Static content</template>
```

## 动态插槽

```typescript
// 动态插槽名
// <template v-for="item in items" #[item.name]>
//   {{ item.content }}
// </template>

// 编译结果带有 DYNAMIC 标记
const slots = {
  [dynamicName]: () => createVNode('div', null, content),
  _: SlotFlags.DYNAMIC
}
```

## normalizeObjectSlots 规范化

```typescript
const normalizeObjectSlots = (
  rawSlots: RawSlots,
  slots: InternalSlots,
  instance: ComponentInternalInstance
) => {
  const ctx = rawSlots._ctx

  for (const key in rawSlots) {
    if (isInternalKey(key)) continue

    const value = rawSlots[key]

    if (isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx)
    } else if (value != null) {
      // 非函数值，包装成函数
      const normalized = () => normalizeSlotValue(value)
      slots[key] = normalized
    }
  }
}
```

## normalizeVNodeSlots 处理简写

```typescript
const normalizeVNodeSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  // <Child>content</Child>
  // 等价于 <Child><template #default>content</template></Child>
  const normalized = normalizeSlotValue(children)
  instance.slots.default = () => normalized
}
```

## 插槽删除

```typescript
if (needDeletionCheck) {
  for (const key in slots) {
    if (
      !isInternalKey(key) &&          // 不是内部属性
      !(key in deletionComparisonTarget)  // 新 children 中不存在
    ) {
      delete slots[key]
    }
  }
}

// 示例：
// 旧: { default, header, footer }
// 新: { default, header }
// 删除: footer
```

## isInternalKey 检查

```typescript
const isInternalKey = (key: string): boolean => key[0] === '_' || key === '$stable'
```

## 使用示例

### 稳定插槽

```html
<template>
  <Child>
    <template #header>
      <h1>Static Header</h1>
    </template>
    <template #default>
      <p>Static Content</p>
    </template>
  </Child>
</template>
```

编译后带 `SlotFlags.STABLE`，更新时跳过。

### 动态插槽

```html
<template>
  <Child>
    <template #header>
      <h1>{{ title }}</h1>
    </template>
    <template #default>
      <p>{{ content }}</p>
    </template>
  </Child>
</template>
```

插槽内容依赖响应式数据，需要更新。

### 动态插槽名

```html
<template>
  <Child>
    <template v-for="item in items" #[item.slot]>
      {{ item.content }}
    </template>
  </Child>
</template>
```

插槽名本身是动态的，带 `SlotFlags.DYNAMIC`。

## 转发插槽

```typescript
// 高阶组件转发插槽
const HOC = {
  setup(props, { slots }) {
    return () => h(Child, null, slots)
  }
}

// slots 带有 SlotFlags.FORWARDED
```

## 与 DYNAMIC_SLOTS 的关系

```typescript
// shouldUpdateComponent 中
if (patchFlag & PatchFlags.DYNAMIC_SLOTS) {
  // 有动态插槽，强制更新
  return true
}
```

## 小结

updateSlots 的核心要点：

1. **SlotFlags**：标记插槽类型
2. **STABLE 优化**：稳定插槽跳过更新
3. **DYNAMIC 处理**：动态插槽需要更新
4. **插槽删除**：清理不存在的插槽
5. **规范化**：统一处理各种插槽格式

下一章将分析组件卸载流程。
