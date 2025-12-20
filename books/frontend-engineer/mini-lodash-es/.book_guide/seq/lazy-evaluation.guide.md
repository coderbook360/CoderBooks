# 章节写作指导：惰性求值

## 1. 章节信息
- **章节标题**: 惰性求值与性能优化
- **文件名**: seq/lazy-evaluation.md
- **所属部分**: 第十部分 - 链式调用与序列
- **章节序号**: 59
- **预计阅读时间**: 22分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解惰性求值的原理和优势
- 掌握 LazyWrapper 的实现机制
- 了解短路优化的应用场景

### 技能目标
- 能够利用惰性求值优化数据处理
- 理解 Lodash 链式调用的性能特性

## 3. 内容要点

### 核心概念

#### 惰性求值 vs 及早求值
```javascript
// 及早求值 - 每步都执行
const result = _([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  .map(x => { console.log('map', x); return x * 2 })  // 10 次
  .filter(x => { console.log('filter', x); return x > 10 })  // 10 次
  .take(2)  // 取 2 个
  .value()

// 惰性求值 - 按需执行
// 实际只需要执行到找到 2 个符合条件的元素为止
```

#### LazyWrapper 结构
```javascript
// LazyWrapper - 惰性包装器
function LazyWrapper(value) {
  this.__wrapped__ = value    // 被包装的值
  this.__actions__ = []       // 待执行的操作
  this.__dir__ = 1            // 迭代方向 (1: 正向, -1: 逆向)
  this.__filtered__ = false   // 是否有过滤操作
  this.__iteratees__ = []     // 迭代器列表
  this.__takeCount__ = MAX_ARRAY_LENGTH  // 取值数量
  this.__views__ = []         // 视图（slice 操作）
}
```

### 支持惰性求值的方法
```javascript
// 可以惰性化的方法
const lazyMethods = [
  'filter', 'map', 'takeWhile', 'dropWhile',
  'head', 'take', 'drop', 'slice', 'initial', 'tail', 'last'
]

// 触发执行的方法
const eagerMethods = [
  'reduce', 'find', 'forEach', 'some', 'every',
  'includes', 'sortBy', 'groupBy', 'countBy'
]
```

### 惰性化实现

#### lazyMap / lazyFilter
```javascript
// lazyMap - 惰性 map
function lazyMap(iteratee) {
  this.__iteratees__.push({
    iteratee: baseIteratee(iteratee),
    type: LAZY_MAP_FLAG
  })
  return this
}

// lazyFilter - 惰性 filter
function lazyFilter(iteratee) {
  this.__iteratees__.push({
    iteratee: baseIteratee(iteratee),
    type: LAZY_FILTER_FLAG
  })
  this.__filtered__ = true
  return this
}
```

#### lazyValue - 惰性执行
```javascript
// lazyValue - 执行惰性链
function lazyValue() {
  const array = this.__wrapped__.value()
  const dir = this.__dir__
  const isArr = isArray(array)
  const isRight = dir < 0
  const arrLength = isArr ? array.length : 0
  const view = getView(0, arrLength, this.__views__)
  const start = view.start
  const end = view.end
  const length = end - start
  const index = isRight ? end : (start - 1)
  const iteratees = this.__iteratees__
  const iterLength = iteratees.length
  const resIndex = 0
  const takeCount = Math.min(length, this.__takeCount__)
  
  const result = []
  
  outer:
  while (length-- && resIndex < takeCount) {
    index += dir
    
    let iterIndex = -1
    let value = array[index]
    
    // 依次执行所有迭代器
    while (++iterIndex < iterLength) {
      const data = iteratees[iterIndex]
      const iteratee = data.iteratee
      const type = data.type
      const computed = iteratee(value)
      
      if (type === LAZY_MAP_FLAG) {
        value = computed
      } else if (!computed) {
        if (type === LAZY_FILTER_FLAG) {
          continue outer  // 跳过不符合条件的元素
        } else {
          break outer     // 遇到 dropWhile/takeWhile 终止条件
        }
      }
    }
    
    result[resIndex++] = value
  }
  
  return result
}
```

### 短路优化示例
```javascript
// 场景：从 10000 个元素中找前 3 个偶数
const data = _.range(10000)

// 无惰性求值：map 10000 次，filter 10000 次，然后取 3 个
// 有惰性求值：只处理到找到 3 个偶数为止（约 6 次）

const result = _.chain(data)
  .map(x => x * 2)
  .filter(x => x % 4 === 0)
  .take(3)
  .value()

// 惰性求值大幅减少了计算量
```

### 惰性链融合
```javascript
// 链融合 - 多个 map 合并为一个
_.chain([1, 2, 3])
  .map(x => x + 1)      // iteratee 1
  .map(x => x * 2)      // iteratee 2
  .map(x => x.toString())  // iteratee 3
  .value()

// 融合后等价于：
// .map(x => ((x + 1) * 2).toString())
```

## 4. 写作要求

### 开篇方式
从"为什么 Lodash 链式调用可以很快"引入

### 结构组织
```
1. 惰性求值概述（400字）
   - 什么是惰性求值
   - 与及早求值的对比
   
2. LazyWrapper 结构（500字）
   - 核心属性
   - 与 LodashWrapper 的关系
   
3. 惰性化方法实现（500字）
   - lazyMap/lazyFilter
   - 迭代器收集
   
4. lazyValue 执行机制（600字）
   - 合并执行
   - 短路优化
   
5. 性能优势分析（400字）
   - 短路优化
   - 链融合
   
6. 小结
```

### 代码示例
- 惰性 vs 及早求值对比
- LazyWrapper 结构
- 短路优化示例
- 性能基准

### 图表需求
- 惰性求值流程图
- 短路优化示意图
- 性能对比图

## 5. 技术细节

### 源码参考
- `.internal/LazyWrapper.js`
- `.internal/lazyValue.js`
- `wrapperLodash.js`
- `.internal/getView.js`

### 实现要点
- LazyWrapper 收集迭代器而不立即执行
- lazyValue 在单次循环中执行所有迭代器
- take/head 等方法设置 __takeCount__ 实现短路
- 迭代方向 __dir__ 支持正向和逆向

### 常见问题
- Q: 哪些方法支持惰性求值？
- A: map, filter, take, drop, slice 等

- Q: 惰性求值总是更快吗？
- A: 对于小数组可能反而更慢，主要优化大数据集

## 6. 风格指导

### 语气语调
性能优化讲解，用数据说话

### 类比方向
- 将惰性求值比作"按需生产"
- 将短路优化比作"提前下班"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
