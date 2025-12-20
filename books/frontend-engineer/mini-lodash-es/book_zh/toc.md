# Mini Lodash-ES 源码解析: 精选核心工具函数的实现原理

本书将带你深入 Lodash 源码，掌握 JavaScript 工具函数的设计思想与实现技巧。

- [序言](preface.md)

---

### 第一部分：基础架构 (Foundations)

1. [Lodash 概览与源码结构](foundations/overview.md)
2. [内部工具函数解析](foundations/internal-helpers.md)
3. [类型判断基础设施](foundations/type-checking-infrastructure.md)

---

### 第二部分：类型判断方法 (Lang Methods)

4. [类型判断方法概览](lang/overview.md)
5. [基础类型判断：isArray、isObject、isFunction](lang/basic-type-checks.md)
6. [空值与边界判断：isNil、isEmpty、isEqual](lang/nil-empty-equal.md)
7. [数值类型判断：isNumber、isNaN、isFinite](lang/number-checks.md)
8. [深度克隆：clone 与 cloneDeep](lang/clone.md)
9. [类型转换：toArray、toString、toNumber](lang/type-conversions.md)

---

### 第三部分：数组方法 (Array Methods)

10. [数组方法概览与设计模式](array/overview.md)
11. [数组分块与展平：chunk、flatten、flattenDeep](array/chunk-flatten.md)
12. [数组过滤：compact、uniq、uniqBy](array/compact-uniq.md)
13. [数组查找：find、findIndex、indexOf](array/find-index.md)
14. [数组集合运算：difference、intersection、union](array/set-operations.md)
15. [数组取值：head、last、nth、take、drop](array/access-slice.md)
16. [数组变换：zip、unzip、fromPairs](array/zip-pairs.md)
17. [数组移除：pull、pullAll、remove、without](array/remove-operations.md)

---

### 第四部分：集合方法 (Collection Methods)

18. [集合方法概览与迭代器模式](collection/overview.md)
19. [遍历方法：forEach、forEachRight](collection/foreach.md)
20. [映射方法：map、flatMap](collection/map.md)
21. [过滤方法：filter、reject、partition](collection/filter.md)
22. [查找方法：find、findLast、includes](collection/find-includes.md)
23. [归约方法：reduce、reduceRight](collection/reduce.md)
24. [分组方法：groupBy、keyBy、countBy](collection/groupby.md)
25. [排序方法：sortBy、orderBy](collection/sort.md)
26. [判断方法：every、some](collection/every-some.md)
27. [采样与随机：sample、sampleSize、shuffle](collection/sample-shuffle.md)

---

### 第五部分：对象方法 (Object Methods)

28. [对象方法概览与属性遍历](object/overview.md)
29. [属性访问：get、set、has、unset](object/get-set.md)
30. [对象合并：assign、merge、defaults](object/merge-assign.md)
31. [对象筛选：pick、pickBy、omit、omitBy](object/pick-omit.md)
32. [对象遍历：keys、values、entries、forIn](object/iterate.md)
33. [对象变换：mapKeys、mapValues、invert](object/transform.md)

---

### 第六部分：函数方法 (Function Methods)

34. [函数方法概览与高阶函数](function/overview.md)
35. [节流防抖：debounce、throttle](function/debounce-throttle.md)
36. [函数缓存：memoize](function/memoize.md)
37. [调用控制：once、before、after](function/call-control.md)
38. [柯里化：curry、curryRight](function/curry.md)
39. [参数处理：partial、partialRight、ary](function/partial-ary.md)
40. [函数包装：negate、flip、wrap](function/wrappers.md)
41. [延迟执行：defer、delay](function/defer-delay.md)

---

### 第七部分：字符串方法 (String Methods)

42. [字符串方法概览](string/overview.md)
43. [大小写转换：camelCase、kebabCase、snakeCase](string/case-conversion.md)
44. [字符串处理：trim、pad、repeat、truncate](string/trim-pad.md)
45. [字符串检测：startsWith、endsWith、includes](string/detection.md)
46. [模板引擎：template](string/template.md)

---

### 第八部分：数学与数值方法 (Math & Number Methods)

47. [数学方法：add、subtract、multiply、divide](math/arithmetic.md)
48. [统计方法：max、min、mean、sum](math/statistics.md)
49. [数值处理：clamp、inRange、random](number/number-utils.md)
50. [精度控制：ceil、floor、round](math/rounding.md)

---

### 第九部分：工具方法 (Util Methods)

51. [工具方法概览](util/overview.md)
52. [迭代器工厂：iteratee、matches、property](util/iteratee.md)
53. [函数组合：flow、flowRight](util/flow.md)
54. [生成器：range、times、uniqueId](util/generators.md)
55. [常量函数：identity、constant、noop](util/constants.md)
56. [条件执行：cond、conforms、defaultTo](util/conditionals.md)

---

### 第十部分：链式调用 (Seq Methods)

57. [链式调用概览](seq/overview.md)
58. [链式包装：chain、value](seq/chain-value.md)
59. [惰性求值：tap、thru](seq/lazy-evaluation.md)

---

### 第十一部分：实战与总结 (Practice & Summary)

60. [手写 Mini-Lodash 核心库](practice/mini-lodash-core.md)
61. [Lodash 设计模式总结](practice/design-patterns.md)
62. [与原生 JavaScript 方法对比](practice/native-comparison.md)
63. [总结与学习路径](practice/conclusion.md)
