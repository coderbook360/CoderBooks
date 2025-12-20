# 章节指导：类型检测工具函数

## 章节定位
分析jQuery的类型检测方法，理解JavaScript类型判断的最佳实践。

## 学习目标
1. 理解typeof的局限性
2. 掌握Object.prototype.toString的原理
3. 分析jQuery类型检测的实现
4. 学会设计可靠的类型检测函数

## 核心内容要求

### 1. typeof的局限
- 无法区分null和object
- 无法区分数组和对象
- 所有对象都返回'object'

### 2. jQuery的解决方案
- class2type映射表
- Object.prototype.toString.call()
- 常用类型检测方法

### 3. 源码分析
- jQuery.type()
- jQuery.isFunction()
- jQuery.isArray()
- jQuery.isPlainObject()
- jQuery.isEmptyObject()
- jQuery.isArrayLike()

### 4. 现代替代方案
- Array.isArray()
- typeof的改进场景
- instanceof的使用

### 5. 最佳实践
- 何时使用哪种检测方式
- 类型检测的性能考虑

## 写作风格
- 从typeof的问题入手
- 展示jQuery的解决方案
- 对比现代方法
