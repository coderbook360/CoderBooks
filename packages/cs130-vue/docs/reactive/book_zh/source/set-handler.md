# set 拦截器详解

set 拦截器在属性被赋值时触发。它的主要职责是设置新值并在适当时候触发更新。相比 get 拦截器，set 的逻辑更集中，但也有一些微妙之处需要理解。

## createSetter 工厂

和 get 一样，set 也通过工厂函数创建：

```typescript
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    // ... 实现
  }
}
```

set 只有一个配置参数 shallow。没有 isReadonly 参数，因为 readonly 对象的 set 拦截器不用这个工厂，而是直接定义为警告函数。

## 获取旧值

set 函数首先获取旧值，用于后续的比较：

```typescript
let oldValue = (target as any)[key]
```

注意这里直接访问 target 而不是 receiver。这是故意的——我们要的是原始对象上的旧值，不需要经过代理。

## 非浅层模式的特殊处理

在非浅层模式下，有一系列特殊处理：

```typescript
if (!shallow) {
  const isOldValueReadonly = isReadonly(oldValue)
  if (!isShallow(value) && !isReadonly(value)) {
    oldValue = toRaw(oldValue)
    value = toRaw(value)
  }
  if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
    if (isOldValueReadonly) {
      return false
    } else {
      oldValue.value = value
      return true
    }
  }
}
```

让我们逐步分析这段代码。

首先检查旧值是否是 readonly。这个信息后面会用到。

然后，如果新值不是浅层代理也不是 readonly，就把旧值和新值都转为原始对象。为什么？因为比较时应该比较原始值而不是代理。两个不同的代理可能指向同一个原始对象，这种情况下不应该触发更新。

最复杂的是 ref 处理。如果旧值是 ref 而新值不是 ref（且目标不是数组），有两种情况：

如果旧值是 readonly ref，拒绝赋值，返回 false。

否则，不是替换 ref 本身，而是设置 ref 的 value。这支持了这种写法：

```javascript
const state = reactive({ count: ref(0) })
state.count = 5 // 相当于 state.count.value = 5
```

这个行为和 get 拦截器的 ref 自动解包配合，让 reactive 对象中的 ref 使用起来更加自然。

## 判断新增还是修改

接下来判断这是新增属性还是修改已有属性：

```typescript
const hadKey = isArray(target) && isIntegerKey(key)
  ? Number(key) < target.length
  : hasOwn(target, key)
```

对于数组，如果设置的索引小于当前长度，就是修改已有元素；否则是新增元素（同时可能增加 length）。

对于对象，用 hasOwn 检查属性是否已存在。

这个区分很重要，因为新增和修改触发的更新类型不同。新增属性可能影响 `for...in` 循环或 `Object.keys()` 的结果，需要通知依赖于遍历的 effect。

## 执行赋值

使用 Reflect.set 执行实际的赋值操作：

```typescript
const result = Reflect.set(target, key, value, receiver)
```

为什么用 Reflect.set 而不是直接 `target[key] = value`？因为 Reflect.set 正确处理了 receiver 参数。如果属性是一个 setter，receiver 决定了 setter 中 this 的值。使用 receiver（代理对象）确保 setter 中的操作也能被正确追踪。

Reflect.set 返回一个布尔值，表示赋值是否成功。在严格模式下，如果对象不可扩展或属性不可写，赋值会失败。

## 触发更新

最后是触发更新的逻辑：

```typescript
if (target === toRaw(receiver)) {
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
}
return result
```

`target === toRaw(receiver)` 这个检查很关键。它确保只有直接在目标对象上的赋值才触发更新。考虑这种情况：

```javascript
const parent = reactive({ name: 'parent' })
const child = Object.create(parent)
const proxyChild = reactive(child)

proxyChild.name = 'child'
```

这里 child 继承自 parent。给 proxyChild.name 赋值时，set 拦截器被调用。但如果 child 自己没有 name 属性，set 操作会沿着原型链找到 parent.name。我们只想在真正修改的对象（child）上触发更新，不想在 parent 上触发。`target === toRaw(receiver)` 就是用来做这个过滤的。

如果是新增属性，触发 ADD 类型的更新。如果是修改，先用 hasChanged 检查值是否真的变化了。

hasChanged 函数处理了 NaN 的特殊情况：

```typescript
const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)
```

Object.is 认为 NaN 等于 NaN（和 `===` 不同），这是正确的行为。如果旧值和新值都是 NaN，不应该触发更新。

## 触发器类型

trigger 函数接收一个操作类型参数，用于精确控制哪些依赖需要被通知：

```typescript
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
```

SET 类型的更新只通知依赖这个具体 key 的 effect。

ADD 类型的更新除了通知依赖这个 key 的 effect，还会通知依赖于迭代的 effect（因为对象的 keys 列表变了）。

DELETE 类型和 ADD 类似。

CLEAR 主要用于集合类型（Map/Set）的 clear 操作。

## 数组长度的特殊处理

当数组元素被新增时，可能会隐式改变 length：

```javascript
const arr = reactive([1, 2, 3])
arr[10] = 10 // length 从 3 变成 11
```

trigger 函数内部会处理这种情况，额外通知依赖 length 的 effect。

同样，直接设置 length 也需要特殊处理：

```javascript
arr.length = 1 // 索引 1、2、10 的元素被删除
```

缩短 length 会删除尾部的元素，需要通知依赖这些被删除索引的 effect。

## 返回值

set 拦截器必须返回一个布尔值。返回 true 表示赋值成功，返回 false 在严格模式下会抛出 TypeError。

```typescript
return result
```

这里返回 Reflect.set 的结果，保持了原始行为。

## 只读模式的 set

readonly 对象的 set 拦截器完全不同：

```typescript
set(target, key) {
  if (__DEV__) {
    warn(`Set operation on key "${String(key)}" failed: target is readonly.`)
  }
  return true
}
```

开发模式下发出警告，然后返回 true。为什么不返回 false？因为返回 false 会在严格模式下抛出异常，可能导致应用崩溃。返回 true 静默失败，让应用继续运行，开发者可以通过警告发现问题。

这是一个务实的设计选择。readonly 的"只读"是一种约定，不是强制的安全机制。它帮助开发者发现错误，但不会因为错误的写入尝试而崩溃应用。

## 浅层模式的 set

浅层模式的 set 跳过了 ref 处理和值转换：

```typescript
const shallowSet = createSetter(true)
```

浅层模式下，ref 不会被自动解包，值也不会被转为原始值。这意味着：

```javascript
const state = shallowReactive({ count: ref(0) })
state.count = 5 // 替换 ref，而不是设置 ref.value
```

这可能让人困惑，所以使用 shallowReactive 时需要特别注意 ref 的处理。

## 性能考量

set 拦截器的性能同样重要，虽然它的调用频率通常比 get 低。

主要的优化点在于：

尽早返回。如果值没有变化，不触发更新。

精确触发。根据操作类型（ADD/SET）精确通知相关的 effect，而不是通知所有 effect。

批量更新。trigger 不直接执行 effect，而是将它们加入队列，由调度器批量处理。

下一章我们将看看 has 和 deleteProperty 拦截器的实现。

