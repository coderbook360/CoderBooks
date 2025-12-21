# 组件公共实例代理

在 Vue 组件中，我们经常通过 `this` 访问各种数据。**但你有没有思考过：为什么 `this.count`、`this.msg`、`this.$el` 都能正常工作？它们明明来自不同的地方！**

```javascript
export default {
  data() {
    return { count: 0 }
  },
  props: ['msg'],
  computed: {
    double() { return this.count * 2 }
  },
  methods: {
    increment() {
      this.count++           // 访问 data
      console.log(this.msg)  // 访问 props
      console.log(this.$el)  // 访问内置属性
    }
  }
}
```

`this.count`、`this.msg`、`this.$el` 都能正常工作。这是如何实现的？本章将深入分析 Vue 3 的公共实例代理机制。

## 代理结构概览

首先要问一个问题：组件中的 `this` 是什么？

答案是：**一个 Proxy 对象**。

```javascript
// 在 setupStatefulComponent 中
instance.ctx = { _: instance }           // 代理目标
instance.proxy = new Proxy(ctx, PublicInstanceProxyHandlers)

// 在 render 函数或 methods 中
// this === instance.proxy
```

当你访问 `this.count` 时，实际上触发了 Proxy 的 `get` 陷阱，Vue 在这里从多个来源查找值。

## 属性访问优先级

现在我要问第二个问题：`this.xxx` 的值从哪里来？

Vue 定义了明确的优先级规则：

```
1. 访问控制检查
   - 阻止以 __ 开头的私有属性
   - 处理 $data、$props 等内置属性

2. setupState（setup 返回的对象）

3. data（data() 返回的对象）

4. props（组件 props）

5. ctx（用户扩展到 this 的属性）

6. 公共属性（$el、$parent、$slots 等）

7. globalProperties（app.config.globalProperties）

8. 未找到，返回 undefined
```

这个顺序很重要：如果 setup、data、props 中有同名属性，**setup 优先**。

## PublicInstanceProxyHandlers 实现

让我们看核心实现：

```javascript
const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { ctx, setupState, data, props, type } = instance
    
    // 阻止访问以 __ 开头的私有属性
    if (key[0] === '_' && key[1] === '_') {
      return undefined
    }
    
    // 快速路径：使用访问缓存
    const accessCache = instance.accessCache || (instance.accessCache = {})
    if (key in accessCache) {
      switch (accessCache[key]) {
        case AccessTypes.SETUP:
          return setupState[key]
        case AccessTypes.DATA:
          return data[key]
        case AccessTypes.PROPS:
          return props[key]
        case AccessTypes.CONTEXT:
          return ctx[key]
      }
    }
    
    // 按优先级查找并缓存
    if (setupState && hasOwn(setupState, key)) {
      accessCache[key] = AccessTypes.SETUP
      return setupState[key]
    }
    
    if (data && hasOwn(data, key)) {
      accessCache[key] = AccessTypes.DATA
      return data[key]
    }
    
    if (props && hasOwn(props, key)) {
      accessCache[key] = AccessTypes.PROPS
      return props[key]
    }
    
    if (hasOwn(ctx, key)) {
      accessCache[key] = AccessTypes.CONTEXT
      return ctx[key]
    }
    
    // 公共属性（$el、$parent 等）
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
    
    // 全局属性
    const { globalProperties } = instance.appContext.config
    if (hasOwn(globalProperties, key)) {
      return globalProperties[key]
    }
    
    return undefined
  },
  
  set({ _: instance }, key, value) {
    const { setupState, data, ctx } = instance
    
    // 按优先级设置
    if (hasOwn(setupState, key)) {
      setupState[key] = value
      return true
    }
    
    if (hasOwn(data, key)) {
      data[key] = value
      return true
    }
    
    // props 是只读的
    if (hasOwn(instance.props, key)) {
      console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
      return false
    }
    
    // 其他属性设置到 ctx
    if (key[0] !== '$') {
      ctx[key] = value
    }
    
    return true
  },
  
  has({ _: instance }, key) {
    const { setupState, data, props, ctx } = instance
    
    return (
      hasOwn(setupState, key) ||
      hasOwn(data, key) ||
      hasOwn(props, key) ||
      hasOwn(ctx, key) ||
      hasOwn(publicPropertiesMap, key) ||
      hasOwn(instance.appContext.config.globalProperties, key)
    )
  }
}
```

## 访问缓存优化

注意代码中的 `accessCache`：

```javascript
const accessCache = instance.accessCache || (instance.accessCache = {})
if (key in accessCache) {
  switch (accessCache[key]) {
    case AccessTypes.SETUP:
      return setupState[key]
    // ...
  }
}
```

这是一个重要的性能优化。第一次访问某个属性时，Vue 会遍历所有可能的来源找到它，然后缓存属性的来源类型。后续访问直接从缓存中获取来源，避免重复查找。

```javascript
const AccessTypes = {
  SETUP: 0,
  DATA: 1,
  PROPS: 2,
  CONTEXT: 3
}
```

## 公共属性映射

`$el`、`$parent`、`$slots` 等内置属性通过专门的映射实现：

```javascript
const publicPropertiesMap = {
  $: (i) => i,
  $el: (i) => i.vnode.el,
  $data: (i) => i.data,
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
  $slots: (i) => i.slots,
  $refs: (i) => i.refs,
  $parent: (i) => i.parent && i.parent.proxy,
  $root: (i) => i.root && i.root.proxy,
  $emit: (i) => i.emit,
  $options: (i) => resolveOptions(i),
  $forceUpdate: (i) => () => queueJob(i.update),
  $nextTick: (i) => nextTick.bind(i.proxy),
  $watch: (i) => instanceWatch.bind(i),
}
```

每个公共属性都是一个函数，接收组件实例，返回对应的值。

## Props 只读保护

注意 set 陷阱中对 props 的处理：

```javascript
if (hasOwn(instance.props, key)) {
  console.warn(`Attempting to mutate prop "${key}". Props are readonly.`)
  return false
}
```

直接修改 props 会触发警告并被阻止。这是 Vue 单向数据流的重要保障——子组件不能直接修改父组件传入的 props。

```javascript
// ❌ 错误：不能修改 props
this.msg = 'new value'  // 警告

// ✓ 正确：通过 emit 通知父组件
this.$emit('update:msg', 'new value')
```

## 与 Composition API 的关系

在 Composition API 中，`setup` 的返回值会被存储到 `setupState`：

```javascript
setup() {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  return { count, double }
}
```

由于 `setupState` 的优先级最高，在模板和选项式 API 中都能通过 `this` 访问这些值：

```javascript
mounted() {
  console.log(this.count)   // 访问 setupState.count
  console.log(this.double)  // 访问 setupState.double
}
```

注意 `proxyRefs` 的作用——setup 返回的 ref 会被自动解包：

```javascript
// setupState = proxyRefs({ count, double })
// 访问 this.count 自动返回 count.value
```

## 与 Options API 的兼容

Vue 3 同时支持选项式 API 和组合式 API。通过公共实例代理，两者可以无缝混用：

```javascript
export default {
  props: ['title'],
  
  setup() {
    const count = ref(0)
    return { count }
  },
  
  data() {
    return { message: 'Hello' }
  },
  
  computed: {
    info() {
      // 可以同时访问 setup、data、props
      return `${this.title}: ${this.message} - ${this.count}`
    }
  }
}
```

代理机制确保了：
- `this.count` → setupState
- `this.message` → data
- `this.title` → props

## has 陷阱的作用

`has` 陷阱用于 `in` 操作符和 `with` 语句：

```javascript
has({ _: instance }, key) {
  return (
    hasOwn(setupState, key) ||
    hasOwn(data, key) ||
    // ...
  )
}
```

这在模板编译时很重要。Vue 的模板编译器会生成类似这样的代码：

```javascript
with (ctx) {
  return h('div', count)  // count 需要在 ctx 中可找到
}
```

`has` 陷阱确保模板中使用的变量能被正确识别。

## 本章小结

本章分析了 Vue 3 的公共实例代理机制：

- **代理结构**：`this` 是一个 Proxy，拦截属性访问
- **优先级规则**：setupState > data > props > ctx > 公共属性 > 全局属性
- **访问缓存**：首次查找后缓存来源，提升性能
- **公共属性**：$el、$parent 等通过专门映射实现
- **只读保护**：props 不可直接修改
- **API 兼容**：选项式和组合式 API 可以混用

理解了代理机制，你就能明白为什么 `this.xxx` 能够"神奇地"找到正确的值。这是 Vue 向开发者屏蔽复杂性、提供简洁 API 的重要手段。

下一章，我们将分析组件的挂载流程——从 `mountComponent` 到首次渲染。
