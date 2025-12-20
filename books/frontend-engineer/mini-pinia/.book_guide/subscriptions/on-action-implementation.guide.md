# 章节写作指导：$onAction 实现原理

## 1. 章节信息
- **章节标题**: $onAction 实现原理
- **文件名**: subscriptions/on-action-implementation.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 $onAction 的完整实现
- 掌握 action 包装器的工作原理
- 了解 after/onError 回调机制

### 技能目标
- 能够从零实现 action 监听
- 能够解释异步 action 的处理

## 3. 内容要点
### 核心概念
- **$onAction**：监听 action 调用
- **StoreOnActionListener**：监听回调类型
- **after/onError**：成功/失败后的回调

### 关键知识点
- action 包装器实现
- Promise 处理
- 调用链的执行顺序

## 4. 写作要求
### 开篇方式
"$onAction 提供了一种非侵入式的方式来监听所有 action 的调用。它不仅能知道 action 何时被调用，还能在 action 完成或失败后执行特定逻辑。"

### 结构组织
```
1. $onAction API 设计
2. StoreOnActionListener 类型
3. action 包装器实现
4. after 回调机制
5. onError 回调机制
6. 异步 action 处理
7. 完整实现代码
```

### 代码示例
```typescript
// $onAction 的使用
const unsubscribe = store.$onAction(
  ({
    name,     // action 名称
    store,    // store 实例
    args,     // 调用参数
    after,    // 成功后回调
    onError,  // 失败后回调
  }) => {
    const startTime = Date.now()
    console.log(`Action "${name}" started with args:`, args)
    
    after((result) => {
      console.log(
        `Action "${name}" finished in ${Date.now() - startTime}ms`,
        'Result:', result
      )
    })
    
    onError((error) => {
      console.error(`Action "${name}" failed:`, error)
    })
  }
)

// action 包装器实现
function action(fn: _Method, name: string = '') {
  const wrappedAction = function (this: any) {
    // 收集 after 回调
    const afterCallbackList: Array<(resolvedReturn: any) => any> = []
    // 收集 onError 回调
    const onErrorCallbackList: Array<(error: unknown) => unknown> = []
    
    function after(callback: (resolvedReturn: any) => any) {
      afterCallbackList.push(callback)
    }
    
    function onError(callback: (error: unknown) => unknown) {
      onErrorCallbackList.push(callback)
    }
    
    // 触发 $onAction 回调
    triggerSubscriptions(actionSubscriptions, {
      args: Array.from(arguments),
      name,
      store,
      after,
      onError,
    })
    
    let ret: unknown
    try {
      ret = fn.apply(this, arguments)
    } catch (error) {
      triggerSubscriptions(onErrorCallbackList, error)
      throw error
    }
    
    // 处理返回值
    if (ret instanceof Promise) {
      return ret
        .then((value) => {
          triggerSubscriptions(afterCallbackList, value)
          return value
        })
        .catch((error) => {
          triggerSubscriptions(onErrorCallbackList, error)
          return Promise.reject(error)
        })
    }
    
    triggerSubscriptions(afterCallbackList, ret)
    return ret
  }
  
  return wrappedAction as typeof fn
}
```

## 5. 技术细节
### 执行顺序
```
1. 调用 action
2. 触发所有 $onAction 回调
   - 回调可以注册 after/onError
3. 执行原始 action 逻辑
4a. 如果成功：触发所有 after 回调
4b. 如果失败：触发所有 onError 回调
```

### 异步 action 的处理
```typescript
// 同步 action
if (!(ret instanceof Promise)) {
  triggerSubscriptions(afterCallbackList, ret)
  return ret
}

// 异步 action
return ret
  .then((value) => {
    triggerSubscriptions(afterCallbackList, value)
    return value
  })
  .catch((error) => {
    triggerSubscriptions(onErrorCallbackList, error)
    return Promise.reject(error)
  })
```

### 错误处理策略
```typescript
// 同步错误
try {
  ret = fn.apply(this, arguments)
} catch (error) {
  triggerSubscriptions(onErrorCallbackList, error)
  throw error  // 重新抛出，不吞掉错误
}

// 异步错误
.catch((error) => {
  triggerSubscriptions(onErrorCallbackList, error)
  return Promise.reject(error)  // 继续拒绝
})
```

## 6. 风格指导
- **语气**：深入实现细节
- **图示**：可用流程图展示执行顺序

## 7. 章节检查清单
- [ ] 完整实现代码
- [ ] after/onError 机制
- [ ] 异步处理逻辑
- [ ] 错误处理策略
- [ ] 执行顺序清晰
