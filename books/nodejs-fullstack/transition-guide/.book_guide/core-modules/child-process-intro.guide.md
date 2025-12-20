# child_process 入门：执行外部命令

## 章节信息
- 章节编号：25
- 文件路径：core-modules/child-process-intro.md
- 预计字数：3000-3500字

## 学习目标
读者完成本章后应能够：
1. 使用 exec 执行 shell 命令
2. 使用 spawn 启动子进程
3. 理解 fork 与 IPC 通信基础
4. 处理子进程的输入输出

## 核心概念
1. exec vs execFile vs spawn vs fork
2. 子进程的 stdio 配置
3. 错误处理与退出码
4. 进程间通信基础
5. 超时与信号处理

## 内容要求
- 四种方法的选择指南
- 常见 shell 命令执行
- 大量输出的处理
- 安全注意事项（命令注入）

## 代码示例要求
- exec 执行 git 命令
- spawn 处理大量输出
- fork 进程通信
- 错误处理模式

## 写作风格
- 对比驱动选择
- 强调安全性
- 实用场景优先
