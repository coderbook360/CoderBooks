# Proxy vs Object.defineProperty 选择

Vue3 用 Proxy 替代了 Vue2 的 Object.defineProperty 来实现响应式。这个选择解决了 Vue2 响应式系统的根本限制。

## Object.defineProperty 的局限

Vue2 使用 Object.defineProperty 劫持对象属性的 getter 和 setter。这种方案有几个无法绕过的限制。

首先是无法检测属性的新增和删除。Object.defineProperty 只能劫持已存在的属性，后续添加的属性不会被自动响应式化。

```javascript
// Vue2 的限制
const vm = new Vue({
  data: { user: { name: 'Alice' } }
})

vm.user.age = 25  // 不会触发更新！
Vue.set(vm.user, 'age', 25)  // 需要使用特殊 API
```

其次是数组的限制。通过索引修改数组元素、修改数组长度都无法被检测到。Vue2 通过重写数组方法（push、pop、splice 等）来部分解决这个问题，但仍有盲区。

```javascript
vm.items[0] = 'new value'  // 不会触发更新
vm.items.length = 0        // 不会触发更新
```

最后是初始化性能问题。Vue2 需要在初始化时递归遍历所有属性进行劫持，对于深层嵌套的大对象，这个开销不可忽视。

## Proxy 的优势

Proxy 是 ES6 引入的特性，可以拦截对象的各种操作，包括属性读写、属性删除、属性枚举等。

```javascript
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    // 拦截属性读取
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    // 拦截属性设置（包括新增）
    return Reflect.set(target, key, value, receiver)
  },
  deleteProperty(target, key) {
    // 拦截属性删除
    return Reflect.deleteProperty(target, key)
  }
})
```

使用 Proxy 后，Vue2 的限制都被解决了。

新增属性自动响应式：Proxy 的 set 拦截器会捕获所有属性设置操作，包括新增属性。

```javascript
const state = reactive({ user: { name: 'Alice' } })
state.user.age = 25  // 自动响应式！
```

数组操作完整支持：索引赋值、length 修改都能被正确拦截。

```javascript
const list = reactive([1, 2, 3])
list[0] = 100        // 触发更新
list.length = 0      // 触发更新
```

惰性响应式：Proxy 只在访问属性时才对嵌套对象进行响应式处理，而不是在初始化时递归处理所有属性。

## 迁移带来的 Breaking Changes

切换到 Proxy 也带来了一些行为变化，需要开发者注意。

响应式对象和原始对象不再相等：

```javascript
const raw = { count: 0 }
const state = reactive(raw)

console.log(state === raw)  // false
console.log(toRaw(state) === raw)  // true
```

需要通过 `toRaw` 获取原始对象。这在需要将对象传递给不理解响应式的外部库时很有用。

解构会失去响应式：

```javascript
const state = reactive({ count: 0 })
const { count } = state  // count 是普通值，不是响应式的

// 需要使用 toRefs
const { count } = toRefs(state)  // count 是 Ref
```

Proxy 不支持原始值：

```javascript
// 这是无效的
const proxy = new Proxy(1, { /* handlers */ })
// TypeError: Cannot create proxy with a non-object as target
```

这就是为什么 Vue3 需要 `ref` API 来处理原始值的响应式。ref 内部使用对象包装原始值，用 value 属性存储实际值。

## 浏览器兼容性

Proxy 不能被 polyfill，这是 Vue3 放弃 IE11 支持的主要原因。在做这个决定时，Vue 团队权衡了新特性带来的收益和放弃部分用户的代价。

随着 IE11 市场份额持续下降，这个决定被证明是正确的。大多数现代浏览器（Chrome、Firefox、Safari、Edge）都完整支持 Proxy。

对于仍需要支持 IE11 的项目，Vue2 仍然是可行的选择，并且会持续维护一段时间。
