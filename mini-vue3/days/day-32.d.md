# Day 32: 定制你的响应式 - triggerRef 与 customRef

你好，我是你的技术导师。

在 `ref` 的世界里，除了标准的 `ref` 和 `shallowRef`，Vue 3 还为我们提供了两个"后门"，让我们能够手动控制响应式的行为。
这就是 `triggerRef` 和 `customRef`。

## 1. triggerRef：手动挡的乐趣

我们在使用 `shallowRef` 时，只有 `.value` 被替换时才会触发更新。
如果我们修改了对象内部的属性，Vue 是不知道的。

```javascript
const state = shallowRef({ count: 1 })
state.value.count = 2 // ❌ 不会触发更新
```

但是，有时候我们就是想改了内部属性后，强制刷新一下视图。
这时，`triggerRef` 就派上用场了。

```javascript
state.value.count = 2
triggerRef(state) // ✅ 强制触发更新
```

### 1.1 实现 triggerRef

在 `src/reactivity/ref.ts` 中：

```typescript
export function triggerRef(ref) {
  triggerEffects(ref.dep)
}
```

是不是简单得令人发指？
前提是你之前已经把 `triggerEffects` 从 `effect.ts` 中抽离出来了（我们在 Day 23 中提到过）。

## 2. customRef：掌控一切

`customRef` 是一个工厂函数，它要求你返回一个对象，该对象包含 `get` 和 `set` 方法。
它会把 `track` 和 `trigger` 两个函数作为参数传给你。
这就意味着：**你可以决定什么时候收集依赖，什么时候触发更新。**

### 2.1 经典案例：防抖 Ref (useDebouncedRef)

假设我们有一个搜索框，我们不希望用户每输入一个字就触发一次搜索请求，而是等用户停下来 500ms 后再触发。

```javascript
function useDebouncedRef(value, delay = 200) {
  let timeout
  return customRef((track, trigger) => {
    return {
      get() {
        track() // 告诉 Vue 追踪这个变量
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        // 延迟执行
        timeout = setTimeout(() => {
          value = newValue
          trigger() // 告诉 Vue 更新视图
        }, delay)
      }
    }
  })
}
```

### 2.2 实现 customRef

在 `src/reactivity/ref.ts` 中：

```typescript
class CustomRefImpl {
  public dep
  public __v_isRef = true
  private _get
  private _set

  constructor(factory) {
    this.dep = new Set()
    const { get, set } = factory(
      () => trackEffects(this.dep), // track
      () => triggerEffects(this.dep) // trigger
    )
    this._get = get
    this._set = set
  }

  get value() {
    return this._get()
  }

  set value(newVal) {
    this._set(newVal)
  }
}

export function customRef(factory) {
  return new CustomRefImpl(factory)
}
```

## 3. 测试驱动

创建 `test/reactivity/customRef.spec.ts`。

```typescript
import { customRef } from '../../src/reactivity/ref'
import { effect } from '../../src/reactivity/effect'

describe('customRef', () => {
  it('should work', () => {
    let value = 0
    let _trigger
    
    const custom = customRef((track, trigger) => {
      _trigger = trigger
      return {
        get() {
          track()
          return value
        },
        set(newValue) {
          value = newValue
          // 注意：这里我们故意不调用 trigger，而是手动控制
        }
      }
    })

    let dummy
    effect(() => {
      dummy = custom.value
    })
    expect(dummy).toBe(0)

    custom.value = 1
    expect(dummy).toBe(0) // 没触发 trigger，所以没更新

    _trigger() // 手动触发
    expect(dummy).toBe(1)
  })
})
```

## 4. 总结

`customRef` 是 Vue 3 响应式系统灵活性的极致体现。
它把底层的 `track` 和 `trigger` 能力暴露给了开发者，让你能够创造出各种神奇的响应式数据结构（比如防抖 Ref、节流 Ref、甚至是从网络异步获取数据的 Ref）。

至此，我们关于 `ref` 的所有内容都讲完了。
明天，我们将进入 **Computed 的高级用法**，看看它是如何处理 setter 的。
