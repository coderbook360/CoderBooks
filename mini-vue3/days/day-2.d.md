# Day 2: 深入理解 Reflect API

你好，我是你的技术导师。

昨天，我们一起推开了 `Proxy` 的大门，见识了它如何优雅地拦截对象操作。你可能觉得："这就够了吧？有了 Proxy，我已经是响应式系统的主宰了！"

且慢。

在 Vue 3 的源码中，你会发现 `Proxy` 的拦截器里总是藏着另一个身影——`Reflect`。

```javascript
// Vue 3 源码片段
get(target, key, receiver) {
  // ... 依赖收集 ...
  return Reflect.get(target, key, receiver) // 为什么要用 Reflect？
}
```

你可能会疑惑：直接返回 `target[key]` 不行吗？为什么非要多此一举用 `Reflect.get`？

今天，我们就来揭开这个谜底。这不仅仅是为了代码规范，更是为了修复一个可能让你调试到怀疑人生的隐蔽 Bug。

## 1. 为什么不能直接操作对象？

让我们先回到最朴素的写法。在 `Proxy` 出现之前，我们习惯了直接操作对象：

```javascript
const obj = { name: 'Vue' }
console.log(obj.name) // 读取
obj.name = 'Vue 3'    // 设置
delete obj.name       // 删除
```

这看起来很自然，但在元编程的世界里，这种"随性"的操作带来了一系列问题：

1.  **行为不一致**：有些操作（如 `Object.defineProperty`）失败时会抛出错误，而有些（如 `delete`）只是返回 `false`。
2.  **函数式编程不友好**：`in`、`delete` 都是操作符，不是函数，无法像函数那样传递和组合。
3.  **Proxy 的镜像缺失**：`Proxy` 提供了拦截器，但如果我们想在拦截器中执行"默认行为"，难道要手动去写 `target[key]` 吗？

`Reflect` 的出现，首先是为了解决这些"规范性"问题。它提供了一套与 `Proxy` 拦截器一一对应的静态方法。

```javascript
// 以前
delete obj.name

// 现在
Reflect.deleteProperty(obj, 'name')
```

但这只是表面文章。`Reflect` 真正的杀手锏，在于它解决了 `Proxy` 无法处理的 `this` 指向问题。

## 2. 致命的 this 指向陷阱

为了让你深刻理解这个问题，我们来做一个实验。

假设我们有一个对象 `parent`，它有一个属性 `_name` 和一个 getter `name`。注意，getter 里用到了 `this`。

```javascript
const parent = {
  _name: 'Parent',
  get name() {
    return this._name
  }
}
```

现在，我们创建一个继承自 `parent` 的对象 `child`，并覆盖 `_name` 属性：

```javascript
const child = {
  _name: 'Child',
  __proto__: parent
}
```

正常情况下，访问 `child.name` 应该输出什么？

```javascript
console.log(child.name) // 输出 'Child'
```

没错，因为 `child.name` 会沿着原型链找到 `parent` 的 getter，而调用时的 `this` 指向的是 `child`，所以返回的是 `child._name`。

### 危机降临

现在，我们给 `child` 套上一层 `Proxy`。

```javascript
const proxy = new Proxy(child, {
  get(target, key, receiver) {
    // ❌ 错误写法：直接访问 target[key]
    return target[key]
  }
})
```

请停下来思考一秒：现在访问 `proxy.name`，会输出什么？

```javascript
console.log(proxy.name) // 输出 'Parent' 😱
```

**等等！为什么变成了 'Parent'？**

让我们像侦探一样还原案发现场：

1.  我们访问 `proxy.name`。
2.  触发 `get` 拦截器，`target` 是 `child`。
3.  拦截器执行 `return target[key]`，也就是 `child.name`。
4.  `child` 自身没有 `name`，沿着原型链找到了 `parent` 的 getter。
5.  **关键点来了**：getter 被调用时，`this` 指向了谁？

在 `target[key]` 这种写法中，getter 是被 `target`（也就是 `child`）调用的。所以 `this` 指向了 `child`。

"那不是应该输出 'Child' 吗？" 你可能会问。

别急，这里有一个思维误区。`child` 是原始对象，不是代理对象！

在 Vue 3 的响应式系统中，我们希望**所有的属性访问都经过代理**，这样才能收集依赖。

如果 getter 中的 `this` 指向了原始对象 `child`，那么当 getter 内部访问 `this._name` 时，它访问的是 `child._name`，而不是 `proxy._name`。

这意味着：**`_name` 的访问不会触发 `get` 拦截器！**

如果 `_name` 是一个响应式数据，Vue 就无法收集到依赖。当 `_name` 变化时，视图就不会更新。这就是严重的 Bug。

## 3. Receiver：修正 this 的救星

为了解决这个问题，`Proxy` 的 `get` 拦截器提供了第三个参数：`receiver`。

`receiver` 总是指向**最初被调用的那个对象**（通常是 proxy 本身）。

而 `Reflect.get` 恰好接受这个 `receiver` 作为第三个参数，并把它作为 getter 调用时的 `this`。

让我们修正代码：

```javascript
const proxy = new Proxy(child, {
  get(target, key, receiver) {
    // ✅ 正确写法：将 receiver 传递给 Reflect
    return Reflect.get(target, key, receiver)
  }
})
```

现在的执行流程是：

1.  访问 `proxy.name`。
2.  触发拦截器，`receiver` 是 `proxy`。
3.  执行 `Reflect.get(target, key, receiver)`。
4.  调用 `parent` 的 getter，但这次，`Reflect` 强行把 `this` 绑定到了 `receiver`（也就是 `proxy`）上。
5.  getter 内部访问 `this._name`，实际上变成了访问 `proxy._name`。
6.  **再次触发 `get` 拦截器！**（因为访问的是 proxy）
7.  Vue 成功收集到 `_name` 的依赖。

这就是为什么 Vue 3 必须使用 `Reflect` 的根本原因。它保证了即使在继承和 getter 的复杂场景下，响应式系统也能不漏掉任何一个依赖。

## 4. 动手时刻：亲眼见证差异

口说无凭，我们来写一段代码验证一下。

```javascript
const parent = {
  _name: 'Parent',
  get name() {
    return this._name
  }
}

const child = {
  _name: 'Child',
  __proto__: parent
}

// 1. 错误写法
const proxyBad = new Proxy(child, {
  get(target, key, receiver) {
    console.log(`[Bad] 访问 ${key}`)
    return target[key]
  }
})

// 2. 正确写法
const proxyGood = new Proxy(child, {
  get(target, key, receiver) {
    console.log(`[Good] 访问 ${key}`)
    return Reflect.get(target, key, receiver)
  }
})

console.log('--- 测试错误写法 ---')
console.log('结果:', proxyBad.name)
// 输出:
// [Bad] 访问 name
// 结果: Child (看起来是对的，但没有触发 _name 的拦截！)

console.log('\n--- 测试正确写法 ---')
console.log('结果:', proxyGood.name)
// 输出:
// [Good] 访问 name
// [Good] 访问 _name  <-- 注意这里！_name 也被拦截了！
// 结果: Child
```

看到区别了吗？正确写法多输出了一行 `[Good] 访问 _name`。这多出来的一行，就是 Vue 3 响应式系统能够正常工作的生命线。

## 5. 总结与预告

今天我们深入挖掘了 `Reflect` API，特别是它在处理 `this` 指向时的关键作用。

我们学到了：
1.  `Reflect` 提供了一套标准化的对象操作 API。
2.  直接操作 `target[key]` 会导致 getter 中的 `this` 指向原始对象，从而丢失依赖。
3.  `Reflect.get(target, key, receiver)` 能将 `this` 修正为代理对象，确保依赖收集的完整性。

现在，我们已经掌握了 `Proxy` 和 `Reflect` 这两把神兵利器。是时候把它们组合起来，构建真正的响应式系统了。

明天，我们将挑战 Vue 3 中最核心的概念——**依赖收集**。我们将亲手实现 `track` 和 `trigger` 函数，让数据真正"动"起来。

准备好烧脑了吗？我们明天见！
