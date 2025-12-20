# 章节写作指导：Actions 实现与 this 绑定

## 1. 章节信息
- **章节标题**: Actions 实现与 this 绑定
- **文件名**: options-store/actions-implementation.md
- **所属部分**: 第四部分：Options Store 实现
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 actions 的处理方式
- 掌握 action 函数的包装逻辑
- 了解 $onAction 的支持实现

### 技能目标
- 能够解释 action 的 this 绑定
- 能够理解 action 的执行流程

## 3. 内容要点
### 核心概念
- **actions**：Store 的方法，可以是同步或异步
- **action 包装**：添加 $onAction 支持
- **this 绑定**：action 中 this 指向 store

### 关键知识点
- actions 在转换中直接传递
- createSetupStore 中的 action 包装
- 异步 action 的处理

## 4. 写作要求
### 开篇方式
"与 state 和 getters 不同，actions 不需要转换为其他形式。但为了支持 $onAction 监听，每个 action 都会被包装一层。"

### 结构组织
```
1. actions 配置格式
2. Options → Setup 中的处理
3. action 包装函数
4. this 绑定机制
5. 异步 action 支持
6. $onAction 集成
```

### 代码示例
```typescript
// actions 配置
const useStore = defineStore('test', {
  state: () => ({ count: 0, loading: false }),
  actions: {
    // 同步 action
    increment() {
      this.count++
    },
    
    // 异步 action
    async fetchData() {
      this.loading = true
      try {
        const data = await api.getData()
        this.count = data.count
      } finally {
        this.loading = false
      }
    },
    
    // 调用其他 action
    incrementTwice() {
      this.increment()
      this.increment()
    }
  }
})

// action 包装逻辑（在 createSetupStore 中）
const action = (fn: _Method, name: string = ''): _Method => {
  const wrappedAction = function(this: any) {
    setActivePinia(pinia)
    const args = Array.from(arguments)
    
    // 触发 $onAction 订阅
    const afterCallbackSet = new Set()
    const onErrorCallbackSet = new Set()
    
    triggerSubscriptions(actionSubscriptions, {
      store,
      name,
      args,
      after: (cb) => afterCallbackSet.add(cb),
      onError: (cb) => onErrorCallbackSet.add(cb)
    })
    
    let ret: any
    try {
      ret = fn.apply(store, args)
    } catch (error) {
      triggerSubscriptions(onErrorCallbackSet, error)
      throw error
    }
    
    // 处理 Promise
    if (ret instanceof Promise) {
      return ret
        .then((value) => {
          triggerSubscriptions(afterCallbackSet, value)
          return value
        })
        .catch((error) => {
          triggerSubscriptions(onErrorCallbackSet, error)
          throw error
        })
    }
    
    triggerSubscriptions(afterCallbackSet, ret)
    return ret
  }
  
  return wrappedAction
}
```

## 5. 技术细节
### Options Store 中 actions 的处理
```typescript
// createOptionsStore 中
function setup() {
  return assign(
    localState,
    actions,  // 直接传递，不做转换
    computedGetters
  )
}

// actions 会在 createSetupStore 中被包装
for (const key in setupStore) {
  const prop = setupStore[key]
  if (typeof prop === 'function') {
    setupStore[key] = action(prop, key)
  }
}
```

### this 绑定
```typescript
// fn.apply(store, args) 确保 this 指向 store
const wrappedAction = function() {
  ret = fn.apply(store, args)
  //         ^^^^^ this 绑定到 store
}
```

### 异步 action 的处理
```typescript
// 判断返回值是否是 Promise
if (ret instanceof Promise) {
  return ret
    .then((value) => {
      triggerSubscriptions(afterCallbackSet, value)
      return value
    })
    .catch((error) => {
      triggerSubscriptions(onErrorCallbackSet, error)
      throw error
    })
}

// 这样 $onAction 的 after 和 onError 都能正确触发
```

## 6. 风格指导
- **语气**：实现细节讲解
- **重点**：action 包装和订阅集成

## 7. 章节检查清单
- [ ] actions 处理流程清晰
- [ ] 包装逻辑完整
- [ ] this 绑定解释
- [ ] 异步处理说明
- [ ] 与 $onAction 的集成
