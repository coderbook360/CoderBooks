# 检索增强生成（RAG）：让模型使用外部知识

## 1. 为什么需要 RAG

LLM 存在两个根本性限制：

1. **知识截止**：模型的知识止于训练数据的截止日期
2. **幻觉问题**：对于不确定的信息，模型可能"编造"看似合理的答案

**场景示例**：

```
用户：我们公司的年假政策是什么？
AI：[编造一个看起来合理但完全错误的答案]
```

RAG（Retrieval-Augmented Generation）的核心思想：**让模型在回答前先"查资料"**。

```
用户：我们公司的年假政策是什么？
       ↓
    [检索公司政策文档]
       ↓
    找到相关条款
       ↓
AI：根据公司政策文档第3.2节，年假政策如下...
```

## 2. RAG 系统架构

### 2.1 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│                      RAG 系统架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ 用户查询 │───▶│ 查询向量化   │───▶│ 向量数据库检索      │ │
│  └─────────┘    └─────────────┘    └──────────┬──────────┘ │
│                                               │            │
│                                               ▼            │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ 最终回答 │◀───│ LLM 生成    │◀───│ 构建增强提示词      │ │
│  └─────────┘    └─────────────┘    └─────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

离线阶段（预处理）：
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────────┐
│ 原始文档 │───▶│ 文本切分 │───▶│ 向量化  │───▶│ 存入向量数据库│
└─────────┘    └─────────┘    └─────────┘    └─────────────┘
```

### 2.2 核心组件

| 组件 | 作用 | 关键技术 |
|------|------|---------|
| 文本切分器 | 将长文档切成小块 | 固定大小/语义切分 |
| 嵌入模型 | 将文本转为向量 | OpenAI Embeddings / BGE |
| 向量数据库 | 存储和检索向量 | Chroma / Pinecone / Milvus |
| 检索器 | 找到相关文档块 | 相似度搜索 / 混合检索 |
| 生成器 | 基于检索结果生成回答 | LLM + 特定提示词 |

## 3. 关键工程决策

### 3.1 文本切分策略

**为什么需要切分**：
- 文档太长无法一次性放入上下文窗口
- 更小的块可以更精准地匹配查询

**常见切分策略对比**：

| 策略 | 实现方式 | 优点 | 缺点 | 适用场景 |
|------|---------|------|------|---------|
| 固定长度 | 按字符/Token数切分 | 简单、一致 | 可能切断句子 | 结构不规则的文本 |
| 句子切分 | 按句号分割 | 保持语义完整 | 块大小不均 | 叙述性文本 |
| 段落切分 | 按换行分割 | 保持逻辑单元 | 段落可能过长 | 结构化文档 |
| 语义切分 | 使用模型判断边界 | 语义最连贯 | 计算成本高 | 高质量要求场景 |
| 递归切分 | 先大块再递归细分 | 灵活可控 | 实现较复杂 | 通用场景 |

**代码示例**：

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 推荐的通用配置
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # 每块约1000字符
    chunk_overlap=200,      # 块之间重叠200字符，避免信息丢失
    separators=["\n\n", "\n", "。", "！", "？", ".", " ", ""],
    length_function=len
)

chunks = text_splitter.split_text(document)
```

**块大小的权衡**：

| 块大小 | 优点 | 缺点 |
|--------|------|------|
| 小（200-500字） | 检索精准 | 可能缺乏上下文 |
| 中（500-1000字） | 平衡精准度和上下文 | 通用场景推荐 |
| 大（1000-2000字） | 上下文丰富 | 可能引入噪音 |

### 3.2 向量数据库选型

| 数据库 | 部署方式 | 规模 | 特点 | 适用场景 |
|--------|---------|------|------|---------|
| Chroma | 本地/嵌入式 | 小型 | 简单、开箱即用 | 原型开发、小数据集 |
| FAISS | 本地 | 中大型 | 高性能、Meta开源 | 本地部署、大规模检索 |
| Pinecone | 云服务 | 大型 | 托管服务、免运维 | 生产环境、快速上线 |
| Milvus | 私有部署/云 | 大型 | 功能完整、可扩展 | 企业级应用 |
| Weaviate | 私有部署/云 | 中大型 | 混合检索、GraphQL | 复杂查询需求 |

**选型决策树**：

```
                    需要生产部署？
                         │
              ┌────否────┴────是────┐
              ▼                     ▼
         Chroma/FAISS          有运维能力？
         (快速原型)                  │
                        ┌────否────┴────是────┐
                        ▼                     ▼
                    Pinecone              Milvus/Weaviate
                    (托管服务)             (自建部署)
```

### 3.3 检索策略

**基础检索：向量相似度**

```python
from openai import OpenAI

client = OpenAI()

def get_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

# 查询向量化
query_embedding = get_embedding("年假政策")

# 在向量数据库中检索 top-k 相似文档
results = vector_db.similarity_search(query_embedding, k=5)
```

**进阶：混合检索**

结合关键词检索和向量检索，取长补短：

```python
# 混合检索示例（概念代码）
def hybrid_search(query, k=5):
    # 1. 向量检索
    vector_results = vector_db.similarity_search(query, k=k*2)
    
    # 2. 关键词检索（BM25）
    keyword_results = bm25_search(query, k=k*2)
    
    # 3. 融合排序（RRF - Reciprocal Rank Fusion）
    combined = reciprocal_rank_fusion(vector_results, keyword_results)
    
    return combined[:k]
```

**为什么混合检索更好**：

| 场景 | 纯向量检索 | 纯关键词检索 | 混合检索 |
|------|-----------|-------------|---------|
| "年假政策" | ✅ 能找到语义相关 | ✅ 精确匹配 | ✅ 两者兼得 |
| "PTO policy" | ⚠️ 可能匹配中文"年假" | ❌ 关键词不匹配 | ✅ 通过向量找到 |
| 专有名词"Q4 OKR" | ⚠️ 可能模糊匹配 | ✅ 精确匹配 | ✅ 精确优先 |

## 4. 生成阶段的提示词设计

### 4.1 基础 RAG 提示词模板

```markdown
你是一个专业的问答助手。请根据以下参考资料回答用户的问题。

# 重要规则
1. 只使用参考资料中的信息回答问题
2. 如果参考资料中没有相关信息，明确说明"根据现有资料无法回答"
3. 引用信息时注明来源

# 参考资料
{retrieved_documents}

# 用户问题
{user_question}

# 回答
```

### 4.2 带来源引用的模板

```markdown
请根据参考资料回答问题，并在回答中标注信息来源。

# 参考资料
[1] {document_1}
[2] {document_2}
[3] {document_3}

# 问题
{question}

# 回答要求
- 使用 [来源编号] 标注每个信息点的出处
- 如果多个来源都支持某观点，列出所有相关来源
- 无法从资料中找到答案时，明确说明

# 回答
```

### 4.3 处理无相关信息的情况

```python
def generate_answer(question, retrieved_docs):
    # 检查检索结果的相关性
    if not retrieved_docs or max_relevance_score < 0.7:
        return "抱歉，我在知识库中没有找到与您问题相关的信息。" \
               "您可以尝试换一种方式描述问题，或联系人工客服。"
    
    # 正常生成
    prompt = build_rag_prompt(question, retrieved_docs)
    return llm.generate(prompt)
```

## 5. 完整代码示例

### 5.1 使用 LangChain 构建简单 RAG

```python
from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA

# 1. 加载文档
loader = TextLoader("company_policy.txt")
documents = loader.load()

# 2. 切分文档
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200
)
chunks = text_splitter.split_documents(documents)

# 3. 创建向量存储
embeddings = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(chunks, embeddings)

# 4. 创建检索链
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # 将所有检索结果"塞入"提示词
    retriever=vectorstore.as_retriever(search_kwargs={"k": 3})
)

# 5. 使用
answer = qa_chain.run("公司的年假政策是什么？")
print(answer)
```

### 5.2 不依赖框架的最小实现

```python
import openai
import numpy as np
from typing import List, Tuple

class SimpleRAG:
    def __init__(self, documents: List[str]):
        self.documents = documents
        self.embeddings = self._embed_documents(documents)
    
    def _embed_documents(self, texts: List[str]) -> np.ndarray:
        """批量获取文档嵌入"""
        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=texts
        )
        return np.array([e.embedding for e in response.data])
    
    def _embed_query(self, query: str) -> np.ndarray:
        """获取查询嵌入"""
        response = openai.embeddings.create(
            model="text-embedding-3-small",
            input=query
        )
        return np.array(response.data[0].embedding)
    
    def retrieve(self, query: str, k: int = 3) -> List[Tuple[str, float]]:
        """检索最相关的k个文档"""
        query_embedding = self._embed_query(query)
        
        # 计算余弦相似度
        similarities = np.dot(self.embeddings, query_embedding)
        
        # 获取top-k
        top_indices = np.argsort(similarities)[-k:][::-1]
        
        return [(self.documents[i], similarities[i]) for i in top_indices]
    
    def answer(self, query: str, k: int = 3) -> str:
        """检索并生成回答"""
        # 检索
        retrieved = self.retrieve(query, k)
        context = "\n\n".join([f"[文档{i+1}] {doc}" 
                               for i, (doc, _) in enumerate(retrieved)])
        
        # 生成
        prompt = f"""根据以下参考资料回答问题。如果资料中没有相关信息，请明确说明。

参考资料：
{context}

问题：{query}

回答："""
        
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        
        return response.choices[0].message.content

# 使用示例
documents = [
    "公司年假政策：入职满一年享有5天年假，满三年享有10天年假。",
    "报销流程：提交发票后，财务将在7个工作日内完成审核。",
    "会议室预订：请通过内部系统提前一天预订，每次最长2小时。"
]

rag = SimpleRAG(documents)
answer = rag.answer("年假有多少天？")
print(answer)
```

## 6. RAG 的局限性与优化方向

### 6.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 检索不准 | 查询和文档表述差异大 | 查询改写、混合检索 |
| 答案不完整 | 相关信息分散在多个块 | 增加检索数量、父文档检索 |
| 幻觉仍存在 | LLM 不完全遵循检索结果 | 更强的提示词约束、引用要求 |
| 延迟高 | 检索+生成双重开销 | 缓存、异步处理 |

### 6.2 进阶优化技术

1. **查询改写**：用 LLM 改写用户查询，提升检索效果
2. **重排序（Rerank）**：用专门的模型对检索结果二次排序
3. **父文档检索**：检索小块，返回其所属的大块
4. **多跳检索**：基于初步答案进行二次检索

## 7. 本章小结

| 方面 | 要点 |
|------|------|
| 核心价值 | 解决知识截止和幻觉问题 |
| 关键决策 | 切分策略、向量数据库、检索方式 |
| 提示词设计 | 明确规则、要求引用、处理无结果情况 |
| 局限性 | 检索质量依赖、延迟增加、不能完全消除幻觉 |

**实践建议**：
1. 从简单的本地向量数据库（Chroma）开始
2. 合理设置块大小（500-1000字符）
3. 在提示词中明确要求"只使用参考资料"
4. 监控检索质量，持续优化切分和检索策略

---

## 练习

1. 使用上述 SimpleRAG 代码，为你自己的一份文档（如学习笔记、工作文档）构建一个简单的问答系统。

2. 比较不同的块大小（如 200、500、1000 字符）对检索效果的影响。

3. 思考：如果用户问了一个你的知识库中完全没有的问题，系统应该如何优雅地处理？
