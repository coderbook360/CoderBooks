# Day 25: toRef 和 toRefs 实现

> 学习日期: 2025-12-17  
> 预计用时: 1小时  
> 难度等级: ⭐⭐

## 📋 今日目标
- [ ] 理解 toRef 的设计目的和使用场景
- [ ] 实现 toRef 函数
- [ ] 实现 toRefs 函数
- [ ] 理解 ObjectRefImpl 的设计原理
- [ ] 解决 reactive 解构失去响应性的问题

## ⏰ 时间规划
- 理论学习: 20分钟
- 编码实践: 30分钟
- 测试与调试: 10分钟

---

## 📚 理论知识详解

### 1. 为什么需要 toRef 和 toRefs？

#### 1.1 reactive 的解构问题

**问题场景**：

```javascript
const state = reactive({
  count: 0,
  name: 'Vue'
})

// ❌ 解构后失去响应性
const { count, name } = state

effect(() => {
  console.log(count)  // count 只是一个普通的数字
})

count++  // 不会触发 effect
state.count++  // 会触发 effect，但 count 变量不会更新
```

**为什么会失去响应性？**

```javascript
// 解构相当于：
const count = state.count  // count = 0，只是一个数字
const name = state.name    // name = 'Vue'，只是一个字符串

// 失去了与 state 的连接
count++  // 只是修改局部变量，与 state.count 无关
```

#### 1.2 toRef 的解决方案

**toRef 创建一个保持连接的 ref**：

```javascript
const state = reactive({ count: 0 })

// ✅ 使用 toRef，保持与源对象的连接
const countRef = toRef(state, 'count')

// 修改 countRef 会同步到 state
countRef.value = 1
console.log(state.count)  // 1

// 修改 state 会同步到 countRef
state.count = 2
console.log(countRef.value)  // 2
```

**核心思想**：

```
toRef 创建的不是独立的 ref，而是源对象属性的"引用"

state.count <--双向绑定--> countRef.value

修改任意一边都会同步到另一边
```

#### 1.3 toRefs 批量转换

**toRefs 将对象的所有属性转换为 ref**：

```javascript
const state = reactive({
  count: 0,
  name: 'Vue',
  version: 3
})

// ✅ 使用 toRefs，可以安全解构
const { count, name, version } = toRefs(state)

// 所有属性都保持响应性
effect(() => {
  console.log(count.value, name.value)
})

count.value++  // 触发 effect，state.count 也会变化
state.name = 'React'  // 触发 effect，name.value 也会变化
```

### 2. toRef 的实现原理

#### 2.1 ObjectRefImpl 类

```typescript
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  
  constructor(
    private readonly _object: T,
    private readonly _key: K
  ) {}
  
  get value() {
    // 读取源对象的属性
    return this._object[this._key]
  }
  
  set value(newVal) {
    // 修改源对象的属性
    this._object[this._key] = newVal
  }
}
```

**关键设计**：
1. **不存储值**：不像 RefImpl 有 `_value`，ObjectRefImpl 直接读写源对象
2. **双向绑定**：get 和 set 都操作源对象，天然保持同步
3. **依赖追踪**：依靠源对象（reactive）的依赖追踪

#### 2.2 toRef vs ref 对比

```javascript
const state = reactive({ count: 0 })

// ref - 创建独立的响应式引用
const countRef1 = ref(state.count)
countRef1.value++
console.log(state.count)  // 0（不同步）

// toRef - 创建对源对象属性的引用
const countRef2 = toRef(state, 'count')
countRef2.value++
console.log(state.count)  // 1（同步）
```

### 3. toRefs 的实现原理

```typescript
function toRefs<T extends object>(object: T) {
  const ret: any = Array.isArray(object) ? new Array(object.length) : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}
```

**工作流程**：

```
1. 遍历对象的所有属性
2. 为每个属性调用 toRef
3. 返回一个新对象，所有属性都是 ref
```

### 4. 实际应用场景

#### 场景 1：组合式函数返回值

```typescript
// ✅ 使用 toRefs，方便解构
function useCounter() {
  const state = reactive({
    count: 0,
    double: computed(() => state.count * 2)
  })
  
  function increment() {
    state.count++
  }
  
  return {
    ...toRefs(state),  // 展开为 ref，可以解构
    increment
  }
}

// 使用时可以解构
const { count, double, increment } = useCounter()
console.log(count.value)  // 响应式的
```

#### 场景 2：Props 转为 ref

```vue
<script setup>
import { toRefs } from 'vue'

const props = defineProps({
  count: Number,
  name: String
})

// ✅ 将 props 转为 ref，在 composition API 中使用
const { count, name } = toRefs(props)

watch(count, (newValue) => {
  console.log('count changed:', newValue)
})
</script>
```

---

## 💻 实践任务

### 任务目标
实现 toRef 和 toRefs 函数，解决 reactive 解构失去响应性的问题。

### 测试用例

在 `test/reactivity/ref.spec.ts` 中添加：

```typescript
describe('toRef', () => {
  it('应该创建对响应式对象属性的引用', () => {
    const state = reactive({ count: 0 })
    const countRef = toRef(state, 'count')
    
    expect(countRef.value).toBe(0)
    expect(isRef(countRef)).toBe(true)
    
    // 修改 ref 同步到源对象
    countRef.value = 1
    expect(state.count).toBe(1)
    
    // 修改源对象同步到 ref
    state.count = 2
    expect(countRef.value).toBe(2)
  })
  
  it('toRef 应该是响应式的', () => {
    const state = reactive({ count: 0 })
    const countRef = toRef(state, 'count')
    let dummy
    
    effect(() => {
      dummy = countRef.value
    })
    
    expect(dummy).toBe(0)
    
    state.count = 1
    expect(dummy).toBe(1)
    
    countRef.value = 2
    expect(dummy).toBe(2)
  })
})

describe('toRefs', () => {
  it('应该转换响应式对象的所有属性为 ref', () => {
    const state = reactive({
      count: 0,
      name: 'Vue'
    })
    
    const refs = toRefs(state)
    
    expect(isRef(refs.count)).toBe(true)
    expect(isRef(refs.name)).toBe(true)
    expect(refs.count.value).toBe(0)
    expect(refs.name.value).toBe('Vue')
  })
  
  it('toRefs 的 ref 应该与源对象同步', () => {
    const state = reactive({
      count: 0,
      name: 'Vue'
    })
    
    const { count, name } = toRefs(state)
    
    // 修改 ref 同步到源对象
    count.value = 1
    expect(state.count).toBe(1)
    
    // 修改源对象同步到 ref
    state.name = 'React'
    expect(name.value).toBe('React')
  })
  
  it('toRefs 的 ref 应该是响应式的', () => {
    const state = reactive({
      count: 0,
      name: 'Vue'
    })
    
    const { count, name } = toRefs(state)
    let dummy
    
    effect(() => {
      dummy = `${name.value}: ${count.value}`
    })
    
    expect(dummy).toBe('Vue: 0')
    
    count.value = 1
    expect(dummy).toBe('Vue: 1')
    
    state.name = 'React'
    expect(dummy).toBe('React: 1')
  })
})
```

### 实现步骤

#### 步骤1: 实现 ObjectRefImpl 类 (预估10分钟)

在 `src/reactivity/ref.ts` 中添加：

```typescript
/**
 * toRef 返回的 ref 实现
 * 不存储值，直接读写源对象的属性
 */
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  
  constructor(
    private readonly _object: T,
    private readonly _key: K
  ) {}
  
  get value() {
    return this._object[this._key]
  }
  
  set value(newVal) {
    this._object[this._key] = newVal
  }
}
```

**为什么这样实现**：
1. 不存储 `_value`，直接代理源对象的属性
2. get/set 直接操作 `_object[_key]`，天然同步
3. 依赖追踪由源对象（reactive）负责

#### 步骤2: 实现 toRef 函数 (预估5分钟)

```typescript
/**
 * 为响应式对象的某个属性创建 ref
 * 修改 ref 会同步到源对象，修改源对象会同步到 ref
 */
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  const val = object[key]
  
  // 如果属性值已经是 ref，直接返回
  if (isRef(val)) {
    return val as any
  }
  
  return new ObjectRefImpl(object, key) as any
}
```

#### 步骤3: 实现 toRefs 函数 (预估10分钟)

```typescript
/**
 * 将响应式对象的所有属性转换为 ref
 * 用于解构 reactive 对象时保持响应性
 */
export function toRefs<T extends object>(object: T): ToRefs<T> {
  if (!isReactive(object)) {
    console.warn('toRefs() 需要一个响应式对象')
  }
  
  const ret: any = Array.isArray(object) ? new Array(object.length) : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}

// 类型定义
type ToRefs<T = any> = {
  [K in keyof T]: Ref<T[K]>
}

type Ref<T = any> = {
  value: T
  __v_isRef: true
}
```

#### 步骤4: 导出 API (预估2分钟)

修改 `src/reactivity/index.ts`：

```typescript
export { reactive, isReactive, shallowReactive } from './reactive'
export { ref, isRef, shallowRef, toRef, toRefs } from './ref'
export { effect } from './effect'
export { computed } from './computed'
export { watch, watchEffect } from './watch'
```

### 完整代码参考

<details>
<summary>点击查看 ref.ts 的完整toRef相关代码</summary>

```typescript
// ObjectRefImpl 类
class ObjectRefImpl<T extends object, K extends keyof T> {
  public readonly __v_isRef = true
  
  constructor(
    private readonly _object: T,
    private readonly _key: K
  ) {}
  
  get value() {
    return this._object[this._key]
  }
  
  set value(newVal) {
    this._object[this._key] = newVal
  }
}

// toRef 函数
export function toRef<T extends object, K extends keyof T>(
  object: T,
  key: K
): Ref<T[K]> {
  const val = object[key]
  
  if (isRef(val)) {
    return val as any
  }
  
  return new ObjectRefImpl(object, key) as any
}

// toRefs 函数
export function toRefs<T extends object>(object: T): ToRefs<T> {
  if (!isReactive(object)) {
    console.warn('toRefs() 需要一个响应式对象')
  }
  
  const ret: any = Array.isArray(object) ? new Array(object.length) : {}
  
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  
  return ret
}
```
</details>

---

## 🤔 思考题

### 问题1: toRef 和 ref 的本质区别是什么？
**提示**: 考虑是否存储值、是否与源对象同步。

### 问题2: 为什么 ObjectRefImpl 不需要 track 和 trigger？
**提示**: 依赖追踪由谁负责？

### 问题3: toRefs 为什么只能用于响应式对象？用于普通对象会怎样？
**提示**: 考虑响应性的来源。

---

## 📝 学习总结

完成今天的学习后，请回答以下问题：

1. **今天学到的核心知识点是什么？**
   - 

2. **toRef 解决了什么问题？**
   - 

3. **在实际项目中如何使用 toRefs？**
   - 

---

## 📖 扩展阅读

- [Vue 3 toRef API 文档](https://cn.vuejs.org/api/reactivity-utilities.html#toref)
- [Vue 3 toRefs API 文档](https://cn.vuejs.org/api/reactivity-utilities.html#torefs)
- [组合式函数最佳实践](https://cn.vuejs.org/guide/reusability/composables.html)

---

## ⏭️ 明日预告

明天我们将学习: **unref 和 proxyRefs**

主要内容:
- unref 工具函数
- proxyRefs 自动解包
- 模板中的自动解包原理
- ref 工具函数完整生态

建议预习: 回顾 ref 的自动解包机制
