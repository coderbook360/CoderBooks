# 章节写作指导：集合排序

## 1. 章节信息
- **章节标题**: 集合排序：sortBy 与 orderBy
- **文件名**: collection/sort.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 25
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 sortBy 的多条件排序机制
- 掌握 orderBy 的排序方向控制
- 了解稳定排序的实现原理

### 技能目标
- 能够使用排序方法进行复杂排序
- 理解迭代器简写在排序中的应用

## 3. 内容要点

### 核心函数

#### sortBy
```javascript
function sortBy(collection, iteratees) {
  if (collection == null) {
    return []
  }
  
  iteratees = iteratees.length
    ? iteratees.map(baseIteratee)
    : [identity]
  
  return baseOrderBy(collection, iteratees, [])
}
```

#### orderBy
```javascript
function orderBy(collection, iteratees, orders) {
  if (collection == null) {
    return []
  }
  
  if (!isArray(iteratees)) {
    iteratees = iteratees == null ? [] : [iteratees]
  }
  if (!isArray(orders)) {
    orders = orders == null ? [] : [orders]
  }
  
  return baseOrderBy(collection, iteratees.map(baseIteratee), orders)
}
```

#### baseOrderBy（核心实现）
```javascript
function baseOrderBy(collection, iteratees, orders) {
  const result = []
  
  // 1. 收集每个元素的所有排序键
  baseEach(collection, (value) => {
    const criteria = iteratees.map(iteratee => iteratee(value))
    result.push({ criteria, index: result.length, value })
  })
  
  // 2. 排序
  return result
    .sort((a, b) => compareMultiple(a, b, orders))
    .map(entry => entry.value)
}

// 多条件比较
function compareMultiple(a, b, orders) {
  const length = a.criteria.length
  
  for (let i = 0; i < length; i++) {
    const result = compareAscending(a.criteria[i], b.criteria[i])
    if (result) {
      const order = orders[i]
      return result * (order === 'desc' ? -1 : 1)
    }
  }
  
  // 稳定排序：索引作为最后比较条件
  return a.index - b.index
}
```

### 使用示例
```javascript
// sortBy 基本用法
const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 },
  { name: 'Bob', age: 30 }
]

// 单条件排序
_.sortBy(users, 'age')
// => [{ name: 'Jane', age: 25 }, { name: 'John', age: 30 }, { name: 'Bob', age: 30 }]

// 多条件排序
_.sortBy(users, ['age', 'name'])
// => 先按 age，age 相同再按 name

// orderBy - 控制排序方向
_.orderBy(users, ['age', 'name'], ['desc', 'asc'])
// => 年龄降序，姓名升序

// 使用函数
_.sortBy(users, [u => u.age, u => u.name.length])
```

### sortBy vs orderBy
| 特性 | sortBy | orderBy |
|------|--------|---------|
| 排序方向 | 只能升序 | 可指定升/降序 |
| 参数形式 | iteratees | iteratees + orders |
| 使用场景 | 简单升序 | 复杂排序需求 |

## 4. 写作要求

### 开篇方式
从"如何按多个条件排序对象数组"引入

### 结构组织
```
1. 排序概述（300字）
   - sortBy vs orderBy
   - 与原生 sort 的区别
   
2. sortBy 源码解析（400字）
   - 迭代器处理
   - 调用 baseOrderBy
   
3. orderBy 源码解析（400字）
   - 方向参数处理
   - 调用 baseOrderBy
   
4. baseOrderBy 核心实现（500字）
   - 收集排序键
   - 多条件比较
   - 稳定排序保证
   
5. 实际应用场景（300字）

6. 小结
```

### 代码示例
- 单条件排序
- 多条件排序
- 指定排序方向
- 使用函数作为迭代器

### 图表需求
- 多条件排序流程图
- sortBy vs orderBy 对比表

## 5. 技术细节

### 源码参考
- `sortBy.js`
- `orderBy.js`
- `.internal/baseOrderBy.js`
- `.internal/compareMultiple.js`
- `.internal/compareAscending.js`

### 实现要点
- sortBy 只能升序，orderBy 可指定方向
- baseOrderBy 先收集所有排序键再统一排序
- 使用元素原始索引保证稳定排序
- compareAscending 处理各种类型比较

### 常见问题
- Q: 排序是否稳定？
- A: 是的，通过保存原始索引保证稳定排序

- Q: 如何降序排序？
- A: 使用 orderBy 并传入 'desc'

## 6. 风格指导

### 语气语调
算法讲解，强调稳定排序

### 类比方向
- 将多条件排序比作"先按年级，再按班级，再按学号"
- 将稳定排序比作"保持原有相对顺序"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
