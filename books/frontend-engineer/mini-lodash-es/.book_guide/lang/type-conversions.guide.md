# 章节写作指导：类型转换

## 1. 章节信息
- **章节标题**: 类型转换：toArray、toString、toNumber
- **文件名**: lang/type-conversions.md
- **所属部分**: 第二部分 - 类型判断方法
- **章节序号**: 9
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Lodash to* 系列方法的设计理念
- 掌握各类型转换的具体规则
- 了解与 JavaScript 强制类型转换的差异

### 技能目标
- 能够使用正确的类型转换方法
- 能够理解转换规则的边界情况

## 3. 内容要点

### 核心函数

#### toArray
```javascript
function toArray(value) {
  if (!value) return []
  if (isArrayLike(value)) return copyArray(value)
  if (isString(value)) return stringToArray(value)
  if (isMap(value) || isSet(value)) return [...value]
  return values(value)
}
```

#### toString
```javascript
function toString(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(toString).join(',')
  const result = String(value)
  return (result === '0' && (1 / value) === -Infinity) ? '-0' : result
}
```

#### toNumber
```javascript
function toNumber(value) {
  if (typeof value === 'number') return value
  if (isSymbol(value)) return NaN
  if (isObject(value)) {
    const other = typeof value.valueOf === 'function' ? value.valueOf() : value
    value = isObject(other) ? other + '' : other
  }
  if (typeof value !== 'string') return value === 0 ? value : +value
  value = value.trim()
  // 处理二进制、八进制、十六进制
  return isBinary.test(value) 
    ? parseInt(value.slice(2), 2)
    : isOctal.test(value) ? parseInt(value.slice(2), 8) : +value
}
```

### 转换规则对照表
| 输入 | toArray | toString | toNumber | toInteger |
|------|---------|----------|----------|-----------|
| `null` | `[]` | `''` | `0`? | `0` |
| `undefined` | `[]` | `''` | `NaN` | `0` |
| `[1,2,3]` | `[1,2,3]` | `'1,2,3'` | `NaN` | `NaN` |
| `'123'` | `['1','2','3']` | `'123'` | `123` | `123` |
| `3.7` | - | `'3.7'` | `3.7` | `3` |
| `{a:1}` | `[1]` | `'[object Object]'` | `NaN` | `NaN` |

## 4. 写作要求

### 开篇方式
以 "JavaScript 的隐式类型转换是双刃剑" 引入，说明显式转换的必要性

### 结构组织
```
1. to* 方法设计理念（300字）
   - 显式转换 vs 隐式转换
   - 安全转换的重要性
   
2. toArray 源码解析（500字）
   - 字符串转数组
   - 类数组转数组
   - 对象转数组（取值）
   
3. toString 源码解析（500字）
   - 特殊值处理
   - -0 的保留
   - 数组转字符串
   
4. toNumber 源码解析（500字）
   - 字符串解析规则
   - 二进制、八进制、十六进制支持
   - Symbol 处理
   
5. toInteger、toFinite、toSafeInteger（400字）
   - 整数转换
   - 有限数转换
   - 安全整数转换
   
6. toLength、toPath（300字）
```

### 代码示例
- 各转换方法的完整实现
- 边界值测试用例
- 与原生转换方法的对比

### 图表需求
- to* 方法转换规则总览表
- 数值转换流程图

## 5. 技术细节

### 源码参考
- `toArray.js`
- `toString.js`
- `toNumber.js`
- `toInteger.js`
- `toFinite.js`
- `toSafeInteger.js`
- `toLength.js`
- `toPath.js`
- `.internal/stringToArray.js`

### 实现要点
- toString 特别处理 -0（保留符号）
- toNumber 支持各种进制字符串
- toInteger 使用 Math.trunc 截断小数部分
- toPath 将路径字符串转换为属性数组

### 常见问题
- Q: toNumber 和 Number() 有什么区别？
- A: toNumber 支持二进制/八进制字符串，并更好地处理对象转换

## 6. 风格指导

### 语气语调
实用导向，强调转换规则的记忆和应用

### 类比方向
- 将类型转换比作 "语言翻译"
- 将转换规则比作 "翻译词典"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
