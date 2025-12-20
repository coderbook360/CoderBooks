# 章节写作指导：数组查找

## 1. 章节信息
- **章节标题**: 数组查找：find、findIndex、indexOf
- **文件名**: array/find-index.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 13
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 find 与 findIndex 的区别
- 掌握 indexOf 与 lastIndexOf 的搜索方向
- 了解 Lodash 查找方法与原生方法的差异

### 技能目标
- 能够选择合适的查找方法
- 能够利用 iteratee 实现复杂查找

## 3. 内容要点

### 核心函数

#### findIndex / findLastIndex
```javascript
function findIndex(array, predicate, fromIndex) {
  const length = array == null ? 0 : array.length
  if (!length) return -1
  
  let index = fromIndex == null ? 0 : toInteger(fromIndex)
  if (index < 0) index = Math.max(length + index, 0)
  
  const iteratee = baseIteratee(predicate)
  for (; index < length; index++) {
    if (iteratee(array[index], index, array)) {
      return index
    }
  }
  return -1
}
```

#### indexOf / lastIndexOf
```javascript
function indexOf(array, value, fromIndex) {
  const length = array == null ? 0 : array.length
  if (!length) return -1
  
  let index = fromIndex == null ? 0 : toInteger(fromIndex)
  if (index < 0) index = Math.max(length + index, 0)
  
  return baseIndexOf(array, value, index)
}
```

### 方法对比
| 方法 | 查找依据 | 返回值 | 原生对应 |
|------|---------|-------|---------|
| find | predicate | 元素值 | Array.find |
| findIndex | predicate | 索引 | Array.findIndex |
| findLast | predicate | 元素值 | Array.findLast |
| findLastIndex | predicate | 索引 | Array.findLastIndex |
| indexOf | 值比较 | 索引 | Array.indexOf |
| lastIndexOf | 值比较 | 索引 | Array.lastIndexOf |

### iteratee 简写
```javascript
// 函数形式
_.findIndex(users, user => user.active)

// 对象形式（_.matches）
_.findIndex(users, { active: true })

// 属性值形式（_.matchesProperty）
_.findIndex(users, ['active', true])

// 属性名形式（_.property）
_.findIndex(users, 'active')
```

## 4. 写作要求

### 开篇方式
以 "在数组中查找元素是最常见的操作之一" 引入

### 结构组织
```
1. 查找方法概览（300字）
   - find vs findIndex
   - indexOf vs findIndex
   
2. findIndex 源码解析（500字）
   - 基本实现
   - fromIndex 处理
   - iteratee 支持
   
3. indexOf 源码解析（400字）
   - 值比较逻辑
   - SameValueZero 规则
   
4. iteratee 简写语法（400字）
   - 四种简写形式
   - baseIteratee 的处理
   
5. findLast 系列（300字）
   - 反向查找
   
6. 与原生方法对比（300字）

7. 小结
```

### 代码示例
- findIndex 的完整实现
- 四种 iteratee 简写的示例
- NaN 查找的边界情况
- 与原生方法的对比

### 图表需求
- 查找方法选择决策树
- iteratee 简写语法表

## 5. 技术细节

### 源码参考
- `findIndex.js`
- `findLastIndex.js`
- `indexOf.js`
- `lastIndexOf.js`
- `.internal/baseFindIndex.js`
- `.internal/baseIndexOf.js`
- `.internal/strictIndexOf.js`

### 实现要点
- indexOf 对 NaN 使用特殊的比较逻辑（NaN 可以找到 NaN）
- fromIndex 支持负数（从末尾计算）
- findIndex 支持 iteratee 简写

### 常见问题
- Q: _.indexOf 和原生 Array.indexOf 有什么区别？
- A: _.indexOf 可以正确找到 NaN，原生 indexOf 无法找到 NaN

## 6. 风格指导

### 语气语调
对比分析为主，实用导向

### 类比方向
- 将查找比作 "在书架上找一本书"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
