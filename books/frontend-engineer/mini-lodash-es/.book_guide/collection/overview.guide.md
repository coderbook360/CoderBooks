# 章节写作指导：集合方法概览

## 1. 章节信息
- **章节标题**: 集合方法概览与设计
- **文件名**: collection/overview.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 18
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Lodash 中"集合"的定义和范围
- 掌握集合方法的统一处理机制
- 了解数组与对象作为集合的差异

### 技能目标
- 能够理解集合方法如何同时处理数组和对象
- 掌握 baseEach 和 baseIteratee 的核心作用

## 3. 内容要点

### 核心概念

#### 什么是集合（Collection）
在 Lodash 中，"集合"是一个抽象概念：
- **数组**：最常见的集合类型
- **对象**：可以被视为键值对的集合
- **类数组对象**：具有 length 属性的对象

#### 集合方法的统一设计
```javascript
// 集合方法的典型模式
function collectionMethod(collection, iteratee) {
  // 1. 统一处理 iteratee
  const func = baseIteratee(iteratee)
  
  // 2. 统一遍历机制
  const iterator = isArrayLike(collection) ? arrayMethod : baseMethod
  
  // 3. 执行操作
  return iterator(collection, func)
}
```

### 核心内部方法

#### baseEach / baseEachRight
```javascript
// 统一的遍历基础方法
function baseEach(collection, iteratee) {
  if (collection == null) return collection
  
  if (!isArrayLike(collection)) {
    return baseForOwn(collection, iteratee)
  }
  
  const length = collection.length
  for (let index = 0; index < length; index++) {
    if (iteratee(collection[index], index, collection) === false) {
      break
    }
  }
  return collection
}
```

#### baseIteratee
```javascript
// 统一的迭代器处理
function baseIteratee(value) {
  if (typeof value === 'function') return value
  if (value == null) return identity
  if (typeof value === 'object') {
    return isArray(value)
      ? baseMatchesProperty(value[0], value[1])
      : baseMatches(value)
  }
  return property(value)
}
```

### 集合方法分类
| 类别 | 方法 | 说明 |
|------|------|------|
| 遍历 | forEach, forEachRight | 无返回值遍历 |
| 转换 | map, flatMap, flatMapDeep | 映射转换 |
| 筛选 | filter, reject, partition | 条件过滤 |
| 查找 | find, findLast, includes | 元素查找 |
| 聚合 | reduce, reduceRight | 累积计算 |
| 分组 | groupBy, keyBy, countBy | 按条件分组 |
| 排序 | sortBy, orderBy | 排序操作 |
| 判断 | every, some | 条件判断 |
| 采样 | sample, sampleSize, shuffle | 随机操作 |

## 4. 写作要求

### 开篇方式
从 "数组有 map、filter，对象呢？" 这个问题引入集合概念

### 结构组织
```
1. 集合的定义（400字）
   - 数组、对象、类数组
   - 为什么需要统一处理
   
2. 统一遍历机制（500字）
   - baseEach 源码解析
   - 数组路径 vs 对象路径
   
3. 统一迭代器机制（500字）
   - baseIteratee 源码解析
   - 支持的 iteratee 类型
   
4. 集合方法分类（300字）
   - 各类方法概述
   
5. 小结
```

### 代码示例
- baseEach 的实现
- baseIteratee 的各种输入形式
- 集合方法处理数组和对象的对比

### 图表需求
- 集合方法分类表
- 方法处理流程图

## 5. 技术细节

### 源码参考
- `.internal/baseEach.js`
- `.internal/baseEachRight.js`
- `.internal/baseIteratee.js`
- `.internal/createBaseEach.js`
- `.internal/createBaseFor.js`

### 实现要点
- isArrayLike 判断决定遍历方式
- baseIteratee 支持函数、属性名、匹配对象等多种形式
- 短路机制：iteratee 返回 false 可以中断遍历

### 常见问题
- Q: 集合方法和数组方法有什么区别？
- A: 集合方法可以同时处理数组和对象，更通用

## 6. 风格指导

### 语气语调
概念性讲解，为后续章节铺垫

### 类比方向
- 将集合比作"容器"
- 将 baseEach 比作"万能遍历器"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
