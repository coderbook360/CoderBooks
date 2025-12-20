# 章节写作指导：属性选择与排除

## 1. 章节信息
- **章节标题**: 属性选择与排除：pick、omit
- **文件名**: object/pick-omit.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 31
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 pick 的属性选择机制
- 掌握 omit 的属性排除机制
- 了解 pickBy 和 omitBy 的条件筛选

### 技能目标
- 能够使用 pick/omit 处理对象属性
- 理解路径选择的实现原理

## 3. 内容要点

### 核心函数

#### pick
```javascript
// pick - 选择指定属性
function pick(object, ...paths) {
  return object == null ? {} : basePick(object, paths.flat())
}

// basePick
function basePick(object, paths) {
  return basePickBy(object, paths, (value, path) => {
    return hasIn(object, path)
  })
}

// basePickBy - 核心实现
function basePickBy(object, paths, predicate) {
  const result = {}
  for (const path of paths) {
    if (predicate(baseGet(object, path), path)) {
      baseSet(result, castPath(path, object), baseGet(object, path))
    }
  }
  return result
}
```

#### pickBy
```javascript
// pickBy - 按条件选择属性
function pickBy(object, predicate) {
  if (object == null) {
    return {}
  }
  const props = []
  forIn(object, (value, key) => {
    if (predicate(value, key)) {
      props.push(key)
    }
  })
  return basePick(object, props)
}
```

#### omit
```javascript
// omit - 排除指定属性
function omit(object, ...paths) {
  const result = {}
  if (object == null) {
    return result
  }
  
  // 收集要排除的键
  const pathsToOmit = new Set(paths.flat().map(p => toKey(isArray(p) ? p[0] : p)))
  
  // 复制不在排除列表中的属性
  for (const key in object) {
    if (!pathsToOmit.has(key)) {
      baseAssignValue(result, key, object[key])
    }
  }
  return result
}
```

#### omitBy
```javascript
// omitBy - 按条件排除属性
function omitBy(object, predicate) {
  return pickBy(object, negate(baseIteratee(predicate)))
}
```

### 使用示例
```javascript
const obj = { a: 1, b: 2, c: 3 }

// pick - 选择属性
_.pick(obj, ['a', 'c'])
// => { a: 1, c: 3 }

// 支持路径
const nested = { a: { b: 1 }, c: 2 }
_.pick(nested, ['a.b', 'c'])
// => { a: { b: 1 }, c: 2 }

// omit - 排除属性
_.omit(obj, ['b'])
// => { a: 1, c: 3 }

// pickBy - 条件选择
_.pickBy(obj, v => v > 1)
// => { b: 2, c: 3 }

// omitBy - 条件排除
_.omitBy(obj, v => v > 1)
// => { a: 1 }

// 实用场景：过滤空值
_.pickBy({ a: 1, b: null, c: undefined, d: '' }, v => v != null)
// => { a: 1, d: '' }
```

### pick vs omit
| 特性 | pick | omit |
|------|------|------|
| 操作 | 选择指定属性 | 排除指定属性 |
| 适用 | 需要少量属性 | 需要排除少量属性 |
| 路径 | 支持嵌套路径 | 只支持顶层属性 |

## 4. 写作要求

### 开篇方式
从"如何只提取对象的部分属性"引入

### 结构组织
```
1. 属性操作概述（300字）
   - pick vs omit 的语义
   - 应用场景
   
2. pick 源码解析（500字）
   - basePick 实现
   - basePickBy 实现
   - 路径支持
   
3. pickBy 源码解析（300字）
   - 条件筛选实现
   
4. omit 源码解析（400字）
   - 实现策略
   - 与 pick 的差异
   
5. omitBy 源码解析（200字）
   - 使用 negate + pickBy
   
6. 实际应用场景（300字）

7. 小结
```

### 代码示例
- 基本用法
- 路径选择
- 条件筛选
- 过滤空值场景

### 图表需求
- pick vs omit 对比图
- 方法关系图

## 5. 技术细节

### 源码参考
- `pick.js`, `pickBy.js`
- `omit.js`, `omitBy.js`
- `.internal/basePick.js`
- `.internal/basePickBy.js`

### 实现要点
- pick 使用 hasIn 检查路径是否存在
- pick 支持嵌套路径，omit 只支持顶层
- omitBy = negate(predicate) + pickBy
- 返回新对象，不修改原对象

### 常见问题
- Q: pick 支持嵌套路径吗？
- A: 支持，如 'a.b.c'

- Q: omit 返回新对象还是修改原对象？
- A: 返回新对象

## 6. 风格指导

### 语气语调
实用导向，强调选型

### 类比方向
- 将 pick 比作"挑选想要的"
- 将 omit 比作"剔除不要的"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
