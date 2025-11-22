# Day 30: 只许看，不许动 - readonly 的实现

你好，我是你的技术导师。

在团队协作中，我们经常需要把一个响应式对象传递给其他组件或模块。
但是，我们不希望它们随意修改这个对象，破坏数据的单向流动。
这时，我们需要给数据穿上一层"防弹衣" —— `readonly`。

## 1. 什么是 readonly？

`readonly` 创建一个对象的只读代理。
-   **读取**：正常工作，且如果是对象，递归返回 `readonly` 代理。
-   **修改**：拦截 `set` 操作，打印警告，不执行修改。
-   **删除**：拦截 `deleteProperty` 操作，打印警告，不执行删除。

```javascript
const original = reactive({ count: 0 })
const copy = readonly(original)

effect(() => {
  console.log(copy.count) // ✅ 正常追踪
})

copy.count++ // ❌ 警告：Set operation on key "count" failed: target is readonly.
```

## 2. 实现 readonlyHandlers

我们需要在 `src/reactivity/baseHandlers.ts` 中增加一组 handlers。

### 2.1 createGetter 支持 readonly

我们在 Day 29 已经预留了 `isReadonly` 参数。

```typescript
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // ... isReactive / isReadonly 判断 ...

    const res = Reflect.get(target, key, receiver)

    if (shallow) {
      return res
    }

    if (isObject(res)) {
      // 关键点：如果是 readonly，递归返回 readonly
      return isReadonly ? readonly(res) : reactive(res)
    }

    // 关键点：readonly 不需要 track
    // 因为它不会变，所以不需要收集依赖
    if (!isReadonly) {
      track(target, key)
    }

    return res
  }
}
```

### 2.2 readonlySetter

```typescript
const readonlySet = {
  set(target, key, value) {
    console.warn(`key :"${String(key)}" set 失败，因为 target 是 readonly`, target)
    return true
  },
  deleteProperty(target, key) {
    console.warn(`key :"${String(key)}" delete 失败，因为 target 是 readonly`, target)
    return true
  }
}
```

### 2.3 导出 handlers

```typescript
export const readonlyHandlers = {
  get: createGetter(true),
  ...readonlySet
}

export const shallowReadonlyHandlers = {
  get: createGetter(true, true), // isReadonly=true, shallow=true
  ...readonlySet
}
```

## 3. 实现 readonly 函数

在 `src/reactivity/reactive.ts` 中：

```typescript
import { readonlyHandlers, shallowReadonlyHandlers } from './baseHandlers'

export function readonly(target) {
  return createReactiveObject(target, readonlyHandlers)
}

export function shallowReadonly(target) {
  return createReactiveObject(target, shallowReadonlyHandlers)
}
```

## 4. 测试驱动

创建 `test/reactivity/readonly.spec.ts`。

```typescript
import { readonly, isReadonly, isProxy } from '../../src/reactivity/reactive'

describe('readonly', () => {
  it('should make nested values readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } }
    const wrapped = readonly(original)
    
    expect(wrapped).not.toBe(original)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(wrapped.bar)).toBe(true) // 深度只读
    expect(isProxy(wrapped)).toBe(true)
    
    expect(wrapped.foo).toBe(1)
  })

  it('should warn when call set', () => {
    console.warn = jest.fn()
    
    const user = readonly({
      age: 10
    })

    user.age = 11
    expect(console.warn).toBeCalled()
    expect(user.age).toBe(10) // 值没变
  })
})

describe('shallowReadonly', () => {
  it('should not make non-reactive properties reactive', () => {
    const props = shallowReadonly({ n: { foo: 1 } })
    expect(isReadonly(props)).toBe(true)
    expect(isReadonly(props.n)).toBe(false) // 深层不是只读
  })
})
```

## 5. 总结

`readonly` 是 Vue 3 单向数据流的重要保障。
在组件开发中，`props` 就是一个 `shallowReadonly` 的对象（在开发环境下）。

至此，我们已经集齐了 `reactive` 的四大金刚：
1.  `reactive`：深层响应式，可读可写。
2.  `shallowReactive`：浅层响应式，可读可写。
3.  `readonly`：深层只读。
4.  `shallowReadonly`：浅层只读。

明天，我们将对这四个 API 进行一次系统的对比和总结，帮你彻底理清它们的使用场景。
