# 章节写作指导：数值类型判断

## 1. 章节信息
- **章节标题**: 数值类型判断：isNumber、isNaN、isFinite
- **文件名**: lang/number-checks.md
- **所属部分**: 第二部分 - 类型判断方法
- **章节序号**: 7
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 JavaScript 数值类型的特殊性
- 掌握 isNumber、isNaN、isFinite、isInteger 的区别
- 了解 Lodash 与原生方法的差异

### 技能目标
- 能够正确判断各种数值类型
- 能够处理 NaN、Infinity 等特殊值

## 3. 内容要点

### 核心函数

#### isNumber
```javascript
function isNumber(value) {
  return typeof value === 'number' ||
    (isObjectLike(value) && getTag(value) === '[object Number]')
}
```

#### isNaN（注意：与全局 isNaN 不同）
```javascript
function isNaN(value) {
  // 只有 NaN 满足 value !== value
  return isNumber(value) && value !== value
}
```

#### isFinite
```javascript
function isFinite(value) {
  return typeof value === 'number' && nativeIsFinite(value)
}
```

#### isInteger
```javascript
function isInteger(value) {
  return typeof value === 'number' && value === Math.trunc(value)
}
```

### 关键对比
| 输入值 | isNumber | _.isNaN | global isNaN | isFinite | isInteger |
|-------|----------|---------|--------------|----------|-----------|
| `3` | true | false | false | true | true |
| `3.14` | true | false | false | true | false |
| `NaN` | true | true | true | false | false |
| `Infinity` | true | false | false | false | false |
| `'3'` | false | false | true | false | false |
| `new Number(3)` | true | false | false | true | true |

## 4. 写作要求

### 开篇方式
以 "NaN !== NaN 这个反直觉的事实" 引入

### 结构组织
```
1. JavaScript 数值类型特点（300字）
   - 双精度浮点数
   - 特殊值：NaN、Infinity、-0
   
2. isNumber 源码解析（400字）
   - 原始值与包装对象
   
3. isNaN 源码解析（500字）
   - Lodash isNaN vs 全局 isNaN vs Number.isNaN
   - NaN 的自反性问题
   
4. isFinite 源码解析（300字）
   - Infinity 的判断
   
5. isInteger 与 isSafeInteger（400字）
   - 整数判断
   - 安全整数范围
   
6. 小结与最佳实践
```

### 代码示例
- 各方法的完整实现
- 三种 isNaN 的对比测试
- 边界值测试（-0、Infinity、MAX_VALUE）

### 图表需求
- 数值判断方法对比表
- JavaScript 数值特殊值分类图

## 5. 技术细节

### 源码参考
- `isNumber.js`
- `isNaN.js`
- `isFinite.js`
- `isInteger.js`
- `isSafeInteger.js`

### 实现要点
- isNumber 需要处理 Number 包装对象
- isNaN 使用 value !== value 技巧判断 NaN
- isFinite 需要先判断 typeof 再调用原生 isFinite

### 常见问题
- Q: 为什么 _.isNaN(undefined) 返回 false，而全局 isNaN(undefined) 返回 true？
- A: Lodash 的 isNaN 只对真正的 NaN 值返回 true，更加精确

## 6. 风格指导

### 语气语调
对比分析为主，强调与原生方法的差异

### 类比方向
- 将 NaN 比作 "数学运算中的无效结果标记"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
