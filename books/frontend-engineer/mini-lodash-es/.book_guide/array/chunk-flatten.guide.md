# 章节写作指导：数组分块与展平

## 1. 章节信息
- **章节标题**: 数组分块与展平：chunk、flatten、flattenDeep
- **文件名**: array/chunk-flatten.md
- **所属部分**: 第三部分 - 数组方法
- **章节序号**: 11
- **预计阅读时间**: 22分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 chunk 的分块算法
- 掌握 flatten 系列方法的递归展平原理
- 了解 flattenDepth 的深度控制机制

### 技能目标
- 能够手写 chunk 实现
- 能够实现支持深度控制的 flatten

## 3. 内容要点

### 核心函数

#### chunk
```javascript
function chunk(array, size = 1) {
  size = Math.max(toInteger(size), 0)
  const length = array == null ? 0 : array.length
  if (!length || size < 1) return []
  
  const result = []
  let index = 0
  while (index < length) {
    result.push(slice(array, index, index += size))
  }
  return result
}
```

#### flatten / flattenDeep / flattenDepth
```javascript
function flatten(array) {
  return baseFlatten(array, 1)
}

function flattenDeep(array) {
  return baseFlatten(array, Infinity)
}

function flattenDepth(array, depth = 1) {
  return baseFlatten(array, toInteger(depth))
}
```

#### baseFlatten（核心实现）
```javascript
function baseFlatten(array, depth, predicate, isStrict, result) {
  predicate || (predicate = isFlattenable)
  result || (result = [])
  
  for (const value of array) {
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        baseFlatten(value, depth - 1, predicate, isStrict, result)
      } else {
        result.push(...value)
      }
    } else if (!isStrict) {
      result[result.length] = value
    }
  }
  return result
}
```

### 使用示例
```javascript
// chunk
_.chunk(['a', 'b', 'c', 'd'], 2)  // [['a', 'b'], ['c', 'd']]
_.chunk(['a', 'b', 'c', 'd'], 3)  // [['a', 'b', 'c'], ['d']]

// flatten
_.flatten([1, [2, [3, [4]], 5]])     // [1, 2, [3, [4]], 5]
_.flattenDeep([1, [2, [3, [4]], 5]]) // [1, 2, 3, 4, 5]
_.flattenDepth([1, [2, [3]]], 2)     // [1, 2, 3]
```

## 4. 写作要求

### 开篇方式
以 "分页加载和树形数据处理" 等实际场景引入

### 结构组织
```
1. chunk 源码解析（500字）
   - 分块逻辑
   - 边界处理
   - 与 Array.from 的对比
   
2. flatten 源码解析（400字）
   - 单层展平
   - 与 Array.flat(1) 的对比
   
3. flattenDeep 源码解析（400字）
   - 递归展平
   - 深度无限
   
4. baseFlatten 核心实现（600字）
   - 递归算法详解
   - isFlattenable 判断
   - predicate 参数的作用
   
5. flattenDepth 深度控制（300字）

6. 手写实现与练习
```

### 代码示例
- chunk 的完整实现
- baseFlatten 的递归逻辑
- 各种嵌套深度的测试用例
- 手写简化版实现

### 图表需求
- chunk 分块过程示意图
- flatten 递归展平过程图

## 5. 技术细节

### 源码参考
- `chunk.js`
- `flatten.js`
- `flattenDeep.js`
- `flattenDepth.js`
- `.internal/baseFlatten.js`
- `.internal/isFlattenable.js`

### 实现要点
- chunk 使用 slice 创建子数组
- baseFlatten 使用 depth 参数控制递归深度
- isFlattenable 判断是否可展平（数组或 arguments）

### 常见问题
- Q: flattenDeep 会不会栈溢出？
- A: 理论上极深的嵌套可能导致栈溢出，但实际场景很少遇到

## 6. 风格指导

### 语气语调
算法分析为主，强调递归思想

### 类比方向
- 将 chunk 比作 "切蛋糕"
- 将 flatten 比作 "把嵌套的盒子拆平"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
