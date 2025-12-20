# 章节写作指导：数值类型处理

## 1. 章节信息
- **章节标题**: 数值类型处理：toNumber、toInteger、toSafeInteger
- **文件名**: number/number-convert.md
- **所属部分**: 第八部分 - 数学与数值方法
- **章节序号**: 50
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解数值类型转换的规则
- 掌握 toInteger 和 toSafeInteger 的区别
- 了解 JavaScript 安全整数的概念

### 技能目标
- 能够正确选择数值转换方法
- 理解各种边界值的处理

## 3. 内容要点

### 核心函数

#### toNumber
```javascript
function toNumber(value) {
  // 已经是数字
  if (typeof value === 'number') {
    return value
  }
  
  // Symbol
  if (isSymbol(value)) {
    return NaN
  }
  
  // 对象
  if (isObject(value)) {
    const other = typeof value.valueOf === 'function' ? value.valueOf() : value
    value = isObject(other) ? `${other}` : other
  }
  
  // 非字符串
  if (typeof value !== 'string') {
    return value === 0 ? value : +value
  }
  
  // 去除空白
  value = value.trim()
  
  // 处理二进制/八进制字面量
  const isBinary = /^0b[01]+$/i.test(value)
  const isOctal = /^0o[0-7]+$/i.test(value)
  
  if (isBinary || isOctal) {
    return parseInt(value.slice(2), isBinary ? 2 : 8)
  }
  
  // 处理十六进制
  const isHex = /^[-+]?0x[0-9a-f]+$/i.test(value)
  if (isHex) {
    return NaN  // 有符号的十六进制返回 NaN
  }
  
  return +value
}
```

#### toInteger
```javascript
function toInteger(value) {
  const result = toFinite(value)
  const remainder = result % 1
  
  return remainder ? result - remainder : result
}
```

#### toFinite
```javascript
const INFINITY = 1 / 0
const MAX_INTEGER = 1.7976931348623157e+308

function toFinite(value) {
  if (!value) {
    return value === 0 ? value : 0
  }
  
  value = toNumber(value)
  
  if (value === INFINITY || value === -INFINITY) {
    const sign = value < 0 ? -1 : 1
    return sign * MAX_INTEGER
  }
  
  return value === value ? value : 0  // NaN 返回 0
}
```

#### toSafeInteger
```javascript
const MAX_SAFE_INTEGER = 9007199254740991  // 2^53 - 1

function toSafeInteger(value) {
  return clamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER)
}
```

### 使用示例
```javascript
// toNumber
_.toNumber(3.2)         // => 3.2
_.toNumber('3.2')       // => 3.2
_.toNumber('0b101')     // => 5 (二进制)
_.toNumber('0o17')      // => 15 (八进制)
_.toNumber(Number.MIN_VALUE)  // => 5e-324
_.toNumber(Infinity)    // => Infinity
_.toNumber(Symbol())    // => NaN

// toInteger
_.toInteger(3.2)        // => 3
_.toInteger('3.2')      // => 3
_.toInteger(Number.MIN_VALUE)  // => 0
_.toInteger(Infinity)   // => 1.7976931348623157e+308

// toFinite
_.toFinite(3.2)         // => 3.2
_.toFinite(Infinity)    // => 1.7976931348623157e+308
_.toFinite(NaN)         // => 0

// toSafeInteger
_.toSafeInteger(3.2)    // => 3
_.toSafeInteger(Infinity)       // => 9007199254740991
_.toSafeInteger(-Infinity)      // => -9007199254740991
_.toSafeInteger(Number.MAX_VALUE)  // => 9007199254740991
```

### 转换规则对比
| 输入 | toNumber | toInteger | toFinite | toSafeInteger |
|------|----------|-----------|----------|---------------|
| 3.2 | 3.2 | 3 | 3.2 | 3 |
| '3.2' | 3.2 | 3 | 3.2 | 3 |
| Infinity | Infinity | MAX_INTEGER | MAX_INTEGER | MAX_SAFE |
| NaN | NaN | 0 | 0 | 0 |

## 4. 写作要求

### 开篇方式
从 JavaScript 数值类型的特殊性引入

### 结构组织
```
1. 数值转换概述（300字）
   - JavaScript 数值类型
   - 转换方法的必要性
   
2. toNumber 源码解析（500字）
   - 各种输入类型处理
   - 进制转换
   
3. toInteger 源码解析（300字）
   - 去除小数部分
   - 基于 toFinite
   
4. toFinite 源码解析（300字）
   - 无穷大处理
   - NaN 处理
   
5. toSafeInteger 源码解析（300字）
   - 安全整数范围
   - 使用 clamp 限制
   
6. 小结
```

### 代码示例
- 各方法基本用法
- 边界值处理
- 进制转换

### 图表需求
- 转换规则对比表
- JavaScript 数值范围图

## 5. 技术细节

### 源码参考
- `toNumber.js`
- `toInteger.js`
- `toFinite.js`
- `toSafeInteger.js`

### 实现要点
- toNumber 处理二进制、八进制字面量
- toInteger 使用 % 1 去除小数
- toFinite 将无穷大映射到最大值
- toSafeInteger 使用 clamp 限制范围

### 常见问题
- Q: 什么是安全整数？
- A: -2^53+1 到 2^53-1 范围内的整数，超出会丢失精度

- Q: toInteger 和 parseInt 有什么区别？
- A: toInteger 只去除小数，parseInt 还会解析字符串

## 6. 风格指导

### 语气语调
深入讲解，强调边界行为

### 类比方向
- 将安全整数比作"精确刻度"
- 超出范围比作"刻度不准"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
