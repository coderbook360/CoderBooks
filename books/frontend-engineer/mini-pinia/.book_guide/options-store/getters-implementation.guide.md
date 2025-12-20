# 章节写作指导：Getters 实现：computed 的封装

## 1. 章节信息
- **章节标题**: Getters 实现：computed 的封装
- **文件名**: options-store/getters-implementation.md
- **所属部分**: 第四部分：Options Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 getters 到 computed 的转换
- 掌握 getter 函数的 this 绑定
- 了解 markRaw 的使用原因

### 技能目标
- 能够实现 getters 转换逻辑
- 能够解释 getter 的缓存机制

## 3. 内容要点
### 核心概念
- **getters → computed**：配置式 getter 转为 computed
- **this 绑定**：getter 中 this 指向 store
- **markRaw**：避免 computed 被深层代理

### 关键知识点
- computed 的惰性求值特性
- call 方法绑定 this
- 两种 getter 写法的支持

## 4. 写作要求
### 开篇方式
"Options Store 的 getters 配置会被转换为 Vue 的 computed。这个转换过程需要处理 this 绑定、确保响应式追踪正常工作。"

### 结构组织
```
1. getters 配置格式
2. 转换为 computed
3. this 绑定处理
4. markRaw 的作用
5. 两种写法支持
6. 实现代码
```

### 代码示例
```typescript
// getters 配置
const useStore = defineStore('test', {
  state: () => ({ count: 0 }),
  getters: {
    // 写法1：箭头函数，state 作为参数
    doubleCount: (state) => state.count * 2,
    
    // 写法2：普通函数，使用 this
    tripleCount(): number {
      return this.count * 3
    },
    
    // 访问其他 getter
    quadrupleCount(): number {
      return this.doubleCount * 2
    }
  }
})

// 转换逻辑
Object.keys(getters || {}).reduce((computedGetters, name) => {
  // 开发环境下检查命名冲突
  if (__DEV__ && name in localState) {
    console.warn(`[🍍]: Getter "${name}" is already defined in state.`)
  }
  
  computedGetters[name] = markRaw(
    computed(() => {
      setActivePinia(pinia)
      const store = pinia._s.get(id)!
      // 使用 call 绑定 this 为 store
      return getters![name].call(store, store)
    })
  )
  
  return computedGetters
}, {} as Record<string, ComputedRef>)
```

## 5. 技术细节
### this 绑定
```typescript
// 为什么用 call(store, store)?
getters![name].call(store, store)
//              ^^^^  ^^^^
//              this  第一个参数

// 这样两种写法都能工作：
getters: {
  // 箭头函数：使用第一个参数
  doubleCount: (state) => state.count * 2,
  
  // 普通函数：使用 this
  tripleCount() { return this.count * 3 }
}
```

### markRaw 的作用
```typescript
computedGetters[name] = markRaw(computed(...))

// 为什么需要 markRaw？
// computed 返回的是 ComputedRef 对象
// 如果被 reactive 代理，会导致不必要的深层响应式转换
// markRaw 标记它不应该被转换为响应式
```

### setActivePinia 的作用
```typescript
computed(() => {
  setActivePinia(pinia)  // 确保嵌套调用正确
  const store = pinia._s.get(id)!
  return getters![name].call(store, store)
})

// 场景：getter 中访问另一个 Store
getters: {
  combinedValue() {
    const otherStore = useOtherStore()  // 需要 activePinia
    return this.value + otherStore.value
  }
}
```

## 6. 风格指导
- **语气**：实现细节讲解
- **对比**：两种 getter 写法

## 7. 章节检查清单
- [ ] 转换逻辑清晰
- [ ] this 绑定解释
- [ ] markRaw 原因
- [ ] 两种写法支持
