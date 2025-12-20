# 章节写作指导：集合聚合

## 1. 章节信息
- **章节标题**: 集合聚合：reduce 与 reduceRight
- **文件名**: collection/reduce.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 23
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 reduce 的累积计算原理
- 掌握初始值缺失时的处理机制
- 了解 Lodash reduce 对对象的支持

### 技能目标
- 能够使用 reduce 实现各种聚合操作
- 理解 reduceRight 的逆序累积

## 3. 内容要点

### 核心函数

#### reduce
```javascript
function reduce(collection, iteratee, accumulator) {
  const func = isArray(collection) ? arrayReduce : baseReduce
  const initAccum = arguments.length < 3
  return func(collection, baseIteratee(iteratee), accumulator, initAccum, baseEach)
}

// arrayReduce - 数组归约
function arrayReduce(array, iteratee, accumulator, initAccum) {
  let index = -1
  const length = array == null ? 0 : array.length
  
  // 如果没有初始值，使用第一个元素
  if (initAccum && length) {
    accumulator = array[++index]
  }
  
  while (++index < length) {
    accumulator = iteratee(accumulator, array[index], index, array)
  }
  return accumulator
}

// baseReduce - 通用归约
function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
  eachFunc(collection, (value, key, collection) => {
    accumulator = initAccum
      ? (initAccum = false, value)
      : iteratee(accumulator, value, key, collection)
  })
  return accumulator
}
```

#### reduceRight
```javascript
function reduceRight(collection, iteratee, accumulator) {
  const func = isArray(collection) ? arrayReduceRight : baseReduce
  const initAccum = arguments.length < 3
  return func(collection, baseIteratee(iteratee), accumulator, initAccum, baseEachRight)
}
```

### 使用示例
```javascript
// reduce 基本用法 - 求和
_.reduce([1, 2, 3, 4], (sum, n) => sum + n, 0)
// => 10

// 没有初始值
_.reduce([1, 2, 3], (sum, n) => sum + n)
// => 6 (使用第一个元素作为初始值)

// reduce 对象
_.reduce({ a: 1, b: 2, c: 3 }, (result, value, key) => {
  result[value] = key
  return result
}, {})
// => { 1: 'a', 2: 'b', 3: 'c' }

// 转换数组为对象
const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
_.reduce(users, (acc, user) => {
  acc[user.id] = user
  return acc
}, {})
// => { 1: { id: 1, name: 'John' }, 2: { id: 2, name: 'Jane' } }

// reduceRight - 逆序
_.reduceRight(['a', 'b', 'c'], (acc, s) => acc + s, '')
// => 'cba'
```

### reduce 实现其他方法
```javascript
// 用 reduce 实现 map
function map(array, iteratee) {
  return _.reduce(array, (acc, value, index) => {
    acc.push(iteratee(value, index, array))
    return acc
  }, [])
}

// 用 reduce 实现 filter
function filter(array, predicate) {
  return _.reduce(array, (acc, value, index) => {
    if (predicate(value, index, array)) {
      acc.push(value)
    }
    return acc
  }, [])
}

// 用 reduce 实现 groupBy
function groupBy(array, iteratee) {
  return _.reduce(array, (acc, value) => {
    const key = iteratee(value)
    ;(acc[key] || (acc[key] = [])).push(value)
    return acc
  }, {})
}
```

## 4. 写作要求

### 开篇方式
从"将数组转换为单一值"的需求引入

### 结构组织
```
1. reduce 概述（300字）
   - 累积计算的概念
   - 与原生 reduce 的区别
   
2. reduce 源码解析（500字）
   - arrayReduce 数组路径
   - baseReduce 通用路径
   - 初始值处理逻辑
   
3. reduceRight 源码解析（300字）
   - 逆序累积
   - baseEachRight 的使用
   
4. reduce 的强大应用（500字）
   - 实现 map/filter
   - 实现 groupBy
   - 对象转换
   
5. 小结
```

### 代码示例
- 基本求和
- 对象处理
- 实现其他方法
- reduceRight 用法

### 图表需求
- reduce 累积过程图
- 初始值处理流程图

## 5. 技术细节

### 源码参考
- `reduce.js`
- `reduceRight.js`
- `.internal/arrayReduce.js`
- `.internal/arrayReduceRight.js`
- `.internal/baseReduce.js`

### 实现要点
- 使用 arguments.length < 3 判断是否有初始值
- 无初始值时，initAccum = true，第一个元素作为初始值
- baseReduce 通过 eachFunc 参数控制遍历方向
- 支持对象归约

### 常见问题
- Q: 空数组不传初始值会怎样？
- A: 返回 undefined

- Q: reduce 和 reduceRight 有什么区别？
- A: reduce 从左到右，reduceRight 从右到左

## 6. 风格指导

### 语气语调
深入讲解，展示 reduce 的强大

### 类比方向
- 将 reduce 比作"滚雪球"
- 累积器比作"不断壮大的雪球"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
