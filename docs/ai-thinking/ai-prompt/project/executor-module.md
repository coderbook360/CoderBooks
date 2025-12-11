## 23. 执行器模块：调用工具查询旅行信息

我们已经有了一份由规划器精心绘制的旅行“蓝图”。现在，是时候将蓝图变为现实了。执行器（Executor）的角色，就是我们团队中的“全能信息搜集员”和“工具调用专家”。它将严格按照蓝图中的每一项任务，去真实的世界（通过API和工具）中获取我们需要的原材料——航班价格、酒店信息、餐厅评分等等。

### 执行器的角色：专注的“任务执行官”

-   **定位**：一个严格、精确、不知疲倦的任务执行官。
-   **输入**：
    1.  **全局上下文 (Global Context)**：由规划器生成的完整旅行计划 JSON。
    2.  **当前任务 (Current Task)**：从上述 JSON 中提取出的、需要当前执行的单个任务对象。
-   **核心任务**：理解当前任务的意图，从一系列可用工具中选择最合适的一个，并生成调用该工具所需的、格式完全正确的参数。
-   **输出**：一个结构化的 JSON 对象，清晰地描述了应该调用哪个工具以及传递什么参数。这本质上就是一种“函数调用”（Function Calling）的实现。

#### 单一职责与全局视野的平衡

执行器完美地体现了“单一职责原则”。它一次只处理一个任务，不关心整个行程如何编排。但同时，它又必须拥有“全局视野”（通过读取完整的旅行计划），这至关重要：

-   **获取必要参数**：当任务是“查询飞往巴黎的航班”时，执行器需要从全局计划中知道“出发日期”是哪一天。
-   **确保逻辑一致**：当任务是“预订罗马的酒店”时，它需要知道在罗马停留几天，以便正确设置预订的入住和退房日期。

### 提示词设计的艺术：让 LLM 学会使用工具

让 LLM 调用工具，是提示词工程中最激动人心的领域之一。其核心在于，你需要在提示词中向模型清晰地“注册”或“声明”它有哪些工具可用，以及每个工具如何使用。

下面，我们通过 P.I.C.A. 模型，来解构执行器的提示词，看看如何引导它将一个自然语言任务，转化为一个精确的机器指令。

```
你是一个顶级的任务执行智能体，专门负责将自然语言任务转化为精确的工具调用指令。

**可用工具列表如下:**

<tools_schema>
[
  {
    "name": "search_flights",
    "description": "根据出发地、目的地和日期，搜索航班信息。",
    "parameters": {
      "type": "object",
      "properties": {
        "departure_city": {"type": "string", "description": "出发城市"},
        "arrival_city": {"type": "string", "description": "到达城市"},
        "date": {"type": "string", "description": "出发日期，格式为 YYYY-MM-DD"}
      },
      "required": ["departure_city", "arrival_city", "date"]
    }
  },
  {
    "name": "search_hotels",
    "description": "根据城市、入住和退房日期以及偏好（如艺术主题）搜索酒店。",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {"type": "string", "description": "所在城市"},
        "check_in_date": {"type": "string", "description": "入住日期，格式为 YYYY-MM-DD"},
        "check_out_date": {"type": "string", "description": "退房日期，格式为 YYYY-MM-DD"},
        "theme": {"type": "string", "description": "酒店主题，可选"}
      },
      "required": ["city", "check_in_date", "check_out_date"]
    }
  }
]
</tools_schema>

**全局旅行计划如下:**

<full_travel_plan>
{{full_plan_json}}
</full_travel_plan>

**当前需要执行的任务如下:**

<current_task>
{{current_task_json}}
</current_task>

请遵循以下步骤：
1.  在 `<thinking>` 标签中，分析当前任务，并结合全局计划，确定需要调用哪个工具，以及所有必需的参数值。
2.  在 `<tool_call>` 标签中，生成一个 JSON 对象，包含 `tool_name` 和 `parameters` 两个字段，用于描述最终的工具调用指令。

```

#### 提示词设计解析

1.  **Persona (角色)**: “顶级的任务执行智能体”，强调其专业性。

2.  **Instruction (指令)**: 核心指令是“将自然语言任务转化为精确的工具调用指令”。
    -   **工具声明 (Tool Schema)**：我们使用 `<tools_schema>` 标签，向模型提供了可用工具的“API 文档”。这份文档采用了类似 JSON Schema 的格式，清晰地定义了每个工具的名称、描述和参数，这是模型能够理解并正确使用工具的基础。
    -   **思维链 (Chain of Thought)**：我们再次使用了 `<thinking>` 标签，引导模型先思考，这对于复杂的参数推断任务至关重要。
    -   **结构化输出 (Structured Output)**：通过 `<tool_call>` 标签，我们确保了模型输出的是一个干净、可直接被代码解析和执行的 JSON 对象。

3.  **Context (情境)**: 提示词包含了两个关键的上下文信息：`full_travel_plan` 和 `current_task`。这使得模型在决策时，既能聚焦于当前，又能顾全大局。

### 迭代执行：从蓝图到原材料库

与规划器一次性生成完整蓝图不同，执行器是在一个循环中被反复调用的。我们的主程序会遍历蓝图中的每一个任务，每次都调用执行器来获取一个工具调用指令，然后执行它，并将结果储存起来。

下面是这个过程的伪代码：

```python
# 伪代码

travel_plan_json = planner_agent(user_request)
execution_results = {}

# 遍历计划中的每一天
for day_plan in travel_plan_json['daily_plan']:
    # 遍历当天的每一个任务
    for task in day_plan['tasks']:
        
        # 1. 调用执行器，获取工具调用指令
        tool_call_instruction = executor_agent(
            full_plan_json=travel_plan_json, 
            current_task_json=task
        )
        
        # 2. 解析指令并执行真实世界的工具
        tool_name = tool_call_instruction['tool_name']
        parameters = tool_call_instruction['parameters']
        
        # 这里的 execute_tool 是一个假设的函数，它会根据 tool_name 
        # 去调用真实的 API，例如 search_flights_api(**parameters)
        raw_data = execute_tool(tool_name, **parameters)
        
        # 3. 将工具返回的原始数据存起来
        execution_results[task['task_id']] = raw_data

# 循环结束后，execution_results 字典就包含了本次旅行所需的所有原始信息
# 例如：{'day1-flight-search': [{'airline': 'CA933', 'price': 8500}, ...], ...}
```

这个循环过程结束后，我们得到的并不是一篇成型的文章，而是一个“原材料库”（`execution_results` 字典）。里面装满了从各个 API 获取到的、最原始、最真实的数据。

现在，我们有了蓝图，也有了原材料。在下一章，我们将介绍综合器（Synthesizer）——团队的"主笔"，看看它如何将这些结构化的数据，转化为一篇有温度、有故事的旅行计划。