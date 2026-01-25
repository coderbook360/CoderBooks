# 数组的响应式处理：应对特殊语义

数组是 JavaScript 中最常用的数据结构之一，但它也是响应式系统实现中最棘手的部分。虽然数组本质上是对象，可以被 Proxy 代理，但数组有很多特殊的语义需要处理——length 属性与索引之间的隐式关联，以及一系列会修改数组结构的内置方法。如果不对这些特殊情况做处理，响应式系统就会出现各种奇怪的行为。

## length 属性的特殊性

数组与普通对象最显著的区别在于 length 属性。这个属性是"活的"：当你添加超出当前长度的元素时，length 会自动增加；当你减小 length 时，超出的元素会被删除。这种双向关联带来了依赖追踪的复杂性。

考虑这样一个场景：你有一个 effect 依赖于数组的 length，当你通过 push 添加元素时，effect 应该被触发。但问题是，push 方法实际上是先读取 length（确定新元素放在哪个位置），然后设置新索引的值，最后更新 length。从 Proxy 的角度看，这涉及到对 length 的读取和对新索引的设置，我们需要确保依赖 length 的 effects 能正确被触发：

```typescript
const arr = reactive([1, 2, 3])

effect(() => {
  console.log('length changed:', arr.length)
})

// push 会增加 length，应该触发上面的 effect
arr.push(4)
```

反过来，如果直接修改 length 来缩短数组，那些被删除的索引的订阅者也应该被通知：

```typescript
const arr = reactive([1, 2, 3, 4, 5])

effect(() => {
  // 依赖于索引 3
  console.log('element at 3:', arr[3])
})

// 缩短数组会删除索引 3，应该触发上面的 effect
arr.length = 2
```

要正确处理这些场景，我们需要在 trigger 函数中添加特殊逻辑。

## 改进 setter：区分新增与修改

首先，我们需要在 setter 中区分"新增属性"和"修改属性"。对于数组来说，如果设置的索引大于等于当前 length，这是新增；否则是修改。这个区分很重要，因为新增元素会影响 length，而修改现有元素不会：

```typescript
function createSetter() {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ) {
    const oldValue = (target as any)[key]
    
    // 判断这是新增还是修改
    // 对于数组，检查索引是否小于当前长度
    // 对于对象，检查属性是否已存在
    const hadKey = Array.isArray(target)
      ? Number(key) < target.length
      : Object.prototype.hasOwnProperty.call(target, key)
    
    const result = Reflect.set(target, key, value, receiver)
    
    // 根据操作类型选择不同的触发方式
    if (!hadKey) {
      // 这是新增操作
      trigger(target, key, TriggerType.ADD)
    } else if (oldValue !== value) {
      // 这是修改操作，且值确实变化了
      trigger(target, key, TriggerType.SET)
    }
    
    return result
  }
}
```

通过传递操作类型给 trigger，我们可以在 trigger 中做出相应的处理。

## 改进 trigger：处理 length 关联

trigger 函数需要根据操作类型和目标类型执行不同的逻辑。对于数组的 ADD 操作，我们需要额外触发依赖于 length 的 effects；对于修改 length 本身，我们需要触发那些被"删除"的索引的订阅者：

```typescript
const TriggerType = {
  ADD: 'ADD',
  SET: 'SET',
  DELETE: 'DELETE'
} as const

function trigger(
  target: object,
  key: unknown,
  type: string,
  newValue?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  // 收集所有需要执行的 effects
  const effectsToRun = new Set<ReactiveEffect>()
  
  // 1. 收集直接依赖于这个 key 的 effects
  const directDeps = depsMap.get(key)
  if (directDeps) {
    directDeps.forEach(effect => {
      if (effect !== activeEffect) {
        effectsToRun.add(effect)
      }
    })
  }
  
  // 2. 数组特殊处理
  if (Array.isArray(target)) {
    // 新增元素时，触发依赖于 length 的 effects
    if (type === TriggerType.ADD) {
      const lengthDeps = depsMap.get('length')
      if (lengthDeps) {
        lengthDeps.forEach(effect => {
          if (effect !== activeEffect) {
            effectsToRun.add(effect)
          }
        })
      }
    }
    
    // 直接修改 length 时，触发被删除索引的订阅者
    if (key === 'length' && typeof newValue === 'number') {
      // 遍历所有已追踪的依赖
      depsMap.forEach((deps, trackedKey) => {
        // 如果追踪的是数字索引，且该索引 >= 新 length
        if (typeof trackedKey === 'number' && trackedKey >= newValue) {
          deps.forEach(effect => {
            if (effect !== activeEffect) {
              effectsToRun.add(effect)
            }
          })
        }
      })
    }
  }
  
  // 执行收集到的 effects
  effectsToRun.forEach(effect => {
    if (effect.scheduler) {
      effect.scheduler(effect)
    } else {
      effect.run()
    }
  })
}
```

这段代码的核心逻辑是：除了触发直接依赖于被修改 key 的 effects，还要根据数组的特殊语义触发间接相关的 effects。新增元素意味着 length 变化，所以触发 length 的订阅者；减小 length 意味着删除元素，所以触发被删除索引的订阅者。

## 数组查找方法的问题

数组的 `includes`、`indexOf`、`lastIndexOf` 方法用于在数组中查找元素。当我们用原始对象作为参数调用这些方法时，会遇到一个问题：

```typescript
const obj = { id: 1 }
const arr = reactive([obj])

// 这会返回 false，但我们期望 true！
console.log(arr.includes(obj))
```

问题在于：当我们访问 `arr[0]` 时，getter 会将 obj 转换为响应式代理返回。所以数组中存储的实际上是 obj 的代理，而 includes 接收的参数是原始 obj。代理和原始对象不相等，所以查找失败。

解决方案是重写这些方法，让它们在代理版本查找失败后，再尝试在原始数组中查找：

```typescript
const arrayInstrumentations: Record<string, Function> = {}

// 重写查找方法
const searchMethods = ['includes', 'indexOf', 'lastIndexOf']
searchMethods.forEach(method => {
  const originalMethod = Array.prototype[method as keyof Array<any>]
  
  arrayInstrumentations[method] = function(
    this: unknown[], 
    ...args: unknown[]
  ) {
    // 首先在代理数组上查找
    let result = originalMethod.apply(this, args)
    
    // 如果找不到，可能是因为参数是原始对象
    // 尝试在原始数组上查找
    if (result === false || result === -1) {
      const rawArray = (this as any)[ReactiveFlags.RAW]
      result = originalMethod.apply(rawArray, args)
    }
    
    return result
  }
})
```

这个实现先在代理数组上执行原始方法。如果返回 false（includes）或 -1（indexOf/lastIndexOf），说明没找到，这时我们获取原始数组（通过 `__v_raw` 标识符）再查找一次。这样无论用户传入的是代理对象还是原始对象，都能正确找到。

在 getter 中，我们需要检查访问的是否是这些被重写的方法：

```typescript
function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    // ... 标识符处理 ...
    
    // 如果访问的是被重写的数组方法，返回我们的版本
    if (Array.isArray(target) && 
        Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    
    // ... 正常处理 ...
  }
}
```

## 避免无限循环：暂停依赖收集

数组的某些方法会同时读取和修改 length，比如 push、pop、shift、unshift、splice。这在响应式系统中可能导致无限循环：

```typescript
const arr = reactive([])

effect(() => {
  // push 会读取 length（确定新位置）
  // 然后设置新元素，导致 length 增加
  // 如果 length 变化触发了这个 effect...
  arr.push(1)
  // 就会再次执行 push，再次触发...
})
```

问题的根源是：这些方法在执行时会读取 length，建立依赖；然后修改 length，触发更新。如果 effect 本身包含这些操作，就会陷入自我触发的循环。

解决方案是在执行这些方法时暂停依赖收集。我们引入一个全局标志来控制：

```typescript
let shouldTrack = true

export function pauseTracking() {
  shouldTrack = false
}

export function enableTracking() {
  shouldTrack = true
}

function track(target: object, key: unknown) {
  // 如果不应该追踪，直接返回
  if (!activeEffect || !shouldTrack) return
  
  // ... 正常的依赖收集逻辑 ...
}
```

然后重写那些可能导致问题的方法：

```typescript
const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice']
mutatingMethods.forEach(method => {
  const originalMethod = Array.prototype[method as keyof Array<any>]
  
  arrayInstrumentations[method] = function(
    this: unknown[], 
    ...args: unknown[]
  ) {
    // 暂停依赖收集
    pauseTracking()
    
    // 执行原始方法
    const result = originalMethod.apply(this, args)
    
    // 恢复依赖收集
    enableTracking()
    
    return result
  }
})
```

在方法执行期间暂停依赖收集，意味着方法内部对 length 的读取不会建立依赖。方法完成后恢复正常。这样，即使 effect 中包含 push 操作，也不会因为 length 的变化而自我触发。

需要注意的是，这种设计是有意为之的：我们希望 push 等操作能触发那些依赖于 length 的其他 effects，但不希望它们触发包含 push 操作本身的 effect。通过在方法执行期间暂停追踪，我们精确地实现了这个语义。

## 处理迭代器

当使用 `for...of` 遍历响应式数组时，JavaScript 会调用数组的 `Symbol.iterator` 方法获取迭代器。这涉及到对数组元素的依次访问，我们需要确保迭代过程中建立正确的依赖：

```typescript
const arr = reactive([1, 2, 3])

effect(() => {
  for (const item of arr) {
    console.log(item)
  }
})

// 添加元素应该触发重新遍历
arr.push(4)
```

由于 `for...of` 会读取每个索引的值，这些索引的依赖会被正常收集。但我们还需要确保对 length 的依赖被收集，因为数组长度变化意味着遍历结果会改变。

实现方式是在访问 Symbol.iterator 或相关方法时，额外追踪对 length 的依赖：

```typescript
function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    // ... 其他逻辑 ...
    
    const result = Reflect.get(target, key, receiver)
    
    if (!isReadonly) {
      track(target, key)
      
      // 对于数组的迭代相关操作，额外追踪 length
      if (Array.isArray(target) && typeof key === 'symbol') {
        track(target, 'length')
      }
    }
    
    // ... 其他逻辑 ...
  }
}
```

这样，当数组长度变化时，所有通过迭代器访问过数组的 effects 都会被重新执行。

## 本章小结

数组的响应式处理揭示了一个重要原则：通用的代理机制需要针对特定数据结构的语义进行定制。数组的 length 属性与索引之间的隐式关联，以及各种内置方法的特殊行为，都需要在响应式系统中得到正确处理。

我们的解决方案包括：区分 ADD 和 SET 操作，让 trigger 能够根据操作类型触发正确的依赖；重写查找方法，让它们能同时搜索代理和原始值；在可能导致循环的方法中暂停依赖收集，避免无限递归；以及为迭代操作追踪 length 依赖。

这些处理看似繁琐，但它们是让响应式数组"符合直觉"的必要工作。用户不需要了解这些细节，他们只需要像使用普通数组一样使用响应式数组，系统会自动处理好一切。这正是好的抽象应该做的：隐藏复杂性，提供简单一致的接口。

在下一章中，我们将处理另一类特殊的数据结构：Map 和 Set 集合类型。它们的挑战与数组不同，但同样需要精心设计的解决方案。
