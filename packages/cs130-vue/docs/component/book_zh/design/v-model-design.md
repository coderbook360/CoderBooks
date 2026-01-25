# v-model 双向绑定设计

表单是 Web 应用的基础交互方式，而双向绑定是处理表单的利器。Vue 的 v-model 让输入元素的值与组件状态保持同步，一行代码替代了繁琐的事件监听和状态更新。但 v-model 不仅仅是语法糖——它背后蕴含着组件通信的设计智慧。

## 从语法糖说起

在原生表单元素上，v-model 是 value 绑定和 input 事件监听的语法糖：

```vue
<!-- 使用 v-model -->
<input v-model="text" />

<!-- 等价于 -->
<input :value="text" @input="text = $event.target.value" />
```

这个转换看似简单，但处理了很多细节。对于不同类型的输入元素，v-model 会使用不同的属性和事件：

```vue
<!-- 文本输入 -->
<input type="text" v-model="text" />
<!-- → :value + @input -->

<!-- 复选框 -->
<input type="checkbox" v-model="checked" />
<!-- → :checked + @change -->

<!-- 单选按钮 -->
<input type="radio" v-model="picked" value="a" />
<!-- → :checked + @change -->

<!-- 下拉选择 -->
<select v-model="selected">
  <option>A</option>
  <option>B</option>
</select>
<!-- → :value + @change -->
```

编译器会根据元素类型自动选择正确的绑定方式。这让开发者不需要记忆每种表单元素的细节，统一使用 v-model 即可。

## 组件上的 v-model

在自定义组件上，v-model 的行为更加明确：

```vue
<!-- 使用 v-model -->
<CustomInput v-model="text" />

<!-- 等价于 -->
<CustomInput :modelValue="text" @update:modelValue="text = $event" />
```

组件需要接收 `modelValue` prop，并在值变化时触发 `update:modelValue` 事件。这是 Vue 3 的约定，与 Vue 2 的 `value` + `input` 不同。

```vue
<!-- CustomInput.vue -->
<script setup>
defineProps(['modelValue'])
defineEmits(['update:modelValue'])
</script>

<template>
  <input 
    :value="modelValue"
    @input="$emit('update:modelValue', $event.target.value)"
  />
</template>
```

这种设计的好处是明确——`modelValue` 和 `update:modelValue` 清楚地表达了"这是 v-model 绑定的值"。它也为多 v-model 绑定铺平了道路。

## 多个 v-model 绑定

Vue 3 的一大改进是支持在同一个组件上使用多个 v-model。这在 Vue 2 中需要通过 `.sync` 修饰符实现，现在统一使用 v-model：

```vue
<!-- 多个 v-model -->
<UserForm 
  v-model:firstName="first"
  v-model:lastName="last"
  v-model:email="email"
/>

<!-- 等价于 -->
<UserForm
  :firstName="first" @update:firstName="first = $event"
  :lastName="last" @update:lastName="last = $event"  
  :email="email" @update:email="email = $event"
/>
```

组件实现：

```vue
<!-- UserForm.vue -->
<script setup>
defineProps(['firstName', 'lastName', 'email'])
defineEmits(['update:firstName', 'update:lastName', 'update:email'])
</script>

<template>
  <input 
    :value="firstName" 
    @input="$emit('update:firstName', $event.target.value)"
  />
  <input 
    :value="lastName"
    @input="$emit('update:lastName', $event.target.value)"
  />
  <input 
    :value="email"
    @input="$emit('update:email', $event.target.value)"
  />
</template>
```

这种模式在表单组件、复杂的输入组件中非常有用。每个可编辑的字段都可以有自己的 v-model 绑定，保持了单向数据流的清晰性，同时提供了双向绑定的便利。

## defineModel 宏

Vue 3.4 引入的 `defineModel` 宏大大简化了 v-model 的实现：

```vue
<script setup>
// 默认的 v-model
const modelValue = defineModel()

// 具名的 v-model
const firstName = defineModel('firstName')
const lastName = defineModel('lastName')

// 带选项的 defineModel
const count = defineModel('count', { 
  type: Number, 
  default: 0,
  required: true 
})
</script>

<template>
  <!-- 直接使用，就像普通的 ref -->
  <input v-model="firstName" />
  <input v-model="lastName" />
  <button @click="count++">{{ count }}</button>
</template>
```

`defineModel` 返回一个 ref，读取时返回 prop 的值，写入时自动触发相应的 emit。这消除了手动处理 prop 和 emit 的样板代码。

在幕后，`defineModel('firstName')` 会：

```javascript
// 编译器生成的等价代码
const firstName = computed({
  get() { return props.firstName },
  set(value) { emit('update:firstName', value) }
})
```

使用 `defineModel` 时，你不需要显式声明 props 和 emits——编译器会自动生成它们。这是 Vue 编译器宏的威力：看起来像普通 JavaScript，实际上在编译时会被转换成更复杂的代码。

## v-model 修饰符

v-model 支持修饰符来改变其行为。内置的修饰符有 `.lazy`、`.number`、`.trim`：

```vue
<!-- .lazy: 使用 change 事件而非 input -->
<input v-model.lazy="text" />

<!-- .number: 将输入转换为数字 -->
<input v-model.number="age" />

<!-- .trim: 去除首尾空白 -->
<input v-model.trim="name" />

<!-- 修饰符可以组合 -->
<input v-model.number.lazy="price" />
```

对于自定义组件，你可以定义自己的修饰符。修饰符通过 `modelModifiers` prop 传递给组件：

```vue
<!-- 父组件 -->
<MyInput v-model.capitalize="text" />

<!-- MyInput.vue -->
<script setup>
const props = defineProps({
  modelValue: String,
  modelModifiers: { default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

function handleInput(e) {
  let value = e.target.value
  // 检查修饰符
  if (props.modelModifiers.capitalize) {
    value = value.charAt(0).toUpperCase() + value.slice(1)
  }
  emit('update:modelValue', value)
}
</script>

<template>
  <input :value="modelValue" @input="handleInput" />
</template>
```

对于具名 v-model，修饰符通过 `<name>Modifiers` 传递：

```vue
<MyInput v-model:title.capitalize="title" />

<!-- MyInput 接收 titleModifiers prop -->
```

使用 `defineModel` 时，修饰符处理更加优雅：

```vue
<script setup>
const [model, modifiers] = defineModel({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  }
})
</script>
```

## v-model 的设计哲学

v-model 的设计体现了 Vue 的几个核心理念。

**渐进增强**。在最简单的情况下，`v-model="value"` 就能工作。当需要更多控制时，可以使用修饰符、具名绑定、自定义修饰符。功能层层递进，复杂性按需引入。

**约定优于配置**。`modelValue` 和 `update:modelValue` 是约定好的名称，遵循约定就能获得 v-model 支持。这减少了决策负担，也让代码更加一致。

**单向数据流的优雅包装**。v-model 本质上仍然是单向数据流——数据通过 prop 流入，通过 event 流出。它只是提供了更简洁的语法，没有破坏数据流的可追踪性。

**编译时优化**。v-model 的很多处理发生在编译时：根据元素类型选择绑定方式、生成修饰符处理代码、将 `defineModel` 展开为 props 和 emits。运行时代码保持简洁高效。

## 实现可编辑组件的最佳实践

当你需要实现一个支持 v-model 的组件时，有几个最佳实践。

**使用 defineModel**。这是 Vue 3.4+ 的推荐方式，代码最简洁：

```vue
<script setup>
const value = defineModel({ required: true })
</script>

<template>
  <input v-model="value" />
</template>
```

**提供类型定义**。TypeScript 项目中，明确 v-model 值的类型：

```vue
<script setup lang="ts">
const value = defineModel<string>({ required: true })
const count = defineModel<number>('count', { default: 0 })
</script>
```

**考虑受控与非受控模式**。有时用户可能不想使用 v-model，而是完全控制组件的值。提供这种灵活性：

```vue
<script setup>
const props = defineProps({
  modelValue: String,
  defaultValue: String  // 非受控模式的初始值
})
const emit = defineEmits(['update:modelValue'])

// 内部状态，用于非受控模式
const internalValue = ref(props.defaultValue)

// 受控还是非受控取决于是否传了 modelValue
const isControlled = computed(() => props.modelValue !== undefined)
const value = computed({
  get() {
    return isControlled.value ? props.modelValue : internalValue.value
  },
  set(val) {
    if (isControlled.value) {
      emit('update:modelValue', val)
    } else {
      internalValue.value = val
    }
  }
})
</script>
```

**处理复杂类型**。当 v-model 绑定的是对象或数组时，确保不要直接修改传入的值：

```vue
<script setup>
const props = defineProps({
  modelValue: Object
})
const emit = defineEmits(['update:modelValue'])

function updateField(key, value) {
  // 创建新对象，不直接修改 props
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
```

## 小结

v-model 是 Vue 处理表单和可编辑组件的核心机制。它将 prop 绑定和事件监听包装成简洁的语法，支持多个绑定、自定义修饰符等高级用法。`defineModel` 宏的引入进一步简化了组件开发。

理解 v-model 的本质——它是 `:modelValue` 和 `@update:modelValue` 的语法糖——有助于正确使用它并理解其边界情况。v-model 并没有破坏单向数据流，它只是让常见的双向绑定场景变得更加便捷。

在下一章中，我们将全面探讨组件通信的各种模式，包括 props/emits、v-model、provide/inject、以及状态管理，帮助你在不同场景下选择合适的通信方式。
