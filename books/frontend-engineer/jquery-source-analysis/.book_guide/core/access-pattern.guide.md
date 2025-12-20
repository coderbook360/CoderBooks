# 章节指导：access通用访问器模式

## 章节定位
分析jQuery的access函数，理解getter/setter统一处理的设计模式。

## 学习目标
1. 理解access解决的问题
2. 掌握access的使用场景
3. 分析access的源码实现
4. 学会设计getter/setter统一的API

## 核心内容要求

### 1. 问题引入
- jQuery中大量方法同时支持get和set
- css()、attr()、html()等方法的双重职责
- 重复代码的问题

### 2. access的设计
- 统一处理get/set逻辑
- 参数判断
- 回调函数模式

### 3. 源码分析
- access函数签名
- 参数解析
- getter和setter分支
- 批量设置处理

### 4. 使用access的方法
- css()
- attr()
- prop()
- data()
- html()
- 等

### 5. 设计启示
- DRY原则
- 高阶函数
- 统一接口模式

## 写作风格
- 从重复代码问题入手
- 展示access如何解决问题
- 分析实际应用
