# 章节写作指导：集合遍历

## 1. 章节信息
- **章节标题**: 集合遍历：forEach 与 forEachRight
- **文件名**: collection/foreach.md
- **所属部分**: 第四部分 - 集合方法
- **章节序号**: 19
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Lodash forEach 与原生 forEach 的区别
- 掌握 forEachRight 的逆序遍历机制
- 了解遍历中断机制的实现

### 技能目标
- 能够正确使用 forEach 遍历数组和对象
- 理解返回 false 中断遍历的原理

## 3. 内容要点

### 核心函数

#### forEach
```javascript
function forEach(collection, iteratee) {
  const func = isArray(collection) ? arrayEach : baseEach
  return func(collection, iteratee)
}

// arrayEach - 数组遍历
function arrayEach(array, iteratee) {
  let index = -1
  const length = array == null ? 0 : array.length
  
  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break
    }
  }
  return array
}
```

#### forEachRight
```javascript
function forEachRight(collection, iteratee) {
  const func = isArray(collection) ? arrayEachRight : baseEachRight
  return func(collection, iteratee)
}

// arrayEachRight - 数组逆序遍历
function arrayEachRight(array, iteratee) {
  let length = array == null ? 0 : array.length
  
  while (length--) {
    if (iteratee(array[length], length, array) === false) {
      break
    }
  }
  return array
}
```

### 使用示例
```javascript
// 遍历数组
_.forEach([1, 2, 3], value => {
  console.log(value)
})
// => 1, 2, 3

// 遍历对象
_.forEach({ a: 1, b: 2 }, (value, key) => {
  console.log(key, value)
})
// => 'a' 1, 'b' 2

// 中断遍历
_.forEach([1, 2, 3, 4, 5], value => {
  if (value > 3) return false // 中断
  console.log(value)
})
// => 1, 2, 3

// 逆序遍历
_.forEachRight([1, 2, 3], value => {
  console.log(value)
})
// => 3, 2, 1
```

### 与原生 forEach 的区别
| 特性 | 原生 forEach | Lodash forEach |
|------|-------------|----------------|
| 遍历对象 | 不支持 | 支持 |
| 中断遍历 | 不能 | return false |
| 返回值 | undefined | 原集合 |
| 逆序遍历 | 不支持 | forEachRight |

## 4. 写作要求

### 开篇方式
从原生 forEach 的局限性引入 Lodash 版本的增强功能

### 结构组织
```
1. forEach 概述（300字）
   - 与原生的区别
   - 主要增强点
   
2. forEach 源码解析（400字）
   - 数组路径：arrayEach
   - 对象路径：baseEach
   
3. 中断机制（300字）
   - return false 的实现
   - 为什么原生不支持
   
4. forEachRight 源码解析（300字）
   - 逆序遍历的实现
   
5. 实际应用场景（200字）

6. 小结
```

### 代码示例
- 基本用法对比
- 对象遍历示例
- 中断遍历示例
- forEachRight 示例

### 图表需求
- 与原生 forEach 对比表

## 5. 技术细节

### 源码参考
- `forEach.js`
- `forEachRight.js`
- `.internal/arrayEach.js`
- `.internal/arrayEachRight.js`
- `.internal/baseEach.js`
- `.internal/baseEachRight.js`

### 实现要点
- isArray 判断决定使用数组还是通用遍历
- 返回 false 严格比较（=== false）
- 返回原集合支持链式调用

### 常见问题
- Q: 为什么 Lodash forEach 能遍历对象？
- A: 内部使用 baseEach，对对象使用 for...in 遍历

## 6. 风格指导

### 语气语调
实用导向，突出与原生的区别

### 类比方向
- 将 forEach 比作"依次访问每个房间"
- 将中断比作"提前退出"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
