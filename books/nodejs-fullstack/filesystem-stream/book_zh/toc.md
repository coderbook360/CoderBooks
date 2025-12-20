# Node.js文件系统与Stream编程: 高效I/O操作指南

深入掌握 Node.js 文件操作与流式编程，构建高性能 I/O 密集型应用。

- [序言](preface.md)

---

### 第一部分：文件系统基础

1. [fs 模块概览与 API 设计](fs-basics/overview.md)
2. [三套 API 对比：回调、同步、Promise](fs-basics/api-styles.md)
3. [文件读取：readFile 与 read](fs-basics/reading-files.md)
4. [文件写入：writeFile 与 write](fs-basics/writing-files.md)
5. [文件追加与截断](fs-basics/append-truncate.md)
6. [文件描述符与低级操作](fs-basics/file-descriptors.md)
7. [文件信息：stat 与 lstat](fs-basics/file-stats.md)
8. [文件存在性检查](fs-basics/file-existence.md)
9. [文件重命名与移动](fs-basics/rename-move.md)
10. [文件复制策略](fs-basics/copy-strategies.md)
11. [文件删除：unlink 与 rm](fs-basics/delete-files.md)

---

### 第二部分：目录操作

12. [目录创建：mkdir 与 mkdtemp](directories/create-directories.md)
13. [目录读取：readdir 与 opendir](directories/read-directories.md)
14. [目录遍历策略](directories/traversal.md)
15. [递归目录操作](directories/recursive-operations.md)
16. [目录删除：rmdir 与 rm](directories/remove-directories.md)
17. [临时目录管理](directories/temp-directories.md)
18. [glob 模式匹配](directories/glob-patterns.md)

---

### 第三部分：高级文件操作

19. [文件监听：watch 与 watchFile](advanced-fs/file-watching.md)
20. [chokidar 文件监听库](advanced-fs/chokidar.md)
21. [符号链接与硬链接](advanced-fs/links.md)
22. [文件权限与 chmod](advanced-fs/permissions.md)
23. [文件所有者与 chown](advanced-fs/ownership.md)
24. [文件时间戳操作](advanced-fs/timestamps.md)
25. [文件锁定机制](advanced-fs/file-locking.md)
26. [fs.constants 与标志位](advanced-fs/constants-flags.md)
27. [跨平台路径处理](advanced-fs/cross-platform.md)

---

### 第四部分：Stream 基础

28. [Stream 设计理念与优势](stream-basics/stream-philosophy.md)
29. [四种 Stream 类型概览](stream-basics/stream-types.md)
30. [Readable Stream 详解](stream-basics/readable-stream.md)
31. [Readable 的两种模式：flowing 与 paused](stream-basics/readable-modes.md)
32. [Writable Stream 详解](stream-basics/writable-stream.md)
33. [Duplex Stream 详解](stream-basics/duplex-stream.md)
34. [Transform Stream 详解](stream-basics/transform-stream.md)
35. [PassThrough Stream](stream-basics/passthrough.md)
36. [Stream 事件体系](stream-basics/stream-events.md)
37. [pipe 与 pipeline](stream-basics/pipe-pipeline.md)

---

### 第五部分：Stream 进阶

38. [背压(Backpressure)原理](stream-advanced/backpressure.md)
39. [背压处理最佳实践](stream-advanced/backpressure-handling.md)
40. [Stream 错误处理](stream-advanced/error-handling.md)
41. [Stream 生命周期管理](stream-advanced/lifecycle.md)
42. [Stream 销毁与清理](stream-advanced/destroy-cleanup.md)
43. [highWaterMark 与缓冲区](stream-advanced/buffer-management.md)
44. [对象模式(Object Mode)](stream-advanced/object-mode.md)
45. [异步迭代器与 Stream](stream-advanced/async-iteration.md)
46. [Stream 性能优化](stream-advanced/performance.md)
47. [Stream 调试技巧](stream-advanced/debugging.md)

---

### 第六部分：自定义 Stream

48. [实现自定义 Readable](custom-streams/custom-readable.md)
49. [实现自定义 Writable](custom-streams/custom-writable.md)
50. [实现自定义 Duplex](custom-streams/custom-duplex.md)
51. [实现自定义 Transform](custom-streams/custom-transform.md)
52. [Stream 组合模式](custom-streams/composition.md)
53. [Stream 工厂函数](custom-streams/factory-functions.md)

---

### 第七部分：常用 Stream 工具

54. [zlib：压缩与解压](stream-utils/zlib.md)
55. [crypto Stream：加密与解密](stream-utils/crypto-streams.md)
56. [readline：逐行读取](stream-utils/readline.md)
57. [CSV 流式解析](stream-utils/csv-parsing.md)
58. [JSON 流式解析](stream-utils/json-streaming.md)
59. [HTTP 请求响应流](stream-utils/http-streams.md)
60. [process.stdin 与 process.stdout](stream-utils/process-streams.md)

---

### 第八部分：实战应用

61. [大文件读取与处理](practice/large-file-processing.md)
62. [文件上传处理](practice/file-upload.md)
63. [文件下载服务](practice/file-download.md)
64. [日志文件轮转](practice/log-rotation.md)
65. [实时日志追踪(tail -f)](practice/log-tailing.md)
66. [文件压缩与解压服务](practice/compression-service.md)
67. [数据导入导出](practice/data-import-export.md)
68. [图片处理流水线](practice/image-pipeline.md)
69. [视频流处理基础](practice/video-streaming.md)
70. [Stream 与数据库](practice/database-streams.md)
71. [多文件合并](practice/file-merging.md)
72. [文件分片处理](practice/file-chunking.md)
73. [文件系统与流总结](practice/summary.md)

---

