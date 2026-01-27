# defineModel (Vue 3.4+)

defineModel 是 Vue 3.4 新增的编译器宏，简化了双向绑定的实现，替代了 defineProps + defineEmits 的组合。

## 基本用法

```html
<!-- 子组件 -->
<script setup>
const model = defineModel()
</script>

<template>
  <input v-model="model" />
</template>

<!-- 父组件 -->
<template>
  <Child v-model="parentValue" />
</template>
```

## 编译器宏定义

```typescript
// packages/runtime-core/src/apiSetupHelpers.ts
export function defineModel<T>(
  options?: { required?: true; default?: T }
): Ref<T>
export function defineModel<T>(
  name: string,
  options?: { required?: true; default?: T }
): Ref<T>
export function defineModel(): any {
  if (__DEV__) {
    warn(
      `defineModel() is a compiler-hint helper that is only usable inside ` +
        `<script setup> of a single file component.`
    )
  }
}
```

## 编译转换

```html
<!-- 源码 -->
<script setup>
const modelValue = defineModel()
</script>

<!-- 编译后（简化） -->
<script>
export default {
  props: {
    modelValue: {}
  },
  emits: ['update:modelValue'],
  setup(__props, { emit }) {
    const modelValue = useModel(__props, 'modelValue', emit)
    return { modelValue }
  }
}
</script>
```

## useModel 实现

```typescript
// packages/runtime-core/src/apiSetupHelpers.ts
export function useModel<T>(
  props: Record<string, any>,
  name: string,
  options?: { local?: boolean }
): Ref<T> {
  const i = getCurrentInstance()!
  
  if (__DEV__ && !i) {
    warn(`useModel() called without active instance.`)
    return ref() as any
  }

  // 检查是否有对应的 prop
  if (__DEV__ && !(name in i.propsOptions[0]!)) {
    warn(`useModel() called with prop "${name}" which is not declared.`)
    return ref() as any
  }

  const camelizedName = camelize(name)
  const hyphenatedName = hyphenate(name)

  const res = customRef((track, trigger) => {
    let localValue: any
    
    watchSyncEffect(() => {
      const propValue = props[name]
      if (hasChanged(localValue, propValue)) {
        localValue = propValue
        trigger()
      }
    })

    return {
      get() {
        track()
        return options?.local ? localValue : props[name]
      },
      set(value) {
        const rawProps = i.vnode!.props
        
        // 检查是否有 v-model 绑定
        if (
          !(rawProps && (
            name in rawProps ||
            camelizedName in rawProps ||
            hyphenatedName in rawProps
          )) &&
          hasChanged(value, localValue)
        ) {
          // 没有 v-model，使用本地值
          localValue = value
          trigger()
        }
        
        // 触发 update 事件
        i.emit(`update:${name}`, value)
      }
    }
  })

  return res
}
```

## 命名模型

```html
<script setup>
// 默认模型
const value = defineModel()

// 命名模型
const title = defineModel('title')
const count = defineModel('count')
</script>

<template>
  <input v-model="value" />
  <input v-model="title" />
  <input type="number" v-model.number="count" />
</template>

<!-- 父组件 -->
<template>
  <Child 
    v-model="val" 
    v-model:title="title" 
    v-model:count="count" 
  />
</template>
```

## 类型定义

```html
<script setup lang="ts">
// 类型参数
const model = defineModel<string>()

// 带选项
const count = defineModel<number>('count', {
  required: true
})

// 带默认值
const title = defineModel<string>('title', {
  default: 'Default Title'
})
</script>
```

## 修饰符支持

```html
<script setup>
const [model, modifiers] = defineModel({
  // 自定义 set 转换
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  }
})
</script>

<!-- 父组件 -->
<template>
  <Child v-model.capitalize="text" />
</template>
```

## 编译后的 props/emits

```typescript
// defineModel() 编译后自动添加
props: {
  modelValue: {
    // 从 defineModel 选项推导
  }
},
emits: ['update:modelValue']

// defineModel('title') 编译后
props: {
  title: {}
},
emits: ['update:title']
```

## 与传统方式对比

```html
<!-- 传统方式 -->
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

const updateValue = (val) => {
  emit('update:modelValue', val)
}
</script>

<template>
  <input :value="modelValue" @input="updateValue($event.target.value)" />
</template>

<!-- defineModel 方式 -->
<script setup>
const model = defineModel()
</script>

<template>
  <input v-model="model" />
</template>
```

## 本地状态模式

```html
<script setup>
// local: true 允许本地修改
const model = defineModel({ local: true })

// 即使父组件没有传 v-model
// 组件内部也可以修改值
</script>
```

## 使用示例

### 表单输入组件

```html
<!-- CustomInput.vue -->
<script setup lang="ts">
const model = defineModel<string>()
</script>

<template>
  <div class="custom-input">
    <input 
      :value="model" 
      @input="model = ($event.target as HTMLInputElement).value"
    />
  </div>
</template>
```

### 开关组件

```html
<!-- Toggle.vue -->
<script setup lang="ts">
const checked = defineModel<boolean>({ default: false })
</script>

<template>
  <button 
    :class="{ active: checked }" 
    @click="checked = !checked"
  >
    {{ checked ? 'ON' : 'OFF' }}
  </button>
</template>
```

### 多个模型

```html
<!-- DateRange.vue -->
<script setup lang="ts">
const startDate = defineModel<Date>('start')
const endDate = defineModel<Date>('end')
</script>

<template>
  <input type="date" v-model="startDate" />
  <input type="date" v-model="endDate" />
</template>

<!-- 使用 -->
<template>
  <DateRange v-model:start="start" v-model:end="end" />
</template>
```

## 小结

defineModel 的核心要点：

1. **编译器宏**：编译时转换为 props + emits
2. **双向绑定**：返回可读写的 Ref
3. **命名模型**：支持多个 v-model
4. **修饰符**：支持自定义转换
5. **类型安全**：完整的 TypeScript 支持

下一章将分析 $attrs 继承机制。
