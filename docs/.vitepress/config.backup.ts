import { defineConfig } from 'vitepress'

// 中文侧边栏配置
const zhSidebar = {
  '/zh/ai-prompt/': [
    {
      text: 'AI 提示词工程实战',
      items: [
        { text: '📚 目录', link: '/zh/ai-prompt/' },
        { text: '序言', link: '/zh/ai-prompt/preface' }
      ]
    },
    {
      text: '第一部分：基础入门',
      collapsed: false,
      items: [
        { text: '1. AI 基本概念入门', link: '/zh/ai-prompt/foundations/basic-concepts' },
        { text: '2. 主流 LLM 概览', link: '/zh/ai-prompt/foundations/llm-overview' },
        { text: '3. 基础编写技巧', link: '/zh/ai-prompt/foundations/basic-prompting' }
      ]
    },
    {
      text: '第二部分：核心方法论',
      collapsed: false,
      items: [
        { text: '4. O.O.D.A. 框架', link: '/zh/ai-prompt/methodology/ooda-framework' },
        { text: '5. P.I.C.A. 概览', link: '/zh/ai-prompt/methodology/pica-overview' },
        { text: '6. P - 角色设定', link: '/zh/ai-prompt/methodology/persona' },
        { text: '7. I - 指令下达', link: '/zh/ai-prompt/methodology/instruction' },
        { text: '8. C - 情境提供', link: '/zh/ai-prompt/methodology/context' },
        { text: '9. A - 行动触发', link: '/zh/ai-prompt/methodology/action' }
      ]
    },
    {
      text: '第三部分：高级提示技术',
      collapsed: false,
      items: [
        { text: '10. 思维链 (CoT)', link: '/zh/ai-prompt/advanced-techniques/chain-of-thought' },
        { text: '11. 自我一致性', link: '/zh/ai-prompt/advanced-techniques/self-consistency' },
        { text: '12. 知识生成', link: '/zh/ai-prompt/advanced-techniques/knowledge-generation' },
        { text: '13. 检索增强生成 (RAG)', link: '/zh/ai-prompt/advanced-techniques/rag' }
      ]
    },
    {
      text: '第四部分：评估与优化',
      collapsed: true,
      items: [
        { text: '14. 评估提示词质量', link: '/zh/ai-prompt/evaluation/evaluating-prompts' },
        { text: '15. A/B 测试与改进', link: '/zh/ai-prompt/evaluation/ab-testing' },
        { text: '16. 错误分析与修正', link: '/zh/ai-prompt/evaluation/debugging' },
        { text: '17. AI 驱动的优化', link: '/zh/ai-prompt/evaluation/ai-driven-optimization' }
      ]
    },
    {
      text: '第五部分：工程化实践',
      collapsed: true,
      items: [
        { text: '18. 版本控制', link: '/zh/ai-prompt/engineering/prompt-versioning' },
        { text: '19. 团队协作', link: '/zh/ai-prompt/engineering/collaboration' },
        { text: '20. 成本与性能', link: '/zh/ai-prompt/engineering/cost-performance' }
      ]
    },
    {
      text: '第六部分：综合实战',
      collapsed: true,
      items: [
        { text: '21. 项目概览', link: '/zh/ai-prompt/project/project-overview' },
        { text: '22. 规划器模块', link: '/zh/ai-prompt/project/planner-module' },
        { text: '23. 执行器模块', link: '/zh/ai-prompt/project/executor-module' },
        { text: '24. 综合器模块', link: '/zh/ai-prompt/project/synthesizer-module' },
        { text: '25. 报告生成器', link: '/zh/ai-prompt/project/reporter-module' },
        { text: '26. 项目整合', link: '/zh/ai-prompt/project/integration' }
      ]
    },
    {
      text: '第七部分：未来展望',
      collapsed: true,
      items: [
        { text: '27. 总结', link: '/zh/ai-prompt/conclusion/summary' }
      ]
    }
  ],

  '/zh/mini-acornjs/': [
    {
      text: 'JavaScript 解析器实战',
      items: [
        { text: '📚 目录', link: '/zh/mini-acornjs/' },
        { text: '序言', link: '/zh/mini-acornjs/preface' }
      ]
    },
    {
      text: '第一部分：解析器基石',
      collapsed: false,
      items: [
        { text: '1. 解析器概览', link: '/zh/mini-acornjs/foundations/parsing-overview' },
        { text: '2. 编译原理速成', link: '/zh/mini-acornjs/foundations/compiler-primer' },
        { text: '3. ESTree 规范', link: '/zh/mini-acornjs/foundations/estree-specification' },
        { text: '4. Acorn 架构概览', link: '/zh/mini-acornjs/foundations/acorn-architecture' },
        { text: '5. 搭建项目', link: '/zh/mini-acornjs/foundations/project-setup' }
      ]
    },
    {
      text: '第二部分：词法分析',
      collapsed: false,
      items: [
        { text: '6. 词法分析概览', link: '/zh/mini-acornjs/lexical-analysis/overview' },
        { text: '7. Token 数据结构', link: '/zh/mini-acornjs/lexical-analysis/token-data-structure' },
        { text: '8. Tokenizer 实现', link: '/zh/mini-acornjs/lexical-analysis/tokenizer-implementation' },
        { text: '9. 标识符与关键字', link: '/zh/mini-acornjs/lexical-analysis/identifiers-and-keywords' },
        { text: '10. 字面量与正则', link: '/zh/mini-acornjs/lexical-analysis/literals-and-regexp' },
        { text: '11. 运算符与标点', link: '/zh/mini-acornjs/lexical-analysis/operators-and-punctuators' }
      ]
    },
    {
      text: '第三部分：语法分析',
      collapsed: false,
      items: [
        { text: '12. 语法分析概览', link: '/zh/mini-acornjs/syntactic-analysis/overview' },
        { text: '13. Parser 核心', link: '/zh/mini-acornjs/syntactic-analysis/parser-state' },
        { text: '14. 解析器辅助方法', link: '/zh/mini-acornjs/syntactic-analysis/parser-helpers' },
        { text: '15. 程序与顶层节点', link: '/zh/mini-acornjs/syntactic-analysis/program-parsing' },
        { text: '16. 语句解析调度', link: '/zh/mini-acornjs/syntactic-analysis/statement-dispatcher' },
        { text: '17. 基础语句', link: '/zh/mini-acornjs/syntactic-analysis/basic-statements' }
      ]
    },
    {
      text: '第四部分：表达式解析',
      collapsed: true,
      items: [
        { text: '18. 运算符优先级', link: '/zh/mini-acornjs/expressions/challenges' },
        { text: '19. Pratt 解析法核心', link: '/zh/mini-acornjs/expressions/pratt-parser-core' },
        { text: '20. Pratt 解析器实现', link: '/zh/mini-acornjs/expressions/pratt-parser-implementation' },
        { text: '21. 原子与分组表达式', link: '/zh/mini-acornjs/expressions/atomic-and-grouping' },
        { text: '22. 数组与对象字面量', link: '/zh/mini-acornjs/expressions/array-and-object-literals' },
        { text: '23. 前缀与更新表达式', link: '/zh/mini-acornjs/expressions/prefix-and-update' },
        { text: '24. 中缀表达式', link: '/zh/mini-acornjs/expressions/infix-expressions' },
        { text: '25. 后缀、调用与成员', link: '/zh/mini-acornjs/expressions/postfix-call-member' },
        { text: '26. 条件与赋值', link: '/zh/mini-acornjs/expressions/conditional-and-assignment' }
      ]
    },
    {
      text: '第五部分：语句与声明',
      collapsed: true,
      items: [
        { text: '27. 变量声明', link: '/zh/mini-acornjs/semantics/variable-declarations' },
        { text: '28. 条件语句', link: '/zh/mini-acornjs/semantics/conditional-statements' },
        { text: '29. 循环语句', link: '/zh/mini-acornjs/semantics/loop-statements' },
        { text: '30. 控制转移', link: '/zh/mini-acornjs/semantics/control-transfer' },
        { text: '31. 函数解析', link: '/zh/mini-acornjs/semantics/function-parsing' },
        { text: '32. 类解析', link: '/zh/mini-acornjs/semantics/class-parsing' },
        { text: '33. 作用域', link: '/zh/mini-acornjs/semantics/scope-and-symbol-table' },
        { text: '34. ES 模块', link: '/zh/mini-acornjs/semantics/es-modules' }
      ]
    },
    {
      text: '第六部分：AST 应用',
      collapsed: true,
      items: [
        { text: '35. AST 遍历', link: '/zh/mini-acornjs/ast-manipulation/traversal-and-visitor-pattern' },
        { text: '36. 代码生成', link: '/zh/mini-acornjs/ast-manipulation/code-generation' }
      ]
    },
    {
      text: '第七部分：高级特性',
      collapsed: true,
      items: [
        { text: '37. 插件化架构', link: '/zh/mini-acornjs/advanced/plugin-architecture' },
        { text: '38. Source Map', link: '/zh/mini-acornjs/advanced/source-map-generation' },
        { text: '39. 性能优化', link: '/zh/mini-acornjs/advanced/performance-optimization' },
        { text: '40. 错误处理', link: '/zh/mini-acornjs/advanced/error-handling-and-recovery' }
      ]
    }
  ],

  '/zh/mini-ramdajs/': [
    {
      text: 'Ramda 设计与实现',
      items: [
        { text: '📚 目录', link: '/zh/mini-ramdajs/' },
        { text: '序言', link: '/zh/mini-ramdajs/preface' }
      ]
    },
    {
      text: '第一部分：函数式编程基石',
      collapsed: false,
      items: [
        { text: '1. 初识函数式编程', link: '/zh/mini-ramdajs/foundations/intro-to-fp' },
        { text: '2. 纯函数与副作用', link: '/zh/mini-ramdajs/foundations/pure-functions-and-side-effects' },
        { text: '3. 不可变性', link: '/zh/mini-ramdajs/foundations/immutability' },
        { text: '4. Ramda 概览', link: '/zh/mini-ramdajs/foundations/ramda-overview' }
      ]
    },
    {
      text: '第二部分：柯里化与函数组合',
      collapsed: false,
      items: [
        { text: '5. 柯里化', link: '/zh/mini-ramdajs/core-mechanics/currying' },
        { text: '6. curry 实现', link: '/zh/mini-ramdajs/core-mechanics/curry-implementation' },
        { text: '7. 函数组合', link: '/zh/mini-ramdajs/core-mechanics/function-composition' },
        { text: '8. compose 与 pipe', link: '/zh/mini-ramdajs/core-mechanics/compose-pipe-implementation' }
      ]
    },
    {
      text: '第三部分：列表操作',
      collapsed: true,
      items: [
        { text: '9. map 与 forEach', link: '/zh/mini-ramdajs/list-operations/map-and-foreach' },
        { text: '10. filter 与 find', link: '/zh/mini-ramdajs/list-operations/filter-and-find' },
        { text: '11. reduce', link: '/zh/mini-ramdajs/list-operations/reduce' },
        { text: '12. 列表切片', link: '/zh/mini-ramdajs/list-operations/slicing' },
        { text: '13. 列表变换', link: '/zh/mini-ramdajs/list-operations/transforming' },
        { text: '14. 排序与去重', link: '/zh/mini-ramdajs/list-operations/sorting-and-deduping' },
        { text: '15. 分组与聚合', link: '/zh/mini-ramdajs/list-operations/grouping' }
      ]
    },
    {
      text: '第四部分：对象操作',
      collapsed: true,
      items: [
        { text: '16. 属性访问', link: '/zh/mini-ramdajs/object-operations/property-access' },
        { text: '17. 对象更新', link: '/zh/mini-ramdajs/object-operations/updating-objects' },
        { text: '18. 对象合并', link: '/zh/mini-ramdajs/object-operations/merging' },
        { text: '19. 结构转换', link: '/zh/mini-ramdajs/object-operations/structure-conversion' }
      ]
    },
    {
      text: '第五部分：逻辑与流程',
      collapsed: true,
      items: [
        { text: '20. 条件逻辑', link: '/zh/mini-ramdajs/logic-flow/conditional-logic' },
        { text: '21. 断言组合', link: '/zh/mini-ramdajs/logic-flow/predicate-composition' },
        { text: '22. 布尔运算', link: '/zh/mini-ramdajs/logic-flow/boolean-and-comparison' }
      ]
    },
    {
      text: '第六部分：Transducer',
      collapsed: true,
      items: [
        { text: '23. Transducer 思想', link: '/zh/mini-ramdajs/transducers/intro-to-transducers' },
        { text: '24. map Transducer', link: '/zh/mini-ramdajs/transducers/map-transducer' },
        { text: '25. 组合与 sequence', link: '/zh/mini-ramdajs/transducers/composition-and-sequence' }
      ]
    },
    {
      text: '第七部分：Lenses',
      collapsed: true,
      items: [
        { text: '26. Lenses 思想', link: '/zh/mini-ramdajs/lenses/intro-to-lenses' },
        { text: '27. lens 实现', link: '/zh/mini-ramdajs/lenses/lens-implementation' },
        { text: '28. Lenses 组合', link: '/zh/mini-ramdajs/lenses/lens-composition' }
      ]
    },
    {
      text: '第八部分：内部架构',
      collapsed: true,
      items: [
        { text: '29. 架构概览', link: '/zh/mini-ramdajs/internal-architecture/overview' },
        { text: '30. 核心工具', link: '/zh/mini-ramdajs/internal-architecture/core-helpers' },
        { text: '31. 公共 API 构建', link: '/zh/mini-ramdajs/internal-architecture/building-a-public-api' }
      ]
    }
  ],

  '/zh/mini-hammerjs/': [
    {
      text: 'Mini Hammer.js 实战',
      items: [
        { text: '📚 目录', link: '/zh/mini-hammerjs/' },
        { text: '序言', link: '/zh/mini-hammerjs/preface' }
      ]
    },
    {
      text: '第一部分：启程',
      collapsed: false,
      items: [
        { text: '1. 手势库的世界', link: '/zh/mini-hammerjs/getting-started/introduction' },
        { text: '2. 为何构建手势库', link: '/zh/mini-hammerjs/getting-started/why-build-gesture-library' },
        { text: '3. Hammer.js 快速上手', link: '/zh/mini-hammerjs/getting-started/hammerjs-quick-start' }
      ]
    },
    {
      text: '第二部分：构建核心引擎',
      collapsed: false,
      items: [
        { text: '4. 常量与工具函数', link: '/zh/mini-hammerjs/building-core-engine/constants-and-utils' },
        { text: '5. EventEmitter', link: '/zh/mini-hammerjs/building-core-engine/event-emitter' },
        { text: '6. 输入适配层', link: '/zh/mini-hammerjs/building-core-engine/input-adapter' },
        { text: '7. 输入处理', link: '/zh/mini-hammerjs/building-core-engine/input-processing-touch-action' },
        { text: '8. 手势状态机', link: '/zh/mini-hammerjs/building-core-engine/gesture-state-machine' },
        { text: '9. Manager', link: '/zh/mini-hammerjs/building-core-engine/manager' },
        { text: '10. Recognizer 基类', link: '/zh/mini-hammerjs/building-core-engine/recognizer-base-class' }
      ]
    },
    {
      text: '第三部分：实现核心手势',
      collapsed: true,
      items: [
        { text: '11. 实现 Tap', link: '/zh/mini-hammerjs/implementing-recognizers/tap' },
        { text: '12. 实现 Pan', link: '/zh/mini-hammerjs/implementing-recognizers/pan' },
        { text: '13. 实现 Swipe', link: '/zh/mini-hammerjs/implementing-recognizers/swipe' },
        { text: '14. 实现 Press', link: '/zh/mini-hammerjs/implementing-recognizers/press' }
      ]
    },
    {
      text: '第四部分：高级手势与协同',
      collapsed: true,
      items: [
        { text: '15. Pinch & Rotate', link: '/zh/mini-hammerjs/advanced-essence/pinch-rotate' },
        { text: '16. 手势协同', link: '/zh/mini-hammerjs/advanced-essence/recognizewith-requirefailure' },
        { text: '17. 手势冲突', link: '/zh/mini-hammerjs/advanced-essence/handling-gesture-conflicts' }
      ]
    },
    {
      text: '第五部分：封装',
      collapsed: true,
      items: [
        { text: '18. 最终组装', link: '/zh/mini-hammerjs/final-assembly/next-steps' }
      ]
    }
  ],

  '/zh/mini-vite/': [
    {
      text: 'Vite 内核实现',
      items: [
        { text: '📚 目录', link: '/zh/mini-vite/' },
        { text: '序言', link: '/zh/mini-vite/preface' }
      ]
    },
    {
      text: '第一部分：设计概览',
      collapsed: false,
      items: [
        { text: '1. 目标与架构', link: '/zh/mini-vite/overview/goals-and-architecture' },
        { text: '2. 数据流与模块图', link: '/zh/mini-vite/overview/dataflow-and-module-graph' },
        { text: '3. 开发与构建边界', link: '/zh/mini-vite/overview/dev-vs-build' },
        { text: '4. 配置解析', link: '/zh/mini-vite/overview/config-resolution-and-defaults' }
      ]
    },
    {
      text: '第二部分：开发服务器',
      collapsed: false,
      items: [
        { text: '5. 启动流程', link: '/zh/mini-vite/dev-server/startup-and-environments' },
        { text: '6. 中间件管线', link: '/zh/mini-vite/dev-server/middleware-pipeline' },
        { text: '7. 路径解析', link: '/zh/mini-vite/dev-server/path-resolution-and-static' },
        { text: '8. 文件监听', link: '/zh/mini-vite/dev-server/file-watching-and-events' }
      ]
    },
    {
      text: '第三部分：插件系统',
      collapsed: true,
      items: [
        { text: '9. 插件模型与钩子', link: '/zh/mini-vite/plugins/plugin-model-and-hooks' },
        { text: '10. 插件容器', link: '/zh/mini-vite/plugins/plugin-container-and-context' },
        { text: '11. HTML 变换', link: '/zh/mini-vite/plugins/index-html-transform' },
        { text: '12. 内置插件', link: '/zh/mini-vite/plugins/builtin-plugins-and-patterns' }
      ]
    },
    {
      text: '第四部分：依赖优化',
      collapsed: true,
      items: [
        { text: '13. 扫描与入口分析', link: '/zh/mini-vite/dep-optimization/scan-and-entry-analysis' },
        { text: '14. 预构建与缓存', link: '/zh/mini-vite/dep-optimization/prebundle-and-cache' },
        { text: '15. 优化策略', link: '/zh/mini-vite/dep-optimization/strategies-and-edge-cases' }
      ]
    },
    {
      text: '第五部分：环境与变量',
      collapsed: true,
      items: [
        { text: '16. 环境文件与模式', link: '/zh/mini-vite/env-mode/env-files-and-mode' },
        { text: '17. import.meta.env', link: '/zh/mini-vite/env-mode/import-meta-env-and-exposure' }
      ]
    },
    {
      text: '第六部分：模块图',
      collapsed: true,
      items: [
        { text: '18. 模块图结构', link: '/zh/mini-vite/module-graph/graph-structure-and-nodes' },
        { text: '19. URL 解析', link: '/zh/mini-vite/module-graph/url-resolution-and-entry' },
        { text: '20. 转换缓存', link: '/zh/mini-vite/module-graph/transform-cache-and-invalidation' }
      ]
    },
    {
      text: '第七部分：HMR',
      collapsed: true,
      items: [
        { text: '21. WebSocket 通道', link: '/zh/mini-vite/hmr/ws-channel-and-handshake' },
        { text: '22. 更新传播', link: '/zh/mini-vite/hmr/update-propagation-and-boundary' },
        { text: '23. 客户端处理', link: '/zh/mini-vite/hmr/client-handling-and-accept' },
        { text: '24. 模块运行器', link: '/zh/mini-vite/hmr/module-runner-and-transport' }
      ]
    },
    {
      text: '第八部分：构建与预览',
      collapsed: true,
      items: [
        { text: '25. 构建选项', link: '/zh/mini-vite/build/options-and-rollup-integration' },
        { text: '26. 插件链与产物', link: '/zh/mini-vite/build/plugin-chain-and-output' },
        { text: '27. 预览服务器', link: '/zh/mini-vite/build/preview-server-and-deploy' }
      ]
    },
    {
      text: '第九部分：SSR',
      collapsed: true,
      items: [
        { text: '28. 环境与模块加载', link: '/zh/mini-vite/ssr/environment-and-module-loader' },
        { text: '29. 堆栈重写', link: '/zh/mini-vite/ssr/stacktrace-and-errors' },
        { text: '30. SSR 清单', link: '/zh/mini-vite/ssr/manifest-and-preload' }
      ]
    },
    {
      text: '第十部分：实践项目',
      collapsed: true,
      items: [
        { text: '31. 范围与需求', link: '/zh/mini-vite/project/scope-and-requirements' },
        { text: '32. 最小开发服务器', link: '/zh/mini-vite/project/minimal-dev-server' },
        { text: '33. 模块图与 HMR', link: '/zh/mini-vite/project/module-graph-and-basic-hmr' },
        { text: '34. 简化插件系统', link: '/zh/mini-vite/project/minimal-plugin-system' },
        { text: '35. 简化构建', link: '/zh/mini-vite/project/minimal-build-and-preview' },
        { text: '36. 整合与测试', link: '/zh/mini-vite/project/integration-and-testing' }
      ]
    }
  ],

  '/zh/mini-path-to-regexp/': [
    {
      text: 'Mini Path-to-RegExp',
      items: [
        { text: '📚 目录', link: '/zh/mini-path-to-regexp/' },
        { text: '序言', link: '/zh/mini-path-to-regexp/preface' }
      ]
    },
    {
      text: '第一部分：基础原理',
      collapsed: false,
      items: [
        { text: '1. API 与核心流程', link: '/zh/mini-path-to-regexp/foundations/overview' },
        { text: '2. 核心概念', link: '/zh/mini-path-to-regexp/foundations/core-concepts' },
        { text: '3. 设计思想', link: '/zh/mini-path-to-regexp/foundations/design-philosophy' }
      ]
    },
    {
      text: '第二部分：路径解析',
      collapsed: false,
      items: [
        { text: '4. 词法分析', link: '/zh/mini-path-to-regexp/implementation/lexical-analysis' },
        { text: '5. Token 数据结构', link: '/zh/mini-path-to-regexp/implementation/token-data-structure' },
        { text: '6. parse 函数', link: '/zh/mini-path-to-regexp/implementation/parse-function' },
        { text: '7. pathToRegexp 函数', link: '/zh/mini-path-to-regexp/implementation/pathtoregexp-function' },
        { text: '8. 高级模式', link: '/zh/mini-path-to-regexp/implementation/advanced-patterns' }
      ]
    },
    {
      text: '第三部分：路径编译',
      collapsed: false,
      items: [
        { text: '9. compile 函数', link: '/zh/mini-path-to-regexp/implementation/compile-function' },
        { text: '10. match 函数', link: '/zh/mini-path-to-regexp/implementation/match-function' },
        { text: '11. 错误处理', link: '/zh/mini-path-to-regexp/implementation/error-handling' }
      ]
    }
  ],

  '/zh/v8-book/': [
    {
      text: 'V8 引擎深度解析',
      items: [
        { text: '📚 目录', link: '/zh/v8-book/' },
        { text: '序言', link: '/zh/v8-book/preface' }
      ]
    },
    {
      text: '第一部分：架构与执行流程',
      collapsed: false,
      items: [
        { text: '1. V8 引擎概览', link: '/zh/v8-book/foundations/v8-overview' },
        { text: '2. 解析过程', link: '/zh/v8-book/foundations/parsing-process' },
        { text: '3. 抽象语法树 (AST)', link: '/zh/v8-book/foundations/ast-structure' },
        { text: '4. 字节码与解释器', link: '/zh/v8-book/foundations/bytecode-interpreter' },
        { text: '5. 即时编译 (JIT)', link: '/zh/v8-book/foundations/jit-compilation' }
      ]
    },
    {
      text: '第二部分：基本类型',
      collapsed: false,
      items: [
        { text: '6. Tagged Pointer 与 Smi', link: '/zh/v8-book/types/tagged-pointer-smi' },
        { text: '7. 基本类型存储', link: '/zh/v8-book/types/basic-types-storage' },
        { text: '8. 类型转换', link: '/zh/v8-book/types/type-conversion' },
        { text: '9. 字符串内部表示', link: '/zh/v8-book/types/string-representation' },
        { text: '10. JSON 处理', link: '/zh/v8-book/types/json-processing' },
        { text: '11. 对象内存结构', link: '/zh/v8-book/types/object-memory-structure' },
        { text: '12. 隐藏类', link: '/zh/v8-book/types/hidden-class' },
        { text: '13. 数组优化', link: '/zh/v8-book/types/array-optimization' },
        { text: '14. 函数对象', link: '/zh/v8-book/types/function-object' }
      ]
    },
    {
      text: '第三部分：高级类型',
      collapsed: true,
      items: [
        { text: '15. 属性描述符', link: '/zh/v8-book/advanced-types/property-descriptors' },
        { text: '16. 访问器属性', link: '/zh/v8-book/advanced-types/accessor-properties' },
        { text: '17. 对象不可变性', link: '/zh/v8-book/advanced-types/object-immutability' },
        { text: '18. Map 与 Set', link: '/zh/v8-book/advanced-types/map-set' },
        { text: '19. WeakMap 与 WeakSet', link: '/zh/v8-book/advanced-types/weakmap-weakset' },
        { text: '20. BigInt', link: '/zh/v8-book/advanced-types/bigint' },
        { text: '21. 类与继承', link: '/zh/v8-book/advanced-types/class-inheritance' },
        { text: '22. ArrayBuffer 与 TypedArray', link: '/zh/v8-book/advanced-types/arraybuffer-typedarray' },
        { text: '23. 迭代器与生成器', link: '/zh/v8-book/advanced-types/iterator-generator' }
      ]
    },
    {
      text: '第四部分：模块系统',
      collapsed: true,
      items: [
        { text: '24. ESM 模块系统', link: '/zh/v8-book/modules/esm-system' },
        { text: '25. 模块作用域', link: '/zh/v8-book/modules/module-scope' },
        { text: '26. 循环依赖', link: '/zh/v8-book/modules/circular-dependency' }
      ]
    },
    {
      text: '第五部分：执行上下文',
      collapsed: true,
      items: [
        { text: '27. 执行上下文', link: '/zh/v8-book/execution/execution-context' },
        { text: '28. 作用域链', link: '/zh/v8-book/execution/scope-chain' },
        { text: '29. 闭包实现', link: '/zh/v8-book/execution/closure-implementation' },
        { text: '30. this 绑定', link: '/zh/v8-book/execution/this-binding' },
        { text: '31. 词法环境', link: '/zh/v8-book/execution/lexical-environment' },
        { text: '32. new 操作符', link: '/zh/v8-book/execution/new-operator' },
        { text: '33. 严格模式', link: '/zh/v8-book/execution/strict-mode' },
        { text: '34. with 与 eval', link: '/zh/v8-book/execution/with-eval' }
      ]
    },
    {
      text: '第六部分：内存管理',
      collapsed: true,
      items: [
        { text: '35. 堆结构', link: '/zh/v8-book/memory/heap-structure' },
        { text: '36. GC 算法', link: '/zh/v8-book/memory/gc-algorithms' },
        { text: '37. 增量 GC', link: '/zh/v8-book/memory/incremental-gc' },
        { text: '38. 内存对齐', link: '/zh/v8-book/memory/memory-alignment' },
        { text: '39. 内存泄漏', link: '/zh/v8-book/memory/memory-leaks' },
        { text: '40. Heap Snapshot', link: '/zh/v8-book/memory/heap-snapshot' },
        { text: '41. FinalizationRegistry', link: '/zh/v8-book/memory/finalization-registry' }
      ]
    },
    {
      text: '第七部分：性能优化',
      collapsed: true,
      items: [
        { text: '42. 内联缓存', link: '/zh/v8-book/optimization/inline-cache' },
        { text: '43. IC 状态', link: '/zh/v8-book/optimization/ic-states' },
        { text: '44. TurboFan 编译器', link: '/zh/v8-book/optimization/turbofan-compiler' },
        { text: '45. 去优化', link: '/zh/v8-book/optimization/deoptimization' },
        { text: '46. 内联函数', link: '/zh/v8-book/optimization/function-inlining' },
        { text: '47. 尾调用优化', link: '/zh/v8-book/optimization/tail-call-optimization' },
        { text: '48. V8 友好代码', link: '/zh/v8-book/optimization/v8-friendly-code' }
      ]
    },
    {
      text: '第八部分：异步机制',
      collapsed: true,
      items: [
        { text: '49. 事件循环', link: '/zh/v8-book/async/event-loop' },
        { text: '50. Promise 内部机制', link: '/zh/v8-book/async/promise-internals' },
        { text: '51. async/await', link: '/zh/v8-book/async/async-await' },
        { text: '52. 定时器实现', link: '/zh/v8-book/async/timers' },
        { text: '53. 异步迭代器', link: '/zh/v8-book/async/async-iterator' },
        { text: '54. Node.js 事件循环', link: '/zh/v8-book/async/nodejs-event-loop' }
      ]
    },
    {
      text: '第九部分：调试机制',
      collapsed: true,
      items: [
        { text: '55. 错误堆栈', link: '/zh/v8-book/debugging/error-stack-trace' },
        { text: '56. try-catch 性能', link: '/zh/v8-book/debugging/try-catch-performance' },
        { text: '57. Source Map', link: '/zh/v8-book/debugging/source-map' },
        { text: '58. 调试协议', link: '/zh/v8-book/debugging/debug-protocol' }
      ]
    },
    {
      text: '第十部分：高级主题',
      collapsed: true,
      items: [
        { text: '59. 原型链', link: '/zh/v8-book/advanced/prototype-chain' },
        { text: '60. Proxy 与 Reflect', link: '/zh/v8-book/advanced/proxy-reflect' },
        { text: '61. Symbol', link: '/zh/v8-book/advanced/symbol' },
        { text: '62. 正则引擎', link: '/zh/v8-book/advanced/regexp-engine' },
        { text: '63. WebAssembly 集成', link: '/zh/v8-book/advanced/wasm-integration' },
        { text: '64. SharedArrayBuffer', link: '/zh/v8-book/advanced/shared-arraybuffer' },
        { text: '65. Realm 隔离', link: '/zh/v8-book/advanced/realm-isolation' },
        { text: '66. DevTools 性能面板', link: '/zh/v8-book/advanced/devtools-performance' },
        { text: '67. d8 工具', link: '/zh/v8-book/advanced/v8-d8-tool' },
        { text: '68. 案例：性能瓶颈', link: '/zh/v8-book/advanced/case-performance-bottleneck' },
        { text: '69. 案例：内存泄漏', link: '/zh/v8-book/advanced/case-memory-leak' }
      ]
    }
  ]
}

// 英文侧边栏配置
const enSidebar = {
  '/en/mini-acornjs/': [
    {
      text: 'JavaScript Parser in Practice',
      items: [
        { text: '📚 Contents', link: '/en/mini-acornjs/' },
        { text: 'Preface', link: '/en/mini-acornjs/preface' }
      ]
    },
    {
      text: 'Part 1: Parser Foundations',
      collapsed: false,
      items: [
        { text: '1. Parser Overview', link: '/en/mini-acornjs/foundations/parsing-overview' },
        { text: '2. Compiler Primer', link: '/en/mini-acornjs/foundations/compiler-primer' },
        { text: '3. ESTree Specification', link: '/en/mini-acornjs/foundations/estree-specification' },
        { text: '4. Acorn Architecture', link: '/en/mini-acornjs/foundations/acorn-architecture' },
        { text: '5. Project Setup', link: '/en/mini-acornjs/foundations/project-setup' }
      ]
    },
    {
      text: 'Part 2: Lexical Analysis',
      collapsed: false,
      items: [
        { text: '6. Lexical Analysis Overview', link: '/en/mini-acornjs/lexical-analysis/overview' },
        { text: '7. Token Data Structure', link: '/en/mini-acornjs/lexical-analysis/token-data-structure' },
        { text: '8. Tokenizer Implementation', link: '/en/mini-acornjs/lexical-analysis/tokenizer-implementation' },
        { text: '9. Identifiers & Keywords', link: '/en/mini-acornjs/lexical-analysis/identifiers-and-keywords' },
        { text: '10. Literals & RegExp', link: '/en/mini-acornjs/lexical-analysis/literals-and-regexp' },
        { text: '11. Operators & Punctuators', link: '/en/mini-acornjs/lexical-analysis/operators-and-punctuators' }
      ]
    },
    {
      text: 'Part 3: Syntactic Analysis',
      collapsed: true,
      items: [
        { text: '12. Syntactic Analysis Overview', link: '/en/mini-acornjs/syntactic-analysis/overview' },
        { text: '13. Parser Core', link: '/en/mini-acornjs/syntactic-analysis/parser-state' },
        { text: '14. Parser Helpers', link: '/en/mini-acornjs/syntactic-analysis/parser-helpers' },
        { text: '15. Program Parsing', link: '/en/mini-acornjs/syntactic-analysis/program-parsing' },
        { text: '16. Statement Dispatcher', link: '/en/mini-acornjs/syntactic-analysis/statement-dispatcher' },
        { text: '17. Basic Statements', link: '/en/mini-acornjs/syntactic-analysis/basic-statements' }
      ]
    },
    {
      text: 'Part 4: Expression Parsing',
      collapsed: true,
      items: [
        { text: '18. Operator Precedence', link: '/en/mini-acornjs/expressions/challenges' },
        { text: '19. Pratt Parser Core', link: '/en/mini-acornjs/expressions/pratt-parser-core' },
        { text: '20. Pratt Parser Implementation', link: '/en/mini-acornjs/expressions/pratt-parser-implementation' },
        { text: '21. Atomic & Grouping', link: '/en/mini-acornjs/expressions/atomic-and-grouping' },
        { text: '22. Array & Object Literals', link: '/en/mini-acornjs/expressions/array-and-object-literals' },
        { text: '23. Prefix & Update', link: '/en/mini-acornjs/expressions/prefix-and-update' },
        { text: '24. Infix Expressions', link: '/en/mini-acornjs/expressions/infix-expressions' },
        { text: '25. Postfix, Call & Member', link: '/en/mini-acornjs/expressions/postfix-call-member' },
        { text: '26. Conditional & Assignment', link: '/en/mini-acornjs/expressions/conditional-and-assignment' }
      ]
    },
    {
      text: 'Part 5: Statements & Declarations',
      collapsed: true,
      items: [
        { text: '27. Variable Declarations', link: '/en/mini-acornjs/semantics/variable-declarations' },
        { text: '28. Conditional Statements', link: '/en/mini-acornjs/semantics/conditional-statements' },
        { text: '29. Loop Statements', link: '/en/mini-acornjs/semantics/loop-statements' },
        { text: '30. Control Transfer', link: '/en/mini-acornjs/semantics/control-transfer' },
        { text: '31. Function Parsing', link: '/en/mini-acornjs/semantics/function-parsing' },
        { text: '32. Class Parsing', link: '/en/mini-acornjs/semantics/class-parsing' },
        { text: '33. Scope', link: '/en/mini-acornjs/semantics/scope-and-symbol-table' },
        { text: '34. ES Modules', link: '/en/mini-acornjs/semantics/es-modules' }
      ]
    },
    {
      text: 'Part 6: AST Applications',
      collapsed: true,
      items: [
        { text: '35. AST Traversal', link: '/en/mini-acornjs/ast-manipulation/traversal-and-visitor-pattern' },
        { text: '36. Code Generation', link: '/en/mini-acornjs/ast-manipulation/code-generation' }
      ]
    },
    {
      text: 'Part 7: Advanced Features',
      collapsed: true,
      items: [
        { text: '37. Plugin Architecture', link: '/en/mini-acornjs/advanced/plugin-architecture' },
        { text: '38. Source Map', link: '/en/mini-acornjs/advanced/source-map-generation' },
        { text: '39. Performance', link: '/en/mini-acornjs/advanced/performance-optimization' },
        { text: '40. Error Handling', link: '/en/mini-acornjs/advanced/error-handling-and-recovery' }
      ]
    }
  ],

  '/en/mini-ramdajs/': [
    {
      text: 'Ramda Design & Implementation',
      items: [
        { text: '📚 Contents', link: '/en/mini-ramdajs/' },
        { text: 'Preface', link: '/en/mini-ramdajs/preface' }
      ]
    },
    {
      text: 'Part 1: FP Foundations',
      collapsed: false,
      items: [
        { text: '1. Intro to FP', link: '/en/mini-ramdajs/foundations/intro-to-fp' },
        { text: '2. Pure Functions', link: '/en/mini-ramdajs/foundations/pure-functions-and-side-effects' },
        { text: '3. Immutability', link: '/en/mini-ramdajs/foundations/immutability' },
        { text: '4. Ramda Overview', link: '/en/mini-ramdajs/foundations/ramda-overview' }
      ]
    },
    {
      text: 'Part 2: Currying & Composition',
      collapsed: false,
      items: [
        { text: '5. Currying', link: '/en/mini-ramdajs/core-mechanics/currying' },
        { text: '6. curry Implementation', link: '/en/mini-ramdajs/core-mechanics/curry-implementation' },
        { text: '7. Function Composition', link: '/en/mini-ramdajs/core-mechanics/function-composition' },
        { text: '8. compose & pipe', link: '/en/mini-ramdajs/core-mechanics/compose-pipe-implementation' }
      ]
    },
    {
      text: 'Part 3: List Operations',
      collapsed: true,
      items: [
        { text: '9. map & forEach', link: '/en/mini-ramdajs/list-operations/map-and-foreach' },
        { text: '10. filter & find', link: '/en/mini-ramdajs/list-operations/filter-and-find' },
        { text: '11. reduce', link: '/en/mini-ramdajs/list-operations/reduce' },
        { text: '12. Slicing', link: '/en/mini-ramdajs/list-operations/slicing' },
        { text: '13. Transforming', link: '/en/mini-ramdajs/list-operations/transforming' },
        { text: '14. Sorting & Deduping', link: '/en/mini-ramdajs/list-operations/sorting-and-deduping' },
        { text: '15. Grouping', link: '/en/mini-ramdajs/list-operations/grouping' }
      ]
    },
    {
      text: 'Part 4: Object Operations',
      collapsed: true,
      items: [
        { text: '16. Property Access', link: '/en/mini-ramdajs/object-operations/property-access' },
        { text: '17. Updating Objects', link: '/en/mini-ramdajs/object-operations/updating-objects' },
        { text: '18. Merging', link: '/en/mini-ramdajs/object-operations/merging' },
        { text: '19. Structure Conversion', link: '/en/mini-ramdajs/object-operations/structure-conversion' }
      ]
    },
    {
      text: 'Part 5: Logic & Control Flow',
      collapsed: true,
      items: [
        { text: '20. Conditional Logic', link: '/en/mini-ramdajs/logic-flow/conditional-logic' },
        { text: '21. Predicate Composition', link: '/en/mini-ramdajs/logic-flow/predicate-composition' },
        { text: '22. Boolean & Comparison', link: '/en/mini-ramdajs/logic-flow/boolean-and-comparison' }
      ]
    },
    {
      text: 'Part 6: Transducers',
      collapsed: true,
      items: [
        { text: '23. Intro to Transducers', link: '/en/mini-ramdajs/transducers/intro-to-transducers' },
        { text: '24. map Transducer', link: '/en/mini-ramdajs/transducers/map-transducer' },
        { text: '25. Composition & sequence', link: '/en/mini-ramdajs/transducers/composition-and-sequence' }
      ]
    },
    {
      text: 'Part 7: Lenses',
      collapsed: true,
      items: [
        { text: '26. Intro to Lenses', link: '/en/mini-ramdajs/lenses/intro-to-lenses' },
        { text: '27. lens Implementation', link: '/en/mini-ramdajs/lenses/lens-implementation' },
        { text: '28. Lens Composition', link: '/en/mini-ramdajs/lenses/lens-composition' }
      ]
    },
    {
      text: 'Part 8: Internal Architecture',
      collapsed: true,
      items: [
        { text: '29. Architecture Overview', link: '/en/mini-ramdajs/internal-architecture/overview' },
        { text: '30. Core Helpers', link: '/en/mini-ramdajs/internal-architecture/core-helpers' },
        { text: '31. Building Public API', link: '/en/mini-ramdajs/internal-architecture/building-a-public-api' }
      ]
    }
  ],

  '/en/mini-hammerjs/': [
    {
      text: 'Mini Hammer.js in Practice',
      items: [
        { text: '📚 Contents', link: '/en/mini-hammerjs/' },
        { text: 'Preface', link: '/en/mini-hammerjs/preface' }
      ]
    },
    {
      text: 'Part 1: Getting Started',
      collapsed: false,
      items: [
        { text: '1. Introduction', link: '/en/mini-hammerjs/getting-started/introduction' },
        { text: '2. Why Build a Gesture Library', link: '/en/mini-hammerjs/getting-started/why-build-gesture-library' },
        { text: '3. Hammer.js Quick Start', link: '/en/mini-hammerjs/getting-started/hammerjs-quick-start' }
      ]
    },
    {
      text: 'Part 2: Building Core Engine',
      collapsed: false,
      items: [
        { text: '4. Constants & Utils', link: '/en/mini-hammerjs/building-core-engine/constants-and-utils' },
        { text: '5. EventEmitter', link: '/en/mini-hammerjs/building-core-engine/event-emitter' },
        { text: '6. Input Adapter', link: '/en/mini-hammerjs/building-core-engine/input-adapter' },
        { text: '7. Input Processing', link: '/en/mini-hammerjs/building-core-engine/input-processing-touch-action' },
        { text: '8. Gesture State Machine', link: '/en/mini-hammerjs/building-core-engine/gesture-state-machine' },
        { text: '9. Manager', link: '/en/mini-hammerjs/building-core-engine/manager' },
        { text: '10. Recognizer Base', link: '/en/mini-hammerjs/building-core-engine/recognizer-base-class' }
      ]
    },
    {
      text: 'Part 3: Core Gestures',
      collapsed: true,
      items: [
        { text: '11. Tap', link: '/en/mini-hammerjs/implementing-recognizers/tap' },
        { text: '12. Pan', link: '/en/mini-hammerjs/implementing-recognizers/pan' },
        { text: '13. Swipe', link: '/en/mini-hammerjs/implementing-recognizers/swipe' },
        { text: '14. Press', link: '/en/mini-hammerjs/implementing-recognizers/press' }
      ]
    },
    {
      text: 'Part 4: Advanced Gestures',
      collapsed: true,
      items: [
        { text: '15. Pinch & Rotate', link: '/en/mini-hammerjs/advanced-essence/pinch-rotate' },
        { text: '16. Gesture Coordination', link: '/en/mini-hammerjs/advanced-essence/recognizewith-requirefailure' },
        { text: '17. Conflict Handling', link: '/en/mini-hammerjs/advanced-essence/handling-gesture-conflicts' }
      ]
    },
    {
      text: 'Part 5: Packaging',
      collapsed: true,
      items: [
        { text: '18. Final Assembly', link: '/en/mini-hammerjs/final-assembly/next-steps' }
      ]
    }
  ],

  '/en/mini-path-to-regexp/': [
    {
      text: 'Mini Path-to-RegExp',
      items: [
        { text: '📚 Contents', link: '/en/mini-path-to-regexp/' },
        { text: 'Preface', link: '/en/mini-path-to-regexp/preface' }
      ]
    },
    {
      text: 'Part 1: Foundational Principles',
      collapsed: false,
      items: [
        { text: '1. API & Core Flow', link: '/en/mini-path-to-regexp/foundations/overview' },
        { text: '2. Core Concepts', link: '/en/mini-path-to-regexp/foundations/core-concepts' },
        { text: '3. Design Philosophy', link: '/en/mini-path-to-regexp/foundations/design-philosophy' }
      ]
    },
    {
      text: 'Part 2: Path Parsing',
      collapsed: false,
      items: [
        { text: '4. Lexical Analysis', link: '/en/mini-path-to-regexp/implementation/lexical-analysis' },
        { text: '5. Token Data Structure', link: '/en/mini-path-to-regexp/implementation/token-data-structure' },
        { text: '6. parse Function', link: '/en/mini-path-to-regexp/implementation/parse-function' },
        { text: '7. pathToRegexp Function', link: '/en/mini-path-to-regexp/implementation/pathtoregexp-function' },
        { text: '8. Advanced Patterns', link: '/en/mini-path-to-regexp/implementation/advanced-patterns' }
      ]
    },
    {
      text: 'Part 3: Path Compilation',
      collapsed: false,
      items: [
        { text: '9. compile Function', link: '/en/mini-path-to-regexp/implementation/compile-function' },
        { text: '10. match Function', link: '/en/mini-path-to-regexp/implementation/match-function' },
        { text: '11. Error Handling', link: '/en/mini-path-to-regexp/implementation/error-handling' }
      ]
    }
  ]
}

export default defineConfig({
  title: "CoderBooks",
  description: "程序员的进阶技术迷你书 / Mini Tech Books for Programmers",
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  locales: {
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { 
            text: '前端框架', 
            items: [
              {
                text: '构建工具',
                items: [
                  { text: 'Mini Vite 内核', link: '/zh/mini-vite/' },
                ]
              },
              {
                text: '交互库',
                items: [
                  { text: 'Mini Hammer.js', link: '/zh/mini-hammerjs/' },
                ]
              }
            ]
          },
          { 
            text: '编译原理', 
            items: [
              {
                text: 'JavaScript 解析',
                items: [
                  { text: 'Mini Acorn 解析器', link: '/zh/mini-acornjs/' },
                ]
              },
              {
                text: '路由匹配',
                items: [
                  { text: 'Mini Path-to-RegExp', link: '/zh/mini-path-to-regexp/' },
                ]
              }
            ]
          },
          { 
            text: '语言进阶', 
            items: [
              {
                text: '函数式编程',
                items: [
                  { text: 'Ramda 设计与实现', link: '/zh/mini-ramdajs/' },
                ]
              },
              {
                text: '引擎原理',
                items: [
                  { text: 'V8 引擎深度解析', link: '/zh/v8-book/' },
                ]
              }
            ]
          },
          { 
            text: 'AI 技术', 
            items: [
              {
                text: '提示工程',
                items: [
                  { text: 'AI 提示词工程实战', link: '/zh/ai-prompt/' },
                ]
              }
            ]
          }
        ],
        sidebar: zhSidebar,
        outline: { label: '页面导航' },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        search: {
          provider: 'local',
          options: {
            translations: {
              button: { buttonText: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换' }
              }
            }
          }
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { 
            text: 'Frameworks', 
            items: [
              {
                text: 'Interaction',
                items: [
                  { text: 'Mini Hammer.js', link: '/en/mini-hammerjs/' },
                ]
              }
            ]
          },
          { 
            text: 'Compilers', 
            items: [
              {
                text: 'JavaScript Parsing',
                items: [
                  { text: 'Mini Acorn Parser', link: '/en/mini-acornjs/' },
                ]
              },
              {
                text: 'Route Matching',
                items: [
                  { text: 'Mini Path-to-RegExp', link: '/en/mini-path-to-regexp/' },
                ]
              }
            ]
          },
          { 
            text: 'Advanced', 
            items: [
              {
                text: 'Functional Programming',
                items: [
                  { text: 'Ramda Design', link: '/en/mini-ramdajs/' },
                ]
              }
            ]
          }
        ],
        sidebar: enSidebar,
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
        search: {
          provider: 'local'
        }
      }
    }
  },

  themeConfig: {
    logo: '/logo.png',
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/user/CoderBooks' }
    ],

    footer: {
      message: 'Released under the MIT License',
      copyright: 'Copyright © 2024 CoderBooks'
    }
  }
})
