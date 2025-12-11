# Vue 3 的设计目标与核心理念

Vue 2 是一个极其成功的框架——2018 年时全球有超过 100 万开发者在使用它。

**既然如此成功，为什么还要“推倒重来”做 Vue 3？这是我们首先要问的问题。** 理解这个问题的答案，是理解整个 Vue 3 架构设计的基础。

## 从"成功的困境"说起

Vue 2 在 2014 年发布，彼时的 JavaScript 生态与今天截然不同。ES6 才刚刚定稿，TypeScript 还是小众选择，Proxy 的浏览器支持几乎为零。Vue 2 基于当时的技术条件做出了最优选择：

- 用 `Object.defineProperty` 实现响应式
- 用 Flow 做类型检查
- 采用单一仓库的代码组织方式

这些选择在当时是正确的，但随着时间推移，它们逐渐成为瓶颈：

**响应式系统的局限**：`Object.defineProperty` 无法检测属性的添加和删除，无法直接监听数组索引变化。这导致了 `Vue.set`、`Vue.delete` 等"补丁 API"的出现，增加了学习成本和心智负担。

**类型系统的不足**：Flow 的生态发展缓慢，类型推断能力有限。Vue 2 的 Options API 对 TypeScript 支持很差——`this` 的类型推断几乎不可能做好。

**代码架构的僵化**：所有代码在一个仓库里，模块之间耦合严重。想单独使用响应式系统？不行，你必须引入完整的 Vue。

尤雨溪在 2018 年开始规划 Vue 3，目标很明确：**不是修修补补，而是利用现代 JavaScript 的能力，从架构层面解决这些根本性问题**。

## 设计目标一：更快

Vue 3 的性能提升来自三个层面。

### 运行时：Proxy 替代 defineProperty

思考一下，`Object.defineProperty` 的问题在哪里？

它是**属性级别**的拦截——你需要遍历对象的每个属性，逐一设置 getter 和 setter。这带来两个问题：

1. 初始化时需要递归遍历整个对象，有性能开销
2. 新增属性无法被自动监听

而 `Proxy` 是**对象级别**的拦截：

```javascript
const proxy = new Proxy(target, {
  // 不管访问什么属性，都会经过这个 get
  // 包括 target 上原本不存在的属性
  get(target, key) { /* 拦截所有读取 */ },
  
  // 不管设置什么属性，都会经过这个 set
  // target.existingProp = 1  ✅ 会触发
  // target.newProp = 1       ✅ 也会触发
  set(target, key, value) { /* 拦截所有设置 */ }
})

// 一次代理，一劳永逸
// Proxy 还支持拦截 delete、in、for...in 等操作
```

一次代理，所有属性的访问都被拦截，包括新增的属性。而且 `Proxy` 支持拦截数组的索引操作，不需要任何 hack。

### 编译时：静态分析与优化

Vue 的模板不是普通的字符串——它是一种 DSL（领域特定语言），包含的信息量远比运行时 JavaScript 丰富。编译器可以利用这些信息做优化：

**静态提升**：模板中的静态内容（不含任何动态绑定的节点）只需要创建一次，之后每次渲染直接复用。

**PatchFlags**：编译器分析每个动态节点，生成一个标记告诉运行时"这个节点只有 class 是动态的"或"只有 text 是动态的"。更新时可以跳过不必要的比较。

**Block Tree**：编译器识别结构稳定的区域，让 Diff 算法可以跳过子树遍历，直接定位到动态节点。

这些优化让 Vue 3 的更新性能提升了 1.3 到 2 倍，尤其在大型应用中效果显著。

### 包体积：Tree-shaking 友好

Vue 2 的 API 挂在 `Vue` 全局对象上：

```javascript
import Vue from 'vue'
Vue.component(...)  // 全局注册组件
Vue.mixin(...)      // 全局混入
Vue.directive(...)  // 全局指令

// 问题：打包工具看到的是 `Vue.xxx`
// 它无法静态分析你用了哪些方法，只能把整个 Vue 对象打包
```

这种设计对 Tree-shaking 不友好——打包工具无法确定你是否使用了 `Vue.component`，只能把整个 Vue 打包进去。

Vue 3 改为命名导出：

```javascript
import { ref, computed, watch } from 'vue'

// 只导入需要的 API
// 打包工具可以静态分析：
// - ref 被使用了 ✅ 打包
// - computed 被使用了 ✅ 打包
// - reactive 没有导入 ❌ 不打包
// - KeepAlive 没有导入 ❌ 不打包
```

没用到的功能（比如 `KeepAlive`、`Teleport`）不会出现在最终产物中。结果是：一个最小的 Vue 3 应用只有约 13.5KB gzipped，而 Vue 2 是 22.5KB。

## 设计目标二：更小

"更小"不仅仅是初始包体积的减小，更是**按需加载能力的提升**。

Vue 3 的核心设计理念是：**你只为你使用的功能付费**。

以内置组件为例：

- `<KeepAlive>` 只在使用时才打包
- `<Teleport>` 只在使用时才打包
- `<Transition>` 只在使用时才打包

如果你的应用只用到 `ref` 和 `computed`，那么 `watch`、`watchEffect`、生命周期钩子等功能都不会打包。

这得益于两个架构决策：

1. **命名导出**：所有 API 以 ES Module 的方式导出
2. **模块化拆分**：响应式、运行时、编译器分离成独立的包

## 设计目标三：更易维护

Vue 3 使用 TypeScript 完全重写，这不仅仅是语言选择的变化，更体现了对代码质量和开发体验的追求。

### TypeScript 优先

Vue 2 用 Flow 做类型检查，但 Flow 的生态日渐式微，类型推断能力也不如 TypeScript。更关键的是，Options API 的设计让 TypeScript 很难发挥作用：

```javascript
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++ // this 的类型怎么推断？
    }
  }
}
```

`this` 指向一个动态构造的对象，包含 data、methods、computed 等多个来源的属性，TypeScript 很难正确推断。

Composition API 解决了这个问题：

```typescript
import { ref } from 'vue'

const count = ref(0) // 类型: Ref<number>
const increment = () => count.value++ // 完全类型安全
```

每个变量都有明确的类型，IDE 可以提供完整的自动补全和错误提示。

### Monorepo 架构

Vue 3 采用 monorepo 结构，把代码拆分成多个独立的包：

- `@vue/reactivity`：响应式系统，可独立使用
- `@vue/runtime-core`：与平台无关的运行时核心
- `@vue/runtime-dom`：DOM 相关的运行时
- `@vue/compiler-core`：与平台无关的编译器核心
- `@vue/compiler-dom`：DOM 相关的编译器

这种架构有几个好处：

**可独立使用**：只想用响应式？`npm install @vue/reactivity` 就够了。

**职责清晰**：每个包只负责一件事，代码边界明确。

**便于测试**：每个包可以独立测试，不需要启动完整的 Vue 环境。

**便于贡献**：新贡献者可以专注于某一个包，不需要理解整个框架。

## 渐进式框架理念

"渐进式"是 Vue 一直以来的设计哲学，但 Vue 3 把它做得更彻底。

所谓渐进式，是指你可以**按需选择框架的功能**：

- 只需要响应式？用 `@vue/reactivity`
- 只需要运行时？用 `@vue/runtime-core`
- 需要完整功能？用 `vue`
- 需要 SSR？加上 `@vue/server-renderer`

Vue 3 的 `createApp` 设计也体现了这一点：

```javascript
// Vue 2：全局配置，所有应用共享
Vue.config.xxx = ...
Vue.mixin(...)

// Vue 3：应用级配置，互不干扰
const app1 = createApp(App1)
app1.config.xxx = ...

const app2 = createApp(App2)
app2.config.xxx = ...
```

每个应用都是独立的实例，配置和插件互不影响。这对于微前端等场景非常重要。

## 关于权衡

任何设计决策都有代价，Vue 3 也不例外。

**学习曲线提升**：Composition API 比 Options API 更灵活，但也更抽象。初学者可能会困惑于"该用 ref 还是 reactive"这样的问题。

**浏览器兼容性**：Proxy 无法被 polyfill，这意味着 Vue 3 不支持 IE11。对于需要支持旧浏览器的项目，这是一个硬限制。

**迁移成本**：虽然 Vue 3 提供了兼容模式，但大型项目的迁移仍然需要不少工作量，尤其是使用了大量 mixins 和 filters 的项目。

Vue 团队的选择是：**面向未来，而不是维护过去**。这个选择是否正确，时间会给出答案。

## 本章小结

Vue 3 的设计围绕三个目标展开：

- **更快**：Proxy 响应式 + 编译时优化 + Tree-shaking
- **更小**：命名导出 + 模块化拆分
- **更易维护**：TypeScript + Monorepo

这些目标之间是相互增强的：TypeScript 帮助保证代码质量，模块化拆分让 Tree-shaking 成为可能，编译时优化让运行时更轻量。

从下一章开始，我们将深入到具体的设计决策中。首先要问的问题是：为什么 Vue 选择了声明式范式？命令式和声明式各有什么优劣？

---

## 练习与思考

1. 安装 `@vue/reactivity` 包，不依赖完整 Vue，创建一个简单的响应式计数器：

```javascript
import { reactive, effect } from '@vue/reactivity'

const state = reactive({ count: 0 })

effect(() => {
  console.log('count is:', state.count)
})

state.count++ // 观察控制台输出
```

2. 查看 Vue 3 源码仓库的 `packages` 目录，列出所有的子包，思考它们各自的职责。

3. 尝试回答：为什么 Vue 3 选择用 TypeScript 重写，而不是继续使用 Flow？
