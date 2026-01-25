# useSlots 与 useAttrs

useSlots 和 useAttrs 是 Vue 3 提供的组合式 API 辅助函数，用于在 setup 中访问组件的插槽和透传属性。

## useSlots 定义

```typescript
// packages/runtime-core/src/apiSetupHelpers.ts
export function useSlots(): SetupContext['slots'] {
  return getContext().slots
}

function getContext(): SetupContext {
  const i = getCurrentInstance()!
  if (__DEV__ && !i) {
    warn(`useContext() called without active instance.`)
  }
  return i.setupContext || (i.setupContext = createSetupContext(i))
}
```

## useAttrs 定义

```typescript
export function useAttrs(): SetupContext['attrs'] {
  return getContext().attrs
}
```

## getContext 上下文获取

```typescript
function getContext(): SetupContext {
  const i = getCurrentInstance()!
  
  if (__DEV__ && !i) {
    warn(`useContext() called without active instance.`)
  }
  
  // 复用或创建 setupContext
  return i.setupContext || (i.setupContext = createSetupContext(i))
}
```

## 与 setup 参数的关系

```typescript
// setup 的第二个参数包含 slots 和 attrs
setup(props, { slots, attrs, emit, expose }) {
  // 这里的 slots 和 attrs 与 useSlots/useAttrs 返回相同
}

// 在 setup 外部（如组合式函数）使用
function useCustomHook() {
  const slots = useSlots()
  const attrs = useAttrs()
  // ...
}
```

## slots 的响应式

```typescript
// slots 对象本身不是响应式的
// 但 slots 函数的返回值会根据父组件更新

const slots = useSlots()

// 每次父组件更新，slots.default() 返回新的 VNodes
const content = computed(() => slots.default?.())
```

## attrs 的响应式

```typescript
// attrs 是响应式的代理对象
const attrs = useAttrs()

// 访问 attrs 会触发依赖收集
watch(
  () => attrs.class,
  (newClass) => {
    console.log('class changed:', newClass)
  }
)
```

## slots 类型

```typescript
// Slots 类型定义
export type Slots = Readonly<InternalSlots>

export type InternalSlots = {
  [name: string]: Slot | undefined
}

export type Slot<T extends any = any> = (
  ...args: IfAny<T, any[], [T] | (T extends undefined ? [] : never)>
) => VNode[]
```

## attrs 类型

```typescript
// Data 类型
export type Data = Record<string, unknown>

// attrs 实际类型
type Attrs = Data
```

## 使用场景

### 组合式函数中访问

```typescript
// useModal.ts
import { useSlots, computed } from 'vue'

export function useModal() {
  const slots = useSlots()
  
  const hasHeader = computed(() => !!slots.header)
  const hasFooter = computed(() => !!slots.footer)
  
  return {
    hasHeader,
    hasFooter
  }
}
```

### 渲染函数中使用

```typescript
import { useSlots, h } from 'vue'

export default {
  setup() {
    const slots = useSlots()
    
    return () => h('div', [
      slots.header?.(),
      slots.default?.(),
      slots.footer?.()
    ])
  }
}
```

### 透传 attrs

```html
<script setup>
import { useAttrs } from 'vue'

const attrs = useAttrs()
</script>

<template>
  <div class="wrapper">
    <input v-bind="attrs" />
  </div>
</template>
```

## defineOptions 配合

```html
<script setup>
import { useAttrs } from 'vue'

// 禁用自动继承 attrs
defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
</script>

<template>
  <div class="custom-input">
    <label>{{ attrs.label }}</label>
    <input v-bind="attrs" />
  </div>
</template>
```

## 与 $slots/$attrs 的关系

```typescript
// 在模板中
// $slots === useSlots() 返回值
// $attrs === useAttrs() 返回值

// 实例代理
const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    // ...
    if (key === '$slots') {
      return instance.slots
    }
    if (key === '$attrs') {
      return instance.attrs
    }
    // ...
  }
}
```

## 注意事项

```typescript
// 1. 必须在 setup 或生命周期钩子中调用
function useMyHook() {
  const slots = useSlots()  // ✅ 在组合式函数中
  return { slots }
}

// 2. 不要解构 slots
const { default: defaultSlot } = useSlots()  // ❌ 失去响应式

// 3. 正确方式
const slots = useSlots()
const content = slots.default?.()  // ✅
```

## 实现细节

```typescript
// createSetupContext 创建上下文
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    instance.exposed = exposed || {}
  }

  if (__DEV__) {
    return Object.freeze({
      get attrs() {
        return getAttrsProxy(instance)
      },
      get slots() {
        return getSlotsProxy(instance)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose
    })
  } else {
    return {
      get attrs() {
        return getAttrsProxy(instance)
      },
      slots: instance.slots,
      emit: instance.emit,
      expose
    }
  }
}
```

## 使用示例

### 动态插槽渲染

```html
<script setup>
import { useSlots, computed } from 'vue'

const slots = useSlots()

const slotNames = computed(() => Object.keys(slots))

const renderSlot = (name) => {
  return slots[name]?.()
}
</script>

<template>
  <div>
    <div v-for="name in slotNames" :key="name">
      <component :is="() => renderSlot(name)" />
    </div>
  </div>
</template>
```

### 条件渲染

```html
<script setup>
import { useSlots } from 'vue'

const slots = useSlots()
</script>

<template>
  <header v-if="slots.header">
    <slot name="header" />
  </header>
  <main>
    <slot />
  </main>
  <footer v-if="slots.footer">
    <slot name="footer" />
  </footer>
</template>
```

## 小结

useSlots 与 useAttrs 的核心要点：

1. **组合式 API**：在 setup 外部访问 slots/attrs
2. **getContext**：复用或创建 setupContext
3. **响应式**：attrs 是响应式的，slots 不是
4. **与模板一致**：等同于 $slots 和 $attrs
5. **组合式函数**：可在自定义 hook 中使用

下一章将分析 defineModel。
