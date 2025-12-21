# Vue 3 与 Vue 2 的架构差异对比

从 Vue 2 到 Vue 3，不是简单的版本迭代，而是一次彻底的架构重写。

**本章系统梳理两个版本的核心差异。** 理解这些差异，能帮你建立正确的认知基础，也能让你从 Vue 2 的经验更快过渡到 Vue 3。

## 响应式系统：从 defineProperty 到 Proxy

这是最根本的变化。

### Vue 2 的实现：Object.defineProperty

Vue 2 的响应式基于 ES5 的 `Object.defineProperty`：

```javascript
function defineReactive(obj, key, val) {
  // 每个属性都有自己的依赖收集器
  const dep = new Dep()
  
  Object.defineProperty(obj, key, {
    get() {
      // 依赖收集：当属性被读取时
      // 将当前正在执行的 watcher 添加到依赖列表
      dep.depend()
      return val
    },
    set(newVal) {
      // 值相同则跳过
      if (newVal === val) return
      // 更新闭包中的值
      val = newVal
      // 触发更新：通知所有依赖这个属性的 watcher
      dep.notify()
    }
  })
}

// 使用时需要对每个属性单独调用
// defineReactive(obj, 'name', obj.name)
// defineReactive(obj, 'age', obj.age)
// 这就是为什么 Vue 2 需要在初始化时遍历整个对象
```

这个 API 的特点是：**拦截的是属性的读写操作**。

要让一个对象变成响应式，Vue 2 需要遍历它的所有属性，对每个属性调用 `defineReactive`。如果属性值还是对象，还需要递归处理。

这带来了几个问题：

**无法检测属性添加**：

```javascript
const state = Vue.observable({ name: 'Vue' })
state.version = 3  // 不会触发更新！
```

`Object.defineProperty` 只能拦截已存在的属性。新增属性没有被拦截，自然不会触发更新。Vue 2 提供了 `Vue.set` 作为补丁：

```javascript
Vue.set(state, 'version', 3)  // 这样才能触发更新
```

**数组索引问题**：

```javascript
const state = Vue.observable({ list: [1, 2, 3] })
state.list[0] = 10  // 不会触发更新！
```

虽然技术上可以用 `defineProperty` 拦截数组索引，但性能代价太高（需要为每个索引设置 getter/setter）。Vue 2 选择重写数组的变异方法（push、pop、splice 等），而不是拦截索引：

```javascript
state.list.push(4)      // ✅ 触发更新
state.list.splice(0, 1, 10)  // ✅ 触发更新
state.list[0] = 10      // ❌ 不触发更新
```

**初始化性能**：

深层嵌套的对象在初始化时需要递归遍历，全部转换为响应式。即使某些深层属性从未被访问，也会有转换开销。

### Vue 3 的实现：Proxy

Vue 3 改用 ES6 的 `Proxy`：

```javascript
function reactive(target) {
  return new Proxy(target, {
    // get 拦截器：拦截所有属性读取，包括新增属性
    get(target, key, receiver) {
      // 收集依赖：记录"谁在读取这个属性"
      track(target, key)
      
      // 使用 Reflect 保证正确的 this 指向
      const result = Reflect.get(target, key, receiver)
      
      // 惰性代理：只有真正访问到嵌套对象时才创建代理
      // 对比 Vue 2 的递归遍历，这里的性能更好
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },
    
    // set 拦截器：拦截所有属性设置，包括新增属性
    set(target, key, value, receiver) {
      // 先执行实际的赋值操作
      const result = Reflect.set(target, key, value, receiver)
      // 触发更新：通知所有订阅了这个属性的 effect
      trigger(target, key)
      return result
    }
    // Proxy 还支持 deleteProperty、has 等拦截器
    // Vue 3 利用这些实现了对属性删除、in 操作符的响应式
  })
}
```

`Proxy` 的特点是：**拦截的是对象上的所有操作**。

这意味着：

**自动检测属性添加**：

```javascript
const state = reactive({ name: 'Vue' })
state.version = 3  // ✅ 自动触发更新
```

新属性的赋值也会经过 `set` 拦截器，无需任何特殊处理。

**原生数组支持**：

```javascript
const state = reactive({ list: [1, 2, 3] })
state.list[0] = 10  // ✅ 自动触发更新
state.list.length = 0  // ✅ 清空数组也能检测
```

`Proxy` 可以拦截任何属性的读写，包括数组索引和 `length`。

**惰性代理**：

Vue 3 不在初始化时递归遍历整个对象。只有当访问某个属性时，才会检查其值是否需要转换为响应式。如果一个深层属性从未被访问，就永远不会被处理。

### 代价

`Proxy` 不能被 polyfill。这意味着 Vue 3 不支持 IE11。这是一个有意的取舍——为了更好的开发体验和性能，放弃对老旧浏览器的支持。

## 组件 API：从 Options 到 Composition

### Options API 的问题

Vue 2 的组件使用 Options API：

```javascript
export default {
  data() {
    return {
      count: 0,
      user: null
    }
  },
  computed: {
    double() {
      return this.count * 2
    }
  },
  methods: {
    increment() {
      this.count++
    },
    async fetchUser() {
      this.user = await api.getUser()
    }
  },
  mounted() {
    this.fetchUser()
  }
}
```

这种组织方式在小型组件中工作良好，但随着组件变大，问题出现了：

**逻辑分散**：一个功能的代码被拆分到 `data`、`computed`、`methods`、`mounted` 等不同位置。当组件有多个功能时，相关代码交织在一起，难以理解和维护。

**逻辑复用困难**：Vue 2 提供 mixins 来复用逻辑，但 mixins 有严重的问题：

- 命名冲突：多个 mixins 可能定义同名属性
- 数据来源不清晰：`this.xxx` 可能来自组件、可能来自某个 mixin
- 类型推断困难：TypeScript 很难正确推断 `this` 的类型

### Composition API 的解决方案

Vue 3 引入了 Composition API：

```javascript
import { ref, computed, onMounted } from 'vue'

// 把"计数器"相关的逻辑封装成一个函数
// 命名约定：以 use 开头，称为"组合式函数"（Composable）
function useCounter() {
  // ref 创建响应式引用，.value 访问/修改值
  const count = ref(0)
  
  // computed 创建计算属性，自动追踪依赖
  const double = computed(() => count.value * 2)
  
  // 普通函数，操作响应式数据
  const increment = () => count.value++
  
  // 返回需要暴露的状态和方法
  return { count, double, increment }
}

// 把"用户"相关的逻辑封装成另一个函数
function useUser() {
  const user = ref(null)
  
  async function fetchUser() {
    user.value = await api.getUser()
  }
  
  // 生命周期钩子也可以在组合式函数中使用
  onMounted(fetchUser)
  
  return { user, fetchUser }
}

export default {
  setup() {
    // 在组件中组合多个功能
    // 数据来源清晰：counter 来自 useCounter
    const counter = useCounter()
    // userState 来自 useUser
    const userState = useUser()
    
    // 暴露给模板
    return { ...counter, ...userState }
  }
}

// 优势：
// 1. 相关代码在一起（useCounter 里全是计数器逻辑）
// 2. 可复用（useCounter 可以在任何组件中使用）
// 3. 类型安全（每个变量类型明确，TypeScript 完美支持）
```

**按功能组织**：相关逻辑放在一起，而不是按选项类型分散。

**自然的复用**：函数是 JavaScript 最基本的复用单元。`useCounter` 可以在任意组件中调用，没有命名冲突问题。

**完美的类型推断**：每个变量都有明确的类型，TypeScript 可以完整推断。

### 两者共存

Vue 3 同时支持 Options API 和 Composition API。你可以继续使用 Options API，甚至可以在同一个组件中混用两者。Composition API 是一个补充，不是替代。

## 全局 API 重构

### Vue 2：全局实例

Vue 2 的 API 挂在全局 `Vue` 对象上：

```javascript
import Vue from 'vue'

Vue.component('MyComponent', { /* ... */ })
Vue.mixin({ /* ... */ })
Vue.use(VueRouter)
Vue.use(Vuex)

new Vue({
  el: '#app',
  router,
  store
})
```

问题：

- **全局污染**：`Vue.component` 注册的组件影响所有实例
- **测试困难**：每个测试都共享全局状态，难以隔离
- **多应用冲突**：页面上有多个 Vue 应用时，它们共享配置

### Vue 3：应用实例

Vue 3 引入 `createApp`：

```javascript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

app.component('MyComponent', { /* ... */ })
app.use(VueRouter)
app.use(Vuex)

app.mount('#app')
```

每个 `createApp` 创建一个独立的应用实例，拥有独立的配置和插件：

```javascript
const app1 = createApp(App1)
app1.config.errorHandler = handler1

const app2 = createApp(App2)
app2.config.errorHandler = handler2  // 互不影响
```

这对微前端场景尤其重要——一个页面上的多个 Vue 应用可以完全独立运行。

## 编译优化

Vue 3 的编译器生成更高效的渲染函数。

### 静态提升

Vue 2：静态节点每次渲染都重新创建。

```javascript
// Vue 2 编译输出
function render() {
  // 每次 render 都会创建新的 VNode 对象
  // 即使 'static' 永远不会变化
  return h('div', [
    h('span', 'static'),  // 每次都创建新对象，浪费内存
    h('span', this.dynamic)
  ])
}
// 问题：运行时无法知道哪些是静态的，必须全量 Diff
```

Vue 3：静态节点提升到模块作用域，只创建一次。

```javascript
// Vue 3 编译输出
// 静态节点被"提升"到 render 函数外部
// 整个应用生命周期只创建一次
const _hoisted = h('span', 'static')

function render(ctx) {
  return h('div', [
    _hoisted,  // 直接复用同一个对象，引用不变
    h('span', ctx.dynamic)
  ])
}
// 好处：
// 1. 节省内存（不重复创建）
// 2. Diff 时可以直接跳过（引用相同 = 内容相同）
```

### PatchFlags

Vue 2：Diff 时比较节点的所有属性。

Vue 3：编译器标记每个动态节点的变化类型：

```javascript
// 编译器分析模板，知道只有 class 是动态的
// 于是生成 PatchFlag = 2（CLASS 常量）
h('span', { class: dynamicClass }, 'text', 2 /* CLASS */)

// PatchFlags 常量定义（简化）：
// TEXT = 1      // 只有文本是动态的
// CLASS = 2     // 只有 class 是动态的
// STYLE = 4     // 只有 style 是动态的
// PROPS = 8     // 有动态属性（非 class/style）
// FULL_PROPS = 16  // 有动态 key，需要完整 Diff
```

运行时只比较标记的部分，跳过静态属性。

### Block Tree

Vue 2：Diff 时遍历整个子树。

Vue 3：编译器识别结构稳定的区域，生成 Block。Block 追踪其内部所有动态节点的扁平数组，Diff 时直接比较这个数组，跳过树遍历。

## 新增特性

### Fragment

Vue 2 组件必须有单一根节点：

```vue-html
<!-- Vue 2：必须包裹 -->
<template>
  <div>
    <header>...</header>
    <main>...</main>
  </div>
</template>
```

Vue 3 支持多根节点：

```vue-html
<!-- Vue 3：直接多根 -->
<template>
  <header>...</header>
  <main>...</main>
</template>
```

### Teleport

将子节点渲染到 DOM 的其他位置：

```vue-html
<template>
  <button @click="open = true">打开弹窗</button>
  <Teleport to="body">
    <div v-if="open" class="modal">
      弹窗内容
    </div>
  </Teleport>
</template>
```

弹窗内容会渲染到 `<body>` 下，而不是组件内部，避免 CSS 层级和定位问题。

### Suspense

协调异步组件的加载状态：

```vue-html
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>
```

在异步组件加载完成前显示 fallback 内容。

### 自定义渲染器 API

Vue 3 正式暴露了 `createRenderer` API，让你可以把 Vue 渲染到任何平台，不仅仅是 DOM。

## TypeScript 支持

Vue 2 用 Flow 做类型检查，社区通过 `@vue/composition-api` 包提供 Vue 3 风格的 API。

Vue 3 完全用 TypeScript 编写，类型定义是第一公民：

```typescript
// 完整的类型推断
const count = ref(0)  // Ref<number>
const double = computed(() => count.value * 2)  // ComputedRef<number>

function useUser() {
  const user = ref<User | null>(null)
  // 明确的类型签名
}
```

IDE 可以提供准确的自动补全和错误提示。

## 本章小结

Vue 3 相对于 Vue 2 的核心变化：

**响应式系统**
- Vue 2：`Object.defineProperty`，属性级拦截，需要 `Vue.set` 处理新增属性
- Vue 3：`Proxy`，对象级拦截，自动检测所有变化

**组件 API**
- Vue 2：Options API，按选项类型组织代码
- Vue 3：Composition API（与 Options API 共存），按功能逻辑组织代码

**全局 API**
- Vue 2：挂载在全局 `Vue` 对象上，所有应用共享配置
- Vue 3：`createApp` 创建独立应用实例，配置隔离

**编译优化**
- Vue 2：基础优化，每次渲染创建新 VNode
- Vue 3：静态提升 + PatchFlags + Block Tree，大幅减少运行时开销

**TypeScript 支持**
- Vue 2：Flow 类型检查 + 社区维护的类型定义
- Vue 3：原生 TypeScript 编写，完整类型推断

这些变化的共同目标是：**更快、更小、更易维护**。

从下一部分开始，我们将深入响应式系统的实现，亲手构建 `reactive`、`ref`、`computed` 等核心 API。

---

## 练习与思考

1. 在 Vue 2 和 Vue 3 中分别测试以下代码，观察差异：

```javascript
// Vue 2
const state = Vue.observable({ list: [] })
state.list[0] = 'test'
console.log(state.list)  // 观察是否触发更新

// Vue 3
const state = reactive({ list: [] })
state.list[0] = 'test'
console.log(state.list)  // 观察是否触发更新
```

2. 将一个使用 mixins 的 Vue 2 组件重构为使用 Composition API 的 Vue 3 组件，体会两种方式的差异。

3. 思考：Vue 3 放弃 IE11 支持是否是一个正确的决定？这个决定反映了什么样的设计哲学？
