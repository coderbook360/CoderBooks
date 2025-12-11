# 自我一致性（Self-Consistency）：通过投票提升准确性

## 1. 问题引入：单次推理的不可靠性

在上一章，我们学习了思维链（CoT）如何通过显式推理提升准确性。但 CoT 仍有局限：**单一推理路径可能出错，而且一旦出错会一路错下去**。

**示例：经典的握手问题**

```
问题：会议室有10个人，每人都与其他所有人握一次手。总共发生多少次握手？

错误的 CoT：
1. 每个人需要和其他9人握手
2. 共有10人
3. 所以总握手次数 = 10 × 9 = 90 次  ← 错误！重复计算了

正确的 CoT：
1. 每个人需要和其他9人握手
2. 共有10人，但每次握手被计算了两次（A握B = B握A）
3. 所以总握手次数 = (10 × 9) / 2 = 45 次
```

同一个问题，不同的推理路径可能得出不同答案。**自我一致性**的核心思想是：**多次独立推理，通过投票选择最一致的答案**。

## 2. 自我一致性的原理

### 2.1 核心机制

```
                    ┌─────────────────┐
                    │     问题        │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ 推理路径1 │        │ 推理路径2 │        │ 推理路径3 │
   │ (高温生成)│        │ (高温生成)│        │ (高温生成)│
   └─────┬────┘        └─────┬────┘        └─────┬────┘
         │                   │                   │
         ▼                   ▼                   ▼
      答案: A             答案: B             答案: A
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   投票聚合       │
                    │   A: 2票         │
                    │   B: 1票         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  最终答案: A     │
                    └─────────────────┘
```

### 2.2 关键参数

| 参数 | 作用 | 推荐值 |
|------|------|--------|
| **Temperature** | 控制推理多样性 | 0.7 - 1.0 |
| **采样次数 n** | 生成的推理路径数 | 5 - 20 |
| **聚合策略** | 如何从多个答案中选择 | 多数投票 |

**为什么需要高温度**：
- 低温度（如 0）：每次生成几乎相同，没有多样性
- 高温度（如 0.7+）：生成不同的推理路径，增加覆盖正确答案的概率

## 3. 完整代码实现

### 3.1 使用 OpenAI API 实现

```python
import openai
from collections import Counter
import re

def self_consistency(
    question: str,
    n_samples: int = 5,
    temperature: float = 0.7,
    model: str = "gpt-4o-mini"
) -> dict:
    """
    自我一致性推理
    
    Args:
        question: 问题
        n_samples: 采样次数
        temperature: 温度参数
        model: 模型名称
    
    Returns:
        包含最终答案和详细结果的字典
    """
    client = openai.OpenAI()
    
    prompt = f"""请解决以下问题，一步一步地思考。

问题：{question}

请在推理过程结束后，用"答案："开头给出最终答案。"""
    
    # 生成多个推理路径
    responses = []
    for _ in range(n_samples):
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=1000
        )
        responses.append(response.choices[0].message.content)
    
    # 提取答案
    answers = []
    for resp in responses:
        # 尝试提取"答案："后面的内容
        match = re.search(r'答案[：:]\s*(.+?)(?:\n|$)', resp)
        if match:
            answer = match.group(1).strip()
            answers.append(answer)
    
    # 投票聚合
    if not answers:
        return {"error": "无法提取答案"}
    
    vote_counts = Counter(answers)
    final_answer, max_votes = vote_counts.most_common(1)[0]
    
    return {
        "question": question,
        "final_answer": final_answer,
        "confidence": max_votes / len(answers),
        "vote_distribution": dict(vote_counts),
        "n_samples": n_samples,
        "reasoning_paths": responses
    }

# 使用示例
result = self_consistency(
    "会议室有10个人，每人都与其他所有人握一次手。总共发生多少次握手？",
    n_samples=5
)

print(f"最终答案: {result['final_answer']}")
print(f"置信度: {result['confidence']:.0%}")
print(f"投票分布: {result['vote_distribution']}")
```

### 3.2 答案标准化

不同推理路径可能用不同格式表达相同答案（如"45"、"45次"、"45 次握手"），需要标准化：

```python
def normalize_answer(answer: str) -> str:
    """标准化答案格式"""
    # 移除单位和额外描述
    answer = answer.strip()
    
    # 提取数字
    numbers = re.findall(r'\d+\.?\d*', answer)
    if numbers:
        return numbers[0]
    
    # 对于非数字答案，统一小写并移除标点
    return re.sub(r'[^\w\s]', '', answer.lower()).strip()

def self_consistency_normalized(question: str, n_samples: int = 5, **kwargs):
    """带答案标准化的自我一致性"""
    result = self_consistency(question, n_samples, **kwargs)
    
    if "error" in result:
        return result
    
    # 标准化所有答案
    normalized_answers = [normalize_answer(a) for a in result["vote_distribution"].keys()]
    
    # 重新计票
    normalized_counts = Counter()
    for original, count in result["vote_distribution"].items():
        normalized = normalize_answer(original)
        normalized_counts[normalized] += count
    
    final_answer, max_votes = normalized_counts.most_common(1)[0]
    
    result["final_answer_normalized"] = final_answer
    result["normalized_vote_distribution"] = dict(normalized_counts)
    
    return result
```

### 3.3 并行生成优化

当采样次数较多时，串行生成会很慢。使用异步请求加速：

```python
import asyncio
from openai import AsyncOpenAI

async def self_consistency_async(
    question: str,
    n_samples: int = 5,
    temperature: float = 0.7,
    model: str = "gpt-4o-mini"
) -> dict:
    """异步并行版本的自我一致性"""
    client = AsyncOpenAI()
    
    prompt = f"""请解决以下问题，一步一步地思考。

问题：{question}

请在推理过程结束后，用"答案："开头给出最终答案。"""
    
    async def generate_one():
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=1000
        )
        return response.choices[0].message.content
    
    # 并行生成所有样本
    responses = await asyncio.gather(*[generate_one() for _ in range(n_samples)])
    
    # 后续处理与同步版本相同...
    answers = []
    for resp in responses:
        match = re.search(r'答案[：:]\s*(.+?)(?:\n|$)', resp)
        if match:
            answers.append(normalize_answer(match.group(1)))
    
    vote_counts = Counter(answers)
    final_answer, max_votes = vote_counts.most_common(1)[0]
    
    return {
        "final_answer": final_answer,
        "confidence": max_votes / len(answers),
        "vote_distribution": dict(vote_counts)
    }

# 使用
# result = asyncio.run(self_consistency_async("你的问题", n_samples=10))
```

## 4. 成本与效果的权衡

### 4.1 成本分析

| 采样次数 | API 成本 | 延迟 | 准确率提升（估计）|
|---------|---------|------|------------------|
| 1（基线）| 1x | 1x | 基线 |
| 3 | 3x | ~3x 或 1x(并行) | +5-10% |
| 5 | 5x | ~5x 或 1x(并行) | +8-15% |
| 10 | 10x | ~10x 或 1x(并行) | +10-20% |
| 20 | 20x | ~20x 或 1x(并行) | 边际收益递减 |

### 4.2 何时使用自我一致性

| 场景 | 是否推荐 | 原因 |
|------|---------|------|
| 数学计算 | ✅ 强烈推荐 | 答案明确，投票有效 |
| 逻辑推理 | ✅ 强烈推荐 | 答案有限，可聚合 |
| 多选题 | ✅ 推荐 | 答案空间有限 |
| 代码生成 | ⚠️ 部分推荐 | 需要额外的正确性验证 |
| 开放式写作 | ❌ 不推荐 | 无"正确"答案可投票 |
| 创意任务 | ❌ 不推荐 | 多样性是优点而非需解决的问题 |

### 4.3 最佳实践

```python
def smart_self_consistency(question: str, complexity: str = "medium"):
    """根据问题复杂度动态调整参数"""
    
    config = {
        "simple": {"n_samples": 3, "temperature": 0.5},
        "medium": {"n_samples": 5, "temperature": 0.7},
        "complex": {"n_samples": 10, "temperature": 0.8},
        "critical": {"n_samples": 20, "temperature": 0.9}
    }
    
    params = config.get(complexity, config["medium"])
    return self_consistency(question, **params)
```

## 5. 进阶变体

### 5.1 加权投票

根据推理路径的"质量"赋予不同权重：

```python
def weighted_self_consistency(question: str, n_samples: int = 5):
    """带权重的自我一致性"""
    client = openai.OpenAI()
    
    # 生成推理路径（同前）
    responses = generate_responses(question, n_samples)
    
    # 使用 LLM 评估每个推理的质量
    weighted_votes = Counter()
    
    for resp in responses:
        answer = extract_answer(resp)
        
        # 评估推理质量
        quality_prompt = f"""评估以下推理的质量（1-5分）：

{resp}

只输出一个数字（1-5）："""
        
        quality_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": quality_prompt}],
            temperature=0
        )
        
        try:
            weight = int(quality_response.choices[0].message.content.strip())
        except:
            weight = 3  # 默认权重
        
        weighted_votes[answer] += weight
    
    final_answer = weighted_votes.most_common(1)[0][0]
    return final_answer
```

### 5.2 早停策略

当答案已经足够一致时，提前停止采样以节省成本：

```python
def early_stopping_self_consistency(
    question: str,
    max_samples: int = 10,
    confidence_threshold: float = 0.8
):
    """带早停的自我一致性"""
    answers = []
    
    for i in range(max_samples):
        response = generate_one_response(question)
        answer = extract_answer(response)
        answers.append(answer)
        
        # 检查是否达到置信度阈值
        if len(answers) >= 3:  # 至少3个样本
            vote_counts = Counter(answers)
            top_answer, top_count = vote_counts.most_common(1)[0]
            confidence = top_count / len(answers)
            
            if confidence >= confidence_threshold:
                print(f"早停于第 {i+1} 个样本，置信度: {confidence:.0%}")
                return top_answer
    
    # 未早停，返回多数投票结果
    return Counter(answers).most_common(1)[0][0]
```

## 6. 本章小结

| 方面 | 要点 |
|------|------|
| 核心原理 | 多次采样 + 高温度 + 投票聚合 |
| 关键参数 | temperature=0.7+, n_samples=5-10 |
| 适用场景 | 答案空间有限的推理任务 |
| 成本权衡 | 线性增加成本，边际收益递减 |
| 优化技巧 | 答案标准化、并行生成、早停策略 |

**实践建议**：
1. 从 n=5 开始，观察投票分布
2. 如果分布很集中（>80%），可以减少采样
3. 如果分布很分散，可能是问题本身有歧义
4. 对于关键任务，使用加权投票提升可靠性

---

## 练习

1. 实现上述 `self_consistency` 函数，并在以下问题上测试：
   - "一个水池，进水管3小时注满，出水管6小时放空。同时开两管，多久注满？"
   
2. 比较 n=3、n=5、n=10 时的答案一致性和成本。

3. 设计一个实验：对于同一个问题，比较 temperature=0 和 temperature=0.8 下的答案分布差异。
