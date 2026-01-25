# customRef 自定义响应式

Vue3 提供了 `ref` 和 `reactive` 作为创建响应式数据的标准方式，但有时候我们需要更精细的控制。`customRef` 允许开发者创建一个自定义的响应式引用，完全控制它的依赖收集和更新触发行为。

## 为什么需要 customRef

标准的 `ref` 在赋值时会立即触发更新。在大多数场景下这是正确的行为，但某些场景需要不同的策略。

比如实现一个防抖（debounce）输入框。用户在输入框中快速输入时，我们不希望每次按键都触发更新，而是希望在用户停止输入一段时间后才更新。如果使用普通的 `ref`，每次输入都会立即更新并触发依赖的重新计算。

```javascript
// 使用普通 ref，每次输入都会立即触发
const text = ref('')

watch(text, async (newText) => {
  // 这会在每次按键时执行
  const results = await search(newText)
  // 如果用户连续输入，会发起很多次请求
})
```

我们可以在 watch 层面加防抖，但如果多处地方使用 `text`，每处都需要单独处理。更优雅的方式是让 `ref` 本身就具有防抖行为。

## customRef 的基本用法

`customRef` 接收一个工厂函数，返回一个包含 `get` 和 `set` 的对象：

```javascript
import { customRef } from 'vue'

function useDebouncedRef(value, delay = 300) {
  let timeout
  
  return customRef((track, trigger) => {
    return {
      get() {
        track() // 收集依赖
        return value
      },
      set(newValue) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger() // 触发更新
        }, delay)
      }
    }
  })
}

// 使用
const text = useDebouncedRef('', 500)
```

这段代码创建了一个防抖的 ref。读取时正常收集依赖，但写入时会延迟指定时间才触发更新。如果在延迟期间又有新的写入，会重置计时器。

## track 和 trigger 的本质

工厂函数接收的 `track` 和 `trigger` 参数是 Vue 响应式系统的核心操作的封装：

`track()` —— 当在 effect 执行期间调用时，会将当前 effect 记录为这个 customRef 的依赖者。

`trigger()` —— 通知所有依赖这个 customRef 的 effect 重新执行。

这两个函数让开发者可以精确控制何时收集依赖、何时触发更新：

```javascript
customRef((track, trigger) => ({
  get() {
    // 可以选择是否收集依赖
    if (shouldTrack) {
      track()
    }
    return value
  },
  set(newValue) {
    value = newValue
    // 可以选择何时触发更新
    if (shouldTrigger) {
      trigger()
    }
  }
}))
```

## 实现带验证的 ref

另一个常见需求是在设置值时进行验证：

```javascript
function useValidatedRef(value, validator) {
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue) {
      if (validator(newValue)) {
        value = newValue
        trigger()
      } else {
        console.warn('Validation failed for value:', newValue)
        // 不触发更新，值保持不变
      }
    }
  }))
}

// 使用
const age = useValidatedRef(0, (val) => val >= 0 && val <= 150)

age.value = 25  // 正常更新
age.value = -5  // 警告，不更新
age.value = 200 // 警告，不更新
```

## 实现持久化的 ref

将 ref 的值同步到 localStorage：

```javascript
function useLocalStorageRef(key, defaultValue) {
  // 从 localStorage 读取初始值
  const stored = localStorage.getItem(key)
  let value = stored ? JSON.parse(stored) : defaultValue
  
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue) {
      value = newValue
      // 同步到 localStorage
      localStorage.setItem(key, JSON.stringify(newValue))
      trigger()
    }
  }))
}

// 使用
const theme = useLocalStorageRef('theme', 'light')
theme.value = 'dark' // 自动保存到 localStorage
```

## 实现节流的 ref

与防抖不同，节流（throttle）保证在固定时间间隔内最多触发一次：

```javascript
function useThrottledRef(value, interval = 300) {
  let lastTrigger = 0
  let pending = false
  let pendingValue = value
  
  return customRef((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(newValue) {
      pendingValue = newValue
      
      const now = Date.now()
      if (now - lastTrigger >= interval) {
        // 已过节流间隔，立即更新
        value = pendingValue
        lastTrigger = now
        trigger()
      } else if (!pending) {
        // 设置定时器在间隔结束后更新
        pending = true
        setTimeout(() => {
          value = pendingValue
          lastTrigger = Date.now()
          pending = false
          trigger()
        }, interval - (now - lastTrigger))
      }
    }
  }))
}
```

## 实现惰性初始化的 ref

有时候初始值的计算很昂贵，我们希望延迟到第一次访问时才计算：

```javascript
function useLazyRef(initializer) {
  let value
  let initialized = false
  
  return customRef((track, trigger) => ({
    get() {
      track()
      if (!initialized) {
        value = initializer()
        initialized = true
      }
      return value
    },
    set(newValue) {
      value = newValue
      initialized = true
      trigger()
    }
  }))
}

// 使用
const expensiveData = useLazyRef(() => {
  console.log('Computing expensive data...')
  return heavyComputation()
})

// 初始化时不会输出 "Computing..."
// 只有第一次访问 expensiveData.value 时才会计算
```

## 与响应式系统的集成

customRef 返回的对象是一个合法的 ref，可以与所有标准的响应式 API 配合使用：

```javascript
const debouncedText = useDebouncedRef('')

// 可以在模板中使用
// <input v-model="debouncedText" />

// 可以与 watch 配合
watch(debouncedText, (val) => {
  console.log('Text changed:', val)
})

// 可以与 computed 配合
const uppercase = computed(() => debouncedText.value.toUpperCase())

// 可以放入 reactive 对象
const state = reactive({
  text: debouncedText
})
// 注意：在 reactive 中会自动解包
console.log(state.text) // 不需要 .value
```

## 实现原理

customRef 的实现非常简洁。它创建一个对象，暴露 `value` 属性的 getter 和 setter：

```javascript
function customRef(factory) {
  // 创建 dep 用于依赖管理
  const dep = new Dep()
  
  const { get, set } = factory(
    // track 函数
    () => dep.track(),
    // trigger 函数
    () => dep.trigger()
  )
  
  return {
    get value() {
      return get()
    },
    set value(newVal) {
      set(newVal)
    },
    // 标记为 ref
    __v_isRef: true
  }
}
```

`Dep` 类（或类似机制）封装了依赖收集和触发的细节。当调用 `track()` 时，如果当前有活跃的 effect，就会建立依赖关系。当调用 `trigger()` 时，所有依赖的 effect 会被通知。

## 使用注意事项

**确保在 get 中调用 track**。如果忘记调用 track，这个 ref 就无法建立依赖关系，watch 和 computed 都不会响应它的变化。

**在适当的时机调用 trigger**。trigger 是触发更新的唯一方式。如果在某些 set 路径中忘记调用 trigger，依赖者不会收到通知。

**避免复杂的异步逻辑**。虽然可以在 get 和 set 中编写复杂的逻辑，但应该保持简单。复杂的异步行为可能导致难以预测的更新顺序。

**考虑初始状态**。如果 get 在某些条件下不调用 track，第一次访问时可能不会建立依赖关系。

## 与 computed 的对比

customRef 和 computed 都可以控制响应式行为，但它们的用途不同：

computed 用于派生值——基于其他响应式数据计算出新的值，自动追踪依赖，具有缓存。

customRef 用于自定义基础响应式行为——控制值的读写行为，手动管理依赖收集和更新触发。

```javascript
// computed：自动追踪，派生新值
const doubled = computed(() => count.value * 2)

// customRef：手动控制，自定义行为
const debounced = customRef((track, trigger) => ({
  get() { track(); return value },
  set(v) { /* 自定义逻辑 */ trigger() }
}))
```

## 小结

customRef 是 Vue3 响应式系统中一个强大但常被忽视的 API。它让开发者可以创建具有自定义行为的响应式引用，比如防抖、节流、验证、持久化等。通过 track 和 trigger 两个函数，开发者获得了对依赖收集和更新触发的完全控制。

在下一章中，我们将探讨响应式系统的边界与限制，了解什么样的数据适合响应式处理，什么样的场景不适合。

