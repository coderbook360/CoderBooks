# 章节写作指导：集合分组

## 1. 章节信息
- **章节标题**: 集合分组：groupBy、keyBy、countBy
- **文件名**: collection/groupby.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 24
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 groupBy 的分组机制
- 掌握 keyBy 的索引构建
- 了解 countBy 的计数统计

### 技能目标
- 能够使用分组方法组织数据
- 理解三种方法的应用场景区别

## 3. 内容要点

### 核心函数

#### groupBy
```javascript
// groupBy - 按条件分组
const groupBy = createAggregator((result, value, key) => {
  if (hasOwnProperty.call(result, key)) {
    result[key].push(value)
  } else {
    baseAssignValue(result, key, [value])
  }
})

// createAggregator 工厂函数
function createAggregator(setter, initializer) {
  return (collection, iteratee) => {
    const func = baseIteratee(iteratee)
    return reduce(collection, (result, value, key) => {
      const groupKey = func(value)
      setter(result, groupKey, value, key)
      return result
    }, initializer ? initializer() : {})
  }
}
```

#### keyBy
```javascript
// keyBy - 按条件创建索引
const keyBy = createAggregator((result, value, key) => {
  baseAssignValue(result, key, value)
})
```

#### countBy
```javascript
// countBy - 按条件计数
const countBy = createAggregator((result, value, key) => {
  if (hasOwnProperty.call(result, key)) {
    ++result[key]
  } else {
    baseAssignValue(result, key, 1)
  }
})
```

### 使用示例
```javascript
// groupBy 基本用法
_.groupBy([6.1, 4.2, 6.3], Math.floor)
// => { 4: [4.2], 6: [6.1, 6.3] }

// groupBy 属性简写
const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 30 },
  { name: 'Bob', age: 25 }
]
_.groupBy(users, 'age')
// => { 25: [{ name: 'Bob', age: 25 }], 30: [{ name: 'John'... }, { name: 'Jane'... }] }

// keyBy - 创建索引
_.keyBy(users, 'name')
// => { John: { name: 'John', age: 30 }, Jane: {...}, Bob: {...} }

// countBy - 计数
_.countBy([6.1, 4.2, 6.3], Math.floor)
// => { 4: 1, 6: 2 }

_.countBy(['one', 'two', 'three'], 'length')
// => { 3: 2, 5: 1 }
```

### 方法对比
| 方法 | 结果类型 | 说明 |
|------|---------|------|
| groupBy | { key: [values] } | 按键分组，值为数组 |
| keyBy | { key: value } | 按键索引，值为最后一个元素 |
| countBy | { key: count } | 按键计数，值为数量 |

## 4. 写作要求

### 开篇方式
从数据分析中常见的分组需求引入

### 结构组织
```
1. 分组方法概述（300字）
   - 三种方法的区别
   - 应用场景
   
2. createAggregator 工厂函数（400字）
   - 统一的创建模式
   - setter 回调的作用
   
3. groupBy 源码解析（400字）
   - 分组逻辑
   - 数组累积
   
4. keyBy 源码解析（300字）
   - 索引构建
   - 覆盖机制
   
5. countBy 源码解析（300字）
   - 计数累积
   
6. 实际应用场景（300字）

7. 小结
```

### 代码示例
- 三种方法的基本用法
- 属性简写
- 实际数据处理场景

### 图表需求
- 三种方法结果对比图
- createAggregator 工厂模式图

## 5. 技术细节

### 源码参考
- `groupBy.js`
- `keyBy.js`
- `countBy.js`
- `.internal/createAggregator.js`
- `.internal/baseAssignValue.js`

### 实现要点
- 三个方法共用 createAggregator 工厂函数
- 差异仅在 setter 回调的实现
- keyBy 后来的值会覆盖先前的值
- 使用 hasOwnProperty 检查避免原型链问题

### 常见问题
- Q: keyBy 遇到重复键怎么办？
- A: 后面的值会覆盖前面的值

- Q: groupBy 和 partition 有什么区别？
- A: partition 只分两组，groupBy 分任意多组

## 6. 风格指导

### 语气语调
功能对比导向，强调选型

### 类比方向
- 将 groupBy 比作"按类别装箱"
- 将 keyBy 比作"建立索引目录"
- 将 countBy 比作"统计票数"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
