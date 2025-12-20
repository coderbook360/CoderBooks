# 章节写作指导：对象方法概览

## 1. 章节信息
- **章节标题**: 对象方法概览与设计
- **文件名**: object/overview.md
- **所属部分**: 第五部分 - 对象方法
- **章节序号**: 28
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Lodash 对象方法的设计理念
- 掌握对象遍历的核心内部方法
- 了解属性路径解析机制

### 技能目标
- 能够理解对象方法的统一设计模式
- 掌握 baseFor 和相关遍历方法

## 3. 内容要点

### 核心概念

#### 对象方法分类
| 类别 | 方法 | 说明 |
|------|------|------|
| 键值获取 | keys, values, entries | 提取对象键/值/键值对 |
| 属性访问 | get, set, has, unset | 路径式属性操作 |
| 属性遍历 | forIn, forOwn | 遍历对象属性 |
| 属性转换 | pick, omit, invert | 选择/排除/反转属性 |
| 对象合并 | assign, merge, defaults | 合并多个对象 |
| 对象创建 | create, fromPairs | 创建新对象 |

#### 核心内部方法

##### baseFor / baseForOwn
```javascript
// baseFor - 对象遍历基础方法
function baseFor(object, iteratee, keysFunc) {
  const iterable = Object(object)
  const props = keysFunc(object)
  let { length } = props
  let index = -1
  
  while (length--) {
    const key = props[++index]
    if (iteratee(iterable[key], key, iterable) === false) {
      break
    }
  }
  return object
}

// baseForOwn - 只遍历自身属性
function baseForOwn(object, iteratee) {
  return object && baseFor(object, iteratee, keys)
}
```

##### 属性路径解析
```javascript
// castPath - 将路径转换为数组
function castPath(value, object) {
  if (isArray(value)) {
    return value
  }
  return isKey(value, object) ? [value] : stringToPath(value)
}

// stringToPath - 解析路径字符串
function stringToPath(string) {
  const result = []
  // 解析 'a.b[0].c' 为 ['a', 'b', '0', 'c']
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push('')
  }
  string.replace(rePropName, (match, number, quote, subString) => {
    result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match))
  })
  return result
}
```

### 对象与数组的遍历差异
```javascript
// 数组遍历 - 使用索引
for (let i = 0; i < array.length; i++) {
  iteratee(array[i], i, array)
}

// 对象遍历 - 使用 keys
const props = keys(object)
for (const key of props) {
  iteratee(object[key], key, object)
}
```

## 4. 写作要求

### 开篇方式
从 JavaScript 对象操作的常见需求引入

### 结构组织
```
1. 对象方法概述（400字）
   - 方法分类
   - 设计理念
   
2. 核心遍历方法（500字）
   - baseFor 源码
   - baseForOwn 源码
   - keys vs keysIn 的区别
   
3. 属性路径机制（500字）
   - castPath 源码
   - stringToPath 源码
   - 路径字符串解析规则
   
4. 对象与数组遍历的差异（300字）

5. 小结
```

### 代码示例
- baseFor 实现
- 路径解析示例
- keys vs keysIn 对比

### 图表需求
- 对象方法分类表
- 路径解析流程图

## 5. 技术细节

### 源码参考
- `.internal/baseFor.js`
- `.internal/baseForOwn.js`
- `.internal/baseForOwnRight.js`
- `.internal/castPath.js`
- `.internal/stringToPath.js`
- `keys.js`, `keysIn.js`

### 实现要点
- baseFor 使用 keysFunc 参数决定获取哪些键
- baseForOwn 使用 keys，只获取自身可枚举属性
- 路径支持点号（a.b）和方括号（a[0]）语法
- stringToPath 使用正则解析复杂路径

### 常见问题
- Q: keys 和 keysIn 有什么区别？
- A: keys 只返回自身属性，keysIn 包括继承属性

## 6. 风格指导

### 语气语调
概念性讲解，为后续章节铺垫

### 类比方向
- 将对象比作"字典"
- 将路径比作"地址"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
