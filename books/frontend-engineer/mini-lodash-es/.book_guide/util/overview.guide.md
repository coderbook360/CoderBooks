# 章节写作指导：工具方法概览

## 1. 章节信息
- **章节标题**: 工具方法概览与设计
- **文件名**: util/overview.md
- **所属部分**: 第九部分 - 工具方法
- **章节序号**: 51
- **预计阅读时间**: 12分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Lodash 工具方法的设计理念
- 掌握工具方法的分类
- 了解 identity 和 constant 的核心作用

### 技能目标
- 能够正确使用各种工具方法
- 理解工具方法在函数式编程中的地位

## 3. 内容要点

### 核心概念

#### 工具方法分类
| 类别 | 方法 | 说明 |
|------|------|------|
| 函数工具 | identity, constant, noop | 函数式编程基础 |
| 迭代工具 | times, range, rangeRight | 迭代生成 |
| 比较工具 | eq, isEqual, matches | 值比较 |
| 路径工具 | property, propertyOf, method | 属性/方法访问 |
| 条件工具 | cond, conforms, stubTrue | 条件判断 |
| 其他 | uniqueId, defaultTo, attempt | 常用工具 |

### 核心基础方法

#### identity - 恒等函数
```javascript
// identity - 返回传入的第一个参数
function identity(value) {
  return value
}

// 用途：作为默认迭代器
_.map([1, 2, 3], _.identity)  // => [1, 2, 3]
_.filter([0, 1, false, 2, '', 3], _.identity)  // => [1, 2, 3]
```

#### constant - 常量函数
```javascript
// constant - 返回一个总是返回指定值的函数
function constant(value) {
  return function() {
    return value
  }
}

// 用途：提供默认值工厂
const getDefault = _.constant({ x: 0, y: 0 })
```

#### noop - 空操作
```javascript
// noop - 不做任何事，返回 undefined
function noop() {
  // Intentionally empty
}

// 用途：作为默认回调
const callback = options.callback || _.noop
```

### 设计原则
```javascript
// 1. 保持简单
// 每个工具方法只做一件事

// 2. 可组合
// 可以与其他方法组合使用
const getUsers = _.flow([
  _.property('data'),
  _.filter(_.matches({ active: true }))
])

// 3. 函数式友好
// 作为高阶函数的参数使用
_.times(5, _.constant('a'))  // => ['a', 'a', 'a', 'a', 'a']
```

## 4. 写作要求

### 开篇方式
从"函数式编程中的基础积木"引入

### 结构组织
```
1. 工具方法概述（300字）
   - 什么是工具方法
   - 在 Lodash 中的地位
   
2. 核心基础方法（500字）
   - identity
   - constant
   - noop
   
3. 工具方法分类（400字）
   - 各类方法预览
   
4. 设计原则（300字）
   - 简单
   - 可组合
   
5. 小结
```

### 代码示例
- identity/constant/noop 基本用法
- 在其他方法中的应用
- 组合使用

### 图表需求
- 工具方法分类表

## 5. 技术细节

### 源码参考
- `identity.js`
- `constant.js`
- `noop.js`
- `stubTrue.js`, `stubFalse.js`
- `stubArray.js`, `stubObject.js`, `stubString.js`

### 实现要点
- identity 是最简单但最重要的函数
- constant 返回闭包保持值的引用
- noop 用于提供默认回调
- stub* 系列是 constant 的特化版本

### 常见问题
- Q: identity 有什么用？
- A: 作为默认迭代器，筛选真值，转换数据流

- Q: constant 和直接使用值有什么区别？
- A: constant 返回函数，可以作为工厂使用

## 6. 风格指导

### 语气语调
概念性讲解，强调设计理念

### 类比方向
- 将工具方法比作"万能工具"
- 将 identity 比作"透明玻璃"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
