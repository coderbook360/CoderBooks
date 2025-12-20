# 章节写作指导：深度克隆

## 1. 章节信息
- **章节标题**: 深度克隆：clone 与 cloneDeep
- **文件名**: lang/clone.md
- **所属部分**: 第二部分 - 类型判断方法
- **章节序号**: 8
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解浅拷贝与深拷贝的本质区别
- 掌握 clone 和 cloneDeep 的实现原理
- 了解循环引用的处理机制

### 技能目标
- 能够实现支持循环引用的深拷贝
- 能够处理各种特殊对象的克隆

## 3. 内容要点

### 核心函数

#### clone（浅拷贝）
```javascript
function clone(value) {
  return baseClone(value, CLONE_SYMBOLS_FLAG)
}
```

#### cloneDeep（深拷贝）
```javascript
function cloneDeep(value) {
  return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG)
}
```

### 克隆标志位
```javascript
const CLONE_DEEP_FLAG = 1      // 深拷贝
const CLONE_FLAT_FLAG = 2      // 展平原型链
const CLONE_SYMBOLS_FLAG = 4   // 复制 Symbol 键
```

### 需要特殊处理的类型
| 类型 | 克隆策略 |
|------|---------|
| 普通对象 | 创建新对象，复制属性 |
| 数组 | 创建新数组，复制元素 |
| Date | new Date(value.getTime()) |
| RegExp | new RegExp(source, flags) |
| Map | 创建新 Map，递归复制键值对 |
| Set | 创建新 Set，递归复制元素 |
| ArrayBuffer | slice(0) |
| TypedArray | new Constructor(buffer.slice(0)) |
| Symbol | Object(Symbol.prototype.valueOf.call(value)) |
| 函数 | 不克隆，直接返回引用 |

## 4. 写作要求

### 开篇方式
以 "JSON.parse(JSON.stringify(obj)) 的局限性" 引入

### 结构组织
```
1. 浅拷贝 vs 深拷贝（400字）
   - 概念区分
   - 常见问题
   
2. clone 源码解析（400字）
   - 浅拷贝逻辑
   - 标志位系统
   
3. cloneDeep 核心实现（800字）
   - baseClone 函数分析
   - 递归克隆逻辑
   
4. 循环引用处理（600字）
   - 问题场景
   - 使用栈结构避免无限递归
   
5. 特殊对象克隆（600字）
   - Date、RegExp
   - Map、Set
   - TypedArray、ArrayBuffer
   
6. cloneWith 与 cloneDeepWith（300字）

7. 手写深拷贝实现
```

### 代码示例
- baseClone 核心逻辑
- 循环引用检测代码
- 各类型克隆的具体实现
- 手写简化版 cloneDeep

### 图表需求
- 浅拷贝与深拷贝内存示意图
- baseClone 执行流程图

## 5. 技术细节

### 源码参考
- `clone.js`
- `cloneDeep.js`
- `cloneWith.js`
- `cloneDeepWith.js`
- `.internal/baseClone.js`
- `.internal/initCloneObject.js`
- `.internal/initCloneByTag.js`
- `.internal/copyArray.js`
- `.internal/copyObject.js`

### 实现要点
```javascript
function baseClone(value, bitmask, customizer, key, object, stack) {
  // 1. 自定义克隆处理
  // 2. 原始值直接返回
  // 3. 根据类型标签选择克隆策略
  // 4. 使用 stack 处理循环引用
  // 5. 递归克隆子属性
}
```

### 常见问题
- Q: 为什么 Lodash 不克隆函数？
- A: 函数是不可变的引用，克隆没有意义且可能破坏闭包

- Q: 如何处理原型链上的属性？
- A: 默认只克隆自有属性，CLONE_FLAT_FLAG 可以展平原型链

## 6. 风格指导

### 语气语调
技术深度较高，注重实现细节的讲解

### 类比方向
- 将深拷贝比作 "完全复制一棵树的所有枝叶"
- 将循环引用比作 "俄罗斯套娃的无限循环"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
