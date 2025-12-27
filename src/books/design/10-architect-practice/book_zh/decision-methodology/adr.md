# 架构决策记录 (ADR)

> ADR（Architecture Decision Record）是一种轻量级的架构决策文档化方法，它记录了重要的架构决策、决策的背景和理由，帮助团队理解"为什么"系统是这样设计的。

## 什么是 ADR？

ADR 是一个简短的文档，记录一个重要的架构决策：

```
ADR (Architecture Decision Record)
├── 标题 (Title)          # 决策的简短描述
├── 状态 (Status)         # proposed, accepted, deprecated, superseded
├── 背景 (Context)        # 决策的背景和驱动因素
├── 决策 (Decision)       # 做出的决策
├── 后果 (Consequences)   # 决策的影响和权衡
└── 日期 (Date)           # 决策日期
```

## 为什么需要 ADR？

### 没有 ADR 时的问题

```typescript
// 场景：新成员加入团队
const newDeveloperQuestions = [
  "为什么我们用 MongoDB 而不是 PostgreSQL？",
  "为什么选择微服务而不是单体架构？",
  "为什么 API 要用 GraphQL？",
  "为什么缓存层用 Redis 而不是 Memcached？",
];

// 常见的（无效的）答复
const commonResponses = [
  "这是历史遗留的决定",
  "我也不知道，问问老张吧",
  "当时做这个决定的人已经离职了",
  "我们一直都是这样做的",
];
```

### 有 ADR 时的好处

- **知识传承**：新成员可以快速了解系统的设计原因
- **避免重复讨论**：已记录的决策不需要重新辩论
- **决策透明**：所有人都能看到决策的理由
- **追溯能力**：了解决策在当时的背景下是否合理

## ADR 模板

### 基础模板

```markdown
# ADR-NNN: [标题]

## 状态
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## 背景
[描述决策的背景、问题和驱动因素]

## 决策
[描述做出的决策]

## 后果
[描述决策的正面和负面影响]

## 参考
[相关链接和参考资料]

---
日期: YYYY-MM-DD
作者: [作者姓名]
```

### 实际案例

```markdown
# ADR-001: 使用 PostgreSQL 作为主数据库

## 状态
Accepted

## 背景
我们的电商平台需要一个可靠的关系型数据库来存储订单、用户和商品数据。
主要需求包括：
- 强一致性的事务支持（订单处理）
- 复杂查询能力（报表和分析）
- JSON 支持（存储商品属性等半结构化数据）
- 良好的扩展性（预计 3 年内数据量达到 TB 级别）

团队有 3 名有 PostgreSQL 经验的开发者，2 名有 MySQL 经验。

## 决策
我们决定使用 PostgreSQL 14 作为主数据库。

选择 PostgreSQL 的原因：
1. 优秀的 JSON/JSONB 支持，满足半结构化数据需求
2. 强大的扩展能力（分区、复制、索引类型）
3. 活跃的社区和丰富的工具生态
4. 团队已有相关经验

考虑但未选择的方案：
- MySQL: JSON 支持较弱，高级特性不如 PostgreSQL
- MongoDB: 不适合强一致性的事务场景
- CockroachDB: 团队无经验，引入风险高

## 后果

**正面影响：**
- 可以利用 JSONB 灵活存储商品属性
- 可以使用分区表处理大量历史订单
- 团队培训成本低

**负面影响：**
- 需要自行搭建高可用方案（主从复制 + 故障切换）
- 写入扩展性有限，未来可能需要分库分表

**缓解措施：**
- 使用 Patroni 实现 PostgreSQL 高可用
- 设计时考虑未来分库分表的可能性

## 参考
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [PostgreSQL vs MySQL 对比](链接)
- 内部技术评估文档

---
日期: 2024-01-10
作者: 李明（技术架构师）
```

## ADR 编写原则

### 1. 记录决策，不是方案

```markdown
# ❌ 错误：描述实现细节
## 决策
我们将使用以下代码实现缓存：
```typescript
const cache = new RedisCache({ host: 'localhost', port: 6379 });
```

# ✅ 正确：描述架构决策
## 决策
我们决定使用 Redis 作为应用层缓存，主要缓存：
- 用户 Session
- 商品详情（TTL: 5分钟）
- 热门搜索结果（TTL: 1小时）
```

### 2. 记录背景和约束

```markdown
# ✅ 好的背景描述
## 背景
我们需要为实时通知系统选择消息队列。

**业务需求：**
- 每日消息量约 1000 万条
- 消息延迟要求 < 100ms
- 需要支持消息回溯（用户离线时）

**团队约束：**
- 运维团队熟悉 AWS 服务
- 预算有限，优先使用托管服务
- 需要在 2 周内完成集成

**技术约束：**
- 需要与现有 Node.js 后端集成
- 需要支持至少 3 种消息类型
```

### 3. 诚实记录权衡

```markdown
## 后果

**我们接受的权衡：**
- 选择 AWS SQS 意味着对 AWS 的依赖加深
- 放弃了 Kafka 的高吞吐量和消息回溯能力
- 未来迁移到其他云可能面临挑战

**我们的缓解策略：**
- 通过抽象层隔离 SQS 具体实现
- 消息格式使用标准的 JSON Schema
```

## ADR 管理实践

### 目录结构

```
docs/
└── adr/
    ├── README.md          # ADR 索引和说明
    ├── 0001-use-postgresql.md
    ├── 0002-adopt-microservices.md
    ├── 0003-use-redis-cache.md
    ├── 0004-graphql-api.md
    └── template.md        # ADR 模板
```

### ADR 索引

```markdown
# 架构决策记录索引

| ADR | 标题 | 状态 | 日期 |
|-----|------|------|------|
| [ADR-0001](0001-use-postgresql.md) | 使用 PostgreSQL 作为主数据库 | Accepted | 2024-01-10 |
| [ADR-0002](0002-adopt-microservices.md) | 采用微服务架构 | Accepted | 2024-01-15 |
| [ADR-0003](0003-use-redis-cache.md) | 使用 Redis 作为缓存 | Accepted | 2024-01-20 |
| [ADR-0004](0004-graphql-api.md) | API 层使用 GraphQL | Superseded by ADR-0008 | 2024-02-01 |
```

### 使用工具

```bash
# 使用 adr-tools 管理 ADR
# 安装: brew install adr-tools (macOS)

# 初始化 ADR 目录
adr init docs/adr

# 创建新 ADR
adr new "使用 PostgreSQL 作为主数据库"

# 标记 ADR 被替代
adr new -s 4 "API 层使用 REST"  # 替代 ADR-0004
```

## 何时写 ADR

```typescript
// 需要写 ADR 的决策
const adrCandidates = [
  '选择主要技术栈（语言、框架、数据库）',
  '架构模式（微服务、单体、事件驱动）',
  '第三方服务选择（云服务、SaaS）',
  '安全和合规相关决策',
  '影响多个团队的技术决策',
  '难以逆转的技术决策',
];

// 不需要写 ADR 的决策
const notAdrCandidates = [
  '代码风格和格式化规则',  // → 用 .prettierrc
  '小型工具库的选择',      // → 影响范围小
  '临时的技术方案',        // → 实验性质
];
```

## 总结

ADR 的核心价值：

1. **记录决策原因**：不只是"做了什么"，更是"为什么"
2. **知识传承**：让新成员快速理解系统设计
3. **避免重复讨论**：已记录的决策有据可查
4. **支持决策演进**：当环境变化时，可以有依据地更新决策

ADR 最佳实践：

1. **保持简洁**：一个 ADR 记录一个决策
2. **及时记录**：在决策时就写，不要事后补
3. **记录背景**：包括约束、需求和当时的考虑
4. **诚实权衡**：记录接受了什么、放弃了什么
5. **持续维护**：过时的 ADR 要标记为 deprecated

ADR 是架构师最有价值的工具之一——它让隐性知识变成显性知识。
