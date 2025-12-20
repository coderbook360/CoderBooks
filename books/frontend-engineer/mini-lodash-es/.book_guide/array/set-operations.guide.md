# 章节写作指导：数组集合运算

## 1. 章节信息
- **章节标题**: 数组集合运算：difference、intersection、union
- **文件名**: array/set-operations.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 14
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解数学集合运算在数组中的应用
- 掌握 difference、intersection、union 的实现原理
- 了解 By/With 变体的使用场景

### 技能目标
- 能够实现高效的集合运算
- 能够根据场景选择合适的运算方法

## 3. 内容要点

### 核心函数

#### difference / differenceBy / differenceWith
```javascript
// 差集：A - B，返回在 A 中但不在 B 中的元素
function difference(array, ...values) {
  return baseDifference(array, baseFlatten(values, 1))
}

function differenceBy(array, ...values) {
  let iteratee = last(values)
  if (isArrayLikeObject(iteratee)) {
    iteratee = undefined
  }
  return baseDifference(array, baseFlatten(values, 1), baseIteratee(iteratee))
}
```

#### intersection / intersectionBy / intersectionWith
```javascript
// 交集：A ∩ B，返回同时在 A 和 B 中的元素
function intersection(...arrays) {
  const mapped = arrays.map(array => castArrayLikeObject(array))
  return baseIntersection(mapped)
}
```

#### union / unionBy / unionWith
```javascript
// 并集：A ∪ B，返回 A 和 B 的所有不重复元素
function union(...arrays) {
  return baseUniq(baseFlatten(arrays, 1))
}
```

### 集合运算示意
```
A = [1, 2, 3]
B = [2, 3, 4]

difference(A, B)     = [1]       // A - B
intersection(A, B)   = [2, 3]    // A ∩ B
union(A, B)          = [1, 2, 3, 4]  // A ∪ B

// 对称差集（xor）
xor(A, B)            = [1, 4]    // (A - B) ∪ (B - A)
```

### 使用示例
```javascript
// 基础用法
_.difference([2, 1], [2, 3])  // [1]
_.intersection([2, 1], [2, 3])  // [2]
_.union([2], [1, 2])  // [2, 1]

// By 变体
_.differenceBy([2.1, 1.2], [2.3, 3.4], Math.floor)  // [1.2]
_.intersectionBy([{ x: 1 }], [{ x: 1 }], 'x')  // [{ x: 1 }]

// With 变体
_.differenceWith([{ a: 1 }], [{ a: 1 }], _.isEqual)  // []
```

## 4. 写作要求

### 开篇方式
以 "数学中的集合论在编程中的应用" 引入

### 结构组织
```
1. 集合运算概述（300字）
   - 差集、交集、并集定义
   - 实际应用场景
   
2. difference 源码解析（500字）
   - baseDifference 实现
   - 多数组处理
   
3. intersection 源码解析（500字）
   - baseIntersection 实现
   - 多数组交集算法
   
4. union 源码解析（400字）
   - 展平 + 去重
   
5. xor 对称差集（300字）
   
6. By/With 变体（400字）
   - 使用场景对比
   
7. 手写实现与练习
```

### 代码示例
- 各集合运算的核心实现
- 多数组集合运算示例
- 对象数组的集合运算

### 图表需求
- 韦恩图展示集合运算
- 算法流程图

## 5. 技术细节

### 源码参考
- `difference.js`, `differenceBy.js`, `differenceWith.js`
- `intersection.js`, `intersectionBy.js`, `intersectionWith.js`
- `union.js`, `unionBy.js`, `unionWith.js`
- `xor.js`, `xorBy.js`, `xorWith.js`
- `.internal/baseDifference.js`
- `.internal/baseIntersection.js`

### 实现要点
- difference 使用 Set/Map 实现 O(n) 查找
- intersection 需要检查所有数组
- union 本质是 flatten + uniq
- xor 需要找出只出现一次的元素

### 常见问题
- Q: difference 和 without 有什么区别？
- A: difference 接受数组参数，without 接受展开参数

## 6. 风格指导

### 语气语调
数学概念结合实际应用

### 类比方向
- 将集合运算比作 "找两个班级的共同学生（交集）"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
