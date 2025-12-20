# util：工具函数最佳实践

## 章节信息
- 章节编号：23
- 文件路径：core-modules/util.md
- 预计字数：2500-3000字

## 学习目标
读者完成本章后应能够：
1. 使用 util.promisify 转换回调风格 API
2. 使用 util.inspect 进行对象调试输出
3. 理解 util.types 类型检查
4. 了解其他实用工具函数

## 核心概念
1. util.promisify 与自定义 promisify
2. util.callbackify 反向转换
3. util.inspect 深度对象打印
4. util.types 类型判断
5. util.deprecate 废弃警告
6. util.format 格式化字符串

## 内容要求
- promisify 的实现原理
- inspect 的自定义选项
- 实用的类型检查
- 调试时的妙用

## 代码示例要求
- promisify 包装 fs 函数
- 自定义 inspect 行为
- 类型检查实战

## 写作风格
- 工具导向
- 直接展示用法
- 强调实用性
