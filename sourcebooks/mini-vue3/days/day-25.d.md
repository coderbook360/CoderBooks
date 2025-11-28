# Day 25: toRef & toRefs - 拯救解构的利器

你好，我是你的技术导师。

昨天我们聊到了 `reactive` 的最大痛点：**解构即死**。
一旦你把 `reactive` 对象解构了，拿到的基本类型变量就和原来的响应式对象断了联系。

今天，我们就来亲手打造两把神兵利器 —— `toRef` 和 `toRefs`，彻底解决这个问题。
顺便，我们还要实现 `proxyRefs`，让我们的开发体验更上一层楼。

## 1. ObjectRefImpl：建立连接的桥梁

要解决解构问题，我们需要一种机制：
当我们访问这个新变量的 `.value` 时，它实际上是去访问原对象的对应属性。
当我们修改这个新变量的 `.value` 时，它实际上是去修改原对象的对应属性。

这不就是代理模式吗？
我们不需要用 `Proxy`，写个简单的类就能搞定。

在 `src/reactivity/ref.ts` 中添加：

```typescript
class ObjectRefImpl {
  public __v_isRef = true

  constructor(
    public object,
    public key,
    public defaultValue?
  ) {}

  get value() {
    const val = this.object[this.key]
    return val === undefined ? this.defaultValue : val
  }

  set value(newVal) {
    this.object[this.key] = newVal
  }
}
```

**解析**：
-   它看起来像一个 `ref`（有 `.value`，有 `__v_isRef` 标记）。
-   但它内部没有 `_value` 属性，也没有 `dep`。
-   它的 `get` 和 `set` 只是简单地转发给 `this.object[this.key]`。
-   因为 `this.object` 本身是一个响应式对象（reactive），所以访问它会自动收集依赖，修改它会自动触发更新。
-   `ObjectRefImpl` 只是一个**二传手**。

## 2. 实现 toRef

有了 `ObjectRefImpl`，`toRef` 就很简单了。

```typescript
export function toRef(object, key, defaultValue?) {
  const val = object[key]
  return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue)
}
```

**使用场景**：
当你需要把 `props` 中的某个属性传递给一个组合式函数，但又想保持响应性时。

```javascript
const props = reactive({ foo: 1, bar: 2 })
useFeature(toRef(props, 'foo'))
```

## 3. 实现 toRefs

`toRefs` 只是遍历对象，对每个属性调用 `toRef`。

```typescript
export function toRefs(object) {
  const ret = Array.isArray(object) ? new Array(object.length) : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}
```

**使用场景**：
这是最常用的。在 `setup` 函数返回时，把 `reactive` 对象转换成一组 `ref`，这样在模板中就可以直接使用属性名，或者在组件中解构使用。

```javascript
export default {
  setup() {
    const state = reactive({ count: 0, name: 'Vue' })
    
    // 返回 { count: Ref<0>, name: Ref<'Vue'> }
    return {
      ...toRefs(state)
    }
  }
}
```

## 4. 实现 proxyRefs：自动脱 ref

在 Vue 3 的模板中，我们使用 `ref` 数据时不需要写 `.value`。
这是因为 Vue 在编译模板时，或者在 `setup` 返回对象时，做了一层代理。
这个代理就是 `proxyRefs`。

它的逻辑是：
-   **Get**: 如果访问的是 `ref`，直接返回 `.value`；如果是普通值，直接返回。
-   **Set**: 如果新值是普通值，且旧值是 `ref`，则修改旧 `ref` 的 `.value`；否则直接替换。

```typescript
import { isRef, unref } from './ref'

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key, receiver) {
      // 自动解包：如果是 ref 就返回 .value，否则返回本身
      return unref(Reflect.get(target, key, receiver))
    },
    
    set(target, key, value, receiver) {
      const oldValue = target[key]
      // 边缘情况：旧值是 ref，新值不是 ref -> 修改旧 ref 的 .value
      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      } else {
        return Reflect.set(target, key, value, receiver)
      }
    }
  })
}
```

**测试一下**：

```javascript
const user = {
  name: ref('Vue'),
  age: 10
}

const proxyUser = proxyRefs(user)

console.log(proxyUser.name) // 'Vue' (不需要 .value)
console.log(proxyUser.age)  // 10

proxyUser.name = 'React'
console.log(user.name.value) // 'React' (原 ref 被更新了)

proxyUser.name = ref('Angular')
console.log(user.name.value) // 'Angular' (整个 ref 被替换了)
```

## 5. 测试驱动

创建 `test/reactivity/toRefs.spec.ts`。

```typescript
import { reactive } from '../../src/reactivity/reactive'
import { toRefs, toRef, proxyRefs } from '../../src/reactivity/ref'
import { effect } from '../../src/reactivity/effect'

describe('toRefs', () => {
  it('should convert reactive object to refs', () => {
    const a = reactive({
      x: 1,
      y: 2
    })

    const { x, y } = toRefs(a)

    expect(x.value).toBe(1)
    expect(y.value).toBe(2)

    // 链接性测试
    a.x = 2
    expect(x.value).toBe(2)

    x.value = 3
    expect(a.x).toBe(3)
  })
})

describe('proxyRefs', () => {
  it('should unwrap refs', () => {
    const user = {
      age: ref(10),
      name: 'xiaohong'
    }
    const proxyUser = proxyRefs(user)
    
    // get
    expect(proxyUser.age).toBe(10)
    expect(proxyUser.name).toBe('xiaohong')

    // set
    proxyUser.age = 20
    expect(proxyUser.age).toBe(20)
    expect(user.age.value).toBe(20)

    proxyUser.age = ref(20)
    expect(proxyUser.age).toBe(20)
    expect(user.age.value).toBe(20)
  })
})
```

## 6. 总结

今天我们完成了 `ref` 家族的最后几块拼图。

1.  **`toRef` / `toRefs`**：解决了 `reactive` 对象的解构难题，让我们可以安全地把响应式对象的属性拆分出来传递。
2.  **`proxyRefs`**：提供了更友好的开发体验，让我们在特定场景下（如模板中）忘掉 `.value`。

至此，**响应式系统（Reactivity）** 模块的所有核心功能都已经实现完毕！🎉

从 `reactive` 到 `effect`，从 `computed` 到 `watch`，再到 `ref` 全家桶。
你已经亲手构建了 Vue 3 最核心的引擎。

接下来的旅程，我们将进入 **Runtime Core（运行时核心）**。
我们将学习如何把这些响应式数据，真正渲染成浏览器里的 DOM 节点。
我们将实现 `h` 函数、虚拟 DOM、组件初始化流程...

准备好了吗？新的挑战在等着你！
