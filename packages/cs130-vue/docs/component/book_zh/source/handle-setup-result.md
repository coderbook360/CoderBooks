# handleSetupResult 返回值处理

`setup` 函数可以返回对象或渲染函数。`handleSetupResult` 负责解析返回值并设置到组件实例上。

## 返回值的两种形式

```javascript
// 形式一：返回状态对象
setup() {
  const count = ref(0)
  return { count }
}

// 形式二：返回渲染函数
setup() {
  const count = ref(0)
  return () => h('div', count.value)
}
```

## 源码分析

```typescript
export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) {
  if (isFunction(setupResult)) {
    // setup 返回渲染函数
    if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
      // SSR 内联渲染
      instance.ssrRender = setupResult
    } else {
      instance.render = setupResult as InternalRenderFunction
    }
  } else if (isObject(setupResult)) {
    // setup 返回状态对象
    if (__DEV__ && isVNode(setupResult)) {
      warn(
        `setup() should not return VNodes directly - ` +
          `return a render function instead.`
      )
    }
    // 开发环境用只读代理包装
    instance.setupState = proxyRefs(setupResult)
    if (__DEV__) {
      exposeSetupStateOnRenderContext(instance)
    }
  } else if (__DEV__ && setupResult !== undefined) {
    warn(
      `setup() should return an object. Received: ${
        setupResult === null ? 'null' : typeof setupResult
      }`
    )
  }
  finishComponentSetup(instance, isSSR)
}
```

## 返回渲染函数

当 `setup` 返回函数时，设置为组件的 `render`：

```typescript
if (isFunction(setupResult)) {
  instance.render = setupResult as InternalRenderFunction
}
```

这个渲染函数会在组件更新时被调用：

```javascript
setup() {
  const count = ref(0)
  
  return () => h('div', [
    h('span', `Count: ${count.value}`),
    h('button', { onClick: () => count.value++ }, '+')
  ])
}
```

渲染函数形式完全绑定 JavaScript，非常灵活。

## 返回状态对象

更常见的是返回对象：

```typescript
if (isObject(setupResult)) {
  instance.setupState = proxyRefs(setupResult)
}
```

对象通过 `proxyRefs` 包装，自动解包 ref。

## proxyRefs

自动解包 ref：

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}
```

关键逻辑：
- `get`：自动调用 `unref` 解包
- `set`：如果原值是 ref，设置到 `.value`

这让模板可以直接使用：

```html
<template>
  {{ count }}  <!-- 不需要 count.value -->
</template>

<script>
setup() {
  const count = ref(0)
  return { count }
}
</script>
```

## VNode 检测

开发环境检测错误的返回值：

```typescript
if (__DEV__ && isVNode(setupResult)) {
  warn(
    `setup() should not return VNodes directly - ` +
      `return a render function instead.`
  )
}
```

防止这种错误：

```javascript
// 错误
setup() {
  return h('div', 'Hello')
}

// 正确
setup() {
  return () => h('div', 'Hello')
}
```

## exposeSetupStateOnRenderContext

开发环境将 setupState 暴露到渲染上下文：

```typescript
export function exposeSetupStateOnRenderContext(
  instance: ComponentInternalInstance
) {
  const { ctx, setupState } = instance
  Object.keys(toRaw(setupState)).forEach(key => {
    if (!setupState.__isScriptSetup) {
      if (isReservedPrefix(key[0])) {
        warn(
          `setup() return property ${JSON.stringify(key)} should not ` +
            `start with "$" or "_" which are reserved prefixes for Vue internals.`
        )
        return
      }
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => setupState[key],
        set: NOOP
      })
    }
  })
}
```

这让 Options API 可以通过 `this` 访问 setup 返回的值。

## 保留前缀检查

`$` 和 `_` 开头的属性是保留的：

```javascript
// 警告
setup() {
  return {
    $custom: 1,  // 不应该用 $ 开头
    _private: 2  // 不应该用 _ 开头
  }
}
```

## finishComponentSetup

处理完返回值后完成设置：

```typescript
finishComponentSetup(instance, isSSR)
```

这个函数处理：
- 编译模板（如果需要）
- 应用 Options API

## SSR 处理

SSR 有特殊的渲染函数：

```typescript
if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
  instance.ssrRender = setupResult
} else {
  instance.render = setupResult
}
```

SSR 渲染函数处理服务端渲染逻辑。

## 异步 setup

如果 `setup` 是异步的：

```javascript
async setup() {
  const data = await fetchData()
  return { data }
}
```

返回的是 Promise，在 `setupStatefulComponent` 中处理：

```typescript
if (isPromise(setupResult)) {
  // 等待 Promise 解析
  setupResult.then((resolved: unknown) => {
    handleSetupResult(instance, resolved, isSSR)
  })
}
```

## 与 Options API 混用

setup 返回值和 Options API 可以混用：

```javascript
export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  data() {
    return { name: 'Vue' }
  },
  computed: {
    double() {
      return this.count * 2  // 访问 setup 返回的值
    }
  }
}
```

通过 `exposeSetupStateOnRenderContext`，Options API 可以通过 `this` 访问 setup 的返回值。

## script setup

`<script setup>` 编译后：

```html
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

变成：

```javascript
export default {
  setup(__props, { expose: __expose }) {
    __expose()
    const count = ref(0)
    const __returned__ = { count }
    Object.defineProperty(__returned__, '__isScriptSetup', { value: true })
    return __returned__
  }
}
```

`__isScriptSetup` 标记影响一些处理逻辑。

## 类型安全

返回值的类型会影响模板中的类型推导：

```typescript
setup() {
  const count = ref(0)
  const increment = () => count.value++
  
  return {
    count,
    increment
  }
}
// 模板中 count 和 increment 都有正确的类型
```

## 小结

`handleSetupResult` 的处理逻辑：

1. **函数**：设置为 `render`
2. **对象**：用 `proxyRefs` 包装后设置为 `setupState`
3. **其他**：开发环境警告

`proxyRefs` 的自动解包让模板使用更简洁，不需要到处写 `.value`。

下一章将分析 `proxyRefs`——自动解包 ref 的实现细节。
