# Emits 事件设计

如果说 Props 是组件接收输入的通道，那么 Emits 就是组件发送输出的通道。在 Vue 的单向数据流模型中，子组件通过触发事件来通知父组件发生了什么，请求父组件执行相应的操作。Emits 的设计既要灵活易用，又要支持类型安全和运行时验证。

## 事件驱动的通信模型

在组件化的世界中，父子组件需要协作完成功能。父组件通过 props 将数据传递给子组件，子组件处理用户交互后需要将结果反馈给父组件。直接修改 props 会破坏单向数据流，那子组件如何通知父组件呢？答案是事件。

```vue
<!-- 子组件 -->
<script setup>
const emit = defineEmits(['submit', 'cancel'])

function handleSubmit() {
  // 通知父组件用户点击了提交
  emit('submit', { data: 'form data' })
}

function handleCancel() {
  // 通知父组件用户点击了取消
  emit('cancel')
}
</script>

<!-- 父组件 -->
<template>
  <MyForm @submit="onSubmit" @cancel="onCancel" />
</template>
```

这个模式和 DOM 事件类似——子组件"触发"事件，父组件"监听"并响应。但组件事件和 DOM 事件有本质区别：组件事件不会冒泡，它只在直接的父子关系中传递。这让事件的流向更加可控和可预测。

## 声明式的 Emits

Vue 3 引入了 `emits` 选项，让组件可以显式声明它会触发哪些事件。这不是必须的——不声明也可以触发事件——但声明有几个重要的好处。

首先是文档价值。通过查看 emits 声明，就能知道组件会触发哪些事件，不需要阅读全部代码。

```javascript
export default {
  emits: ['update', 'delete', 'select'],
  // 一眼就能看出这个组件会触发三个事件
}
```

其次是区分组件事件和原生事件。如果一个事件没有被声明为 emit，它会被视为原生 DOM 事件并透传到根元素：

```javascript
export default {
  // 没有声明 emits
  template: '<button @click="$emit(\'click\')">Click</button>'
}
// click 事件会触发两次：一次是 $emit 触发的，一次是 button 的原生 click
// 因为 click 没有被声明，父组件的 @click 会被当作原生事件透传

export default {
  emits: ['click'],  // 声明后就只触发一次
  template: '<button @click="$emit(\'click\')">Click</button>'
}
```

这是一个容易踩的坑。如果你的组件触发与原生事件同名的事件（如 click、focus、input），一定要在 emits 中声明，否则可能出现事件重复触发的问题。

## 事件验证

Emits 支持运行时验证，类似于 props 的验证机制。通过对象语法，可以为每个事件定义验证函数：

```javascript
export default {
  emits: {
    // 简单声明，不验证
    click: null,
    
    // 带验证的声明
    submit: (payload) => {
      if (!payload.email) {
        console.warn('submit 事件需要包含 email')
        return false
      }
      return true
    },
    
    // 验证事件参数类型
    update: (value) => {
      if (typeof value !== 'number') {
        console.warn('update 事件需要一个数字')
        return false
      }
      return true
    }
  }
}
```

验证函数接收 emit 的参数，返回布尔值表示验证是否通过。验证失败时会在控制台输出警告，但事件仍然会被触发——这是开发时的辅助检查，不是硬性阻止。

验证在开发复杂组件库时很有价值。当组件被错误使用时，明确的警告信息能帮助用户快速定位问题。

## TypeScript 类型支持

在 TypeScript 项目中，`defineEmits` 提供了完整的类型支持。类型定义既是编译时检查，也是 IDE 智能提示的来源：

```vue
<script setup lang="ts">
// 运行时声明风格
const emit = defineEmits(['update', 'delete'])

// 类型声明风格（推荐）
const emit = defineEmits<{
  (e: 'update', value: number): void
  (e: 'delete', id: string): void
  (e: 'select', item: { id: number; name: string }): void
}>()

// 触发事件时有完整的类型检查
emit('update', 42)       // OK
emit('update', '42')     // 类型错误：需要 number
emit('delete', 123)      // 类型错误：需要 string
emit('unknown', 1)       // 类型错误：未声明的事件
</script>
```

Vue 3.3+ 还支持更简洁的对象语法：

```vue
<script setup lang="ts">
const emit = defineEmits<{
  update: [value: number]
  delete: [id: string]
  select: [item: { id: number; name: string }]
}>()
</script>
```

这种写法使用元组语法表示事件参数，更加简洁。两种写法等价，选择你喜欢的风格即可。

## emit 函数的实现

在运行时，`emit` 是组件实例上的一个方法。它的核心逻辑是查找父组件传入的事件处理器，并调用它：

```javascript
// 简化的 emit 实现
function emit(instance, event, ...args) {
  const props = instance.vnode.props || {}
  
  // 事件名转换为 handler 名：click -> onClick
  const handlerName = `on${capitalize(event)}`
  const handler = props[handlerName]
  
  if (handler) {
    // 调用父组件传入的处理器
    handler(...args)
  }
  
  // 处理 v-model 的特殊事件
  if (event.startsWith('update:')) {
    const modelHandler = props[`onUpdate:${event.slice(7)}`]
    if (modelHandler) {
      modelHandler(...args)
    }
  }
}
```

这段代码展示了 emit 的基本原理。当子组件调用 `emit('submit', data)` 时，Vue 会在父组件传入的 props 中查找 `onSubmit` 处理器。事件名会经过一系列转换：`submit` 变成 `onSubmit`，`update:value` 变成 `onUpdate:value`。

这种设计让模板语法（`@submit`）和 props（`onSubmit`）能够对应起来。本质上，事件监听器就是一种特殊的 prop。

## v-model 与 emits

v-model 是基于 props 和 emits 的语法糖。当你在组件上使用 `v-model`：

```vue
<CustomInput v-model="text" />
<!-- 等价于 -->
<CustomInput :modelValue="text" @update:modelValue="text = $event" />
```

组件需要接收 `modelValue` prop，并在值变化时触发 `update:modelValue` 事件。这是一个约定，遵循它就能支持 v-model：

```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])

function updateValue(newValue) {
  emit('update:modelValue', newValue)
}
</script>

<template>
  <input :value="modelValue" @input="updateValue($event.target.value)" />
</template>
```

Vue 3 支持多个 v-model 绑定，通过参数区分：

```vue
<UserForm 
  v-model:firstName="first" 
  v-model:lastName="last" 
/>
<!-- 等价于 -->
<UserForm 
  :firstName="first" @update:firstName="first = $event"
  :lastName="last" @update:lastName="last = $event"
/>
```

组件需要声明对应的 props 和 emits：

```javascript
defineProps(['firstName', 'lastName'])
defineEmits(['update:firstName', 'update:lastName'])
```

Vue 3.4+ 引入的 `defineModel` 宏进一步简化了这个模式：

```vue
<script setup>
// 自动处理 prop 和 emit
const firstName = defineModel('firstName')
const lastName = defineModel('lastName')

// 直接读写即可
firstName.value = 'John'  // 自动触发 update:firstName
</script>
```

`defineModel` 是编译器宏，它生成响应式的 ref，读取时返回 prop 值，写入时自动触发 emit。这让双向绑定的实现变得极为简洁。

## 事件修饰符的处理

Vue 模板支持事件修饰符，如 `.stop`、`.prevent`、`.once` 等。对于原生 DOM 事件，这些修饰符会转换为对应的 JavaScript 代码。对于组件事件，只有部分修饰符有效。

```vue
<!-- .once 修饰符对组件事件有效 -->
<MyComponent @submit.once="handleSubmit" />

<!-- .native 修饰符在 Vue 3 中已移除 -->
<!-- Vue 2: <MyComponent @click.native="..." /> -->
<!-- Vue 3: 直接使用，未声明的事件自动成为原生事件 -->
<MyComponent @click="..." />  <!-- 如果 click 未在 emits 中声明 -->
```

`.once` 修饰符会转换为 `onSubmitOnce` prop，Vue 在首次触发后会移除处理器。但 `.stop`、`.prevent` 等修饰符对组件事件没有意义，因为组件事件不是真正的 DOM 事件。

## 事件命名约定

事件名应该使用 camelCase 或 kebab-case。Vue 会自动处理两者的转换：

```vue
<!-- 以下写法等价 -->
<MyComponent @my-event="handler" />
<MyComponent @myEvent="handler" />
```

事件名应该是动词或动词短语，描述发生了什么：`update`、`delete`、`select`、`change`、`submit`。避免使用名词作为事件名。

对于表示状态变化的事件，推荐使用 `update:xxx` 的格式。这不仅与 v-model 兼容，也清楚地表达了语义：

```javascript
// 表示值的更新
emit('update:value', newValue)
emit('update:visible', false)
emit('update:selectedIds', ids)
```

## 事件与响应式的关系

事件触发本身不涉及响应式——它只是一个函数调用。但事件触发后，父组件的处理器通常会修改响应式状态，从而触发重新渲染。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

// 事件处理器修改响应式状态
function handleIncrement(step) {
  count.value += step
}
</script>

<template>
  <Counter @increment="handleIncrement" />
  <p>Count: {{ count }}</p>
</template>
```

在这个例子中，`Counter` 组件触发 `increment` 事件，父组件的处理器修改 `count`，由于 `count` 是响应式的，视图会自动更新显示新值。事件是触发状态变更的信号，响应式系统负责将状态变更反映到视图上。

## 设计良好的事件接口

和 Props 一样，设计良好的事件接口对组件的易用性至关重要。

**事件名要有描述性**。`click` 太通用，`submitForm`、`deleteItem`、`selectOption` 更能表达意图。

**事件参数要精简**。传递必要的信息，避免传递冗余数据。如果需要传递多个值，使用对象而非多个参数：

```javascript
// 不推荐：参数过多
emit('update', id, name, value, timestamp)

// 推荐：使用对象
emit('update', { id, name, value, timestamp })
```

**保持一致性**。如果一个组件库的其他组件使用 `select` 事件表示选择，就不要在新组件中使用 `choose`。

**考虑是否需要取消**。某些操作可能需要支持取消，可以通过事件参数传递：

```javascript
emit('beforeDelete', {
  item,
  preventDefault: () => { cancelled = true }
})
if (!cancelled) {
  // 执行删除
}
```

**文档化**。记录每个事件的触发时机、参数类型和示例用法。

## 小结

Emits 是 Vue 组件向外通信的核心机制。通过声明式的 emits 选项，组件可以清晰地表达自己会触发哪些事件，并支持运行时验证和 TypeScript 类型检查。v-model 基于 props 和 emits 实现，提供了便捷的双向绑定语法。

理解 emit 的内部实现——本质上是查找并调用父组件传入的事件处理函数——有助于理解组件通信的本质。事件不是魔法，它是一种规范化的函数调用约定。

在下一章中，我们将探讨 Slots 插槽——一种更灵活的组件组合方式，让父组件可以向子组件传递内容和模板。
