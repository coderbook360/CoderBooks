# provide/inject 依赖注入

当你需要将数据从祖先组件传递到深层后代组件时，逐层传递 props 会变得非常繁琐。provide/inject 提供了一种"依赖注入"机制，让祖先组件可以作为其所有后代组件的依赖提供者，无论组件层级有多深。

## 问题的起源

考虑一个常见的场景：应用的主题设置。主题信息在根组件中定义，但需要被任意深度的子组件使用：

```vue
<!-- 使用 props 逐层传递 -->
<App>                         <!-- 定义 theme -->
  <Layout :theme="theme">
    <Sidebar :theme="theme">
      <NavItem :theme="theme" />  <!-- 终于用到了 -->
    </Sidebar>
    <Content :theme="theme">
      <Article :theme="theme">
        <CodeBlock :theme="theme" /> <!-- 这里也需要 -->
      </Article>
    </Content>
  </Layout>
</App>
```

Layout、Sidebar、Content、Article 这些中间组件都需要接收并传递 theme，即使它们自己并不使用它。这种现象被称为"prop 逐级透传"（prop drilling），它让组件之间产生了不必要的耦合。

provide/inject 解决了这个问题：

```vue
<!-- App.vue -->
<script setup>
import { provide, ref } from 'vue'
const theme = ref('light')
provide('theme', theme)
</script>

<!-- CodeBlock.vue (任意深度的后代) -->
<script setup>
import { inject } from 'vue'
const theme = inject('theme')
</script>
```

中间的组件完全不需要知道 theme 的存在。

## 基本用法

provide 接收两个参数：注入名（key）和值：

```javascript
import { provide, ref, readonly } from 'vue'

// 提供静态值
provide('appName', 'My App')

// 提供响应式值
const count = ref(0)
provide('count', count)

// 提供只读值（防止后代修改）
provide('count', readonly(count))

// 提供对象（通常包含状态和方法）
provide('counter', {
  count,
  increment: () => count.value++
})
```

inject 接收注入名，返回对应的值：

```javascript
import { inject } from 'vue'

// 基本用法
const appName = inject('appName')

// 提供默认值
const theme = inject('theme', 'light')

// 默认值是工厂函数
const config = inject('config', () => ({
  debug: false
}))
```

如果没有祖先组件 provide 对应的 key，且没有提供默认值，inject 会返回 undefined。在开发模式下，Vue 会发出警告。

## 使用 Symbol 作为 Key

字符串作为 key 存在命名冲突的风险。在大型应用或组件库中，推荐使用 Symbol：

```javascript
// keys.js
export const ThemeSymbol = Symbol('theme')
export const UserSymbol = Symbol('user')

// 祖先组件
import { ThemeSymbol } from './keys'
provide(ThemeSymbol, theme)

// 后代组件
import { ThemeSymbol } from './keys'
const theme = inject(ThemeSymbol)
```

Symbol 保证了全局唯一性，不会与其他代码冲突。

## 响应式的考量

provide 的值可以是响应式的，这样后代组件可以自动响应变化：

```javascript
// 祖先组件
const count = ref(0)
provide('count', count)

// 后代组件
const count = inject('count')
// count.value 会跟踪祖先的变化
```

但这引入了一个问题：后代组件是否可以修改这个值？

```javascript
// 后代组件
const count = inject('count')
count.value++  // 这会影响祖先和所有其他后代！
```

这破坏了单向数据流。推荐的做法是：

1. 使用 readonly 阻止直接修改
2. 提供修改方法，让修改通过祖先进行

```javascript
// 祖先组件
const count = ref(0)
function increment() {
  count.value++
}

provide('counter', {
  count: readonly(count),  // 只读
  increment               // 提供方法
})

// 后代组件
const { count, increment } = inject('counter')
// count.value++ 会失败，只能调用 increment()
```

这种模式保持了数据流的可追踪性——所有修改都通过祖先组件提供的方法进行。

## 应用级 Provide

除了在组件中 provide，还可以在应用级别提供：

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 应用级 provide
app.provide('appConfig', {
  apiUrl: 'https://api.example.com',
  debug: import.meta.env.DEV
})

app.mount('#app')
```

应用级 provide 对整个应用的所有组件可用。这适合提供全局配置、服务实例等。

## 实现原理

provide/inject 的实现原理相对简单。每个组件实例都有一个 `provides` 对象，inject 时沿着父组件链向上查找：

```javascript
// 简化的实现
function provide(key, value) {
  const currentInstance = getCurrentInstance()
  if (currentInstance) {
    let provides = currentInstance.provides
    // 如果是第一次 provide，创建新对象继承父组件的 provides
    const parentProvides = currentInstance.parent?.provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

function inject(key, defaultValue) {
  const currentInstance = getCurrentInstance()
  if (currentInstance) {
    // 从父组件的 provides 中查找
    const provides = currentInstance.parent?.provides
    if (provides && key in provides) {
      return provides[key]
    } else if (arguments.length > 1) {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    }
  }
}
```

关键点是 `Object.create(parentProvides)`——这创建了一个原型链，让查找可以沿着祖先链向上进行。子组件的 provides 继承父组件的 provides，当子组件自己 provide 同名的 key 时，会覆盖父组件的值，但不影响父组件本身。

## 与组件库开发

provide/inject 在组件库开发中非常有用。很多复合组件（如 Form/FormItem、Tabs/TabPane）使用这种模式：

```vue
<!-- Form.vue -->
<script setup>
import { provide, reactive } from 'vue'

const props = defineProps(['rules', 'model'])
const emit = defineEmits(['validate'])

const formContext = reactive({
  model: props.model,
  rules: props.rules,
  fields: [],
  registerField(field) {
    this.fields.push(field)
  },
  unregisterField(field) {
    const index = this.fields.indexOf(field)
    if (index !== -1) this.fields.splice(index, 1)
  },
  validate() {
    return Promise.all(this.fields.map(f => f.validate()))
  }
})

provide('form', formContext)

defineExpose({
  validate: formContext.validate
})
</script>

<template>
  <form @submit.prevent="$emit('submit')">
    <slot></slot>
  </form>
</template>

<!-- FormItem.vue -->
<script setup>
import { inject, onMounted, onUnmounted } from 'vue'

const props = defineProps(['name', 'rules'])
const form = inject('form')

const fieldContext = {
  name: props.name,
  validate() {
    const value = form.model[props.name]
    const rules = props.rules || form.rules?.[props.name]
    // 执行验证逻辑...
  }
}

onMounted(() => {
  form?.registerField(fieldContext)
})

onUnmounted(() => {
  form?.unregisterField(fieldContext)
})
</script>

<template>
  <div class="form-item">
    <slot></slot>
  </div>
</template>
```

FormItem 通过 inject 获取 Form 的上下文，注册自己为表单字段。Form 不需要知道有多少个 FormItem，FormItem 也不需要通过 props 接收 Form 的引用。这种松耦合让组件更加灵活。

## 最佳实践

**明确依赖关系**。虽然 provide/inject 创建了隐式依赖，但你应该在文档或类型定义中明确：

```typescript
// 定义 provide 的类型
interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggleTheme: () => void
}

// 创建带类型的 inject 辅助函数
export function useTheme(): ThemeContext {
  const ctx = inject<ThemeContext>('theme')
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
```

**限制修改权限**。使用 readonly 防止后代直接修改数据，提供明确的方法进行修改。

**提供默认值**。考虑组件在没有祖先 provide 时的行为。必要时使用默认值或抛出明确的错误。

**避免过度使用**。provide/inject 应该用于真正需要跨多层传递的数据。对于简单的父子通信，props/emits 更加直观。

## 与 React Context 的对比

如果你有 React 背景，provide/inject 类似于 React 的 Context API。主要区别是：

- Vue 的 provide/inject 使用 key 而非 Context 对象
- Vue 不需要 Provider 组件包裹
- Vue 的 inject 可以有默认值
- Vue 的响应式系统让数据变化自动触发更新

```javascript
// React Context
const ThemeContext = createContext('light')
<ThemeContext.Provider value="dark">
  <App />
</ThemeContext.Provider>
const theme = useContext(ThemeContext)

// Vue provide/inject
provide('theme', 'dark')
const theme = inject('theme', 'light')
```

Vue 的方式更加简洁，不需要额外的 Provider 组件。

## 小结

provide/inject 是 Vue 的依赖注入机制，解决了深层组件间的数据传递问题。它让祖先组件可以向任意深度的后代"注入"数据，而不需要逐层传递 props。

理解 provide/inject 的原型链实现有助于理解其行为：子组件的 provides 继承父组件的 provides，inject 沿着这条链向上查找。响应式数据可以被 provide，但建议使用 readonly 和方法来维护单向数据流。

在组件库开发中，provide/inject 是实现复合组件通信的利器。但它创建了隐式依赖，应该谨慎使用，并通过类型定义和文档使依赖关系明确。

在下一章中，我们将探讨异步组件和懒加载的设计思想，理解 Vue 如何处理动态加载的组件。
