# Day 13: 响应式数组进阶处理

你好，我是你的技术导师。

昨天，我们解决了数组的索引和 `length` 的联动问题，还处理了 `includes` 等查找方法的身份识别问题。
今天，我们要解决数组响应式中最后一个，也是最隐蔽的 Bug —— **无限递归**。

## 1. 致命的 push

让我们看一个看似人畜无害的例子：

```javascript
const arr = reactive([])
effect(() => {
  arr.push(1)
})
```

如果你运行这段代码，浏览器会直接卡死，或者报错 `Maximum call stack size exceeded`。
为什么？

让我们拆解一下 `push` 的动作：
1.  **读取 length**：`push` 需要知道把元素放到哪个位置，所以它会读取 `length` 属性。
    -   触发 `track('length')`。
    -   当前 `effect` 被收集到了 `length` 的依赖中。
2.  **设置新值**：`arr[0] = 1`。
3.  **更新 length**：`arr.length` 变为 1。
    -   触发 `trigger('length')`。
    -   取出 `length` 的依赖（就是当前这个 `effect`）并执行。
4.  **Effect 重新执行**：再次调用 `arr.push(1)`。
5.  **回到第 1 步**...

这就是一个完美的死循环。

## 2. 解决方案：暂停追踪

问题的根源在于：`push` 方法内部读取 `length` 时，不应该收集依赖。
因为 `push` 本身是一个**修改操作**，它不应该被视为一次**读取操作**（尽管它内部确实读取了）。

我们需要一个开关，在执行 `push` 等方法时，暂时关闭依赖收集。

### 2.1 实现开关

在 `effect.ts` 中，我们增加一个全局变量 `shouldTrack`：

```typescript
export let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}
```

注意，这里用了一个**栈**（`trackStack`）来保存之前的状态。这是为了防止嵌套调用时状态错乱。

然后修改 `track` 函数：

```typescript
export function track(target, key) {
  // 如果开关关闭，直接返回
  if (!shouldTrack || !activeEffect) return
  // ...
}
```

### 2.2 拦截数组方法

现在，我们可以利用这个开关来拦截数组的变更方法了。

```typescript
const arrayInstrumentations = {};

['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originalMethod = Array.prototype[method]
  
  arrayInstrumentations[method] = function(...args) {
    // 1. 暂停追踪
    pauseTracking()
    
    // 2. 执行原始方法
    const res = originalMethod.apply(this, args)
    
    // 3. 恢复追踪
    resetTracking()
    
    return res
  }
})
```

这样，当我们在 `effect` 中调用 `arr.push(1)` 时：
1.  进入拦截器，`shouldTrack` 变为 `false`。
2.  执行原始 `push`，读取 `length`。
3.  触发 `track('length')`，但因为 `shouldTrack` 为 `false`，**什么都不做**。
4.  执行完毕，`shouldTrack` 恢复为 `true`。
5.  `length` 改变，触发 `trigger`。但因为刚才没收集依赖，所以**不会触发**当前 `effect`。

死循环解除了！

## 3. 完整的数组拦截器

结合昨天和今天的内容，我们的数组拦截器 `arrayInstrumentations` 现在长这样：

```typescript
const arrayInstrumentations = {
  // 查找方法：处理 Proxy 身份问题
  includes: function(searchElement) { /* ... */ },
  indexOf: function(searchElement) { /* ... */ },
  lastIndexOf: function(searchElement) { /* ... */ },
  
  // 变更方法：处理无限递归问题
  push: function(...args) { /* ... */ },
  pop: function(...args) { /* ... */ },
  shift: function(...args) { /* ... */ },
  unshift: function(...args) { /* ... */ },
  splice: function(...args) { /* ... */ },
}
```

只要在 `get` 拦截器中判断一下：

```typescript
function get(target, key, receiver) {
  if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
    return Reflect.get(arrayInstrumentations, key, receiver)
  }
  // ...
}
```

## 4. 总结

今天我们修复了数组响应式中最大的隐患。

1.  **问题本质**：数组变更方法（如 `push`）隐式读取 `length` 导致的不必要的依赖收集。
2.  **解决策略**：引入 `shouldTrack` 开关，在特定时刻暂停依赖收集。
3.  **实现细节**：使用栈结构管理 `shouldTrack` 状态，确保嵌套调用的安全性。

至此，我们对 `Reactive` 的实现已经非常完善了。它不仅支持普通对象，还完美支持了数组的各种骚操作。

明天，我们将离开 `Reactive` 的世界，去探索 Vue 3 中另一个极其重要的响应式 API —— **Ref**。

如果说 `Reactive` 是处理复杂对象的重型武器，那 `Ref` 就是处理基本类型的瑞士军刀。

明天见！
