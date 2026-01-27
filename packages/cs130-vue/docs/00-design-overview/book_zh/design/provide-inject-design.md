# Provide/Inject 的跨层级通信设计

当组件树层级较深时，逐层传递 props 变得繁琐。Vue 提供的 provide/inject 机制让祖先组件可以直接向后代组件传递数据。

## 问题场景

考虑一个多层嵌套的布局：

```
App
└── Layout
    └── Sidebar
        └── NavMenu
            └── NavItem  ← 需要访问 App 的主题配置
```

如果用 props 传递主题配置，每一层都要声明和传递这个 prop，即使中间层自己不使用它。这就是所谓的 "prop drilling"。

## 基本用法

provide 在祖先组件中提供数据：

```javascript
// App.vue
import { provide, ref } from 'vue'

export default {
  setup() {
    const theme = ref('light')

    provide('theme', theme)
    provide('toggleTheme', () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    })
  }
}
```

inject 在后代组件中注入数据：

```javascript
// NavItem.vue
import { inject } from 'vue'

export default {
  setup() {
    const theme = inject('theme')
    const toggleTheme = inject('toggleTheme')

    return { theme, toggleTheme }
  }
}
```

不管中间隔了多少层，后代组件都能直接获取祖先提供的数据。

## 响应式保持

provide 可以传递响应式数据，inject 接收的也是响应式的：

```javascript
// 祖先
const count = ref(0)
provide('count', count)

// 后代
const count = inject('count')
// count 是响应式的，变化会触发更新
```

但要注意，如果 provide 传递的是普通值，inject 接收的就不是响应式的：

```javascript
// 祖先
provide('count', 0)  // 普通值

// 后代
const count = inject('count')  // 0，不是响应式的
```

为了保持响应式，有两种策略：

```javascript
// 策略 1：传递 ref
provide('count', ref(0))

// 策略 2：传递 reactive 对象
provide('state', reactive({ count: 0, name: '' }))
```

## 只读保护

默认情况下，inject 获取的响应式数据可以被修改。为了防止子组件意外修改祖先的状态，可以使用 readonly：

```javascript
// 祖先
const state = reactive({ count: 0 })
provide('state', readonly(state))
provide('updateCount', (value) => { state.count = value })

// 后代
const state = inject('state')
const updateCount = inject('updateCount')

state.count = 1       // 警告：只读
updateCount(1)        // 通过函数修改，正确方式
```

这遵循了单向数据流原则：数据由提供者管理，消费者只能通过提供者暴露的方法修改。

## 默认值处理

inject 的第二个参数是默认值：

```javascript
const theme = inject('theme', 'light')  // 如果没有 provide，使用 'light'

// 工厂函数形式
const config = inject('config', () => ({ debug: false }), true)
// 第三个参数 true 表示第二个参数是工厂函数
```

这让组件可以在没有祖先提供数据时也能正常工作。

## Symbol 作为 key

使用字符串作为 key 可能有命名冲突。大型应用或库开发中，推荐使用 Symbol：

```javascript
// keys.js
export const ThemeKey = Symbol('theme')
export const UserKey = Symbol('user')

// 祖先
import { ThemeKey } from './keys'
provide(ThemeKey, theme)

// 后代
import { ThemeKey } from './keys'
const theme = inject(ThemeKey)
```

Symbol 保证唯一性，不会和其他库或组件冲突。

## 与 Pinia 的对比

provide/inject 和 Pinia 都能解决跨组件状态共享，但定位不同：

provide/inject 适合：

- 组件树局部的配置传递（主题、语言）
- 父子组件系列间的通信（表单和表单项）
- 不需要持久化的临时状态

Pinia 适合：

- 全局共享的业务状态
- 需要持久化的状态
- 复杂的状态逻辑和计算

```javascript
// provide/inject：组件树内部
provide('formContext', { validate, reset })

// Pinia：全局状态
const userStore = useUserStore()
```

两者可以结合使用：Pinia 管理全局业务状态，provide/inject 处理组件层级的配置传递。

## 设计权衡

provide/inject 有一个潜在问题：数据来源不够显式。看代码时不容易知道 inject 的数据是哪个祖先提供的。

Vue 通过几种方式缓解这个问题：

TypeScript 类型推断让 inject 的类型更明确。

使用 Symbol key 让依赖关系通过 import 可追踪。

配合 DevTools 可以可视化 provide/inject 关系。

尽管如此，过度使用 provide/inject 仍可能让代码难以理解。建议在确实需要跨多层传递数据时才使用，简单的父子通信用 props/emit 更清晰。
