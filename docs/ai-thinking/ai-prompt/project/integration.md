## 26. 项目整合：运行完整的智能规划流程

欢迎来到我们实战项目的“总装车间”！在前面的章节中，我们已经像制造精密零件一样，精心设计了规划器、执行器、综合器和报告生成器这四个核心模块。现在，是时候将这些独立的“思想模块”，用代码的螺丝和焊料，组装成一部完整、强大的“智能规划引擎”了。

本章的核心，就是用代码串联思想，我们将编写一个主控制脚本，它将作为整个流水线的总指挥，调度各个智能体按部就班地完成任务，最终实现从一个模糊需求到一份精美报告的端到端自动化流程。

### 集成的本质：用代码驱动智能体协作

集成的本质，就是将我们为每个模块设计的提示词，封装成一个个可被调用的函数或类，然后用一个主程序来依次调用它们，并管理它们之间的数据传递。

让我们先通过一段高级伪代码，来预览一下这个“总指挥”的工作逻辑。

```python
# main_controller.py (高级伪代码)

def run_full_pipeline(user_request: str):
    # =================================================================
    # 步骤 1: 调用规划器 (Planner)，将模糊需求转化为结构化蓝图
    # =================================================================
    print("\n[1/4] 规划器正在将您的需求转化为旅行蓝图...")
    travel_plan_json = planner_agent.run(user_request)
    print("-> 蓝图已生成！")

    # =================================================================
    # 步骤 2: 循环调用执行器 (Executor)，为蓝图中的每个任务获取原材料
    # =================================================================
    print("\n[2/4] 执行器正在调用工具，搜集航班、酒店等信息...")
    execution_results = {}
    for day_plan in travel_plan_json['daily_plan']:
        for task in day_plan['tasks']:
            # 2.1 获取工具调用指令
            tool_call = executor_agent.run(travel_plan_json, task)
            # 2.2 执行工具并获取原始数据
            raw_data = execute_tool(tool_call['tool_name'], **tool_call['parameters'])
            # 2.3 存储结果
            execution_results[task['task_id']] = raw_data
    print("-> 所有信息搜集完毕！")

    # =================================================================
    # 步骤 3: 循环调用综合器 (Synthesizer)，将原材料烹饪成每日行程
    # =================================================================
    print("\n[3/4] 综合器正在将枯燥的数据撰写成生动的每日行程...")
    daily_plans_collection = []
    for day_plan in travel_plan_json['daily_plan']:
        day_markdown = synthesizer_agent.run(travel_plan_json, execution_results, day_plan['day'])
        daily_plans_collection.append(day_markdown)
    print("-> 每日行程已全部生成！")

    # =================================================================
    # 步骤 4: 调用报告生成器 (Reporter)，将所有内容封装成最终报告
    # =================================================================
    print("\n[4/4] 报告生成器正在进行最终的美化和封装...")
    final_report_markdown = reporter_agent.run(travel_plan_json, daily_plans_collection)
    print("-> 您的专属旅行计划已生成！")

    # =================================================================
    # 最终产出
    # =================================================================
    return final_report_markdown

```

### 智能体的实现：将提示词封装成“黑盒”

为了让主控制流如此清晰，我们需要将每个智能体复杂的“提示词构建”和“LLM API调用”逻辑，封装成一个独立的类。这就像是把复杂的电路板，装进一个有标准接口的“黑盒”里。

下面是一个 `PlannerAgent` 类的简化实现，其他智能体的结构也与此类似：

```python
# agent_lib.py (简化示例)
import openai

class PlannerAgent:
    def __init__(self, api_key):
        self.api_key = api_key
        # 从文件中读取提示词模板，而不是硬编码在代码里
        with open("prompts/planner_prompt.txt", "r") as f:
            self.prompt_template = f.read()

    def run(self, user_request: str) -> dict:
        # 1. 填充提示词模板，构建最终的请求
        final_prompt = self.prompt_template.replace("{{USER_REQUEST}}", user_request)

        # 2. 调用大模型 API
        client = openai.OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": final_prompt}]
        )
        llm_output = response.choices[0].message.content

        # 3. 从返回结果中解析出 <json> 标签内的内容并返回
        # (这里的 parse_json_from_response 是一个自定义的解析函数)
        parsed_json = parse_json_from_response(llm_output, "<json>")
        return parsed_json

```

通过这样的封装，我们的主控制器 `main_controller.py` 就不再关心提示词的具体内容或如何调用API，它只需要知道调用 `planner_agent.run()` 就能得到一个 JSON 格式的蓝图即可。这就是软件工程中的“高内聚，低耦合”思想。

### 端到端运行演示

现在，让我们启动整个流水线！

```python
# 伪代码入口
if __name__ == "__main__":
    # 1. 定义用户的原始需求
    user_request = "下个月我想去巴黎和罗马，玩10天，预算2万，对艺术和美食感兴趣。"
    
    # 2. 运行完整的流水线
    final_plan = run_full_pipeline(user_request)
    
    # 3. 将最终生成的 Markdown 保存到文件
    with open("trip_plan.md", "w", encoding="utf-8") as f:
        f.write(final_plan)
    
    print("\n旅行计划已成功保存到 trip_plan.md 文件！")

```

当这段代码执行时，你将会在控制台看到我们的四个智能体依次开始工作的日志，最终，一个名为 `trip_plan.md` 的文件将被创建。打开它，你将看到一份由 AI 为你量身定制的、完整的、精美的巴黎罗马10日游计划。

### 模块化设计的力量

通过本次实战，我们构建的不仅仅是一个应用，更是一个可扩展、可维护的**智能体框架**。由于采用了高度模块化的设计：

-   **可替换**：如果我们觉得 GPT-4 的规划能力不够好，我们可以轻易地为 `PlannerAgent` 更换一个更强的模型（比如 Claude 3 Opus），而无需改动任何其他代码。
-   **可升级**：如果我们想为执行器增加一个“查询火车票”的新工具，我们只需在执行器的提示词和工具库中进行修改，而不会影响到规划器和综合器。
-   **可重用**：这个四步走的“规划-执行-综合-报告”框架是一个高度通用的模型，你可以轻易地将它适配到其他领域，比如构建一个“自动论文撰写助手”、“市场分析报告生成器”等等。

至此，我们已经走完了整个综合实战项目。你不仅学会了如何设计独立的提示词，更掌握了如何将它们组织成一个协同工作的、强大的智能系统。

在本书的最后一章，我们将进行总结，并展望你作为一名“智能体构建者”的未来之路。