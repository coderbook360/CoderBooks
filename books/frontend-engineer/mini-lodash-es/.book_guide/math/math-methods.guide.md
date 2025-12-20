# 章节写作指导：数学方法

## 1. 章节信息
- **章节标题**: 数学方法：sum、mean、max、min
- **文件名**: math/math-methods.md
- **所属部分**: 第八部分 - 数学与数值方法
- **章节序号**: 47
- **预计阅读时间**: 18分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Lodash 数学方法的设计
- 掌握聚合计算方法的实现
- 了解 *By 系列变体的作用

### 技能目标
- 能够使用数学方法进行数据统计
- 理解 iteratee 在数学方法中的应用

## 3. 内容要点

### 核心函数

#### sum / sumBy
```javascript
// sum - 求和
function sum(array) {
  return array != null && array.length
    ? baseSum(array, identity)
    : 0
}

// sumBy - 带迭代器的求和
function sumBy(array, iteratee) {
  return array != null && array.length
    ? baseSum(array, baseIteratee(iteratee))
    : 0
}

// baseSum - 核心实现
function baseSum(array, iteratee) {
  let result
  
  for (const value of array) {
    const current = iteratee(value)
    if (current !== undefined) {
      result = result === undefined ? current : (result + current)
    }
  }
  return result
}
```

#### mean / meanBy
```javascript
// mean - 平均值
function mean(array) {
  return baseMean(array, identity)
}

// meanBy - 带迭代器的平均值
function meanBy(array, iteratee) {
  return baseMean(array, baseIteratee(iteratee))
}

// baseMean - 核心实现
function baseMean(array, iteratee) {
  const length = array == null ? 0 : array.length
  return length ? (baseSum(array, iteratee) / length) : NaN
}
```

#### max / maxBy / min / minBy
```javascript
// max - 最大值
function max(array) {
  return array != null && array.length
    ? baseExtremum(array, identity, baseGt)
    : undefined
}

// maxBy - 带迭代器的最大值
function maxBy(array, iteratee) {
  return array != null && array.length
    ? baseExtremum(array, baseIteratee(iteratee), baseGt)
    : undefined
}

// baseExtremum - 核心实现
function baseExtremum(array, iteratee, comparator) {
  let result
  let computed
  
  for (const value of array) {
    const current = iteratee(value)
    if (current != null && 
        (computed === undefined ? current === current : comparator(current, computed))) {
      computed = current
      result = value
    }
  }
  return result
}

// min / minBy 类似，使用 baseLt 比较器
```

### 使用示例
```javascript
// sum
_.sum([4, 2, 8, 6])
// => 20

// sumBy
const objects = [{ n: 4 }, { n: 2 }, { n: 8 }]
_.sumBy(objects, o => o.n)
// => 14
_.sumBy(objects, 'n')  // 属性简写
// => 14

// mean
_.mean([4, 2, 8])
// => 4.666...

// max / min
_.max([4, 2, 8, 6])
// => 8
_.min([4, 2, 8, 6])
// => 2

// maxBy / minBy
const users = [
  { user: 'barney', age: 36 },
  { user: 'fred', age: 40 }
]
_.maxBy(users, 'age')
// => { user: 'fred', age: 40 }
_.minBy(users, o => o.age)
// => { user: 'barney', age: 36 }
```

### 方法对比
| 方法 | 返回值 | 空数组返回 |
|------|--------|-----------|
| sum | 总和 | 0 |
| mean | 平均值 | NaN |
| max | 最大元素 | undefined |
| min | 最小元素 | undefined |

## 4. 写作要求

### 开篇方式
从"数据统计"的常见需求引入

### 结构组织
```
1. 数学方法概述（300字）
   - 方法分类
   - *By 变体的作用
   
2. sum/sumBy 源码解析（400字）
   - baseSum 实现
   - 空值处理
   
3. mean/meanBy 源码解析（300字）
   - 基于 sum 实现
   - NaN 返回值
   
4. max/min 系列源码解析（500字）
   - baseExtremum 实现
   - 返回原始元素
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- 各方法基本用法
- *By 变体使用
- 空数组处理

### 图表需求
- 方法返回值对比表
- baseExtremum 流程图

## 5. 技术细节

### 源码参考
- `sum.js`, `sumBy.js`
- `mean.js`, `meanBy.js`
- `max.js`, `maxBy.js`
- `min.js`, `minBy.js`
- `.internal/baseSum.js`
- `.internal/baseMean.js`
- `.internal/baseExtremum.js`

### 实现要点
- sum 空数组返回 0，mean 返回 NaN
- max/min 返回原始元素而非计算值
- baseExtremum 使用比较器函数
- undefined 值会被跳过

### 常见问题
- Q: maxBy 返回的是什么？
- A: 返回满足条件的原始元素，不是计算值

- Q: 空数组 mean 为什么返回 NaN？
- A: 数学上 0/0 是未定义的

## 6. 风格指导

### 语气语调
功能讲解，注重实用性

### 类比方向
- 将 mean 比作"平均成绩"
- 将 max/min 比作"排名第一/最后"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
