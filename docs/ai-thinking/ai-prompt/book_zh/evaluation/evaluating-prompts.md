# 度量效果：如何评估提示词的质量

## 1. 为什么需要系统化评估

在提示词工程中，"感觉效果不错"是危险的。没有量化的评估：

- 无法比较不同版本提示词的优劣
- 无法追踪优化的进展
- 无法在问题出现时快速定位原因
- 无法向团队和利益相关者证明改进效果

**核心原则**：任何优化都应该可衡量。

## 2. 评估指标体系

### 2.1 指标分类

```
┌─────────────────────────────────────────────────────────────┐
│                      评估指标体系                            │
├──────────────────────┬──────────────────────────────────────┤
│      定量指标        │              定性指标                 │
│   (可自动计算)       │           (需人工判断)               │
├──────────────────────┼──────────────────────────────────────┤
│ • 格式正确率         │ • 相关性                             │
│ • 关键词覆盖率       │ • 准确性                             │
│ • 响应时间           │ • 完整性                             │
│ • Token 消耗         │ • 可读性                             │
│ • 任务完成率         │ • 风格一致性                         │
└──────────────────────┴──────────────────────────────────────┘
```

### 2.2 定量指标

| 指标 | 计算方式 | 适用场景 |
|------|---------|---------|
| **格式正确率** | 输出能否被解析 / 总数 | JSON、代码生成 |
| **关键词覆盖率** | 包含必需关键词的输出 / 总数 | 信息提取、摘要 |
| **长度符合率** | 在指定长度范围内的输出 / 总数 | 内容生成 |
| **执行成功率** | 生成代码能运行 / 总数 | 代码生成 |
| **延迟** | 平均响应时间 | 实时应用 |
| **成本** | 平均 Token 消耗 | 成本敏感场景 |

**代码示例**：

```python
import json
import time

def evaluate_json_output(outputs: list) -> dict:
    """评估 JSON 输出的质量"""
    metrics = {
        "total": len(outputs),
        "valid_json": 0,
        "has_required_fields": 0,
        "avg_response_time": 0
    }
    
    required_fields = ["title", "summary", "score"]
    total_time = 0
    
    for output, response_time in outputs:
        total_time += response_time
        
        # 检查 JSON 有效性
        try:
            data = json.loads(output)
            metrics["valid_json"] += 1
            
            # 检查必需字段
            if all(field in data for field in required_fields):
                metrics["has_required_fields"] += 1
        except json.JSONDecodeError:
            pass
    
    metrics["avg_response_time"] = total_time / len(outputs)
    metrics["valid_json_rate"] = metrics["valid_json"] / metrics["total"]
    metrics["field_coverage_rate"] = metrics["has_required_fields"] / metrics["total"]
    
    return metrics
```

### 2.3 定性指标评分卡

对于无法自动评估的指标，使用标准化的评分卡：

| 维度 | 1分（差） | 3分（中） | 5分（优） |
|------|----------|----------|----------|
| **准确性** | 存在事实错误 | 基本正确，有小瑕疵 | 完全准确 |
| **相关性** | 答非所问 | 部分相关 | 高度相关 |
| **完整性** | 遗漏关键信息 | 覆盖主要点 | 全面详尽 |
| **可读性** | 难以理解 | 能理解但不流畅 | 清晰易读 |
| **风格一致性** | 完全不符合要求 | 部分符合 | 完全符合 |

## 3. LLM-as-Judge：使用 AI 评估 AI

### 3.1 为什么使用 LLM 评估

| 评估方式 | 优点 | 缺点 | 适用场景 |
|---------|------|------|---------|
| 人工评估 | 最准确 | 慢、贵、不可扩展 | 最终质量把关 |
| 规则评估 | 快、一致 | 只能评估形式 | 格式检查 |
| LLM 评估 | 快、可扩展、能评语义 | 有偏差 | 大规模迭代 |

**核心思想**：用一个 LLM（通常是更强的模型）来评估另一个 LLM 的输出。

### 3.2 基础评估提示词

```markdown
你是一个专业的内容质量评估专家。请评估以下 AI 回答的质量。

## 评估标准
- 准确性（1-5分）：信息是否正确
- 相关性（1-5分）：是否回答了用户问题
- 完整性（1-5分）：是否覆盖了所有要点
- 可读性（1-5分）：表达是否清晰

## 用户问题
{question}

## AI 回答
{answer}

## 参考答案（如有）
{reference}

## 请输出评估结果
以 JSON 格式输出：
{
  "accuracy": {"score": 1-5, "reason": "..."},
  "relevance": {"score": 1-5, "reason": "..."},
  "completeness": {"score": 1-5, "reason": "..."},
  "readability": {"score": 1-5, "reason": "..."},
  "overall": {"score": 1-5, "summary": "..."}
}
```

### 3.3 对比评估（Pairwise Comparison）

当需要比较两个提示词版本时，对比评估比绝对评分更可靠：

```markdown
你是一个专业的内容质量评估专家。请比较以下两个 AI 回答，判断哪个更好。

## 用户问题
{question}

## 回答 A
{answer_a}

## 回答 B
{answer_b}

## 评估要求
1. 从准确性、完整性、可读性三个维度分析
2. 给出你的最终判断：A更好 / B更好 / 差不多
3. 解释你的判断理由

## 评估结果
```

### 3.4 LLM-as-Judge 的局限性

| 问题 | 描述 | 缓解方法 |
|------|------|---------|
| 位置偏差 | 倾向于选择第一个选项 | 随机化选项顺序 |
| 冗长偏差 | 倾向于认为长回答更好 | 明确要求关注内容质量 |
| 自我偏好 | 可能偏好类似自己风格的回答 | 使用不同模型评估 |
| 一致性 | 同一输入可能得到不同评分 | 多次评估取平均 |

**代码示例：降低偏差的评估**

```python
import random

def unbiased_pairwise_eval(question, answer_a, answer_b, evaluator_model):
    """降低偏差的对比评估"""
    # 随机化顺序
    if random.random() > 0.5:
        first, second = answer_a, answer_b
        order = "AB"
    else:
        first, second = answer_b, answer_a
        order = "BA"
    
    prompt = f"""比较以下两个回答，哪个更好？

问题：{question}

回答1：{first}

回答2：{second}

只输出：1 或 2 或 平局"""
    
    result = evaluator_model.generate(prompt)
    
    # 还原真实顺序
    if order == "BA":
        if result == "1":
            return "B"
        elif result == "2":
            return "A"
    else:
        if result == "1":
            return "A"
        elif result == "2":
            return "B"
    return "Tie"
```

## 4. 构建评估数据集

### 4.1 评估集设计原则

| 原则 | 说明 |
|------|------|
| **代表性** | 覆盖实际使用中的各种场景 |
| **多样性** | 包含简单、中等、困难的案例 |
| **边界覆盖** | 包含边缘情况和异常输入 |
| **可维护** | 便于更新和扩展 |

### 4.2 评估集结构

```json
{
  "eval_set": [
    {
      "id": "001",
      "category": "code_generation",
      "difficulty": "medium",
      "input": "写一个 Python 函数，检查字符串是否是回文",
      "expected_output": "...",
      "evaluation_criteria": {
        "must_contain": ["def", "return"],
        "must_not_contain": ["import"],
        "code_must_run": true
      },
      "tags": ["python", "string", "algorithm"]
    }
  ]
}
```

### 4.3 评估集规模建议

| 应用阶段 | 建议规模 | 说明 |
|---------|---------|------|
| 快速迭代 | 20-50 条 | 核心场景覆盖 |
| 正式评估 | 100-200 条 | 完整场景覆盖 |
| 生产监控 | 50-100 条/类别 | 按业务分类 |

## 5. 评估工作流

### 5.1 完整评估流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 1.准备评估集 │───▶│ 2.运行评估  │───▶│ 3.分析结果  │
└─────────────┘    └─────────────┘    └─────────────┘
                                            │
┌─────────────┐    ┌─────────────┐          │
│ 5.部署上线  │◀───│ 4.迭代优化  │◀─────────┘
└─────────────┘    └─────────────┘
```

### 5.2 自动化评估脚本

```python
import json
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class EvalResult:
    input_id: str
    output: str
    metrics: Dict[str, float]
    passed: bool

def run_evaluation(
    prompt_template: str,
    eval_set: List[dict],
    model,
    evaluator_model=None
) -> Dict:
    """运行完整评估流程"""
    results = []
    
    for item in eval_set:
        # 1. 生成输出
        prompt = prompt_template.format(**item)
        output = model.generate(prompt)
        
        # 2. 定量评估
        metrics = {}
        criteria = item.get("evaluation_criteria", {})
        
        # 格式检查
        if "must_contain" in criteria:
            metrics["keyword_coverage"] = sum(
                1 for kw in criteria["must_contain"] if kw in output
            ) / len(criteria["must_contain"])
        
        # 3. LLM 评估（可选）
        if evaluator_model:
            llm_eval = llm_judge(
                item["input"], 
                output, 
                item.get("expected_output"),
                evaluator_model
            )
            metrics["llm_score"] = llm_eval["overall"]["score"]
        
        # 4. 判断是否通过
        passed = all([
            metrics.get("keyword_coverage", 1) >= 0.8,
            metrics.get("llm_score", 5) >= 3
        ])
        
        results.append(EvalResult(
            input_id=item["id"],
            output=output,
            metrics=metrics,
            passed=passed
        ))
    
    # 5. 汇总统计
    summary = {
        "total": len(results),
        "passed": sum(1 for r in results if r.passed),
        "pass_rate": sum(1 for r in results if r.passed) / len(results),
        "avg_metrics": {
            key: sum(r.metrics.get(key, 0) for r in results) / len(results)
            for key in ["keyword_coverage", "llm_score"]
        }
    }
    
    return {"results": results, "summary": summary}
```

## 6. 常见评估陷阱

| 陷阱 | 问题描述 | 解决方案 |
|------|---------|---------|
| 过拟合评估集 | 只针对评估集优化，实际效果差 | 保持评估集和优化独立 |
| 指标游戏 | 优化指标但损害实际体验 | 多维度评估，重视定性反馈 |
| 忽视边缘情况 | 评估集只包含"正常"输入 | 主动设计异常输入测试 |
| 评估标准漂移 | 不同人/时间评估标准不一致 | 使用评分卡，定期校准 |

## 7. 本章小结

| 方面 | 要点 |
|------|------|
| 评估分类 | 定量（自动）+ 定性（人工/LLM） |
| LLM-as-Judge | 可扩展的语义评估，但存在偏差 |
| 评估集 | 代表性、多样性、边界覆盖 |
| 工作流 | 准备→运行→分析→迭代→部署 |

**实践建议**：
1. 从简单的定量指标开始
2. 构建核心场景的评估集（20-50条）
3. 使用 LLM-as-Judge 加速迭代
4. 定期人工审核，校准自动评估
5. 警惕过拟合评估集

---

## 练习

1. 为一个"代码解释"任务设计评估指标（至少包含3个定量指标和2个定性指标）。

2. 编写一个 LLM-as-Judge 的提示词，用于评估"产品描述"的质量。

3. 设计一个包含 10 个测试案例的评估集，覆盖"文本摘要"任务的不同场景。
