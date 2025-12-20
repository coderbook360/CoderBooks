# 章节写作指导：插件扩展 Store

## 1. 章节信息
- **章节标题**: 插件扩展 Store
- **文件名**: plugins/extend-store.md
- **所属部分**: 第八部分：插件系统
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解插件扩展 Store 的方式
- 掌握返回值与直接修改的区别
- 了解响应式属性的正确添加方式

### 技能目标
- 能够通过插件添加属性和方法
- 能够正确声明 TypeScript 类型

## 3. 内容要点
### 核心概念
- **直接修改**：`store.xxx = value`
- **返回值合并**：`return { xxx: value }`
- **_customProperties**：标记自定义属性

### 关键知识点
- 两种扩展方式的区别
- ref 与普通值的处理
- TypeScript 类型声明

## 4. 写作要求
### 开篇方式
"插件可以通过两种方式扩展 Store：直接修改 store 对象，或者返回一个对象让 Pinia 自动合并。理解这两种方式的区别对于编写正确的插件非常重要。"

### 结构组织
```
1. 两种扩展方式
2. 直接修改的用法
3. 返回值合并的用法
4. 响应式属性的添加
5. _customProperties 的作用
6. TypeScript 类型扩展
7. 最佳实践
```

### 代码示例
```typescript
// 方式一：直接修改
function directPlugin({ store }) {
  // 添加普通属性
  store.hello = 'world'
  
  // 添加响应式属性
  store.loading = ref(false)
  
  // 添加方法
  store.greet = () => console.log('Hello!')
  
  // 标记自定义属性（用于 storeToRefs）
  store._customProperties.add('hello')
  store._customProperties.add('loading')
}

// 方式二：返回值合并
function returnPlugin({ store }) {
  // 返回要合并的对象
  return {
    hello: 'world',
    loading: ref(false),
    greet: () => console.log('Hello!'),
  }
}

// 两种方式效果相同
// 但返回值方式更函数式，更容易测试
```

## 5. 技术细节
### Pinia 如何处理返回值
```typescript
// 在 createSetupStore 中
pinia._p.forEach((extender) => {
  assign(
    store,
    scope.run(() =>
      extender({
        store,
        app: pinia._a,
        pinia,
        options: optionsForPlugin,
      })
    )!
  )
})

// extender 返回的对象会被 assign 到 store
// 返回 undefined 或不返回也可以
```

### 响应式属性的正确添加
```typescript
// ✅ 正确：使用 ref
store.loading = ref(false)

// ❌ 错误：直接赋值原始值
store.loading = false
// 这不是响应式的

// ✅ 正确：使用 reactive
store.settings = reactive({ theme: 'dark' })

// 注意：直接修改时需要在 scope 内
pinia._p.forEach((extender) => {
  scope.run(() => extender(context))
  //           ^ 在 scope 内执行
})
```

### _customProperties 的作用
```typescript
function plugin({ store }) {
  store.router = markRaw(router)
  store._customProperties.add('router')
  //                      ^^^
  // 告诉 storeToRefs 跳过这个属性
}

// storeToRefs 的处理
export function storeToRefs(store) {
  const refs = {}
  for (const key in store) {
    const value = store[key]
    if (isRef(value) || isReactive(value)) {
      // 跳过 _customProperties 中的属性
      if (!store._customProperties.has(key)) {
        refs[key] = toRef(store, key)
      }
    }
  }
  return refs
}
```

### TypeScript 类型扩展
```typescript
// 扩展所有 Store 的类型
declare module 'pinia' {
  export interface PiniaCustomProperties {
    // 所有 Store 都会有的属性
    router: Router
    hello: string
  }
  
  export interface PiniaCustomStateProperties<S> {
    // 添加到每个 Store 的 state 中
    loading: boolean
  }
}

// 使用时有类型提示
const store = useAnyStore()
store.router  // Router 类型
store.hello   // string 类型
store.loading // boolean 类型
```

## 6. 风格指导
- **语气**：实践导向
- **对比**：两种方式对比

## 7. 章节检查清单
- [ ] 两种方式对比
- [ ] 响应式添加正确
- [ ] _customProperties 解释
- [ ] TypeScript 扩展示例
