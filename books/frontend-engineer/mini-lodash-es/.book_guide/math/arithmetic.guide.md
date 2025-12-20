# 章节写作指导：数值运算

## 1. 章节信息
- **章节标题**: 数值运算：add、subtract、multiply、divide
- **文件名**: math/arithmetic.md
- **所属部分**: 第八部分 - 数学与数值方法
- **章节序号**: 49
- **预计阅读时间**: 12分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Lodash 数值运算方法的设计意图
- 掌握四则运算方法的实现
- 了解 ceil、floor、round 的扩展功能

### 技能目标
- 能够在函数式编程中使用这些方法
- 理解精度参数的作用

## 3. 内容要点

### 核心函数

#### 四则运算
```javascript
// add - 加法
function add(augend, addend) {
  return +augend + +addend
}

// subtract - 减法
function subtract(minuend, subtrahend) {
  return +minuend - +subtrahend
}

// multiply - 乘法
function multiply(multiplier, multiplicand) {
  return +multiplier * +multiplicand
}

// divide - 除法
function divide(dividend, divisor) {
  return +dividend / +divisor
}
```

#### 取整方法
```javascript
// ceil - 向上取整（支持精度）
function ceil(number, precision = 0) {
  return createRound('ceil')(number, precision)
}

// floor - 向下取整（支持精度）
function floor(number, precision = 0) {
  return createRound('floor')(number, precision)
}

// round - 四舍五入（支持精度）
function round(number, precision = 0) {
  return createRound('round')(number, precision)
}

// createRound - 工厂函数
function createRound(methodName) {
  const func = Math[methodName]
  return (number, precision) => {
    precision = precision == null ? 0 : Math.min(+precision, 292)
    if (precision) {
      // 使用指数运算避免浮点数问题
      let [value, exp] = `${number}e`.split('e')
      const result = func(+`${value}e${+exp + precision}`)
      ;[value, exp] = `${result}e`.split('e')
      return +`${value}e${+exp - precision}`
    }
    return func(number)
  }
}
```

### 使用示例
```javascript
// 基本四则运算
_.add(6, 4)        // => 10
_.subtract(6, 4)   // => 2
_.multiply(6, 4)   // => 24
_.divide(6, 4)     // => 1.5

// 在函数式编程中的应用
const numbers = [1, 2, 3, 4, 5]
_.reduce(numbers, _.add, 0)  // => 15

// 配合 partial 使用
const add10 = _.partial(_.add, 10)
add10(5)  // => 15

// 取整方法
_.ceil(4.006)      // => 5
_.ceil(6.004, 2)   // => 6.01
_.ceil(6040, -2)   // => 6100

_.floor(4.006)     // => 4
_.floor(0.046, 2)  // => 0.04
_.floor(4060, -2)  // => 4000

_.round(4.006)     // => 4
_.round(4.006, 2)  // => 4.01
_.round(4060, -2)  // => 4100
```

### 精度参数说明
| precision | 说明 | 示例 |
|-----------|------|------|
| 正数 | 保留小数位数 | round(4.006, 2) => 4.01 |
| 0 | 取整到整数 | round(4.006) => 4 |
| 负数 | 取整到指定位 | round(4060, -2) => 4100 |

### 为什么需要这些简单方法
```javascript
// 场景1：函数式编程
_.reduce([1, 2, 3], _.add)  // 比自己写回调更简洁

// 场景2：配合 partial/curry
const double = _.partial(_.multiply, 2)
const half = _.partial(_.divide, _, 2)

// 场景3：作为回调传递
[1, 2, 3].reduce(_.add)  // 直接传递，无需包装
```

## 4. 写作要求

### 开篇方式
从"为什么需要封装简单的运算"引入

### 结构组织
```
1. 数值运算概述（300字）
   - 为什么封装简单运算
   - 函数式编程的需求
   
2. 四则运算源码解析（300字）
   - 实现简单但有用
   - 类型转换
   
3. 取整方法源码解析（500字）
   - createRound 工厂
   - 精度处理
   - 浮点数问题的解决
   
4. 实际应用场景（400字）
   - 函数式编程
   - partial/curry 配合
   
5. 小结
```

### 代码示例
- 四则运算基本用法
- 取整方法各种精度
- 函数式编程应用

### 图表需求
- 精度参数说明表

## 5. 技术细节

### 源码参考
- `add.js`, `subtract.js`, `multiply.js`, `divide.js`
- `ceil.js`, `floor.js`, `round.js`
- `.internal/createRound.js`

### 实现要点
- 四则运算使用 + 进行类型转换
- 取整使用指数表示法避免浮点数精度问题
- precision 最大值限制为 292
- 负精度用于处理大数的舍入

### 常见问题
- Q: 为什么不直接用 Math.round？
- A: Lodash 版本支持精度参数

- Q: 为什么需要 add 这样简单的方法？
- A: 在函数式编程中作为回调使用

## 6. 风格指导

### 语气语调
解释设计意图，强调函数式应用

### 类比方向
- 将这些方法比作"积木块"
- 组合使用构建复杂计算

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
