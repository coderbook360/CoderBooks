# customRef：自定义响应式引用

customRef 是 Vue 响应式 API 中一个强大但较少使用的函数。它允许你完全控制 ref 的追踪和触发时机，可以用于实现防抖、节流、惰性更新等高级模式。

## customRef 的基本用法

customRef 接收一个工厂函数，这个函数接收 track 和 trigger 参数，返回一个包含 get 和 set 的对象：

```typescript
import { customRef } from 'vue'

function myCustomRef(value) {
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        value = newValue
        trigger()
      }
    }
  })
}
```

track 函数用于通知系统这是一个依赖，trigger 函数用于通知系统值已变化。你可以完全控制何时调用它们。

## customRef 的实现

让我们看看 customRef 的源码：

```typescript
export function customRef<T>(factory: CustomRefFactory<T>): Ref<T> {
  return new CustomRefImpl(factory) as any
}

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void,
) => {
  get: () => T
  set: (value: T) => void
}
```

它创建一个 CustomRefImpl 实例，传入用户提供的工厂函数。

## CustomRefImpl 类

```typescript
class CustomRefImpl<T> {
  public dep?: Dep = undefined

  private readonly _get: ReturnType<CustomRefFactory<T>>['get']
  private readonly _set: ReturnType<CustomRefFactory<T>>['set']

  public readonly __v_isRef = true

  constructor(factory: CustomRefFactory<T>) {
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this),
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
```

构造函数调用用户的工厂函数，传入两个绑定好的函数：

- track 函数：调用 `trackRefValue(this)`，将当前 effect 添加到这个 ref 的依赖中
- trigger 函数：调用 `triggerRefValue(this)`，通知所有依赖更新

工厂函数返回的 get 和 set 被保存，并在访问 .value 时调用。

## 实现防抖 ref

这是 customRef 最经典的使用案例：

```typescript
function useDebouncedRef<T>(value: T, delay = 200) {
  let timeout: number
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      }
    }
  })
}

// 使用
const searchQuery = useDebouncedRef('', 300)

// 在模板中
// <input v-model="searchQuery" />

// searchQuery 的变化会延迟 300ms 才触发依赖更新
```

这个防抖 ref 的 set 不会立即触发更新，而是等待 delay 毫秒。如果在延迟期间又有新的设置，会取消之前的定时器并重新开始计时。

## 实现节流 ref

类似地，可以实现节流：

```typescript
function useThrottledRef<T>(value: T, delay = 200) {
  let lastTime = 0
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        const now = Date.now()
        if (now - lastTime >= delay) {
          value = newValue
          lastTime = now
          trigger()
        }
      }
    }
  })
}
```

节流 ref 限制了触发频率，在 delay 时间内最多触发一次。

## 实现惰性 ref

惰性 ref 可以延迟初始值的计算：

```typescript
function useLazyRef<T>(getter: () => T) {
  let computed = false
  let value: T
  
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        if (!computed) {
          value = getter()
          computed = true
        }
        return value
      },
      set(newValue) {
        value = newValue
        computed = true
        trigger()
      }
    }
  })
}

// 使用
const expensiveValue = useLazyRef(() => {
  console.log('computing...')
  return heavyCalculation()
})

// 第一次访问时才计算
console.log(expensiveValue.value)  // 'computing...' 然后返回结果
console.log(expensiveValue.value)  // 直接返回缓存值
```

## 实现持久化 ref

可以创建自动与 localStorage 同步的 ref：

```typescript
function useLocalStorageRef<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key)
  let value: T = stored ? JSON.parse(stored) : defaultValue
  
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        value = newValue
        localStorage.setItem(key, JSON.stringify(newValue))
        trigger()
      }
    }
  })
}

// 使用
const theme = useLocalStorageRef('theme', 'light')
theme.value = 'dark'  // 自动保存到 localStorage
```

## 实现验证 ref

可以在设置时添加验证：

```typescript
function useValidatedRef<T>(
  initialValue: T,
  validator: (value: T) => boolean,
  onInvalid?: (value: T) => void
) {
  let value = initialValue
  
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue) {
        if (validator(newValue)) {
          value = newValue
          trigger()
        } else {
          onInvalid?.(newValue)
        }
      }
    }
  })
}

// 使用
const age = useValidatedRef(
  18,
  (v) => v >= 0 && v <= 150,
  (v) => console.warn(`Invalid age: ${v}`)
)

age.value = 25   // 正常设置
age.value = -5   // 警告，不会更新
```

## track 和 trigger 的时机

customRef 的核心在于控制 track 和 trigger 的调用时机：

track() 应该在 get 中调用，这样读取时会建立依赖关系。如果不调用 track，读取这个 ref 不会被 effect 追踪。

trigger() 应该在值变化后调用，通知依赖更新。可以根据业务逻辑决定何时调用——立即调用、延迟调用、条件调用都可以。

```typescript
customRef((track, trigger) => ({
  get() {
    // 不调用 track：读取不会被追踪
    return value
  },
  set(newValue) {
    value = newValue
    // 不调用 trigger：设置不会触发更新
  }
}))
```

这种灵活性让你可以实现各种特殊行为。

## 与 computed 的对比

customRef 和 computed 都可以自定义响应式行为，但定位不同：

computed 适合派生值，根据其他响应式数据计算得出：

```typescript
const doubled = computed(() => count.value * 2)
```

customRef 适合需要自定义追踪/触发逻辑的场景：

```typescript
const debounced = customRef((track, trigger) => ({
  get() { track(); return value },
  set(v) { /* 自定义逻辑 */ }
}))
```

如果只需要基本的响应式，用 ref；如果需要派生计算，用 computed；如果需要完全控制，用 customRef。

## 注意事项

闭包中的值管理要小心。value 变量在闭包中，需要确保正确更新：

```typescript
customRef((track, trigger) => {
  let value = initialValue  // 在闭包中
  return {
    get() {
      track()
      return value  // 返回闭包中的 value
    },
    set(newValue) {
      value = newValue  // 更新闭包中的 value
      trigger()
    }
  }
})
```

异步操作中的竞态条件也需要处理：

```typescript
function useAsyncRef<T>(fetcher: () => Promise<T>) {
  let value: T | undefined
  let pending = false
  let requestId = 0
  
  return customRef((track, trigger) => ({
    get() {
      track()
      if (!pending && value === undefined) {
        pending = true
        const id = ++requestId
        fetcher().then(result => {
          if (id === requestId) {  // 检查是否是最新请求
            value = result
            pending = false
            trigger()
          }
        })
      }
      return value
    },
    set(newValue) {
      value = newValue
      trigger()
    }
  }))
}
```

## 本章小结

customRef 提供了创建自定义响应式引用的能力。通过工厂函数获取 track 和 trigger，你可以完全控制依赖追踪和更新触发的时机。

常见应用包括防抖/节流 ref、惰性初始化、持久化存储、输入验证等。这些模式将响应式逻辑封装在 ref 内部，使用时像普通 ref 一样简单。

customRef 是响应式系统提供的"底层 API"，在需要特殊行为时非常有用。理解它的工作原理，有助于在常规 API 无法满足需求时找到解决方案。
