# Day 12: 数组的响应式处理

你好，我是你的技术导师。

在之前的课程中，我们处理的都是普通对象（Object）。
今天，我们要挑战一个更难啃的骨头 —— **数组（Array）**。

数组虽然也是对象，但它太特殊了：
1.  它的 key 是数字索引。
2.  它有一个神奇的属性 `length`，会自动更新。
3.  它有一堆会改变自身的方法（push, pop, splice...）。

如果直接用处理普通对象的逻辑去处理数组，会遇到各种奇奇怪怪的 Bug。
今天，我们就来一一攻克这些难题。

## 1. 索引与 Length 的纠葛

### 1.1 修改索引，触发 length

```javascript
const arr = reactive(['a']) // length: 1
effect(() => {
  console.log(arr.length)
})

arr[1] = 'b' // length 变为 2
```

当我们设置 `arr[1] = 'b'` 时，不仅新增了索引 `1`，还隐式修改了 `length`。
所以，如果操作是 `ADD` 类型（新增索引），我们需要手动触发 `length` 的依赖。

```typescript
// trigger 函数中
if (type === 'ADD' && Array.isArray(target)) {
  // 如果是数组新增元素，触发 length 的依赖
  const lengthDep = depsMap.get('length')
  triggerEffects(lengthDep)
}
```

### 1.2 修改 length，触发索引

反过来，如果我们修改 `length`，可能会导致元素被删除。

```javascript
const arr = reactive(['a', 'b', 'c'])
effect(() => {
  console.log(arr[2]) // 依赖索引 2
})

arr.length = 1 // 索引 1, 2 被删除
```

当 `length` 变小时，所有索引大于等于新 `length` 的元素都被删除了。
我们需要通知那些依赖了被删除索引的 effect。

```typescript
// trigger 函数中
if (key === 'length' && Array.isArray(target)) {
  depsMap.forEach((dep, key) => {
    // 如果 key 是索引，且 key >= newLength，说明被删除了
    if (key >= newValue) {
      triggerEffects(dep)
    }
  })
}
```

## 2. 查找方法的陷阱 (includes)

```javascript
const obj = {}
const arr = reactive([obj])

console.log(arr.includes(obj)) // false ???
```

为什么是 `false`？
因为 `arr[0]` 获取到的是 `obj` 的**代理对象（Proxy）**。
而 `includes` 拿代理对象去和原始对象 `obj` 比较，当然不相等。

为了解决这个问题，我们需要重写 `includes`、`indexOf`、`lastIndexOf` 等查找方法。

**策略**：
1.  先在代理对象中找。
2.  如果找不到，把目标转成原始对象，再在原始数组中找。

```typescript
const arrayInstrumentations = {
  includes(searchElement) {
    // 1. 正常查找
    const res = Array.prototype.includes.call(this, searchElement)
    if (res) return true
    
    // 2. 找不到？把 searchElement 转成原始值再找一次
    return Array.prototype.includes.call(this, toRaw(searchElement))
  }
}
```

## 3. 修改方法的风暴 (push)

```javascript
const arr = reactive([])
effect(() => {
  arr.push(1)
})
```

这段代码会导致**栈溢出**！为什么？

`push` 方法会做两件事：
1.  读取 `length`（为了知道插在哪里）。
2.  设置 `length`（插入后长度加一）。

在 `effect` 中执行 `push`：
1.  读取 `length` -> 收集依赖（track）。
2.  设置 `length` -> 触发依赖（trigger）。
3.  触发谁？触发当前这个 `effect`。
4.  `effect` 重新执行 -> 再次 `push` -> 再次 track -> 再次 trigger...
5.  **无限递归！**

**解决方案**：
在执行 `push`、`pop` 等会修改 `length` 的方法时，**暂停依赖收集**。

```typescript
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  arrayInstrumentations[method] = function(...args) {
    pauseTracking() // 暂停
    const res = Array.prototype[method].apply(this, args)
    resetTracking() // 恢复
    return res
  }
})
```

## 4. 拦截器的挂载

我们定义好了 `arrayInstrumentations`，怎么用到 `Proxy` 里呢？

在 `get` 拦截器中：

```typescript
function get(target, key, receiver) {
  // 如果是数组，且访问的是被拦截的方法
  if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
    return Reflect.get(arrayInstrumentations, key, receiver)
  }
  
  // ... 普通的 get 逻辑
}
```

## 5. 总结

数组的响应式处理，是 Vue 3 响应式系统中最繁琐的部分。它充满了各种边界情况和黑魔法。

1.  **双向联动**：处理了 `index` 和 `length` 的相互影响。
2.  **查找修正**：通过重写 `includes` 等方法，解决了 Proxy 身份识别问题。
3.  **递归风暴**：通过暂停依赖收集，解决了 `push` 等方法的无限循环问题。

搞定了数组，我们的响应式系统就真的可以"横行霸道"了。无论是对象还是数组，无论是增删改查还是深层嵌套，它都能完美应对。

明天，我们将进入响应式系统的最后一个模块 —— **Ref**。
它虽然简单，但却是 Vue 3 Composition API 的基石。

明天见！
