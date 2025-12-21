# 手写 mini-vitest: 从零实现现代化测试框架

本书将带你深入理解测试框架的核心原理，从零开始实现一个功能完备的 mini-vitest，掌握测试运行器、断言库、Mock 系统、快照测试等核心模块的设计与实现。

- [序言](index.md)

---

### 第一部分：测试框架基础

1. [测试框架发展历程](foundations/testing-history.md)
2. [Vitest 与 Jest 的对比分析](foundations/vitest-vs-jest.md)
3. [Vitest 核心架构概览](foundations/vitest-architecture.md)
4. [Vite 生态集成原理](foundations/vite-integration.md)
5. [项目初始化与开发环境搭建](foundations/project-setup.md)
6. [ESM 优先设计理念](foundations/esm-first-design.md)

---

### 第二部分：配置系统

7. [配置文件加载机制](configuration/config-loading.md)
8. [配置解析与合并策略](configuration/config-resolution.md)
9. [Vite 配置复用机制](configuration/vite-config-reuse.md)
10. [defineConfig 类型推导](configuration/define-config.md)
11. [环境变量处理](configuration/environment-variables.md)
12. [Project 多项目配置](configuration/projects-support.md)

---

### 第三部分：测试文件发现与过滤

13. [测试文件匹配模式](file-discovery/file-patterns.md)
14. [Glob 模式解析实现](file-discovery/glob-parsing.md)
15. [include 与 exclude 规则](file-discovery/include-exclude.md)
16. [Test Filtering 实现](file-discovery/test-filtering.md)
17. [文件变更检测机制](file-discovery/file-change-detection.md)
18. [依赖关系追踪](file-discovery/dependency-tracking.md)

---

### 第四部分：模块解析与转换

19. [ESM 模块加载器设计](module-resolution/esm-loader.md)
20. [TypeScript 转换集成](module-resolution/typescript-transform.md)
21. [JSX/TSX 处理机制](module-resolution/jsx-tsx-transform.md)
22. [路径别名解析](module-resolution/path-aliases.md)
23. [模块缓存策略](module-resolution/module-caching.md)
24. [动态导入处理](module-resolution/dynamic-imports.md)

---

### 第五部分：Test Runner 核心引擎

25. [Test Runner 架构设计](test-runner/architecture.md)
26. [测试收集阶段](test-runner/test-collection.md)
27. [测试执行调度](test-runner/execution-scheduler.md)
28. [Worker 进程管理](test-runner/worker-management.md)
29. [child_process vs worker_threads](test-runner/process-vs-threads.md)
30. [测试隔离策略](test-runner/test-isolation.md)
31. [执行结果聚合](test-runner/result-aggregation.md)

---

### 第六部分：Test API 实现

32. [test/it 函数设计](test-api/test-function.md)
33. [describe 测试套件](test-api/describe-suite.md)
34. [test.skip 跳过测试](test-api/test-skip.md)
35. [test.only 独占执行](test-api/test-only.md)
36. [test.todo 待办测试](test-api/test-todo.md)
37. [test.fails 预期失败](test-api/test-fails.md)
38. [test.each 参数化测试](test-api/test-each.md)
39. [test.for 增强参数化](test-api/test-for.md)
40. [test.extend 扩展上下文](test-api/test-extend.md)
41. [test.skipIf/runIf 条件执行](test-api/conditional-execution.md)

---

### 第七部分：并发执行

42. [test.concurrent 并发测试](concurrent/concurrent-tests.md)
43. [describe.concurrent 并发套件](concurrent/concurrent-suites.md)
44. [test.sequential 顺序执行](concurrent/sequential-tests.md)
45. [describe.shuffle 随机顺序](concurrent/shuffle-tests.md)
46. [并发控制与资源竞争](concurrent/concurrency-control.md)
47. [maxConcurrency 配置](concurrent/max-concurrency.md)
48. [fileParallelism 文件并行](concurrent/file-parallelism.md)

---

### 第八部分：生命周期钩子

49. [beforeAll 全局前置](hooks/before-all.md)
50. [afterAll 全局后置](hooks/after-all.md)
51. [beforeEach 单例前置](hooks/before-each.md)
52. [afterEach 单例后置](hooks/after-each.md)
53. [onTestFinished 测试完成回调](hooks/on-test-finished.md)
54. [onTestFailed 测试失败回调](hooks/on-test-failed.md)
55. [钩子执行顺序与作用域](hooks/execution-order.md)
56. [清理函数模式](hooks/cleanup-pattern.md)

---

### 第九部分：Test Context

57. [Test Context 设计理念](test-context/context-design.md)
58. [context.expect 本地断言](test-context/local-expect.md)
59. [context.skip 动态跳过](test-context/dynamic-skip.md)
60. [Fixtures 机制](test-context/fixtures.md)
61. [自定义 Context 扩展](test-context/custom-context.md)
62. [Context 在并发测试中的应用](test-context/context-in-concurrent.md)

---

### 第十部分：Expect 断言系统

63. [Expect 架构设计](expect/architecture.md)
64. [Chai 集成与兼容](expect/chai-integration.md)
65. [toBe 严格相等](expect/to-be.md)
66. [toEqual 深度相等](expect/to-equal.md)
67. [toStrictEqual 严格深度相等](expect/to-strict-equal.md)
68. [toContain 包含检查](expect/to-contain.md)
69. [toMatch 正则匹配](expect/to-match.md)
70. [toThrowError 异常断言](expect/to-throw-error.md)
71. [toBeNull/Undefined/Defined](expect/null-undefined.md)
72. [toBeTruthy/Falsy 布尔转换](expect/truthy-falsy.md)
73. [toBeGreaterThan/LessThan 数值比较](expect/number-comparisons.md)
74. [toBeCloseTo 浮点数比较](expect/floating-point.md)
75. [toHaveProperty 属性检查](expect/to-have-property.md)
76. [toHaveLength 长度检查](expect/to-have-length.md)
77. [toMatchObject 对象匹配](expect/to-match-object.md)
78. [expect.not 取反断言](expect/not-modifier.md)

---

### 第十一部分：异步断言

79. [resolves 成功解析](async-expect/resolves.md)
80. [rejects 拒绝断言](async-expect/rejects.md)
81. [expect.poll 轮询断言](async-expect/poll.md)
82. [expect.soft 软断言](async-expect/soft-assertions.md)
83. [expect.assertions 断言计数](async-expect/assertion-count.md)
84. [expect.hasAssertions 断言存在](async-expect/has-assertions.md)

---

### 第十二部分：Mock 断言

85. [toHaveBeenCalled 调用检查](mock-assertions/to-have-been-called.md)
86. [toHaveBeenCalledTimes 调用次数](mock-assertions/called-times.md)
87. [toHaveBeenCalledWith 参数检查](mock-assertions/called-with.md)
88. [toHaveBeenLastCalledWith 最后调用](mock-assertions/last-called-with.md)
89. [toHaveBeenNthCalledWith 第 N 次调用](mock-assertions/nth-called-with.md)
90. [toHaveReturned 返回检查](mock-assertions/to-have-returned.md)
91. [toHaveReturnedWith 返回值检查](mock-assertions/returned-with.md)
92. [toHaveResolved Promise 解析检查](mock-assertions/to-have-resolved.md)

---

### 第十三部分：非对称匹配器

93. [expect.anything 任意值](asymmetric/anything.md)
94. [expect.any 类型匹配](asymmetric/any.md)
95. [expect.arrayContaining 数组包含](asymmetric/array-containing.md)
96. [expect.objectContaining 对象包含](asymmetric/object-containing.md)
97. [expect.stringContaining 字符串包含](asymmetric/string-containing.md)
98. [expect.stringMatching 字符串匹配](asymmetric/string-matching.md)
99. [expect.closeTo 近似值](asymmetric/close-to.md)
100. [自定义非对称匹配器](asymmetric/custom-matchers.md)

---

### 第十四部分：Expect 扩展

101. [expect.extend 机制](expect-extend/extend-mechanism.md)
102. [自定义匹配器实现](expect-extend/custom-matchers.md)
103. [TypeScript 类型扩展](expect-extend/typescript-types.md)
104. [expect.addEqualityTesters](expect-extend/equality-testers.md)
105. [this.utils 工具方法](expect-extend/utils.md)
106. [匹配器错误信息格式化](expect-extend/error-formatting.md)

---

### 第十五部分：Vi Mock 函数

107. [vi.fn 创建 Mock 函数](vi-mock/vi-fn.md)
108. [Mock 实例数据结构](vi-mock/mock-instance.md)
109. [mock.calls 调用记录](vi-mock/mock-calls.md)
110. [mock.results 返回记录](vi-mock/mock-results.md)
111. [mock.instances 实例记录](vi-mock/mock-instances.md)
112. [mockImplementation 实现替换](vi-mock/mock-implementation.md)
113. [mockImplementationOnce 单次实现](vi-mock/mock-implementation-once.md)
114. [mockReturnValue 返回值设置](vi-mock/mock-return-value.md)
115. [mockResolvedValue 异步返回值](vi-mock/mock-resolved-value.md)
116. [mockRejectedValue 异步拒绝值](vi-mock/mock-rejected-value.md)
117. [mockClear/Reset/Restore](vi-mock/mock-clear-reset-restore.md)

---

### 第十六部分：Vi Spy 间谍函数

118. [vi.spyOn 方法间谍](vi-spy/spy-on.md)
119. [Getter/Setter 间谍](vi-spy/getter-setter-spy.md)
120. [间谍与原始实现](vi-spy/spy-original.md)
121. [vi.isMockFunction 类型检查](vi-spy/is-mock-function.md)
122. [vi.mocked 类型辅助](vi-spy/mocked-helper.md)
123. [vi.clearAllMocks 批量清除](vi-spy/clear-all-mocks.md)
124. [vi.resetAllMocks 批量重置](vi-spy/reset-all-mocks.md)
125. [vi.restoreAllMocks 批量还原](vi-spy/restore-all-mocks.md)

---

### 第十七部分：模块 Mock

126. [vi.mock 模块模拟](module-mock/vi-mock.md)
127. [vi.mock hoisting 机制](module-mock/hoisting.md)
128. [vi.hoisted 变量提升](module-mock/vi-hoisted.md)
129. [vi.doMock 非提升模拟](module-mock/vi-do-mock.md)
130. [vi.unmock 取消模拟](module-mock/vi-unmock.md)
131. [vi.importActual 导入原始模块](module-mock/import-actual.md)
132. [vi.importMock 导入模拟模块](module-mock/import-mock.md)
133. [__mocks__ 目录约定](module-mock/mocks-directory.md)
134. [工厂函数模式](module-mock/factory-function.md)
135. [自动 Mock 算法](module-mock/auto-mocking.md)
136. [vi.resetModules 模块缓存重置](module-mock/reset-modules.md)

---

### 第十八部分：Fake Timers

137. [vi.useFakeTimers 启用假计时器](fake-timers/use-fake-timers.md)
138. [vi.useRealTimers 恢复真实计时器](fake-timers/use-real-timers.md)
139. [vi.setSystemTime 设置系统时间](fake-timers/set-system-time.md)
140. [vi.advanceTimersByTime 时间推进](fake-timers/advance-timers-by-time.md)
141. [vi.advanceTimersToNextTimer 下一个计时器](fake-timers/advance-to-next-timer.md)
142. [vi.runAllTimers 运行所有计时器](fake-timers/run-all-timers.md)
143. [vi.runOnlyPendingTimers 运行待处理计时器](fake-timers/run-pending-timers.md)
144. [vi.getTimerCount 计时器计数](fake-timers/get-timer-count.md)
145. [vi.advanceTimersToNextFrame 下一帧推进](fake-timers/advance-to-next-frame.md)
146. [@sinonjs/fake-timers 集成](fake-timers/sinon-fake-timers.md)

---

### 第十九部分：环境与全局变量

147. [vi.stubGlobal 全局变量模拟](globals/stub-global.md)
148. [vi.unstubAllGlobals 全局变量还原](globals/unstub-all-globals.md)
149. [vi.stubEnv 环境变量模拟](globals/stub-env.md)
150. [vi.unstubAllEnvs 环境变量还原](globals/unstub-all-envs.md)
151. [test.environment 配置](globals/test-environment.md)
152. [happy-dom 集成](globals/happy-dom.md)
153. [jsdom 集成](globals/jsdom.md)

---

### 第二十部分：快照测试

154. [快照测试原理](snapshot/snapshot-principles.md)
155. [toMatchSnapshot 文件快照](snapshot/to-match-snapshot.md)
156. [toMatchInlineSnapshot 内联快照](snapshot/to-match-inline-snapshot.md)
157. [toMatchFileSnapshot 自定义文件快照](snapshot/to-match-file-snapshot.md)
158. [快照文件格式设计](snapshot/snapshot-format.md)
159. [快照更新机制](snapshot/snapshot-updating.md)
160. [pretty-format 序列化](snapshot/pretty-format.md)
161. [自定义序列化器](snapshot/custom-serializers.md)
162. [toThrowErrorMatchingSnapshot](snapshot/error-snapshot.md)

---

### 第二十一部分：代码覆盖率

163. [覆盖率收集原理](coverage/coverage-principles.md)
164. [v8 Provider 实现](coverage/v8-provider.md)
165. [Istanbul Provider 实现](coverage/istanbul-provider.md)
166. [覆盖率指标详解](coverage/coverage-metrics.md)
167. [include/exclude 配置](coverage/include-exclude.md)
168. [覆盖率报告生成](coverage/report-generation.md)
169. [HTML 报告渲染](coverage/html-reporter.md)
170. [覆盖率阈值检查](coverage/thresholds.md)
171. [自定义覆盖率 Provider](coverage/custom-provider.md)

---

### 第二十二部分：Reporter 报告系统

172. [Reporter 架构设计](reporters/architecture.md)
173. [默认 Reporter 实现](reporters/default-reporter.md)
174. [Verbose Reporter](reporters/verbose-reporter.md)
175. [JSON Reporter](reporters/json-reporter.md)
176. [JUnit Reporter](reporters/junit-reporter.md)
177. [TAP Reporter](reporters/tap-reporter.md)
178. [自定义 Reporter 开发](reporters/custom-reporter.md)
179. [Reporter 事件钩子](reporters/event-hooks.md)
180. [测试结果输出格式化](reporters/output-formatting.md)

---

### 第二十三部分：Watch Mode

181. [Watch Mode 架构](watch-mode/architecture.md)
182. [文件监听机制](watch-mode/file-watching.md)
183. [HMR 式测试更新](watch-mode/hmr-updates.md)
184. [智能测试重跑](watch-mode/smart-rerun.md)
185. [交互式命令处理](watch-mode/interactive-commands.md)
186. [--standalone 模式](watch-mode/standalone-mode.md)
187. [变更文件过滤](watch-mode/changed-file-filtering.md)

---

### 第二十四部分：CLI 命令行

188. [CLI 解析器实现](cli/cli-parser.md)
189. [vitest run 命令](cli/run-command.md)
190. [vitest watch 命令](cli/watch-command.md)
191. [vitest bench 命令](cli/bench-command.md)
192. [--filter 测试过滤](cli/filter-option.md)
193. [--shard 分片执行](cli/shard-option.md)
194. [--merge-reports 报告合并](cli/merge-reports.md)
195. [命令行参数与配置合并](cli/config-merge.md)

---

### 第二十五部分：Benchmark 性能测试

196. [bench 函数实现](benchmark/bench-function.md)
197. [Tinybench 集成](benchmark/tinybench-integration.md)
198. [性能指标计算](benchmark/performance-metrics.md)
199. [bench.skip/only/todo](benchmark/bench-modifiers.md)
200. [Benchmark 报告输出](benchmark/benchmark-report.md)

---

### 第二十六部分：类型测试

201. [类型测试原理](type-testing/principles.md)
202. [expectTypeOf 实现](type-testing/expect-type-of.md)
203. [assertType 实现](type-testing/assert-type.md)
204. [类型推断检查](type-testing/type-inference.md)
205. [--typecheck 模式](type-testing/typecheck-mode.md)

---

### 第二十七部分：浏览器模式

206. [Browser Mode 架构](browser-mode/architecture.md)
207. [Playwright 集成](browser-mode/playwright-integration.md)
208. [WebdriverIO 集成](browser-mode/webdriverio-integration.md)
209. [组件测试支持](browser-mode/component-testing.md)
210. [Locator API 实现](browser-mode/locator-api.md)
211. [可视化回归测试](browser-mode/visual-regression.md)

---

### 第二十八部分：In-Source Testing

212. [In-Source Testing 原理](in-source/principles.md)
213. [import.meta.vitest 检测](in-source/vitest-detection.md)
214. [测试代码剥离](in-source/test-stripping.md)
215. [tree-shaking 集成](in-source/tree-shaking.md)

---

### 第二十九部分：Vitest UI

216. [Vitest UI 架构](vitest-ui/architecture.md)
217. [WebSocket 通信](vitest-ui/websocket-communication.md)
218. [测试结果可视化](vitest-ui/result-visualization.md)
219. [覆盖率可视化](vitest-ui/coverage-visualization.md)
220. [交互式调试](vitest-ui/interactive-debugging.md)

---

### 第三十部分：性能优化

221. [启动时间优化](performance/startup-optimization.md)
222. [Worker 池管理](performance/worker-pool.md)
223. [模块缓存优化](performance/module-caching.md)
224. [测试分片策略](performance/sharding-strategy.md)
225. [OpenTelemetry 集成](performance/open-telemetry.md)

---

### 第三十一部分：生态系统集成

226. [setupFiles 配置](ecosystem/setup-files.md)
227. [globalSetup 配置](ecosystem/global-setup.md)
228. [Extending Matchers 最佳实践](ecosystem/extending-matchers.md)
229. [IDE 集成机制](ecosystem/ide-integration.md)
230. [VS Code 扩展通信](ecosystem/vscode-extension.md)

---

### 第三十二部分：从 Jest 迁移

231. [Jest 兼容性层](migration/jest-compatibility.md)
232. [API 差异对照](migration/api-differences.md)
233. [配置迁移指南](migration/config-migration.md)
234. [常见迁移问题](migration/common-issues.md)

---

### 附录

235. [Vitest 核心 API 速查](appendix/api-reference.md)
236. [配置选项完整列表](appendix/config-options.md)
237. [错误排查指南](appendix/troubleshooting.md)
238. [术语表](appendix/glossary.md)
239. [参考资源](appendix/resources.md)
