# 章节写作指导：集合随机采样

## 1. 章节信息
- **章节标题**: 集合随机采样：sample、shuffle
- **文件名**: collection/sample-shuffle.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 27
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 sample 的随机采样机制
- 掌握 shuffle 的 Fisher-Yates 洗牌算法
- 了解 sampleSize 的多元素采样

### 技能目标
- 能够使用随机方法进行数据采样
- 理解洗牌算法的均匀性保证

## 3. 内容要点

### 核心函数

#### sample
```javascript
// sample - 随机取一个元素
function sample(collection) {
  const array = isArrayLike(collection)
    ? collection
    : values(collection)
  const length = array.length
  return length ? array[Math.floor(Math.random() * length)] : undefined
}
```

#### sampleSize
```javascript
// sampleSize - 随机取 n 个元素
function sampleSize(collection, n = 1) {
  n = toInteger(n)
  const array = isArrayLike(collection)
    ? copyArray(collection)
    : values(collection)
  const length = array.length
  
  if (n < 0) {
    n = 0
  } else if (n > length) {
    n = length
  }
  
  // 使用部分 Fisher-Yates 洗牌
  let index = -1
  while (++index < n) {
    const rand = index + Math.floor(Math.random() * (length - index))
    const value = array[rand]
    array[rand] = array[index]
    array[index] = value
  }
  return array.slice(0, n)
}
```

#### shuffle
```javascript
// shuffle - 打乱数组
function shuffle(collection) {
  return sampleSize(collection, Infinity)
}
```

### Fisher-Yates 洗牌算法
```javascript
// 标准 Fisher-Yates 算法
function fisherYatesShuffle(array) {
  let currentIndex = array.length
  let randomIndex
  
  // 从后向前遍历
  while (currentIndex !== 0) {
    // 随机选择一个剩余元素
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--
    
    // 与当前元素交换
    [array[currentIndex], array[randomIndex]] = 
      [array[randomIndex], array[currentIndex]]
  }
  
  return array
}
```

### 使用示例
```javascript
// sample - 随机取一个
_.sample([1, 2, 3, 4])
// => 2 (随机结果)

// sample 对象
_.sample({ a: 1, b: 2, c: 3 })
// => 2 (随机一个值)

// sampleSize - 随机取多个
_.sampleSize([1, 2, 3, 4], 2)
// => [3, 1] (随机两个)

// sampleSize 超出长度
_.sampleSize([1, 2, 3], 5)
// => [2, 3, 1] (最多返回全部)

// shuffle - 打乱
_.shuffle([1, 2, 3, 4])
// => [4, 1, 3, 2] (随机顺序)

// shuffle 对象（返回值数组）
_.shuffle({ a: 1, b: 2, c: 3 })
// => [2, 1, 3]
```

### 算法分析
| 方法 | 时间复杂度 | 空间复杂度 |
|------|----------|----------|
| sample | O(1) | O(1) |
| sampleSize(n) | O(n) | O(n) |
| shuffle | O(n) | O(n) |

## 4. 写作要求

### 开篇方式
从"如何从数组中随机取样"引入

### 结构组织
```
1. 随机采样概述（300字）
   - 应用场景
   - 三种方法的关系
   
2. sample 源码解析（300字）
   - 随机索引生成
   - 对象处理
   
3. sampleSize 源码解析（400字）
   - 部分洗牌优化
   - n 值边界处理
   
4. shuffle 源码解析（300字）
   - 调用 sampleSize
   - 完全洗牌
   
5. Fisher-Yates 算法详解（500字）
   - 算法原理
   - 均匀性证明
   - 为什么是 O(n)
   
6. 小结
```

### 代码示例
- 各方法基本用法
- 边界情况处理
- Fisher-Yates 算法演示

### 图表需求
- Fisher-Yates 洗牌过程图
- 算法复杂度对比表

## 5. 技术细节

### 源码参考
- `sample.js`
- `sampleSize.js`
- `shuffle.js`
- `.internal/copyArray.js`
- `values.js`

### 实现要点
- sample 使用 Math.floor(Math.random() * length) 生成随机索引
- sampleSize 使用部分 Fisher-Yates，只洗牌前 n 个
- shuffle = sampleSize(collection, Infinity)
- 对对象调用 values() 转换为数组

### 常见问题
- Q: shuffle 是原地修改还是返回新数组？
- A: 返回新数组，不修改原集合

- Q: Fisher-Yates 为什么能保证均匀？
- A: 每个元素有相等的概率出现在任意位置

## 6. 风格指导

### 语气语调
算法讲解，注重原理

### 类比方向
- 将 shuffle 比作"洗牌"
- 将 sampleSize 比作"抽签"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
