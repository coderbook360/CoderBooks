# 章节写作指导：数组变换

## 1. 章节信息
- **章节标题**: 数组变换：zip、unzip、fromPairs
- **文件名**: array/zip-pairs.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 16
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 zip/unzip 的矩阵转置概念
- 掌握 fromPairs/toPairs 的键值对转换
- 了解 zipObject/zipObjectDeep 的用途

### 技能目标
- 能够使用 zip 系列方法处理并行数据
- 能够在对象和数组之间灵活转换

## 3. 内容要点

### 核心函数

#### zip / unzip
```javascript
// zip - 将多个数组按索引分组
function zip(...arrays) {
  return unzipWith(arrays, identity)
}

// unzip - zip 的逆操作
function unzip(array) {
  if (!(array != null && array.length)) return []
  let length = 0
  array = filter(array, group => {
    if (isArrayLikeObject(group)) {
      length = Math.max(group.length, length)
      return true
    }
  })
  return times(length, index => map(array, group => group[index]))
}
```

#### zipWith / unzipWith
```javascript
function zipWith(...arrays) {
  const iteratee = last(arrays)
  const length = arrays.length
  if (typeof iteratee === 'function') {
    arrays.length = length - 1
  }
  return unzipWith(arrays, iteratee)
}
```

#### fromPairs / toPairs
```javascript
// fromPairs - 键值对数组 → 对象
function fromPairs(pairs) {
  const result = {}
  for (const [key, value] of pairs) {
    result[key] = value
  }
  return result
}

// toPairs - 对象 → 键值对数组
function toPairs(object) {
  return Object.entries(Object(object))
}
```

#### zipObject / zipObjectDeep
```javascript
// zipObject - 两个数组 → 对象
function zipObject(props, values) {
  return baseZipObject(props || [], values || [], assignValue)
}
```

### 使用示例
```javascript
// zip - 合并
_.zip(['a', 'b'], [1, 2], [true, false])
// => [['a', 1, true], ['b', 2, false]]

// unzip - 拆分
_.unzip([['a', 1], ['b', 2]])
// => [['a', 'b'], [1, 2]]

// zipWith - 带计算
_.zipWith([1, 2], [10, 20], (a, b) => a + b)
// => [11, 22]

// fromPairs
_.fromPairs([['a', 1], ['b', 2]])
// => { a: 1, b: 2 }

// zipObject
_.zipObject(['a', 'b'], [1, 2])
// => { a: 1, b: 2 }
```

## 4. 写作要求

### 开篇方式
以 "处理并行数组数据" 的场景引入

### 结构组织
```
1. zip/unzip 概念（400字）
   - 矩阵转置类比
   - 实际应用场景
   
2. zip 源码解析（400字）
   - 按索引分组
   
3. unzip 源码解析（500字）
   - 长度处理
   - 逆转置逻辑
   
4. zipWith/unzipWith（400字）
   - 带迭代器的变体
   
5. fromPairs/toPairs（400字）
   - 对象与键值对转换
   
6. zipObject 系列（300字）

7. 小结
```

### 代码示例
- zip/unzip 的完整实现
- 矩阵转置的可视化示例
- 各种变体的使用场景

### 图表需求
- zip 操作示意图
- 矩阵转置图示

## 5. 技术细节

### 源码参考
- `zip.js`, `unzip.js`
- `zipWith.js`, `unzipWith.js`
- `zipObject.js`, `zipObjectDeep.js`
- `fromPairs.js`, `toPairs.js`
- `.internal/baseZipObject.js`

### 实现要点
- zip 实际上调用 unzipWith(arrays, identity)
- unzip 需要找到最长数组的长度
- fromPairs 是 toPairs 的逆操作
- zipObjectDeep 支持路径字符串

### 常见问题
- Q: zip 和 zipObject 有什么区别？
- A: zip 返回二维数组，zipObject 返回对象

## 6. 风格指导

### 语气语调
概念讲解结合实用示例

### 类比方向
- 将 zip 比作 "拉链把两边拉到一起"
- 将 unzip 比作 "把拉链拉开"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
