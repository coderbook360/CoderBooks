# 组件通信模式

组件化开发的一个核心挑战是组件之间的通信。Vue 提供了多种通信方式，每种都有其适用场景。选择正确的通信方式，是写出可维护代码的关键。

## 通信方式全景

在深入每种方式之前，先建立一个全景图：

**Props/Emits** 是最基础的方式，适用于父子组件之间的直接通信。数据通过 props 从父流向子，事件通过 emits 从子流向父。

**v-model** 是 props/emits 的语法糖，专门为双向绑定场景设计。当子组件需要"编辑"父组件的数据时，v-model 是最自然的选择。

**Provide/Inject** 解决了深层嵌套时的 props 透传问题。祖先组件可以向任意深度的后代组件注入数据，无需通过每一层显式传递。

**Template Refs** 允许父组件直接访问子组件实例或 DOM 元素。这打破了常规的数据流，应该谨慎使用。

**Event Bus** 在 Vue 2 时代是跨组件通信的常用方式，但在 Vue 3 中已不推荐，被更好的替代方案取代。

**状态管理（Pinia/Vuex）** 适用于多个组件需要共享状态的场景，特别是那些没有直接父子关系的组件。

## Props 和 Emits：基础之道

Props 和 Emits 是 Vue 组件通信的基石。它们实现了清晰的单向数据流：

```html
<!-- 父组件 -->
<script setup>
import { ref } from 'vue'
const count = ref(0)

function handleIncrement(step) {
  count.value += step
}
</script>

<template>
  <Counter :count="count" @increment="handleIncrement" />
</template>

<!-- Counter.vue -->
<script setup>
defineProps(['count'])
const emit = defineEmits(['increment'])

function increment() {
  emit('increment', 1)
}
</script>

<template>
  <button @click="increment">{{ count }}</button>
</template>
```

这个模式的优点是数据流向清晰——一眼就能看出数据从哪里来、事件到哪里去。缺点是当组件嵌套较深时，需要层层传递 props 和事件，代码会变得繁琐。

一个经常被问到的问题是：什么时候用 props 传递数据，什么时候让子组件自己获取？原则是：如果数据是子组件行为的"输入"，用 props；如果数据是子组件内部的实现细节，让子组件自己处理。

```html
<!-- 好：用户 ID 是输入，用户详情由子组件获取 -->
<UserCard :userId="123" />

<!-- 避免：过度传递数据 -->
<UserCard 
  :userName="user.name" 
  :userEmail="user.email"
  :userAvatar="user.avatar"
  :userBio="user.bio"
/>
```

第一种方式更好——子组件只接收必要的标识符，自己负责获取详细数据。这减少了父子组件的耦合。

## Provide/Inject：跨层级通信

当组件嵌套很深时，层层传递 props 变得痛苦。Provide/Inject 提供了一种"隧道"机制：

```html
<!-- 祖先组件 -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('light')
const toggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

provide('theme', { theme, toggleTheme })
</script>

<!-- 深层后代组件 -->
<script setup>
import { inject } from 'vue'

const { theme, toggleTheme } = inject('theme')
</script>

<template>
  <div :class="theme">
    <button @click="toggleTheme">切换主题</button>
  </div>
</template>
```

Provide/Inject 特别适合以下场景：

**应用级配置**，如主题、国际化、用户信息等需要在整个应用中访问的数据。

**组件库的内部通信**，如 Form 和 FormItem、Tabs 和 TabPane 之间的关系。

```html
<!-- Form.vue -->
<script setup>
import { provide, reactive } from 'vue'

const formState = reactive({
  values: {},
  errors: {},
  registerField: (name) => { /* ... */ },
  setFieldValue: (name, value) => { /* ... */ }
})

provide('form', formState)
</script>

<!-- FormItem.vue -->
<script setup>
import { inject, onMounted } from 'vue'

const props = defineProps(['name'])
const form = inject('form')

onMounted(() => {
  form.registerField(props.name)
})
</script>
```

需要注意的是，Provide/Inject 创建了一种隐式的依赖关系。从代码上不容易看出子组件依赖于某个祖先的 provide。建议：

- 为 provide 的 key 使用 Symbol 或明确的命名
- 在组件文档中说明 inject 依赖
- 考虑提供默认值处理祖先未 provide 的情况

```javascript
// 使用 Symbol 作为 key
const ThemeSymbol = Symbol('theme')
provide(ThemeSymbol, theme)
const theme = inject(ThemeSymbol, 'light') // 提供默认值
```

## Template Refs：直接访问

有时候你需要直接访问子组件实例或 DOM 元素。Template refs 提供了这种能力：

```html
<script setup>
import { ref, onMounted } from 'vue'
import ChildComponent from './ChildComponent.vue'

const inputRef = ref(null)
const childRef = ref(null)

onMounted(() => {
  // 访问 DOM 元素
  inputRef.value.focus()
  
  // 访问子组件暴露的方法
  childRef.value.doSomething()
})
</script>

<template>
  <input ref="inputRef" />
  <ChildComponent ref="childRef" />
</template>
```

子组件默认会暴露其全部公开属性。使用 `<script setup>` 时，组件默认不暴露任何内容，需要使用 `defineExpose` 明确指定：

```html
<!-- ChildComponent.vue -->
<script setup>
const count = ref(0)
const privateMethod = () => { /* 内部方法 */ }
const publicMethod = () => { /* 对外方法 */ }

// 只暴露需要的部分
defineExpose({
  count,
  publicMethod
})
</script>
```

Template refs 是一种"逃生舱"——它打破了正常的数据流，让父组件可以命令式地操作子组件。这在某些场景是必要的（如调用子组件的 focus 方法），但过度使用会让组件间的关系变得不清晰。原则是：能用 props/emits 解决的，就不要用 refs。

## 状态管理：全局共享

当多个不相关的组件需要共享状态时，props 透传和 provide/inject 都不是好的选择。这时候需要状态管理解决方案。

Pinia 是 Vue 官方推荐的状态管理库：

```javascript
// stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0
  }),
  getters: {
    double: (state) => state.count * 2
  },
  actions: {
    increment() {
      this.count++
    }
  }
})

// 任意组件中使用
import { useCounterStore } from '@/stores/counter'

const counter = useCounterStore()
counter.increment()
console.log(counter.count, counter.double)
```

状态管理的适用场景：

- 用户登录状态
- 购物车数据
- 应用配置
- 需要在多个页面间保持的状态

不适合放入状态管理的：

- 仅在单个组件中使用的局部状态
- 表单的临时输入状态
- UI 状态如模态框的开关

过度使用状态管理会让简单的事情变复杂。一个好的判断标准是：这个状态是否需要在组件卸载后保留？是否需要被多个无关组件访问？

## 选择合适的方式

面对具体场景，如何选择通信方式？这里是一个决策流程：

**父子组件之间**：首选 props/emits。如果是双向绑定场景，用 v-model。

**爷孙或更深层级**：如果只是少数几个值需要传递，provide/inject 是好选择。如果涉及复杂的状态管理，考虑 Pinia。

**兄弟组件**：通过共同的父组件中转，或使用状态管理。

**跨页面保持状态**：状态管理 + 持久化。

**临时的命令式操作**：template refs，但要节制使用。

一个常见的误区是把所有状态都放入状态管理。这会让代码变得冗余——简单的父子通信用 props/emits 就够了。状态管理是为真正的"全局状态"准备的。

另一个误区是滥用 refs 来获取子组件数据。如果你发现自己经常通过 refs 读取子组件的状态，可能需要重新思考数据的归属——也许这些数据应该由父组件管理。

## 通信的边界

好的组件设计应该有清晰的通信边界。每个组件应该：

- 明确自己接收什么输入（props）
- 明确自己产生什么输出（emits）
- 尽量减少对外部的隐式依赖（inject）
- 谨慎暴露内部方法（expose）

当你发现一个组件的 props 越来越多，或者频繁地 inject 各种依赖，这是一个信号——组件可能承担了太多职责，需要重新设计。

组件通信的最高境界是"无需通信"——每个组件足够独立，只需要最少的接口与外界交互。这需要仔细思考数据的归属和组件的职责划分。

## 小结

Vue 提供了丰富的组件通信方式：props/emits 用于父子直接通信，provide/inject 解决深层透传，template refs 提供命令式访问，状态管理处理全局共享。选择合适的方式需要理解每种方式的适用场景和代价。

通信方式的选择反映了组件设计的质量。过于复杂的通信模式往往意味着组件划分或数据归属需要重新审视。保持通信模式简单清晰，是写出可维护代码的关键。

在下一章中，我们将深入探讨 provide/inject 的设计思想和实现细节，理解这个看似简单的 API 背后的考量。
