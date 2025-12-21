# Node.js数据库与ORM设计: 从SQL到NoSQL

全面掌握 Node.js 数据库操作，深入理解 ORM 设计原理与最佳实践。

- [序言](preface.md)

---

### 第一部分：数据库基础

1. [数据库类型概览](foundations/database-types.md)
2. [关系型 vs 非关系型数据库](foundations/relational-vs-nosql.md)
3. [ACID 与 BASE 理论](foundations/acid-base.md)
4. [CAP 定理与取舍](foundations/cap-theorem.md)
5. [Node.js 数据库驱动概览](foundations/nodejs-drivers.md)
6. [连接池原理与配置](foundations/connection-pool.md)

---

### 第二部分：PostgreSQL 实战

7. [PostgreSQL 特性概览](postgresql/features-overview.md)
8. [pg 驱动入门](postgresql/pg-driver.md)
9. [连接与连接池配置](postgresql/connection-pool.md)
10. [基础 CRUD 操作](postgresql/basic-crud.md)
11. [参数化查询与安全](postgresql/parameterized-queries.md)
12. [事务处理](postgresql/transactions.md)
13. [PostgreSQL 数据类型](postgresql/data-types.md)
14. [JSONB 操作](postgresql/jsonb.md)
15. [数组类型操作](postgresql/arrays.md)
16. [全文搜索](postgresql/full-text-search.md)
17. [索引策略与优化](postgresql/indexing.md)
18. [EXPLAIN 查询分析](postgresql/explain-analyze.md)
19. [存储过程与函数](postgresql/stored-procedures.md)
20. [监听通知(LISTEN/NOTIFY)](postgresql/listen-notify.md)

---

### 第三部分：MySQL 实战

21. [MySQL 特性概览](mysql/features-overview.md)
22. [mysql2 驱动入门](mysql/mysql2-driver.md)
23. [连接池与配置](mysql/connection-pool.md)
24. [基础 CRUD 操作](mysql/basic-crud.md)
25. [预处理语句](mysql/prepared-statements.md)
26. [事务与锁](mysql/transactions-locks.md)
27. [MySQL 数据类型](mysql/data-types.md)
28. [JSON 数据类型](mysql/json-type.md)
29. [索引设计与优化](mysql/indexing.md)
30. [EXPLAIN 查询分析](mysql/explain.md)
31. [MySQL vs PostgreSQL 对比](mysql/mysql-vs-postgresql.md)

---

### 第四部分：MongoDB 实战

32. [MongoDB 核心概念](mongodb/core-concepts.md)
33. [文档模型设计](mongodb/document-modeling.md)
34. [mongodb 驱动入门](mongodb/native-driver.md)
35. [连接与连接管理](mongodb/connection-management.md)
36. [基础 CRUD 操作](mongodb/basic-crud.md)
37. [查询操作符](mongodb/query-operators.md)
38. [更新操作符](mongodb/update-operators.md)
39. [聚合管道入门](mongodb/aggregation-basics.md)
40. [聚合管道进阶](mongodb/aggregation-advanced.md)
41. [索引类型与策略](mongodb/indexing.md)
42. [MongoDB 事务](mongodb/transactions.md)
43. [Change Streams](mongodb/change-streams.md)
44. [Schema 设计最佳实践](mongodb/schema-design.md)
45. [嵌入 vs 引用](mongodb/embedding-vs-referencing.md)

---

### 第五部分：Redis 实战

46. [Redis 核心概念](redis/core-concepts.md)
47. [ioredis 驱动入门](redis/ioredis.md)
48. [连接与集群配置](redis/connection-cluster.md)
49. [字符串(String)操作](redis/strings.md)
50. [列表(List)操作](redis/lists.md)
51. [集合(Set)与有序集合(Sorted Set)](redis/sets.md)
52. [哈希(Hash)操作](redis/hashes.md)
53. [Redis 作为缓存](redis/caching.md)
54. [缓存策略与失效](redis/cache-strategies.md)
55. [Redis 发布订阅](redis/pub-sub.md)
56. [Redis Streams](redis/streams.md)
57. [分布式锁实现](redis/distributed-lock.md)
58. [Redis 限流](redis/rate-limiting.md)
59. [Redis 事务与 Lua 脚本](redis/transactions-lua.md)
60. [Redis 持久化配置](redis/persistence.md)

---

### 第六部分：Prisma ORM

61. [Prisma 设计理念](prisma/design-philosophy.md)
62. [Prisma 快速入门](prisma/getting-started.md)
63. [Prisma Schema 语法](prisma/schema-syntax.md)
64. [Prisma Client 生成](prisma/client-generation.md)
65. [基础 CRUD 操作](prisma/basic-crud.md)
66. [关系查询](prisma/relations.md)
67. [过滤与排序](prisma/filtering-sorting.md)
68. [分页策略](prisma/pagination.md)
69. [聚合与分组](prisma/aggregation.md)
70. [原生查询](prisma/raw-queries.md)
71. [事务处理](prisma/transactions.md)
72. [Prisma Migrate](prisma/migrations.md)
73. [Prisma 性能优化](prisma/performance.md)

---

### 第七部分：TypeORM

74. [TypeORM 设计理念](typeorm/design-philosophy.md)
75. [TypeORM 快速入门](typeorm/getting-started.md)
76. [实体(Entity)定义](typeorm/entities.md)
77. [装饰器详解](typeorm/decorators.md)
78. [Repository 模式](typeorm/repository.md)
79. [QueryBuilder](typeorm/query-builder.md)
80. [关系映射](typeorm/relations.md)
81. [事务处理](typeorm/transactions.md)
82. [迁移管理](typeorm/migrations.md)
83. [TypeORM vs Prisma 对比](typeorm/typeorm-vs-prisma.md)

---

### 第八部分：Mongoose ODM

84. [Mongoose 设计理念](mongoose/design-philosophy.md)
85. [Mongoose 快速入门](mongoose/getting-started.md)
86. [Schema 定义](mongoose/schema.md)
87. [Schema 类型与选项](mongoose/schema-types.md)
88. [Model 操作](mongoose/model.md)
89. [查询构建](mongoose/queries.md)
90. [中间件(Middleware)](mongoose/middleware.md)
91. [虚拟属性(Virtuals)](mongoose/virtuals.md)
92. [填充(Population)](mongoose/population.md)
93. [验证器](mongoose/validators.md)
94. [插件系统](mongoose/plugins.md)
95. [Mongoose 最佳实践](mongoose/best-practices.md)

---

### 第九部分：高级主题

96. [数据库连接池深度解析](advanced/connection-pool-deep.md)
97. [事务隔离级别](advanced/isolation-levels.md)
98. [乐观锁与悲观锁](advanced/locking-strategies.md)
99. [数据库迁移策略](advanced/migration-strategies.md)
100. [读写分离实现](advanced/read-write-splitting.md)
101. [分库分表概述](advanced/sharding.md)
102. [数据库监控与诊断](advanced/monitoring.md)
103. [备份与恢复](advanced/backup-recovery.md)
104. [数据库安全最佳实践](advanced/security.md)
105. [数据库与ORM总结](advanced/summary.md)

---

