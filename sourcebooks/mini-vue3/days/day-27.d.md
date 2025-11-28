# Day 27: 响应式工具箱 - isReactive, toRaw 与 markRaw

你好，我是你的技术导师。

在响应式系统的最后，我们需要补齐一些实用的工具函数。
这些函数在开发 Vue 插件或进行底层调试时非常有用。
它们就像是瑞士军刀上的各种小工具，虽然不常用，但关键时刻能救命。

## 1. 状态判断函数

我们需要判断一个对象到底是什么类型的代理。
Vue 3 的做法非常巧妙：**访问特定的属性**。
我们在 `get` 拦截器中，检测用户是否在访问这些特殊属性，如果是，就直接返回 `true`。

### 1.1 定义枚举

在 `src/reactivity/reactive.ts` 中：

```typescript
export const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  RAW = '__v_raw'
}
```

### 1.2 修改 baseHandlers

我们需要在 `createGetter` 中增加判断逻辑。

```typescript
// src/reactivity/baseHandlers.ts

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // 1. 判断 isReactive
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    }
    // 2. 判断 isReadonly
    else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    }
    
    // ... 原有的逻辑 ...
  }
}
```

### 1.3 实现工具函数

现在实现这些函数就易如反掌了。

```typescript
// src/reactivity/reactive.ts

export function isReactive(value) {
  // 如果 value 是 proxy，访问它的属性会触发 get 拦截器，返回 true
  // 如果 value 是普通对象，访问它的属性返回 undefined，转为 boolean 就是 false
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
```

## 2. toRaw：获取原始对象

有时候我们需要拿到代理对象背后的原始对象（比如为了性能优化，或者避免触发响应式）。
原理一样，我们通过访问 `__v_raw` 属性来获取。

### 2.1 修改 baseHandlers

```typescript
// src/reactivity/baseHandlers.ts

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      // 3. 返回原始对象
      return target
    }
    
    // ...
  }
}
```

### 2.2 实现 toRaw

```typescript
// src/reactivity/reactive.ts

export function toRaw(observed) {
  // 尝试获取 __v_raw
  const raw = observed && observed[ReactiveFlags.RAW]
  // 如果获取到了，说明是 proxy，继续递归（处理多层代理的情况）；如果没获取到，说明本身就是 raw
  return raw ? toRaw(raw) : observed
}
```

## 3. markRaw：标记为"不可代理"

有时候我们有一个复杂的第三方库对象（比如地图实例），我们不希望它被转换成响应式对象（因为性能开销大，且不需要）。
我们可以给它打个标签：`skip`。

### 3.1 实现 markRaw

```typescript
// src/reactivity/reactive.ts

export function markRaw(value) {
  Object.defineProperty(value, ReactiveFlags.SKIP, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: true
  })
  return value
}
```

### 3.2 修改 reactive

在创建代理之前，检查这个标记。

```typescript
// src/reactivity/reactive.ts

export function reactive(target) {
  // 如果被标记了 skip，直接返回
  if (target[ReactiveFlags.SKIP]) {
    return target
  }
  // ...
}
```

## 4. 测试驱动

创建 `test/reactivity/readonly.spec.ts` 或 `reactive.spec.ts`。

```typescript
describe('reactive utils', () => {
  it('isReactive', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(isReactive(observed)).toBe(true)
    expect(isReactive(original)).toBe(false)
  })

  it('isReadonly', () => {
    const original = { foo: 1 }
    const wrapped = readonly(original)
    expect(isReadonly(wrapped)).toBe(true)
    expect(isReadonly(original)).toBe(false)
  })

  it('isProxy', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const wrapped = readonly(original)
    expect(isProxy(observed)).toBe(true)
    expect(isProxy(wrapped)).toBe(true)
    expect(isProxy(original)).toBe(false)
  })

  it('toRaw', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(toRaw(observed)).toBe(original)
    expect(toRaw(original)).toBe(original)
  })
  
  it('nested reactive toRaw', () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    const observed2 = reactive(observed)
    expect(toRaw(observed2)).toBe(original)
  })
})
```

## 5. 总结

今天我们给响应式系统装上了最后的"保险杠"。

-   **`isReactive` / `isReadonly`**：让我们能看透对象的本质。
-   **`toRaw`**：让我们能穿越代理，直达本源。
-   **`markRaw`**：让我们能手动控制响应式的边界，优化性能。

至此，**Reactivity 模块** 彻底完结！🎉🎉🎉

你已经从零开始，一行一行代码地构建了一个功能完备、通过测试的 Vue 3 响应式系统。
这是一个巨大的成就。

明天，我们将进行一次**阶段性复盘**，回顾这20多天的旅程，总结得失，并为下一阶段的 **Runtime Core** 做好准备。
