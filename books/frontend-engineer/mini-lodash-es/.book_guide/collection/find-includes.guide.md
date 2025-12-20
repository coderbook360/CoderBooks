# 章节写作指导：集合查找

## 1. 章节信息
- **章节标题**: 集合查找：find、includes、size
- **文件名**: collection/find-includes.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 22
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 find 与 filter 的区别
- 掌握 includes 的包含检查机制
- 了解 size 的统一大小获取

### 技能目标
- 能够使用查找方法快速定位元素
- 理解 SameValueZero 比较算法

## 3. 内容要点

### 核心函数

#### find / findLast
```javascript
// find - 查找第一个匹配元素
function find(collection, predicate, fromIndex) {
  const iterable = Object(collection)
  const iteratee = baseIteratee(predicate)
  
  if (isArrayLike(collection)) {
    const index = findIndex(collection, predicate, fromIndex)
    return index > -1 ? iterable[index] : undefined
  }
  
  let result
  baseEach(collection, (value, key, collection) => {
    if (iteratee(value, key, collection)) {
      result = value
      return false // 找到后中断
    }
  })
  return result
}

// findLast - 从后向前查找
function findLast(collection, predicate, fromIndex) {
  // 类似 find，但从后向前遍历
}
```

#### includes
```javascript
function includes(collection, value, fromIndex) {
  collection = isArrayLike(collection)
    ? collection
    : values(collection)
  
  fromIndex = toInteger(fromIndex)
  if (fromIndex < 0) {
    fromIndex = Math.max(collection.length + fromIndex, 0)
  }
  
  return isString(collection)
    ? (fromIndex <= collection.length && collection.indexOf(value, fromIndex) > -1)
    : !!collection.length && baseIndexOf(collection, value, fromIndex) > -1
}
```

#### size
```javascript
function size(collection) {
  if (collection == null) {
    return 0
  }
  if (isArrayLike(collection)) {
    return isString(collection)
      ? stringSize(collection)
      : collection.length
  }
  const tag = getTag(collection)
  if (tag === mapTag || tag === setTag) {
    return collection.size
  }
  return keys(collection).length
}
```

### 使用示例
```javascript
// find 基本用法
const users = [
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
]
_.find(users, u => u.age > 25)
// => { name: 'John', age: 30 }

// find 对象匹配简写
_.find(users, { age: 30 })
// => { name: 'John', age: 30 }

// includes 检查
_.includes([1, 2, 3], 2)
// => true

_.includes({ a: 1, b: 2 }, 1)
// => true (检查值)

_.includes('hello', 'ell')
// => true

// size
_.size([1, 2, 3])      // => 3
_.size({ a: 1, b: 2 }) // => 2
_.size('hello')        // => 5
```

## 4. 写作要求

### 开篇方式
从"如何快速找到满足条件的第一个元素"引入

### 结构组织
```
1. find 概述（300字）
   - 与 filter 的区别
   - 短路特性
   
2. find 源码解析（400字）
   - 数组路径
   - 对象路径
   - 中断机制
   
3. findLast 源码解析（200字）
   - 逆序查找
   
4. includes 源码解析（400字）
   - 数组/对象/字符串处理
   - SameValueZero 比较
   
5. size 源码解析（300字）
   - 统一大小获取
   - 各类型处理
   
6. 小结
```

### 代码示例
- find 各种用法
- includes 各类型检查
- size 统一获取

### 图表需求
- find vs filter 对比图

## 5. 技术细节

### 源码参考
- `find.js`, `findLast.js`
- `includes.js`
- `size.js`
- `.internal/baseIndexOf.js`
- `.internal/stringSize.js`

### 实现要点
- find 找到后返回 false 中断遍历
- includes 对对象检查的是值而非键
- size 支持数组、对象、Map、Set、字符串
- stringSize 处理 Unicode 字符

### 常见问题
- Q: find 找不到返回什么？
- A: 返回 undefined

- Q: includes 检查对象时查的是什么？
- A: 检查的是对象的值，不是键

## 6. 风格指导

### 语气语调
功能导向，强调实用性

### 类比方向
- 将 find 比作"找到即停"
- 将 includes 比作"包含检查"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
