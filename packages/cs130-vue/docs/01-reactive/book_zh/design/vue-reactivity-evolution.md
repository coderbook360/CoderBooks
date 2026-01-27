# Vue 响应式的演进历程

Vue 的响应式系统并不是一蹴而就的。从 2014 年 Vue 0.x 的首次发布到今天的 Vue3，响应式系统经历了多次重大迭代。理解这段演进历程，不仅能帮助我们理解当前设计的合理性，也能从中学习框架设计者是如何面对问题、权衡方案、逐步优化的。

## Vue1：Object.defineProperty 的初次尝试

Vue 从一开始就选择了与 React 不同的道路。React 采用显式的 `setState` 来触发更新，而尤雨溪希望 Vue 能够实现真正的响应式——直接修改对象属性就能触发视图更新。这个设计目标在 2014 年是相当激进的。

在 ES5 时代，实现属性拦截的唯一可靠方式是 `Object.defineProperty`。这个 API 允许开发者在对象属性被读取或写入时执行自定义逻辑。Vue1 的响应式系统正是基于这个 API 构建的。

核心思路很直接：遍历对象的所有属性，将每个属性都转换成 getter/setter。在 getter 中收集依赖，在 setter 中触发更新。简化的实现大致如下：

```javascript
function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return
  
  Object.keys(obj).forEach(key => {
    defineReactive(obj, key, obj[key])
  })
}

function defineReactive(obj, key, val) {
  // 递归处理嵌套对象
  observe(val)
  
  // 每个属性都有自己的依赖收集器
  const dep = new Dep()
  
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get() {
      // 收集当前正在执行的 watcher
      if (Dep.target) {
        dep.addSub(Dep.target)
      }
      return val
    },
    set(newVal) {
      if (newVal === val) return
      val = newVal
      // 新值如果是对象，也需要响应式处理
      observe(newVal)
      // 通知所有依赖更新
      dep.notify()
    }
  })
}
```

这段代码展示了 Vue1 响应式的核心机制：通过 `Object.defineProperty` 劫持属性访问，在 getter 中建立依赖关系（谁在读取这个属性），在 setter 中触发更新（通知所有依赖者数据变了）。`Dep` 类负责管理一个属性的所有依赖，而 `Dep.target` 是一个全局变量，指向当前正在执行的 watcher。

这个设计在当时是非常优雅的。开发者可以像操作普通对象一样操作数据，而 Vue 在背后默默完成依赖追踪和更新触发。但这种方案也带来了一些固有的限制。

## Object.defineProperty 的局限性

`Object.defineProperty` 方案的第一个问题是无法检测属性的添加和删除。因为它只能劫持已存在的属性，如果用户动态添加新属性或删除已有属性，Vue 无法感知。这导致了一个经典的"坑"：

```javascript
const vm = new Vue({
  data: {
    user: { name: 'Alice' }
  }
})

// 这个修改是响应式的
vm.user.name = 'Bob'

// 这个添加不是响应式的！
vm.user.age = 25
```

为了解决这个问题，Vue 提供了 `Vue.set` 和 `Vue.delete` 这两个特殊方法。开发者需要记住：添加新属性必须使用 `Vue.set`，删除属性必须使用 `Vue.delete`。这不仅增加了学习成本，还容易导致 bug——很多开发者会忘记使用这些方法，然后困惑为什么视图没有更新。

第二个问题是数组的响应式处理很棘手。`Object.defineProperty` 可以拦截通过下标访问数组元素的操作，但有两个实际问题：一是性能问题，因为数组可能非常长，给每个下标都定义 getter/setter 代价太高；二是无法拦截 `length` 属性的变化，而很多数组操作（如 `push`、`pop`）都会修改 `length`。

Vue2 采用了一个折中方案：不劫持数组的下标访问，而是"patch"数组的变异方法。具体来说，Vue2 会用自己的实现替换数组的 `push`、`pop`、`shift`、`unshift`、`splice`、`sort`、`reverse` 这七个方法，在调用原生方法的同时触发更新。

```javascript
const arrayProto = Array.prototype
const arrayMethods = Object.create(arrayProto)

const methodsToPatch = [
  'push', 'pop', 'shift', 'unshift', 
  'splice', 'sort', 'reverse'
]

methodsToPatch.forEach(method => {
  const original = arrayProto[method]
  Object.defineProperty(arrayMethods, method, {
    value: function mutator(...args) {
      const result = original.apply(this, args)
      const ob = this.__ob__
      // 某些方法会插入新元素，需要对新元素进行响应式处理
      let inserted
      switch (method) {
        case 'push':
        case 'unshift':
          inserted = args
          break
        case 'splice':
          inserted = args.slice(2)
          break
      }
      if (inserted) ob.observeArray(inserted)
      // 触发更新
      ob.dep.notify()
      return result
    }
  })
})
```

这段代码展示了 Vue2 是如何处理数组响应式的。它创建了一个继承自 `Array.prototype` 的新对象，然后用自定义的方法替换了七个变异方法。当开发者调用这些方法时，Vue 可以感知到数组的变化。但这种方案仍然无法处理通过下标直接修改元素的情况：

```javascript
// Vue2 中，这个操作不是响应式的！
vm.items[0] = 'new value'

// 必须使用 Vue.set 或 splice
Vue.set(vm.items, 0, 'new value')
// 或
vm.items.splice(0, 1, 'new value')
```

第三个问题是初始化的性能开销。`Object.defineProperty` 必须在对象创建时就递归遍历所有属性，将它们转换成响应式的。如果数据结构很深或者属性很多，这个初始化过程会比较耗时。更糟糕的是，即使某些属性永远不会被使用，它们也会被转换——这是一种浪费。

这些局限性在 Vue2 时代虽然有各种 workaround，但始终是开发者的痛点。每个 Vue 开发者都曾经踩过"为什么视图没更新"的坑，然后发现是因为没有正确使用 `Vue.set`。

## Proxy 的到来

ES6 引入的 Proxy 为响应式系统带来了新的可能。与 `Object.defineProperty` 不同，Proxy 是对整个对象的代理，可以拦截对象的所有操作，包括属性的读取、写入、删除、枚举等。这意味着之前的限制都可以被解决。

Proxy 的基本用法如下：

```javascript
const original = { name: 'Alice', age: 25 }

const proxy = new Proxy(original, {
  get(target, key, receiver) {
    console.log(`Getting ${key}`)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log(`Setting ${key} to ${value}`)
    return Reflect.set(target, key, value, receiver)
  },
  deleteProperty(target, key) {
    console.log(`Deleting ${key}`)
    return Reflect.deleteProperty(target, key)
  }
})

proxy.name       // Getting name
proxy.age = 26   // Setting age to 26
delete proxy.age // Deleting age

// 动态添加的属性也能被拦截！
proxy.email = 'alice@example.com' // Setting email to alice@example.com
```

对比 `Object.defineProperty`，Proxy 的优势非常明显。首先，它可以拦截属性的添加和删除，不再需要 `Vue.set` 和 `Vue.delete`。其次，对于数组，Proxy 可以拦截任何形式的访问和修改，包括下标操作和 `length` 变化。第三，Proxy 是惰性的——不需要在初始化时递归遍历所有属性，只有当属性被访问时才进行响应式处理，这对大型对象来说是一个显著的性能优化。

当然，Proxy 也不是完美的。它最大的问题是浏览器兼容性——IE 不支持 Proxy，而且 Proxy 是无法被 polyfill 的。这就是为什么 Vue3 放弃了对 IE 的支持。在 2020 年 Vue3 正式发布时，现代浏览器对 Proxy 的支持已经非常好，IE 的市场份额也已经很低，这个权衡是合理的。

## Vue3 响应式系统的重新设计

Vue3 的响应式系统不仅仅是用 Proxy 替换 `Object.defineProperty`，而是进行了全面的重新设计。这次重构的目标不仅是解决已知的限制，还要提供更好的开发体验和更强的功能。

第一个重要变化是响应式系统的独立。在 Vue2 中，响应式系统和组件系统是紧密耦合的，你必须在 Vue 组件的 `data` 选项中定义响应式数据。Vue3 将响应式系统抽取成一个独立的包 `@vue/reactivity`，它可以完全脱离 Vue 框架使用。这意味着你可以在任何 JavaScript 项目中使用 Vue3 的响应式能力，即使你用的是 React 或者纯 JavaScript。

```javascript
// 可以直接从 @vue/reactivity 导入使用
import { reactive, ref, computed, effect } from '@vue/reactivity'

const state = reactive({
  count: 0
})

effect(() => {
  console.log('Count is:', state.count)
})

state.count++ // 输出: Count is: 1
```

第二个变化是 API 的重新设计。Vue3 引入了 Composition API，其中 `ref` 和 `reactive` 成为创建响应式数据的两种主要方式。`ref` 用于包装原始值，`reactive` 用于创建响应式对象。这种设计提供了更灵活的选择——你可以根据数据的类型和使用场景选择最合适的 API。

第三个变化是类型支持的改进。Vue3 从一开始就用 TypeScript 编写，响应式 API 提供了完善的类型推导。`ref<T>` 和 `reactive` 都能正确推导出数据的类型，这对大型项目的可维护性非常重要。

第四个变化是新增了一些强大的功能，比如 `effectScope` 用于管理副作用的生命周期，`customRef` 用于创建自定义的响应式引用。这些 API 让开发者能够更精细地控制响应式行为。

## 核心架构的演变

从架构层面看，Vue3 的响应式系统也有了显著的变化。

在依赖追踪方面，Vue2 使用 `Dep` 类和 `Watcher` 类来管理依赖关系。每个响应式属性都有一个 `Dep` 实例，每个消费者（如组件渲染函数、computed）都是一个 `Watcher`。当属性被读取时，当前的 `Watcher` 被添加到 `Dep` 的订阅列表中。

Vue3 重新设计了这套系统。它使用 `ReactiveEffect` 类来表示副作用函数，用 `targetMap`（一个 WeakMap）来存储依赖关系。依赖的组织结构从"每个属性一个 Dep"变成了"全局一个 WeakMap，target → key → effects"。这种设计更加扁平，也更容易进行依赖清理。

```javascript
// Vue3 的依赖存储结构
// targetMap: WeakMap<target, Map<key, Set<ReactiveEffect>>>

const targetMap = new WeakMap()

// 例如，对于 state.count 的依赖会存储为：
// targetMap.get(state).get('count') => Set of ReactiveEffect
```

在副作用调度方面，Vue2 的更新调度相对简单，主要是通过 `nextTick` 实现异步批量更新。Vue3 引入了更灵活的 `scheduler` 机制，允许开发者控制副作用的执行时机。`watch` 的 `flush: 'pre'` / `'post'` / `'sync'` 选项就是这个能力的体现。

另一个重要的改进是依赖清理机制。Vue2 的依赖清理相对粗暴——每次重新渲染前都清空所有依赖，然后重新收集。Vue3 采用了更精细的策略，通过双向关联（effect 知道自己依赖哪些属性，属性也知道被哪些 effect 依赖）实现精确的依赖清理，减少了不必要的内存开销。

## 从演进中学到的设计智慧

回顾 Vue 响应式系统的演进历程，我们可以学到很多关于框架设计的智慧。

首先是权衡的艺术。没有完美的方案，只有在特定约束下的最优解。Vue2 选择 `Object.defineProperty` 是因为需要兼容 IE；Vue3 选择 Proxy 是因为现代浏览器的普及让这个权衡变得可行。框架设计者需要在功能、性能、兼容性、开发体验之间做出取舍。

其次是渐进式改进。Vue 的每个大版本都在解决上一版本的痛点，同时保持核心思想的一致性——"响应式数据驱动视图"这个理念从 Vue1 到 Vue3 都没有变。这种渐进式的演进比激进的革命更容易被社区接受。

第三是开放的架构。Vue3 将响应式系统独立出来，不仅让它可以在 Vue 之外使用，也让社区可以基于它构建新的工具。这种模块化的设计理念是现代框架的重要特征。

在接下来的章节中，我们将深入对比 Proxy 和 `Object.defineProperty` 的技术细节，理解 Vue3 选择 Proxy 的具体原因。

