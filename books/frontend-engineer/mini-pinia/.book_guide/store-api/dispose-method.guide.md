# 章节写作指导：$dispose 与资源清理

## 1. 章节信息
- **章节标题**: $dispose 与资源清理
- **文件名**: store-api/dispose-method.md
- **所属部分**: 第七部分：Store API
- **预计阅读时间**: 12分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 $dispose 的作用与实现
- 掌握 Store 资源清理的完整流程
- 了解 $dispose 的使用场景

### 技能目标
- 能够实现 $dispose 方法
- 能够正确使用 $dispose 清理资源

## 3. 内容要点
### 核心概念
- **$dispose**：销毁 Store 实例
- **scope.stop()**：停止所有副作用
- **资源清理**：订阅、注册表、副作用

### 关键知识点
- effectScope 的停止
- 订阅集合的清空
- Store 注册表的移除

## 4. 写作要求
### 开篇方式
"Store 并非永远存在。在某些场景下（如 SSR、测试、动态 Store），我们需要销毁 Store 并释放其占用的资源。$dispose 正是为此而设计。"

### 结构组织
```
1. $dispose 的作用
2. 清理的内容
3. 实现原理
4. 使用场景
5. 注意事项
6. 完整实现代码
```

### 代码示例
```typescript
// $dispose 实现
function $dispose() {
  // 1. 停止 effectScope（清理所有 computed、watch 等）
  scope.stop()
  
  // 2. 清空订阅集合
  subscriptions.clear()
  actionSubscriptions.clear()
  
  // 3. 从 Pinia 注册表中移除
  pinia._s.delete($id)
}

// 使用示例
const store = useCounterStore()

// 正常使用
store.increment()
store.$subscribe(() => {})

// 销毁 Store
store.$dispose()

// 之后再调用 useCounterStore() 会创建新的实例
const newStore = useCounterStore()
// newStore !== store（是新创建的）
```

## 5. 技术细节
### 清理顺序的重要性
```typescript
function $dispose() {
  // 1. 先停止 scope
  scope.stop()
  // 这会触发所有 onScopeDispose 回调
  // 并停止所有 watch、watchEffect、computed
  
  // 2. 再清空订阅
  subscriptions.clear()
  actionSubscriptions.clear()
  // 此时不会有新的订阅回调被触发
  
  // 3. 最后从注册表移除
  pinia._s.delete($id)
  // 下次调用 useStore() 会创建新实例
}
```

### scope.stop() 的效果
```typescript
// 在 setup 中创建的所有副作用都会被清理
const store = defineStore('test', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)  // 会被清理
  
  watchEffect(() => {
    console.log(count.value)  // 会被清理
  })
  
  watch(count, () => {})  // 会被清理
  
  return { count, double }
})
```

### 使用场景
```typescript
// 1. SSR：每个请求后销毁
app.use(pinia)
await renderApp()
// 请求结束后
pinia._s.forEach(store => store.$dispose())

// 2. 测试：每个测试后重置
afterEach(() => {
  store.$dispose()
})

// 3. 动态 Store：不再需要时销毁
const dynamicStore = defineStore(`dynamic-${id}`, { ... })
const store = dynamicStore()
// 使用完成后
store.$dispose()
```

### 注意事项
```typescript
// $dispose 后 Store 仍然存在于内存
// 只是 Pinia 不再管理它
const store = useCounterStore()
store.$dispose()

// store 对象仍然可用，但状态已与 Pinia 断开
store.count  // 仍然可访问
store.$patch  // 可能不正常工作

// 最佳实践：dispose 后不再使用该引用
store.$dispose()
// 下次需要时重新获取
const newStore = useCounterStore()
```

## 6. 风格指导
- **语气**：实用性讲解
- **场景**：强调使用场景

## 7. 章节检查清单
- [ ] 清理内容完整
- [ ] 清理顺序说明
- [ ] 使用场景覆盖
- [ ] 注意事项明确
