# 章节写作指导：集合筛选

## 1. 章节信息
- **章节标题**: 集合筛选：filter、reject、partition
- **文件名**: collection/filter.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 21
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 filter 与 reject 的互补关系
- 掌握 partition 的分区机制
- 了解 iteratee 在筛选中的应用

### 技能目标
- 能够使用各种筛选方法处理数据
- 掌握匹配对象简写语法

## 3. 内容要点

### 核心函数

#### filter
```javascript
function filter(collection, predicate) {
  const func = isArray(collection) ? arrayFilter : baseFilter
  return func(collection, baseIteratee(predicate))
}

// arrayFilter - 数组筛选
function arrayFilter(array, predicate) {
  const length = array == null ? 0 : array.length
  const result = []
  
  let index = -1
  while (++index < length) {
    const value = array[index]
    if (predicate(value, index, array)) {
      result.push(value)
    }
  }
  return result
}

// baseFilter - 通用筛选
function baseFilter(collection, predicate) {
  const result = []
  baseEach(collection, (value, key, collection) => {
    if (predicate(value, key, collection)) {
      result.push(value)
    }
  })
  return result
}
```

#### reject
```javascript
// reject - filter 的反操作
function reject(collection, predicate) {
  const func = isArray(collection) ? arrayFilter : baseFilter
  return func(collection, negate(baseIteratee(predicate)))
}
```

#### partition
```javascript
// partition - 分成两组
function partition(collection, predicate) {
  return reduce(collection, (result, value, key) => {
    result[predicate(value, key, collection) ? 0 : 1].push(value)
    return result
  }, [[], []])
}
```

### 使用示例
```javascript
// filter 基本用法
_.filter([1, 2, 3, 4], n => n % 2 === 0)
// => [2, 4]

// filter 对象匹配简写
const users = [
  { name: 'John', active: true },
  { name: 'Jane', active: false }
]
_.filter(users, { active: true })
// => [{ name: 'John', active: true }]

// filter 属性简写
_.filter(users, 'active')
// => [{ name: 'John', active: true }]

// reject - 反向筛选
_.reject([1, 2, 3, 4], n => n % 2 === 0)
// => [1, 3]

// partition - 分组
_.partition([1, 2, 3, 4], n => n % 2 === 0)
// => [[2, 4], [1, 3]]
```

### 匹配简写
```javascript
// 对象匹配
_.filter(users, { active: true, age: 30 })
// 匹配所有属性都相等的元素

// 属性存在检查
_.filter(users, 'active')
// 等同于 _.filter(users, u => u.active)

// 数组路径匹配
_.filter(users, ['name', 'John'])
// 等同于 _.filter(users, u => u.name === 'John')
```

## 4. 写作要求

### 开篇方式
从数据筛选的常见场景引入

### 结构组织
```
1. filter 概述（300字）
   - 与原生 filter 的区别
   - 支持对象筛选
   
2. filter 源码解析（400字）
   - arrayFilter 数组路径
   - baseFilter 通用路径
   
3. reject 源码解析（300字）
   - negate 的作用
   - 与 filter 的关系
   
4. partition 源码解析（400字）
   - 使用 reduce 实现
   - 分区逻辑
   
5. iteratee 简写机制（400字）
   - 对象匹配
   - 属性匹配
   - 路径匹配
   
6. 小结
```

### 代码示例
- 基本筛选
- 对象匹配简写
- reject 用法
- partition 用法

### 图表需求
- filter vs reject 对比图
- partition 分区示意图

## 5. 技术细节

### 源码参考
- `filter.js`
- `reject.js`
- `partition.js`
- `.internal/arrayFilter.js`
- `.internal/baseFilter.js`
- `negate.js`

### 实现要点
- reject = filter + negate(predicate)
- partition 使用 reduce 一次遍历完成分区
- baseIteratee 处理对象匹配、属性匹配等简写

### 常见问题
- Q: filter 和 reject 有什么区别？
- A: filter 保留满足条件的，reject 保留不满足条件的

## 6. 风格指导

### 语气语调
实用导向，强调便捷的简写语法

### 类比方向
- 将 filter 比作"筛子"
- 将 partition 比作"分拣"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
