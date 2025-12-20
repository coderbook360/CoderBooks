# 章节写作指导：数组过滤

## 1. 章节信息
- **章节标题**: 数组过滤：compact、uniq、uniqBy
- **文件名**: array/compact-uniq.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 12
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 compact 的假值过滤机制
- 掌握 uniq 系列方法的去重算法
- 了解 Set 和 Map 在去重中的应用

### 技能目标
- 能够实现高效的数组去重
- 能够根据场景选择合适的去重方法

## 3. 内容要点

### 核心函数

#### compact
```javascript
function compact(array) {
  const result = []
  for (const value of array) {
    if (value) {
      result.push(value)
    }
  }
  return result
}
```

#### uniq / uniqBy / uniqWith
```javascript
function uniq(array) {
  return baseUniq(array)
}

function uniqBy(array, iteratee) {
  return baseUniq(array, baseIteratee(iteratee))
}

function uniqWith(array, comparator) {
  return baseUniq(array, undefined, comparator)
}
```

#### baseUniq（核心实现）
```javascript
function baseUniq(array, iteratee, comparator) {
  const includes = comparator ? arrayIncludesWith : arrayIncludes
  const isCommon = !comparator
  
  const seen = iteratee ? [] : result
  const result = []
  
  for (const value of array) {
    const computed = iteratee ? iteratee(value) : value
    
    if (isCommon && computed === computed) {
      // 使用 Set 优化常见情况
      if (seen.has(computed)) continue
      seen.add(computed)
    } else if (!includes(seen, computed, comparator)) {
      if (seen !== result) seen.push(computed)
    } else {
      continue
    }
    result.push(value)
  }
  return result
}
```

### 假值列表
```javascript
// compact 移除的值
false, null, 0, '', undefined, NaN
```

### 使用示例
```javascript
// compact
_.compact([0, 1, false, 2, '', 3])  // [1, 2, 3]

// uniq
_.uniq([2, 1, 2])  // [2, 1]

// uniqBy
_.uniqBy([{ x: 1 }, { x: 2 }, { x: 1 }], 'x')  // [{ x: 1 }, { x: 2 }]

// uniqWith
_.uniqWith([{ a: 1 }, { a: 1 }], _.isEqual)  // [{ a: 1 }]
```

## 4. 写作要求

### 开篇方式
以 "数据清洗中的去重需求" 引入

### 结构组织
```
1. compact 源码解析（400字）
   - 假值定义
   - 简洁实现
   
2. uniq 源码解析（500字）
   - 基本去重逻辑
   - SameValueZero 比较规则
   
3. uniqBy 源码解析（500字）
   - iteratee 的作用
   - 按属性去重场景
   
4. uniqWith 源码解析（400字）
   - 自定义比较器
   - 深度比较去重
   
5. baseUniq 核心实现（600字）
   - Set 优化策略
   - 性能考量
   
6. 手写实现与练习
```

### 代码示例
- compact 的完整实现
- baseUniq 的核心逻辑
- 各种去重场景的测试
- 与 [...new Set(arr)] 的对比

### 图表需求
- 去重算法流程图
- uniq 系列方法对比表

## 5. 技术细节

### 源码参考
- `compact.js`
- `uniq.js`
- `uniqBy.js`
- `uniqWith.js`
- `.internal/baseUniq.js`
- `.internal/setToArray.js`

### 实现要点
- uniq 使用 Set 实现 O(n) 时间复杂度
- uniqBy 需要维护 computed 值的 seen 数组
- uniqWith 需要逐一比较，时间复杂度 O(n²)
- NaN 的特殊处理（NaN !== NaN）

### 常见问题
- Q: uniq 能处理对象数组吗？
- A: 不能，对象引用不同即视为不同，需要用 uniqWith + isEqual

## 6. 风格指导

### 语气语调
算法分析为主，强调性能权衡

### 类比方向
- 将去重比作 "从一堆卡片中挑出不重复的"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
