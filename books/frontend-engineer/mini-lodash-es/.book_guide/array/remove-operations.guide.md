# 章节写作指导：数组移除操作

## 1. 章节信息
- **章节标题**: 数组移除操作：pull、remove、without
- **文件名**: array/remove-operations.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 17
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 pull 系列方法的原地修改特性
- 掌握 remove 的条件移除机制
- 了解 without 的非破坏性移除

### 技能目标
- 能够根据场景选择合适的移除方法
- 理解原地修改 vs 返回新数组的区别

## 3. 内容要点

### 核心函数

#### pull / pullAll / pullAllBy / pullAllWith
```javascript
// pull - 原地移除指定值
function pull(array, ...values) {
  return pullAll(array, values)
}

// pullAll - 移除数组中的所有指定值
function pullAll(array, values) {
  return pullAllBy(array, values)
}

// pullAllBy - 带迭代器的移除
function pullAllBy(array, values, iteratee) {
  // 使用 baseIteratee 处理迭代器
  // 原地修改数组
}

// pullAllWith - 带比较器的移除
function pullAllWith(array, values, comparator) {
  // 使用自定义比较器
}
```

#### pullAt
```javascript
// pullAt - 按索引移除并返回移除的元素
function pullAt(array, ...indexes) {
  const result = baseAt(array, indexes)
  // 原地移除
  // 返回被移除的元素
  return result
}
```

#### remove
```javascript
// remove - 条件移除（原地修改）
function remove(array, predicate) {
  const result = []
  if (!(array != null && array.length)) {
    return result
  }
  let index = -1
  const indexes = []
  const length = array.length
  
  while (++index < length) {
    const value = array[index]
    if (predicate(value, index, array)) {
      result.push(value)
      indexes.push(index)
    }
  }
  basePullAt(array, indexes)
  return result
}
```

#### without
```javascript
// without - 非破坏性移除（返回新数组）
function without(array, ...values) {
  return isArrayLikeObject(array)
    ? baseDifference(array, values)
    : []
}
```

### 使用示例
```javascript
// pull - 原地移除
const arr1 = [1, 2, 3, 2, 4]
_.pull(arr1, 2)
console.log(arr1) // [1, 3, 4] - 原数组被修改

// pullAt - 按索引移除
const arr2 = ['a', 'b', 'c', 'd']
const removed = _.pullAt(arr2, [1, 3])
console.log(arr2)    // ['a', 'c']
console.log(removed) // ['b', 'd']

// remove - 条件移除
const arr3 = [1, 2, 3, 4, 5]
const evens = _.remove(arr3, n => n % 2 === 0)
console.log(arr3)  // [1, 3, 5]
console.log(evens) // [2, 4]

// without - 返回新数组
const arr4 = [1, 2, 3, 2, 4]
const result = _.without(arr4, 2)
console.log(arr4)   // [1, 2, 3, 2, 4] - 原数组不变
console.log(result) // [1, 3, 4]
```

### 方法对比表
| 方法 | 修改原数组 | 返回值 | 适用场景 |
|------|----------|--------|---------|
| pull | 是 | 修改后的原数组 | 移除特定值 |
| pullAt | 是 | 被移除的元素 | 按索引移除 |
| remove | 是 | 被移除的元素 | 条件移除 |
| without | 否 | 新数组 | 不可变操作 |

## 4. 写作要求

### 开篇方式
通过 "如何从数组中安全地删除元素" 这个常见需求引入

### 结构组织
```
1. 移除操作概述（300字）
   - 原地修改 vs 非破坏性
   - Lodash 提供的选择
   
2. pull 系列源码解析（600字）
   - pull → pullAll → pullAllBy 的调用链
   - basePullAt 内部实现
   
3. pullAt 源码解析（300字）
   - 按索引移除
   - 返回被移除元素
   
4. remove 源码解析（500字）
   - 条件判断
   - 收集索引后批量移除
   
5. without 源码解析（300字）
   - 使用 baseDifference
   - 非破坏性特点
   
6. 选型指南（300字）
   - 场景对比
   
7. 小结
```

### 代码示例
- 每个方法的基本用法
- 原地修改的验证示例
- 配合其他方法的组合用法

### 图表需求
- 方法对比表格
- 原地修改 vs 返回新数组 示意图

## 5. 技术细节

### 源码参考
- `pull.js`, `pullAll.js`, `pullAllBy.js`, `pullAllWith.js`
- `pullAt.js`
- `remove.js`
- `without.js`
- `.internal/basePullAll.js`, `.internal/basePullAt.js`

### 实现要点
- pull 系列使用 splice 原地修改数组
- basePullAt 从后向前移除以避免索引问题
- remove 先收集所有要移除的索引，再批量移除
- without 内部使用 baseDifference，与 difference 共享逻辑

### 常见问题
- Q: pull 和 without 有什么区别？
- A: pull 修改原数组，without 返回新数组不修改原数组

- Q: remove 返回什么？
- A: 返回被移除的元素数组，同时原数组被修改

## 6. 风格指导

### 语气语调
实用导向，强调方法选型

### 类比方向
- 将原地修改比作"直接在原纸上修改"
- 将非破坏性比作"复印一份再修改"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
