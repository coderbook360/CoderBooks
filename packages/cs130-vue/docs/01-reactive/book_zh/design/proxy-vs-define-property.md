# Proxy vs Object.defineProperty

在上一章中，我们回顾了 Vue 响应式系统的演进历程，了解到 Vue3 从 `Object.defineProperty` 切换到 Proxy 是一个重大的技术决策。这一章我们将深入对比这两种方案的技术细节，理解 Vue3 为什么做出这个选择，以及这个选择带来了哪些影响。

## 两种拦截机制的本质区别

`Object.defineProperty` 和 Proxy 都可以实现对对象访问的拦截，但它们的工作机制有本质的不同。

`Object.defineProperty` 是属性级别的拦截。它修改的是对象本身，将普通属性转换成带有 getter/setter 的访问器属性。调用这个 API 后，原对象就被改变了：

```javascript
const obj = { name: 'Alice' }

Object.defineProperty(obj, 'name', {
  get() {
    console.log('Getting name')
    return this._name
  },
  set(value) {
    console.log('Setting name to', value)
    this._name = value
  }
})

// obj 已经被修改了，name 属性变成了访问器属性
console.log(Object.getOwnPropertyDescriptor(obj, 'name'))
// { get: [Function: get], set: [Function: set], enumerable: true, configurable: true }
```

这种"就地修改"的方式意味着：你必须在对象创建之后逐个属性地进行转换，而且只能拦截已经存在的属性。如果后来添加了新属性，你需要再次调用 `Object.defineProperty` 来处理它。

Proxy 则是对象级别的拦截。它创建的是原对象的一个"代理"，所有对代理对象的操作都可以被拦截。原对象保持不变，拦截逻辑完全在代理层实现：

```javascript
const obj = { name: 'Alice' }

const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    console.log('Getting', key)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log('Setting', key, 'to', value)
    return Reflect.set(target, key, value, receiver)
  }
})

// obj 保持不变
console.log(Object.getOwnPropertyDescriptor(obj, 'name'))
// { value: 'Alice', writable: true, enumerable: true, configurable: true }

// 所有操作都通过 proxy 进行
proxy.name        // Getting name
proxy.age = 25    // Setting age to 25（新属性也能拦截！）
```

这种"代理模式"意味着：你只需要创建一次代理，之后所有的操作——无论是已有属性还是新增属性——都会被拦截。这就是为什么 Vue3 不再需要 `Vue.set`。

## 可拦截操作的对比

`Object.defineProperty` 只能拦截属性的读取（get）和写入（set）两种操作。而 Proxy 可以拦截的操作多达 13 种，覆盖了对象的几乎所有行为。

让我们看看这些拦截器（handler traps）分别能做什么。`get` 和 `set` 自不必说，`has` 拦截的是 `in` 操作符，这让 Vue3 可以追踪 `'key' in obj` 这样的检查。`deleteProperty` 拦截的是 `delete` 操作符，这让 Vue3 可以在属性被删除时触发更新。`ownKeys` 拦截的是属性遍历操作（如 `Object.keys`、`for...in`），这让 Vue3 可以追踪对象的完整结构变化。

以下代码展示了这些拦截器的实际应用：

```javascript
const target = { name: 'Alice', age: 25 }

const proxy = new Proxy(target, {
  // 拦截属性读取
  get(target, key, receiver) {
    console.log(`[get] ${String(key)}`)
    return Reflect.get(target, key, receiver)
  },
  
  // 拦截属性写入
  set(target, key, value, receiver) {
    console.log(`[set] ${String(key)} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  },
  
  // 拦截 in 操作符
  has(target, key) {
    console.log(`[has] ${String(key)}`)
    return Reflect.has(target, key)
  },
  
  // 拦截 delete 操作符
  deleteProperty(target, key) {
    console.log(`[delete] ${String(key)}`)
    return Reflect.deleteProperty(target, key)
  },
  
  // 拦截属性遍历
  ownKeys(target) {
    console.log('[ownKeys]')
    return Reflect.ownKeys(target)
  }
})

proxy.name           // [get] name
proxy.email = 'test' // [set] email = test
'age' in proxy       // [has] age
delete proxy.age     // [delete] age
Object.keys(proxy)   // [ownKeys]
```

这段代码展示了 Proxy 强大的拦截能力。每一种对对象的操作都能被精确捕获，这为响应式系统提供了完整的"感知"能力。相比之下，`Object.defineProperty` 的 getter/setter 就显得非常有限了。

值得注意的是，Vue3 并没有使用所有 13 种拦截器。在实际实现中，主要使用的是 `get`、`set`、`has`、`deleteProperty`、`ownKeys` 这几种。这是因为响应式系统关注的是数据的读取和修改，其他一些拦截器（如 `apply` 用于函数调用、`construct` 用于构造函数）与数据响应式关系不大。

## 数组处理的差异

数组是前端开发中最常用的数据结构之一，两种方案对数组的处理差异尤为明显。

使用 `Object.defineProperty` 处理数组面临两个挑战。第一，数组可能非常长，给每个下标都定义 getter/setter 的开销太大。第二，数组的 `length` 属性无法被正确拦截——当你通过 `push` 或 `pop` 修改数组时，`length` 会自动变化，但这个变化无法触发 setter。

Vue2 的解决方案是"方法重写"：创建一个继承自 `Array.prototype` 的对象，用自定义实现替换七个会修改数组的方法。这种方案虽然有效，但存在明显的局限性——通过下标直接修改元素是无法被追踪的：

```javascript
// Vue2 中
const vm = new Vue({
  data: {
    items: ['a', 'b', 'c']
  }
})

// 这些操作可以被追踪（因为方法被重写了）
vm.items.push('d')
vm.items.pop()
vm.items.splice(1, 1, 'x')

// 但这个操作无法被追踪！
vm.items[0] = 'z' // 视图不会更新
```

Proxy 完全解决了这个问题。因为 Proxy 拦截的是所有对对象的操作，数组的下标访问本质上就是属性访问，自然会被 `get` 和 `set` 拦截：

```javascript
const arr = ['a', 'b', 'c']

const proxy = new Proxy(arr, {
  get(target, key, receiver) {
    console.log(`[get] ${String(key)}`)
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    console.log(`[set] ${String(key)} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  }
})

proxy[0]       // [get] 0
proxy[0] = 'z' // [set] 0 = z
proxy.length   // [get] length
proxy.push('d')
// [get] push
// [get] length
// [set] 3 = d
// [set] length = 4
```

从输出可以看到，`push` 操作实际上涉及多步：读取 `push` 方法、读取当前 `length`、设置新元素、更新 `length`。Proxy 可以捕获所有这些步骤，Vue3 可以据此触发精准的更新。

不过这里有一个细节需要注意：Vue3 对数组方法的处理并不是简单地拦截每个操作。因为一次 `push` 会触发多次 `set`（设置元素和更新 `length`），如果每次都触发更新会造成性能浪费。Vue3 的实际实现会在内部进行优化，确保一次数组操作只触发一次更新。

## 性能特征对比

两种方案在性能上也有显著差异，但这个差异比很多人想象的要微妙。

`Object.defineProperty` 的性能开销主要在初始化阶段。当一个大对象被转换为响应式时，需要递归遍历所有属性，每个属性都要调用 `Object.defineProperty`。这个过程是同步的，如果对象很大，会造成明显的初始化延迟。

```javascript
// 假设有一个包含 10000 个属性的大对象
const bigObject = {}
for (let i = 0; i < 10000; i++) {
  bigObject[`key${i}`] = i
}

// Vue2 需要立即遍历所有属性
// observe(bigObject) 会是一个耗时的同步操作
```

Proxy 的优势在于它是"惰性"的。创建 Proxy 本身几乎没有开销，只有当属性被实际访问时才会触发拦截。这意味着即使是一个巨大的对象，只要你只访问其中的一小部分属性，就只需要为这一小部分属性建立依赖关系。

但惰性也意味着访问时的开销被分散了。每次通过 Proxy 访问属性都会调用拦截函数，这比直接访问属性要慢。在高频访问的场景下，这个开销会累积。不过 JavaScript 引擎（尤其是 V8）对 Proxy 的优化在逐年改进，现代浏览器中的 Proxy 性能已经相当不错。

另一个性能相关的话题是内存使用。`Object.defineProperty` 会修改原对象，不会产生额外的对象。Proxy 会创建新的代理对象，但代理对象本身很轻量，而且 Vue3 会缓存已创建的代理（同一个原对象只会创建一个代理），所以内存开销也是可控的。

实际上，Vue3 的响应式系统在整体性能上是优于 Vue2 的。这不仅得益于 Proxy 的特性，还因为 Vue3 对依赖追踪、更新调度等环节都进行了优化。单独比较 Proxy 和 `Object.defineProperty` 的性能意义不大，重要的是整个系统的协同优化。

## 深层响应式的处理

对于嵌套对象的响应式处理，两种方案的策略也不同。

`Object.defineProperty` 方案必须在初始化时递归处理所有嵌套层级。因为它只能拦截已存在的属性，如果不在一开始就处理，后续访问嵌套属性时就无法建立依赖关系：

```javascript
// Vue2 的 observe 函数必须递归处理
function observe(obj) {
  if (typeof obj !== 'object' || obj === null) return
  
  Object.keys(obj).forEach(key => {
    defineReactive(obj, key, obj[key])
    // 递归处理嵌套对象
    observe(obj[key])
  })
}
```

这种"急切求值"的策略在处理大型嵌套对象时会有性能问题。想象一个深度为 10、每层有 100 个属性的对象——初始化时需要处理近百亿个属性。

Vue3 的 Proxy 方案采用"惰性代理"策略。只有当嵌套对象被实际访问时，才会为它创建代理：

```javascript
// Vue3 的 reactive 实现（简化版）
function reactive(target) {
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver)
      // 追踪依赖
      track(target, key)
      // 如果访问的属性是对象，惰性地创建它的代理
      if (typeof result === 'object' && result !== null) {
        return reactive(result)
      }
      return result
    },
    // ... set 等其他拦截器
  })
  return proxy
}
```

这种惰性策略意味着：如果某个嵌套对象从来没有被访问过，它就永远不会被代理。这对于大型数据结构来说是巨大的性能优化。当然，Vue3 也会缓存已创建的代理，避免重复代理同一个对象。

## this 指向与 Reflect

使用 Proxy 时有一个容易被忽略的细节：`this` 的指向问题。考虑以下代码：

```javascript
const target = {
  name: 'Alice',
  greet() {
    return `Hello, ${this.name}`
  }
}

const proxy = new Proxy(target, {
  get(target, key) {
    return target[key] // 注意这里直接访问 target
  }
})

proxy.greet() // "Hello, Alice"
```

这段代码看起来工作正常，但存在问题。当 `greet` 方法被调用时，`this` 实际上指向 `target` 而不是 `proxy`。这意味着方法内部的 `this.name` 访问不会被 Proxy 拦截，也就无法建立依赖关系。

为了解决这个问题，Vue3 使用 `Reflect` API 配合 `receiver` 参数：

```javascript
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    // 使用 Reflect.get 并传入 receiver
    return Reflect.get(target, key, receiver)
  }
})
```

`receiver` 参数代表的是原始的调用接收者，也就是 `proxy`。当使用 `Reflect.get(target, key, receiver)` 时，如果属性是一个 getter，getter 内部的 `this` 会指向 `receiver`（即 `proxy`）而不是 `target`。这确保了即使在方法内部访问属性，也能正确触发 Proxy 的拦截。

这就是为什么 Vue3 的源码中大量使用 `Reflect` API 而不是直接操作 `target`。`Reflect` 不仅提供了与 Proxy 拦截器一一对应的方法，还能正确处理 `this` 指向问题。

## 边界情况与兼容性考量

虽然 Proxy 解决了很多问题，但它也有自己的限制和注意事项。

首先是某些内置对象的特殊行为。`Date`、`RegExp`、`Map`、`Set` 等内置对象的内部槽位（internal slot）是 JavaScript 规范定义的特殊机制，Proxy 无法直接拦截对这些槽位的访问。例如：

```javascript
const date = new Date()
const proxy = new Proxy(date, {})

proxy.getTime() // TypeError: this is not a Date object
```

这是因为 `Date.prototype.getTime` 内部会检查 `this` 的内部槽位 `[[DateValue]]`，而 Proxy 对象没有这个槽位。Vue3 对这类对象采用特殊处理——不对它们创建 Proxy，而是直接返回原始值，或者使用 `ref` 包装。

对于 `Map` 和 `Set`，Vue3 的处理更为复杂。它需要重新实现这些集合类型的方法，确保在操作时能够正确追踪依赖。我们会在后续的源码解析章节详细讨论这个话题。

另一个值得注意的是恒等性（identity）问题。因为 Proxy 创建的是新对象，`proxy !== target` 总是成立的。这意味着如果代码中有基于对象引用的比较逻辑，使用 Proxy 后可能会出问题：

```javascript
const target = {}
const proxy = new Proxy(target, {})

console.log(proxy === target) // false

const map = new Map()
map.set(target, 'value')
console.log(map.get(proxy)) // undefined（因为 key 不同）
```

Vue3 通过维护一个 `proxyMap`（从原对象到代理对象的映射）来处理这个问题。`reactive()` 会检查传入的对象是否已经有代理，如果有就返回已有的代理，确保同一个原对象只对应一个代理对象。

## Vue3 为什么选择 Proxy

综合以上分析，我们可以清晰地看到 Vue3 选择 Proxy 的理由：

**功能完整性**：Proxy 可以拦截属性的添加、删除、遍历等操作，彻底解决了 `Vue.set` 和数组下标访问的痛点。对开发者来说，响应式数据的行为终于和普通 JavaScript 对象一致了，这是开发体验的巨大提升。

**性能优化空间**：Proxy 的惰性特性让 Vue3 可以按需代理，避免了初始化时的大量开销。对于大型应用来说，这意味着更快的启动时间和更低的内存消耗。

**架构简洁性**：基于 Proxy 的实现不需要区分对象和数组的处理逻辑，不需要维护特殊的数组方法补丁，代码更加简洁统一。

当然，这个选择也意味着放弃对 IE 的支持。但在 2020 年 Vue3 发布时，IE 的市场份额已经很低，微软也已经宣布放弃 IE。对于新项目来说，这个权衡是合理的。对于必须支持 IE 的项目，Vue2 仍然是可靠的选择。

在下一章中，我们将讨论 Vue3 响应式系统的设计目标，理解尤雨溪和团队在设计这个系统时考虑了哪些因素，做出了哪些权衡。

