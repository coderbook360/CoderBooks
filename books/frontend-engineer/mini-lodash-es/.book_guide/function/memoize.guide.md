# 章节写作指导：函数缓存

## 1. 章节信息
- **章节标题**: 函数缓存：memoize 原理与应用
- **文件名**: function/memoize.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 37
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解记忆化/缓存的概念
- 掌握 memoize 的实现原理
- 了解缓存键的自定义机制

### 技能目标
- 能够使用 memoize 优化计算密集型函数
- 理解缓存策略的设计

## 3. 内容要点

### 核心函数

#### memoize 实现
```javascript
function memoize(func, resolver) {
  if (typeof func !== 'function' || 
      (resolver != null && typeof resolver !== 'function')) {
    throw new TypeError('Expected a function')
  }
  
  const memoized = function(...args) {
    // 计算缓存键
    const key = resolver ? resolver.apply(this, args) : args[0]
    const cache = memoized.cache
    
    // 检查缓存
    if (cache.has(key)) {
      return cache.get(key)
    }
    
    // 执行函数并缓存结果
    const result = func.apply(this, args)
    memoized.cache = cache.set(key, result) || cache
    return result
  }
  
  // 使用 Map 作为默认缓存
  memoized.cache = new (memoize.Cache || Map)()
  return memoized
}

// 可自定义缓存类
memoize.Cache = Map
```

### 使用示例
```javascript
// 基本用法 - 斐波那契
const fibonacci = _.memoize(n => {
  if (n < 2) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
})

fibonacci(10) // 第一次计算
fibonacci(10) // 使用缓存

// 自定义缓存键
const getUser = _.memoize(
  (id, options) => fetchUser(id, options),
  (id, options) => `${id}-${JSON.stringify(options)}`
)

// 访问缓存
getUser(1, { name: true })
console.log(getUser.cache) // Map { '1-{"name":true}' => {...} }

// 清空缓存
getUser.cache.clear()

// 自定义缓存实现
memoize.Cache = WeakMap
```

### 缓存键策略
```javascript
// 默认：只使用第一个参数
_.memoize((a, b) => a + b)(1, 2) // 键: 1
_.memoize((a, b) => a + b)(1, 3) // 键: 1，返回缓存的 3

// 自定义：使用所有参数
const add = _.memoize(
  (a, b) => a + b,
  (...args) => args.join(',')
)
add(1, 2) // 键: '1,2'
add(1, 3) // 键: '1,3'，不使用缓存
```

### 自定义缓存
```javascript
// 使用 LRU 缓存
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize
    this.cache = new Map()
  }
  
  has(key) {
    return this.cache.has(key)
  }
  
  get(key) {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    // 更新访问顺序
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }
  
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
    return this
  }
}

memoize.Cache = LRUCache
```

## 4. 写作要求

### 开篇方式
从"重复计算的性能问题"引入

### 结构组织
```
1. 记忆化概念（400字）
   - 什么是记忆化
   - 应用场景
   
2. memoize 源码解析（500字）
   - 闭包结构
   - 缓存键计算
   - 缓存读写
   
3. resolver 自定义缓存键（400字）
   - 默认行为
   - 自定义策略
   
4. 缓存实现自定义（400字）
   - memoize.Cache
   - LRU 缓存示例
   
5. 使用注意事项（300字）
   - 内存泄漏风险
   - 适用场景
   
6. 小结
```

### 代码示例
- memoize 实现
- 斐波那契优化
- 自定义缓存键
- LRU 缓存

### 图表需求
- 缓存命中流程图
- 性能对比图

## 5. 技术细节

### 源码参考
- `memoize.js`

### 实现要点
- 默认使用第一个参数作为缓存键
- 缓存存储在 memoized.cache 属性上
- 支持自定义 resolver 函数
- 支持自定义 Cache 类（需实现 has/get/set）

### 常见问题
- Q: memoize 会内存泄漏吗？
- A: 可能，缓存无限增长。可使用 LRU 等策略限制

- Q: 如何手动清除缓存？
- A: memoizedFunc.cache.clear()

## 6. 风格指导

### 语气语调
实用导向，注重性能分析

### 类比方向
- 将缓存比作"笔记本"
- 将 LRU 比作"有限容量的笔记本"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
