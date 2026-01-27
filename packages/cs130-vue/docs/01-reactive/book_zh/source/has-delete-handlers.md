# has 和 deleteProperty 拦截器

除了 get 和 set，Proxy 还可以拦截其他操作。has 拦截器处理 `in` 操作符，deleteProperty 拦截器处理 `delete` 操作符。这两个拦截器在响应式系统中的实现相对简单，但理解它们有助于全面掌握响应式的工作原理。

## has 拦截器

has 拦截器在使用 `in` 操作符检查属性存在性时触发：

```javascript
const state = reactive({ name: 'Vue' })

if ('name' in state) {
  // has 拦截器被调用
}
```

实现如下：

```typescript
function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}
```

逻辑非常直接：先用 Reflect.has 获取结果，然后调用 track 收集依赖，最后返回结果。

和 get 拦截器一样，内置 Symbol 被排除在追踪之外。这是合理的——对 `Symbol.iterator in obj` 这样的检查进行追踪没有意义。

## has 的依赖场景

什么情况下 has 的依赖会被触发？考虑这个例子：

```javascript
const state = reactive({})

effect(() => {
  if ('foo' in state) {
    console.log('foo exists')
  } else {
    console.log('foo does not exist')
  }
})
// 输出：foo does not exist

state.foo = 'bar'
// effect 重新执行，输出：foo exists
```

当 `state.foo` 被添加时，trigger 函数会检查是否有依赖于 'foo' 这个 key 的 HAS 类型追踪，并触发相应的 effect。

这种机制让条件渲染变得响应式：

```html
<template>
  <div v-if="'loading' in state">加载中...</div>
</template>
```

当 loading 属性被添加或删除时，模板会自动更新。

## deleteProperty 拦截器

deleteProperty 拦截器在使用 `delete` 操作符删除属性时触发：

```javascript
const state = reactive({ name: 'Vue' })
delete state.name // deleteProperty 拦截器被调用
```

实现如下：

```typescript
function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}
```

分步骤看这个实现：

首先检查属性是否存在。如果属性本来就不存在，删除操作不应该触发更新。

然后获取旧值，用于传递给 trigger（某些场景下可能需要知道被删除的值）。

执行实际的删除操作。Reflect.deleteProperty 返回布尔值，表示删除是否成功。

如果删除成功且属性之前存在，触发 DELETE 类型的更新。

## DELETE 触发的影响

DELETE 类型的触发会影响多种依赖：

依赖该具体属性的 effect 会被触发，因为属性值从某个值变成了 undefined（或者说不存在）。

依赖于 `in` 检查的 effect 会被触发，因为 `'key' in obj` 的结果从 true 变成了 false。

依赖于迭代的 effect 会被触发，因为 `Object.keys()` 的结果变了。

```javascript
const state = reactive({ a: 1, b: 2 })

effect(() => {
  console.log(Object.keys(state))
})
// 输出：['a', 'b']

delete state.a
// effect 重新执行，输出：['b']
```

## 只读模式下的 deleteProperty

和 set 一样，readonly 对象的 deleteProperty 只是警告并返回 true：

```typescript
deleteProperty(target, key) {
  if (__DEV__) {
    warn(`Delete operation on key "${String(key)}" failed: target is readonly.`)
  }
  return true
}
```

返回 true 而不是 false 的原因和 set 一样——避免在严格模式下抛出异常。

## 数组的 delete

对数组元素使用 delete 会留下空洞：

```javascript
const arr = reactive([1, 2, 3])
delete arr[1]
console.log(arr) // [1, empty, 3]
console.log(arr.length) // 3
```

delete 不会改变数组长度，只是把那个位置变成空洞。这和 `arr.splice(1, 1)` 不同，后者会移动后面的元素并减少 length。

在响应式系统中，delete 数组元素会触发对该索引的 DELETE 更新。但因为 length 没变，依赖 length 的 effect 不会被触发。

## 实际应用场景

has 和 deleteProperty 在日常开发中使用较少，但在某些场景下很有用：

动态属性检查：

```javascript
const permissions = reactive({})

// 组件中
const canEdit = computed(() => 'edit' in permissions)

// 后端返回权限后
permissions.edit = true // canEdit 变为 true
```

可选配置清理：

```javascript
const config = reactive({
  theme: 'dark',
  language: 'zh'
})

function resetToDefault(key) {
  delete config[key]
}
```

表单字段管理：

```javascript
const formData = reactive({
  name: '',
  email: ''
})

function removeField(field) {
  delete formData[field]
}
```

## 与 set undefined 的区别

有时候开发者会困惑：删除属性和设置为 undefined 有什么区别？

```javascript
const state = reactive({ foo: 'bar' })

// 方式一：删除
delete state.foo
console.log('foo' in state) // false
console.log(state.foo) // undefined

// 方式二：设置为 undefined
state.bar = 'baz'
state.bar = undefined
console.log('bar' in state) // true
console.log(state.bar) // undefined
```

删除属性后，`in` 检查返回 false，属性从对象中消失。设置为 undefined 后，属性仍然存在，只是值为 undefined。

在响应式系统中，这两种操作触发的更新类型不同：delete 触发 DELETE 类型，包括迭代相关的更新；设置为 undefined 触发 SET 类型，不影响迭代。

选择哪种方式取决于你的意图。如果需要完全移除属性（比如从表单中删除一个字段），用 delete。如果只是清空值但保留字段（比如重置表单），设置为 undefined 或空字符串。

## 小结

has 和 deleteProperty 拦截器虽然不如 get 和 set 常用，但它们完善了响应式系统的能力。has 让 `in` 操作符也能被追踪，deleteProperty 让属性删除也能触发更新。这使得 Vue3 的响应式系统能够应对各种边缘场景。

下一章我们将分析 ownKeys 拦截器，它处理对象的遍历操作。

