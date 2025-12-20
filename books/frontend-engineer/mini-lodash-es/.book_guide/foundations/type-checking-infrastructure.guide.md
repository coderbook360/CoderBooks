# 章节写作指导：类型判断基础设施

## 1. 章节信息
- **章节标题**: 类型判断基础设施
- **文件名**: foundations/type-checking-infrastructure.md
- **所属部分**: 第一部分 - 基础架构
- **章节序号**: 3
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 JavaScript 类型系统的复杂性
- 掌握 Lodash 类型判断的核心机制
- 了解 Object.prototype.toString 的工作原理

### 技能目标
- 能够实现可靠的类型判断函数
- 能够处理跨 Realm 类型判断问题
- 能够选择合适的类型判断方法

## 3. 内容要点

### 核心概念
- **typeof 的局限性**: 无法区分 null、数组、普通对象
- **instanceof 的局限性**: 跨 iframe 失效
- **Object.prototype.toString**: 最可靠的类型标签获取方式
- **Symbol.toStringTag**: ES6 自定义类型标签

### 关键内部函数
| 函数名 | 作用 | 返回值示例 |
|--------|------|-----------|
| getTag | 获取类型标签 | "[object Array]" |
| baseGetTag | 基础类型标签 | "[object Object]" |
| isObjectLike | 类对象判断 | true/false |
| isArrayLike | 类数组判断 | true/false |

### 类型标签对照表
```javascript
Object.prototype.toString.call([])           // "[object Array]"
Object.prototype.toString.call({})           // "[object Object]"
Object.prototype.toString.call(null)         // "[object Null]"
Object.prototype.toString.call(undefined)    // "[object Undefined]"
Object.prototype.toString.call(new Map())    // "[object Map]"
Object.prototype.toString.call(new Set())    // "[object Set]"
```

## 4. 写作要求

### 开篇方式
以 "typeof null === 'object' 这个历史遗留问题" 引入，说明可靠类型判断的必要性

### 结构组织
```
1. JavaScript 类型判断的挑战（400字）
   - typeof 的问题
   - instanceof 的问题
   
2. Object.prototype.toString 原理（500字）
   - 工作机制
   - Symbol.toStringTag 的影响
   
3. Lodash 类型判断基础设施（600字）
   - getTag 函数实现
   - isObjectLike 函数实现
   - isArrayLike 函数实现
   
4. 跨 Realm 类型判断（300字）
   - 问题场景
   - 解决方案
   
5. 小结
```

### 代码示例
- 展示 typeof 的各种返回值
- 展示 Object.prototype.toString 的使用
- 实现 getTag 函数
- 实现 isArrayLike 函数

### 图表需求
- JavaScript 类型判断方法对比表
- 类型标签完整对照表

## 5. 技术细节

### 源码参考
- `.internal/getTag.js`
- `.internal/baseGetTag.js`
- `isObjectLike.js`
- `isArrayLike.js`

### 实现要点
```javascript
// getTag 核心实现
function getTag(value) {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]'
  }
  return Object.prototype.toString.call(value)
}

// isArrayLike 核心实现
function isArrayLike(value) {
  return value != null && typeof value !== 'function' && isLength(value.length)
}
```

### 常见问题
- Q: 为什么不直接用 Array.isArray？
- A: Lodash 需要处理类数组对象（arguments, NodeList），不只是真正的数组

## 6. 风格指导

### 语气语调
循循善诱，从问题出发逐步引出解决方案

### 类比方向
- 将类型判断比作 "身份验证系统"
- 将类型标签比作 "身份证号"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
