# 章节写作指导：字符串方法概览

## 1. 章节信息
- **章节标题**: 字符串方法概览与设计
- **文件名**: string/overview.md
- **所属部分**: 第七部分 - 字符串方法
- **章节序号**: 42
- **预计阅读时间**: 12分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Lodash 字符串方法的设计理念
- 掌握字符串方法的分类
- 了解 Unicode 处理的考量

### 技能目标
- 能够理解字符串方法的统一模式
- 掌握核心内部方法的作用

## 3. 内容要点

### 核心概念

#### 字符串方法分类
| 类别 | 方法 | 说明 |
|------|------|------|
| 大小写转换 | camelCase, kebabCase, snakeCase | 命名风格转换 |
| 填充对齐 | pad, padStart, padEnd | 字符串填充 |
| 修剪处理 | trim, trimStart, trimEnd | 去除空白/字符 |
| 拆分合并 | split, words | 字符串拆分 |
| 转义处理 | escape, unescape | HTML 转义 |
| 模板 | template | 模板字符串 |
| 其他 | repeat, truncate, startsWith | 常用操作 |

### 核心内部方法

#### words - 单词拆分
```javascript
// words - 将字符串拆分为单词数组
function words(string, pattern) {
  if (pattern === undefined) {
    // 使用默认正则匹配各种命名风格
    return hasUnicodeWord(string)
      ? unicodeWords(string)
      : asciiWords(string)
  }
  return string.match(pattern) || []
}

// 默认正则 - ASCII 单词
const asciiWords = string => 
  string.match(/[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g) || []

// Unicode 单词（更复杂）
const unicodeWords = string => {
  // 处理大小写边界、Unicode 字符等
}
```

#### 大小写转换的统一模式
```javascript
// 所有 case 转换方法都基于这个模式
function createCaseConverter(callback) {
  return string => {
    // 1. 拆分为单词
    const wordsArray = words(deburr(string).replace(/['\u2019]/g, ''))
    // 2. 转换每个单词
    // 3. 用指定方式连接
    return wordsArray.reduce(callback, '')
  }
}
```

### Unicode 处理
```javascript
// 检测是否包含 Unicode 字符
function hasUnicode(string) {
  return reHasUnicode.test(string)
}

// 检测是否包含 Unicode 单词
function hasUnicodeWord(string) {
  return reHasUnicodeWord.test(string)
}

// Unicode 字符的特殊处理
function stringSize(string) {
  return hasUnicode(string) 
    ? unicodeSize(string) 
    : string.length
}
```

## 4. 写作要求

### 开篇方式
从"命名风格转换"的常见需求引入

### 结构组织
```
1. 字符串方法概述（300字）
   - 方法分类
   - 与原生方法的关系
   
2. words 核心方法（400字）
   - 单词拆分逻辑
   - ASCII vs Unicode
   
3. 大小写转换的统一模式（400字）
   - createCaseConverter
   - 拆分-转换-连接
   
4. Unicode 处理（300字）
   - 为什么需要特殊处理
   - hasUnicode 检测
   
5. 小结
```

### 代码示例
- words 基本用法
- 各种命名风格预览
- Unicode 处理示例

### 图表需求
- 字符串方法分类表
- 大小写转换流程图

## 5. 技术细节

### 源码参考
- `words.js`
- `.internal/asciiWords.js`
- `.internal/unicodeWords.js`
- `.internal/hasUnicode.js`
- `.internal/unicodeSize.js`

### 实现要点
- words 是大小写转换的基础
- 所有 case 方法都使用 words 拆分
- Unicode 需要特殊正则和处理
- deburr 用于去除音调符号

### 常见问题
- Q: 为什么需要 Unicode 处理？
- A: JavaScript 字符串按 UTF-16 编码，某些字符由多个码元组成

## 6. 风格指导

### 语气语调
概念性讲解，为后续章节铺垫

### 类比方向
- 将 words 比作"分词器"
- 将 case 转换比作"翻译器"

## 7. 章节检查清单
- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操
