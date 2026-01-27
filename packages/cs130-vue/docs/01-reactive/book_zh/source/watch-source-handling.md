# watch source 处理：数据源的统一化

watch 可以监听多种类型的数据源：ref、reactive 对象、getter 函数、以及它们的数组组合。本章详细分析 Vue 如何将这些不同类型统一处理。

## 数据源类型概览

watch 支持的数据源类型：

```typescript
// 1. Ref
watch(ref(0), callback)

// 2. Computed
watch(computed(() => count.value * 2), callback)

// 3. Reactive 对象
watch(reactive({ count: 0 }), callback)

// 4. Getter 函数
watch(() => state.count, callback)

// 5. 数组（多源）
watch([ref1, ref2, () => state.count], callback)
```

每种类型在内部都会被转换为 getter 函数。

## Ref 类型处理

```typescript
if (isRef(source)) {
  getter = () => source.value
  forceTrigger = isShallow(source)
}
```

ref 的处理最简单，getter 返回 .value。

forceTrigger 对 shallowRef 为 true。shallowRef 的值是对象时，即使引用不变但内部可能变了，需要强制触发回调。

```typescript
const obj = { count: 0 }
const shallow = shallowRef(obj)

watch(shallow, (newVal) => {
  console.log(newVal.count)  // 需要 forceTrigger 才能触发
})

// 修改内部属性
shallow.value.count = 1
triggerRef(shallow)  // 手动触发
```

## Reactive 对象处理

```typescript
if (isReactive(source)) {
  getter = () => reactiveGetter(source)
  deep = true  // 自动开启深度监听
}

function reactiveGetter(source: object) {
  if (deep) {
    return source
  }
  if (isShallow(source) || deep === false || deep === 0) {
    return traverse(source, 1)
  }
  return traverse(source)
}
```

监听 reactive 对象时自动开启 deep 模式。这是合理的设计——既然要监听整个对象，通常希望任何嵌套属性变化都能触发。

reactiveGetter 根据 deep 值决定遍历深度。deep 为 true 时会在后面统一调用 traverse。

## Getter 函数处理

```typescript
if (isFunction(source)) {
  if (cb) {
    // watch(getter, callback)
    getter = () =>
      callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
  } else {
    // watchEffect(effect)
    getter = () => {
      if (cleanup) {
        cleanup()
      }
      return callWithAsyncErrorHandling(
        source,
        instance,
        ErrorCodes.WATCH_CALLBACK,
        [onCleanup],
      )
    }
  }
}
```

getter 函数是最灵活的方式，可以监听任意表达式：

```typescript
// 监听计算结果
watch(() => state.a + state.b, callback)

// 监听嵌套属性
watch(() => state.user.profile.name, callback)

// 监听条件表达式
watch(() => state.count > 10, callback)
```

watchEffect 模式下，getter 会先执行清理函数，然后传入 onCleanup 让用户注册新的清理函数。

## 多源数组处理

```typescript
if (isArray(source)) {
  isMultiSource = true
  forceTrigger = source.some(s => isReactive(s) || isShallow(s))
  getter = () =>
    source.map(s => {
      if (isRef(s)) {
        return s.value
      } else if (isReactive(s)) {
        return reactiveGetter(s)
      } else if (isFunction(s)) {
        return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER)
      } else {
        __DEV__ && warnInvalidSource(s)
      }
    })
}
```

数组源的处理组合了上述所有类型。getter 返回一个数组，每个元素按其类型处理。

isMultiSource 标记影响后续的值比较和回调参数格式：

```typescript
watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
  // 回调参数是数组形式
})
```

forceTrigger 在数组中任何一个是 reactive 或 shallowRef 时为 true。

## 无效源处理

```typescript
} else {
  getter = NOOP
  __DEV__ && warnInvalidSource(source)
}
```

如果 source 不是任何有效类型，getter 设为空函数，开发模式下给出警告。

```typescript
function warnInvalidSource(s: unknown) {
  warn(
    `Invalid watch source: `,
    s,
    `A watch source can only be a getter/effect function, a ref, ` +
      `a reactive object, or an array of these types.`,
  )
}
```

## traverse 深度遍历

```typescript
export function traverse(
  value: unknown,
  depth: number = Infinity,
  seen?: Set<unknown>,
): unknown {
  if (depth <= 0 || !isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)

  depth--

  if (isRef(value)) {
    traverse(value.value, depth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, depth, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen)
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse(value[key as any], depth, seen)
      }
    }
  }

  return value
}
```

traverse 递归访问对象的所有属性，触发 getter 建立依赖追踪。

关键设计：

1. depth 控制遍历深度，避免不必要的深层追踪
2. seen Set 防止循环引用导致无限递归
3. ReactiveFlags.SKIP 标记的对象被跳过
4. 支持数组、Set、Map、普通对象
5. 包括 Symbol 键

## 深度选项的演进

Vue 3.5 增强了 deep 选项：

```typescript
// 完全深度（默认 reactive 对象行为）
watch(state, callback, { deep: true })

// 指定深度
watch(state, callback, { deep: 2 })

// 禁用深度
watch(state, callback, { deep: false })
```

数字深度让用户精确控制追踪层级：

```typescript
const state = reactive({
  level1: {
    level2: {
      level3: { value: 1 }
    }
  }
})

// 只追踪到 level2
watch(state, callback, { deep: 2 })

state.level1.level2 = {}        // 触发
state.level1.level2.level3 = {} // 不触发
```

## getter 构建的最终处理

```typescript
const baseGetter = getter
if (deep) {
  if (deep === true) {
    getter = () => traverse(baseGetter())
  } else {
    const depth = deep
    getter = () => traverse(baseGetter(), depth)
  }
}
```

如果 deep 有效，在原 getter 外包装 traverse 调用。deep 为 true 时无限深度，为数字时使用指定深度。

## 类型推断

TypeScript 根据源类型推断回调参数类型：

```typescript
const count = ref(0)
const name = ref('Vue')

// 单源：推断为 number
watch(count, (newVal) => {
  // newVal: number
})

// 多源：推断为元组
watch([count, name], ([c, n]) => {
  // c: number, n: string
})

// getter：推断返回类型
watch(() => count.value * 2, (val) => {
  // val: number
})
```

这依赖于精心设计的类型重载。

## 本章小结

watch 的数据源处理展示了优秀的 API 设计——提供灵活的输入接口，内部统一为 getter 函数。每种类型有针对性的处理逻辑，traverse 函数实现可控的深度遍历。

理解源处理机制有助于选择最合适的监听方式。getter 函数最灵活，ref 最简单，reactive 对象自动深度监听，数组支持同时监听多个源。
