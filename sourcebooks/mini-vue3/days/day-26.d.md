# Day 26: 优雅的解包 - unref 与 proxyRefs

你好，我是你的技术导师。

昨天我们实现了 `toRefs`，解决了响应式对象解构的问题。
但在使用 `ref` 时，我们还是面临一个"心智负担"：总是要写 `.value`。
特别是在模板中，如果我们还要写 `{{ count.value }}`，那简直是灾难。

Vue 3 为了提供更好的开发体验（DX），引入了自动解包机制。
今天，我们就来实现这背后的魔法：`unref` 和 `proxyRefs`。

## 1. unref：智能取值

有时候，我们不确定一个值到底是不是 `ref`。
-   如果是 `ref`，我们要取 `.value`。
-   如果是普通值，我们就直接用。

为了避免到处写 `isRef(val) ? val.value : val`，Vue 提供了 `unref`。

### 1.1 实现

在 `src/reactivity/ref.ts` 中：

```typescript
import { isRef } from './ref'

export function unref(ref) {
  return isRef(ref) ? ref.value : ref
}
```

这就完了？对，就这么简单。
但它非常实用。比如在编写工具函数时：

```typescript
function useFeature(maybeRef) {
  const value = unref(maybeRef)
  // 现在 value 一定是普通值了
}
```

## 2. proxyRefs：模板的幕后英雄

我们在写 Vue 模板时：

```html
<div>{{ count }}</div> <!-- 不需要写 count.value -->
```

但在 `setup` 中：

```javascript
setup() {
  const count = ref(0)
  return { count }
}
```

Vue 是怎么做到的？
答案就是 `proxyRefs`。
Vue 在处理 `setup` 的返回值时，会用 `proxyRefs` 包裹一层。

### 2.1 场景复现

假设没有 `proxyRefs`：

```javascript
const user = {
  name: ref('Vue'),
  age: ref(3)
}

// 访问
console.log(user.name.value) // 烦琐
```

我们希望：

```javascript
console.log(user.name) // 'Vue'
```

### 2.2 实现原理

我们在昨天其实已经抢先体验了 `proxyRefs` 的代码，今天我们来详细剖析它的逻辑。
它是一个 `Proxy`，拦截了 `get` 和 `set`。

```typescript
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      // 核心逻辑：自动 unref
      return unref(Reflect.get(target, key, receiver))
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key]
      
      // 核心逻辑：如果旧值是 ref，新值不是 ref，则更新旧 ref 的 .value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      } else {
        // 否则直接替换（比如新值也是 ref，或者旧值本来就不是 ref）
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}
```

### 2.3 深度解析 Set 逻辑

`set` 的逻辑稍微有点绕，我们举个例子：

**场景 1：更新 ref 的值**
```javascript
const state = proxyRefs({ count: ref(0) })
state.count = 1

// oldValue 是 ref(0)
// value 是 1 (非 ref)
// -> 命中 if 分支
// -> oldValue.value = 1
// -> 结果：ref 内部的值变了，响应式触发
```

**场景 2：替换 ref**
```javascript
const state = proxyRefs({ count: ref(0) })
state.count = ref(2)

// oldValue 是 ref(0)
// value 是 ref(2) (是 ref)
// -> 没命中 if 分支
// -> 直接 Reflect.set
// -> 结果：state.count 变成了新的 ref(2)，旧的 ref(0) 被丢弃
```

**场景 3：普通属性赋值**
```javascript
const state = proxyRefs({ name: 'Vue' })
state.name = 'React'

// oldValue 不是 ref
// -> 没命中 if 分支
// -> 直接 Reflect.set
```

## 3. 测试驱动

让我们补充一些更详尽的测试用例，确保所有边缘情况都覆盖到。
在 `test/reactivity/ref.spec.ts` 或 `test/reactivity/proxyRefs.spec.ts` 中：

```typescript
describe('proxyRefs', () => {
  it('should return value directly if not ref', () => {
    const value = proxyRefs({
      a: 1
    })
    expect(value.a).toBe(1)
  })

  it('should unwrap ref', () => {
    const value = proxyRefs({
      a: ref(1)
    })
    expect(value.a).toBe(1)
  })

  it('should update ref value', () => {
    const value = proxyRefs({
      a: ref(1)
    })
    value.a = 2
    expect(value.a).toBe(2)
    expect(value.a.value).toBe(2) // 原 ref 也更新了
  })

  it('should replace ref', () => {
    const value = proxyRefs({
      a: ref(1)
    })
    const newRef = ref(2)
    value.a = newRef
    expect(value.a).toBe(2)
    expect(value.a).toBe(newRef.value)
  })
  
  it('should work with reactive', () => {
    const count = ref(1)
    const state = reactive({
      count
    })
    // reactive 内部其实也做了类似 proxyRefs 的处理（在 Vue 源码中）
    // 但在我们的 mini-vue 中，reactive 目前还没有自动解包 ref
    // 这是一个值得注意的区别：Vue 的 reactive 会自动解包 ref，但仅限深层属性
  })
})
```

## 4. 总结

今天的内容虽然简短，但非常重要。
`unref` 和 `proxyRefs` 是 Vue 3 "易用性" 的重要保障。
它们展示了框架设计的一个重要原则：**把复杂留给自己，把简单留给用户**。

通过 `proxyRefs`，我们在模板中可以像操作普通对象一样操作响应式数据，完全感觉不到 `ref` 的存在。

明天，我们将实现最后几个工具函数：`toRaw`、`markRaw` 以及各种 `isXXX` 判断函数，彻底完善我们的响应式系统工具箱。
