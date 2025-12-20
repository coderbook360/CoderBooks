# path 模块：跨平台路径处理

## 章节信息
- 章节编号：16
- 文件路径：core-modules/path.md
- 预计字数：2500-3000字

## 学习目标
读者完成本章后应能够：
1. 理解不同操作系统路径分隔符的差异
2. 熟练使用 path 模块的核心方法
3. 编写跨平台兼容的路径处理代码
4. 理解相对路径与绝对路径的转换

## 核心概念
1. 路径分隔符差异（Windows vs POSIX）
2. path.join vs path.resolve 的区别
3. path.basename、path.dirname、path.extname
4. path.parse 与 path.format
5. path.relative 与 path.isAbsolute
6. __dirname 与 __filename

## 内容要求
- 对比 Windows 和 Linux/macOS 的路径差异
- 强调永远不要手动拼接路径字符串
- 提供实际场景示例：配置文件路径、模块导入路径
- 演示常见错误及其修正

## 代码示例要求
- 展示 path.join 和 path.resolve 的区别
- 演示路径解析和格式化
- 提供跨平台兼容的最佳实践

## 写作风格
- 实践导向，直接展示用法
- 通过对比帮助理解
- 强调"为什么"要用 path 模块
