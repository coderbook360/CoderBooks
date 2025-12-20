# 章节写作指导：空值与边界判断

## 1. 章节信息
- **章节标题**: 空值与边界判断：isNil、isEmpty、isEqual
- **文件名**: lang/nil-empty-equal.md
- **所属部分**: 第二部分 - 类型判断方法
- **章节序号**: 6
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 isNil、isNull、isUndefined 的区别
- 掌握 isEmpty 的判断逻辑和边界情况
- 深入理解 isEqual 的深度比较算法

### 技能目标
- 能够正确使用空值判断方法
- 能够实现深度比较函数

## 3. 内容要点

### 核心函数

#### isNil / isNull / isUndefined
```javascript
function isNil(value) {
  return value == null  // 同时匹配 null 和 undefined
}

function isNull(value) {
  return value === null
}

function isUndefined(value) {
  return value === undefined
}
```

#### isEmpty
```javascript
function isEmpty(value) {
  if (value == null) return true
  if (isArrayLike(value)) return !value.length
  if (isMap(value) || isSet(value)) return !value.size
  for (const key in value) {
    if (hasOwnProperty.call(value, key)) return false
  }
  return true
}
```

#### isEqual
```javascript
// 深度比较，处理循环引用、类型标签、特殊对象等
function isEqual(value, other) {
  return baseIsEqual(value, other)
}
```

### 关键知识点
| 输入值 | isNil | isEmpty | 说明 |
|-------|-------|---------|------|
| `null` | true | true | 空值 |
| `undefined` | true | true | 空值 |
| `''` | false | true | 空字符串 |
| `[]` | false | true | 空数组 |
| `{}` | false | true | 空对象 |
| `0` | false | true | 数字被视为空 |
| `false` | false | true | 布尔值被视为空 |

## 4. 写作要求

### 开篇方式
以 "null 和 undefined 之争" 引入，引出空值判断的复杂性

### 结构组织
```
1. 空值判断三兄弟（400字）
   - isNil vs isNull vs isUndefined
   - 使用场景对比
   
2. isEmpty 深度解析（600字）
   - 判断逻辑详解
   - 各类型的空值定义
   - 边界情况处理
   
3. isEqual 深度比较（800字）
   - 基本比较逻辑
   - 对象深度比较
   - 循环引用处理
   - 特殊对象处理（Date, RegExp, Map, Set）
   
4. isEqualWith 自定义比较（300字）

5. 手写实现与练习
```

### 代码示例
- 三个空值判断方法的完整实现
- isEmpty 的各种输入测试
- isEqual 的深度比较核心逻辑
- 循环引用场景的处理

### 图表需求
- isEmpty 判断流程图
- isEqual 比较算法流程图

## 5. 技术细节

### 源码参考
- `isNil.js`
- `isNull.js`
- `isUndefined.js`
- `isEmpty.js`
- `isEqual.js`
- `.internal/baseIsEqual.js`
- `.internal/equalArrays.js`
- `.internal/equalByTag.js`
- `.internal/equalObjects.js`

### 实现要点
- isEmpty 对数字和布尔值返回 true（争议点）
- isEqual 使用栈结构处理循环引用
- isEqual 需要按类型标签分发比较逻辑

### 常见问题
- Q: 为什么 isEmpty(0) 返回 true？
- A: Lodash 认为原始值没有 "长度" 或 "属性" 概念，所以视为空

## 6. 风格指导

### 语气语调
深入源码细节，注重边界情况的讨论

### 类比方向
- 将 isEqual 比作 "深度检查两个物体是否一模一样"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
