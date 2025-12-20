# fs 模块：同步、异步与 Promise API 对比

## 章节信息
- 章节编号：17
- 文件路径：core-modules/fs-apis.md
- 预计字数：3000-3500字

## 学习目标
读者完成本章后应能够：
1. 理解 fs 模块三种 API 风格的差异
2. 根据场景选择合适的 API
3. 正确处理文件操作错误
4. 使用 fs/promises 进行现代异步文件操作

## 核心概念
1. 同步 API（*Sync 方法）及其阻塞特性
2. 回调风格 API 与错误优先模式
3. fs/promises API（Node.js 10+）
4. 文件读写基础：readFile、writeFile
5. 文件描述符与 open/read/write/close
6. 文件操作的常见错误码

## 内容要求
- 三种 API 风格的对比表格
- 何时使用同步 API（启动时配置读取）
- 何时使用异步 API（运行时操作）
- 错误处理的不同方式
- 常见错误码解释（ENOENT、EACCES、EEXIST）

## 代码示例要求
- 同一操作用三种风格实现
- 正确的错误处理模式
- fs/promises 配合 async/await

## 写作风格
- 对比驱动，突出差异
- 场景化选择指南
- 强调最佳实践
