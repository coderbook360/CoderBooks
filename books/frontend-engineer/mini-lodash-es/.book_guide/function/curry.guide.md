# 章节写作指导：柯里化

## 1. 章节信息
- **章节标题**: 柯里化：curry 与 curryRight
- **文件名**: function/curry.md
- **所属部分**: 第六部分 - 函数方法
- **章节序号**: 40
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解柯里化的概念和数学基础
- 掌握 Lodash curry 的灵活实现
- 了解 arity 和占位符的作用

### 技能目标
- 能够使用 curry 创建可复用的函数
- 理解 Lodash curry 与传统 curry 的区别

## 3. 内容要点

### 核心函数

#### curry
```javascript
function curry(func, arity) {
  arity = arity === undefined ? func.length : toInteger(arity)
  return createWrap(func, WRAP_CURRY_FLAG, undefined, undefined, undefined, arity)
}

// 简化实现
function currySimple(func, arity = func.length) {
  return function curried(...args) {
    if (args.length >= arity) {
      return func.apply(this, args)
    }
    return function(...moreArgs) {
      return curried.apply(this, [...args, ...moreArgs])
    }
  }
}
```

#### curryRight
```javascript
function curryRight(func, arity) {
  arity = arity === undefined ? func.length : toInteger(arity)
  return createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined, undefined, undefined, arity)
}
```

### Lodash curry 的灵活性
```javascript
// 传统柯里化：每次只能传一个参数
const traditionalCurry = a => b => c => a + b + c
traditionalCurry(1)(2)(3) // => 6

// Lodash curry：可以传任意数量的参数
const add = _.curry((a, b, c) => a + b + c)
add(1)(2)(3)     // => 6
add(1, 2)(3)     // => 6
add(1)(2, 3)     // => 6
add(1, 2, 3)     // => 6
```

### 使用示例
```javascript
// 基本用法
const add = _.curry((a, b, c) => a + b + c)

const add1 = add(1)
const add1and2 = add1(2)
add1and2(3) // => 6

// 使用占位符
const _ = curry.placeholder
const addTo10 = add(_, _, 10)
addTo10(1, 2)  // => 13 (1 + 2 + 10)

// curryRight - 从右到左填充
const greet = _.curryRight((greeting, name, punctuation) => 
  `${greeting}, ${name}${punctuation}`
)
const greetJohn = greet('!')('John')
greetJohn('Hello') // => 'Hello, John!'

// 指定 arity
const fn = _.curry((a, b, c = 0) => a + b + c, 2)
fn(1)(2)    // => 3 (只需要2个参数)
fn(1, 2, 5) // => 8 (额外参数仍然传递)
```

### curry vs partial
| 特性 | curry | partial |
|------|-------|---------|
| 调用方式 | 可多次调用 | 一次性预设 |
| 参数顺序 | 从左到右（或右到左） | 可用占位符任意位置 |
| 返回值 | 累积参数的函数 | 固定参数的函数 |
| 使用场景 | 函数组合 | 参数预设 |

## 4. 写作要求

### 开篇方式
从 "什么是柯里化" 的概念引入

### 结构组织
```
1. 柯里化概念（500字）
   - 数学定义
   - 在编程中的应用
   - 传统 vs Lodash 实现
   
2. curry 源码解析（500字）
   - 核心实现逻辑
   - 参数累积机制
   - arity 处理
   
3. curryRight 源码解析（300字）
   - 参数填充方向
   
4. 占位符机制（400字）
   - 如何使用
   - 实现原理
   
5. curry vs partial（300字）

6. 实际应用场景（300字）
   - 函数组合
   - 配置工厂
   
7. 小结
```

### 代码示例
- 传统 vs Lodash curry 对比
- 基本用法
- 占位符使用
- 实际应用

### 图表需求
- 参数累积过程图
- curry vs partial 对比表

## 5. 技术细节

### 源码参考
- `curry.js`
- `curryRight.js`
- `.internal/createWrap.js`
- `.internal/createCurry.js`

### 实现要点
- Lodash curry 支持一次传多个参数（更灵活）
- 使用 func.length 获取默认 arity
- 支持占位符调整参数位置
- curryRight 从右到左填充参数

### 常见问题
- Q: curry 和传统柯里化有什么区别？
- A: Lodash curry 更灵活，可以一次传多个参数

- Q: arity 参数有什么用？
- A: 指定需要多少个参数才执行原函数

## 6. 风格指导

### 语气语调
深入讲解，结合数学概念

### 类比方向
- 将柯里化比作"分期付款"
- 将 arity 比作"所需金额"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
