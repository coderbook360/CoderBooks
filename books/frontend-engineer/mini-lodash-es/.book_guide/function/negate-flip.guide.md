# 章节写作指导：函数行为修改

## 1. 章节信息
- **章节标题**: 函数行为修改：negate、flip、ary
- **文件名**: function/negate-flip.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 41
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解函数行为修改的设计理念
- 掌握 negate、flip、ary 的作用
- 了解 unary、rearg 等辅助方法

### 技能目标
- 能够使用这些方法快速修改函数行为
- 理解在函数组合中的应用

## 3. 内容要点

### 核心函数

#### negate
```javascript
// negate - 取反谓词函数
function negate(predicate) {
  if (typeof predicate !== 'function') {
    throw new TypeError('Expected a function')
  }
  return function(...args) {
    return !predicate.apply(this, args)
  }
}
```

#### flip
```javascript
// flip - 反转参数顺序
function flip(func) {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function')
  }
  return function(...args) {
    return func.apply(this, args.reverse())
  }
}
```

#### ary
```javascript
// ary - 限制参数数量
function ary(func, n) {
  n = n === undefined ? func.length : toInteger(n)
  return function(...args) {
    return func.apply(this, args.slice(0, n))
  }
}
```

#### unary
```javascript
// unary - 只接受一个参数
function unary(func) {
  return ary(func, 1)
}
```

#### rearg
```javascript
// rearg - 重排参数
function rearg(func, indexes) {
  return function(...args) {
    const reorderedArgs = indexes.map(index => args[index])
    return func.apply(this, reorderedArgs)
  }
}
```

### 使用示例
```javascript
// negate - 取反
const isEven = n => n % 2 === 0
const isOdd = _.negate(isEven)
isOdd(3) // => true

// 与 filter/reject 配合
_.filter([1, 2, 3, 4], isOdd)   // => [1, 3]
// 等价于
_.reject([1, 2, 3, 4], isEven)  // => [1, 3]

// flip - 反转参数
const subtract = (a, b) => a - b
const subtractFlipped = _.flip(subtract)
subtract(5, 3)        // => 2
subtractFlipped(5, 3) // => -2

// ary - 限制参数
['6', '8', '10'].map(parseInt)           // => [6, NaN, 2] 🐛
['6', '8', '10'].map(_.unary(parseInt))  // => [6, 8, 10] ✅

// rearg - 重排参数
const greet = (greeting, name, punctuation) => 
  `${greeting}, ${name}${punctuation}`
const greetReordered = _.rearg(greet, [2, 0, 1])
greetReordered('!', 'Hello', 'John') // => 'Hello, John!'
```

### 方法对比
| 方法 | 作用 | 使用场景 |
|------|------|---------|
| negate | 返回值取反 | 创建反向谓词 |
| flip | 参数顺序反转 | 适配不同参数顺序 |
| ary(n) | 只取前n个参数 | 防止意外参数 |
| unary | 只取1个参数 | parseInt 等场景 |
| rearg | 自定义参数顺序 | 适配不同 API |

## 4. 写作要求

### 开篇方式
从 "parseInt 在 map 中的陷阱" 引入

### 结构组织
```
1. 函数行为修改概述（300字）
   - 为什么需要修改函数行为
   - 方法分类
   
2. negate 源码解析（300字）
   - 返回值取反
   - 与 filter/reject 的关系
   
3. flip 源码解析（300字）
   - 参数反转
   - 使用场景
   
4. ary/unary 源码解析（400字）
   - 参数数量限制
   - parseInt 陷阱解决
   
5. rearg 源码解析（300字）
   - 参数重排
   
6. 小结
```

### 代码示例
- 各方法基本用法
- parseInt 陷阱
- 实际应用场景

### 图表需求
- 方法对比表
- 参数处理流程图

## 5. 技术细节

### 源码参考
- `negate.js`
- `flip.js`
- `ary.js`
- `unary.js`
- `rearg.js`

### 实现要点
- negate 使用 ! 取反返回值
- flip 使用 args.reverse()
- unary = ary(func, 1)
- 都保持正确的 this 绑定

### 常见问题
- Q: unary 有什么用？
- A: 最常见的是解决 parseInt 在 map 中的问题

- Q: flip 会影响原函数吗？
- A: 不会，返回新函数

## 6. 风格指导

### 语气语调
问题导向，突出实用场景

### 类比方向
- 将 negate 比作"是非颠倒"
- 将 flip 比作"左右互换"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
