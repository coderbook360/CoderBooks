# 章节写作指导：基础类型判断

## 1. 章节信息
- **章节标题**: 基础类型判断：isArray、isObject、isFunction
- **文件名**: lang/basic-type-checks.md
- **所属部分**: 第二部分 - 类型判断方法
- **章节序号**: 5
- **预计阅读时间**: 20分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 isArray、isObject、isFunction 的实现原理
- 掌握各方法的边界情况处理
- 了解 isPlainObject、isObjectLike 等扩展方法

### 技能目标
- 能够手写可靠的类型判断函数
- 能够根据场景选择正确的判断方法

## 3. 内容要点

### 核心函数

#### isArray
```javascript
// Lodash 直接使用原生方法
const isArray = Array.isArray
```

#### isObject
```javascript
function isObject(value) {
  const type = typeof value
  return value != null && (type === 'object' || type === 'function')
}
```

#### isFunction
```javascript
function isFunction(value) {
  return typeof value === 'function'
}
```

### 关键知识点
| 方法 | 返回 true 的情况 | 返回 false 的情况 |
|------|-----------------|------------------|
| isArray | `[]`, `new Array()` | `{}`, `arguments`, `NodeList` |
| isObject | `{}`, `[]`, `function(){}`, `new Date()` | `null`, `undefined`, 原始值 |
| isFunction | 函数、类、async函数、生成器 | 普通对象、数组 |
| isPlainObject | `{}`, `Object.create(null)` | `[]`, `new Date()`, 类实例 |

### 易混淆概念
- **isObject vs isPlainObject**: isObject 范围更广，包括数组和函数
- **isObjectLike vs isObject**: isObjectLike 不包括函数

## 4. 写作要求

### 开篇方式
以 "typeof [] === 'object' 让多少人踩过坑" 引入

### 结构组织
```
1. isArray 源码解析（400字）
   - Array.isArray 的可靠性
   - 为什么不用 instanceof
   
2. isObject 源码解析（500字）
   - 实现逻辑分析
   - null 的特殊处理
   
3. isFunction 源码解析（400字）
   - typeof 的可靠性
   - 特殊函数类型处理
   
4. 扩展方法（400字）
   - isPlainObject
   - isObjectLike
   - isArrayLike
   
5. 对比与选择指南（300字）

6. 手写实现与练习
```

### 代码示例
- 各方法的完整源码实现
- 丰富的测试用例覆盖边界情况
- 手写简化版实现

### 图表需求
- 类型判断方法覆盖范围韦恩图
- 判断结果对照表

## 5. 技术细节

### 源码参考
- `isArray.js`
- `isObject.js`
- `isFunction.js`
- `isPlainObject.js`
- `isObjectLike.js`

### 实现要点
- isArray 直接使用 Array.isArray（ES5+ 原生支持）
- isObject 需要排除 null（typeof null === 'object' 的历史问题）
- isPlainObject 需要检查 prototype 链

### 常见问题
- Q: 为什么 isObject(null) 返回 false？
- A: 虽然 typeof null === 'object'，但 Lodash 认为 null 不是有意义的对象

## 6. 风格指导

### 语气语调
深入浅出，源码分析与实用建议相结合

### 类比方向
- 将类型判断比作 "门卫检查身份"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
