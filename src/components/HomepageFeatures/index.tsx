import {useState, type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

// 书籍数据类型
type BookItem = {
  title: string;
  emoji: string;
  category: string;
  description: ReactNode;
  link: string;
  tags: string[];
};

// 书籍列表数据 - 所有 16 本书籍
const BookList: BookItem[] = [
  // ===== 源码解读系列 =====
  {
    title: 'Mini-Vite 源码解读',
    emoji: '⚡',
    category: '源码解读',
    description: '深入拆解 Vite 核心机制，从开发服务器、插件系统到 HMR，亲手实现 mini-vite。',
    link: '/books/mini-vite',
    tags: ['Vite', 'Node.js', '构建工具'],
  },
  {
    title: 'Mini-Vue3 源码解读',
    emoji: '💚',
    category: '源码解读',
    description: '从零构建 mini-vue3，深入响应式系统、组件渲染、编译器与 Diff 算法。',
    link: '/books/mini-vue3',
    tags: ['Vue3', '响应式', '编译器'],
  },
  {
    title: 'Mini-Acorn.js 解析器',
    emoji: '🌰',
    category: '源码解读',
    description: '解析 Acorn.js 源码，掌握 JavaScript 解析器与 AST 操作的核心原理。',
    link: '/books/mini-acornjs',
    tags: ['AST', '解析器', '编译原理'],
  },
  {
    title: 'Mini-Hammer.js 手势库',
    emoji: '🔨',
    category: '源码解读',
    description: '剖析 Hammer.js 手势识别库，理解触摸事件处理与手势识别算法。',
    link: '/books/mini-hammerjs',
    tags: ['手势', '触摸事件', '移动端'],
  },
  {
    title: 'Mini-Ramda.js 函数式',
    emoji: '🐏',
    category: '源码解读',
    description: '深入 Ramda.js 函数式编程库，掌握柯里化、组合、透镜等核心概念。',
    link: '/books/mini-ramdajs',
    tags: ['函数式', '柯里化', '组合'],
  },
  {
    title: 'Path-to-RegExp 路由',
    emoji: '🛤️',
    category: '源码解读',
    description: '解析 path-to-regexp 源码，理解 Express/Koa 路由匹配的核心实现。',
    link: '/books/mini-path-to-regexp',
    tags: ['路由', '正则', 'Express'],
  },
  {
    title: 'V8 引擎深度剖析',
    emoji: '🚀',
    category: '源码解读',
    description: '深入 V8 引擎底层，理解 JIT 编译、垃圾回收、内存布局与性能优化。',
    link: '/books/v8',
    tags: ['V8', '引擎', '性能'],
  },

  // ===== LeetCode 算法系列 =====
  {
    title: 'LeetCode ① 数据结构基础',
    emoji: '📊',
    category: 'LeetCode',
    description: '系统讲解数组、字符串、链表、栈队列、哈希表、堆、二叉树与位运算。',
    link: '/books/leetcode-ds',
    tags: ['数据结构', '面试', '基础'],
  },
  {
    title: 'LeetCode ② 算法技巧篇',
    emoji: '🎯',
    category: 'LeetCode',
    description: '掌握双指针、滑动窗口、二分查找、贪心算法、分治思想等核心技巧。',
    link: '/books/leetcode-algo',
    tags: ['双指针', '二分', '贪心'],
  },
  {
    title: 'LeetCode ③ 动态规划精通',
    emoji: '🧩',
    category: 'LeetCode',
    description: '系统攻克动态规划，从线性 DP 到背包问题，从区间 DP 到状态压缩。',
    link: '/books/leetcode-dp',
    tags: ['DP', '背包', '状态压缩'],
  },
  {
    title: 'LeetCode ④ 图论与搜索',
    emoji: '🕸️',
    category: 'LeetCode',
    description: '掌握 BFS/DFS、最短路径、拓扑排序、并查集等图论核心算法。',
    link: '/books/leetcode-graph',
    tags: ['图论', 'BFS', '并查集'],
  },
  {
    title: 'LeetCode ⑤ 高级数据结构',
    emoji: '🏗️',
    category: 'LeetCode',
    description: '线段树、树状数组、字典树、平衡树、LRU/LFU 等高级数据结构。',
    link: '/books/leetcode-advanced',
    tags: ['线段树', '字典树', 'LRU'],
  },
  {
    title: 'LeetCode ⑥ 算法竞赛实战',
    emoji: '🏆',
    category: 'LeetCode',
    description: '数论、组合数学、启发式搜索、竞赛模板与大厂面试真题实战。',
    link: '/books/leetcode-competitive',
    tags: ['竞赛', '数论', '真题'],
  },

  // ===== AI 与思维系列 =====
  {
    title: 'AI 提示词工程实战',
    emoji: '🤖',
    category: 'AI & 思维',
    description: '从 P.I.C.A. 方法论到思维链、RAG，掌握构建高质量提示词的核心技巧。',
    link: '/books/ai-prompt',
    tags: ['AI', '提示词', 'LLM'],
  },
  {
    title: '清晰思考',
    emoji: '🧠',
    category: 'AI & 思维',
    description: '培养清晰思考的能力，掌握结构化思维与决策方法论。',
    link: '/books/clear-thinking',
    tags: ['思维', '决策', '方法论'],
  },

  // ===== 前端工具系列 =====
  {
    title: 'UnoCSS 实战指南',
    emoji: '🎨',
    category: '前端工具',
    description: '掌握 UnoCSS 按需生成的原子化 CSS 引擎，构建高性能样式架构。',
    link: '/books/unocss',
    tags: ['CSS', '原子化', '工具'],
  },
];

// 书籍分类（保持顺序）
const categories = ['全部', '源码解读', 'LeetCode', 'AI & 思维', '前端工具'];

// 单本书籍卡片组件
function BookCard({title, emoji, category, description, link, tags}: BookItem) {
  return (
    <div className={clsx('col col--4', styles.bookCol)}>
      <Link to={link} className={styles.bookLink}>
        <div className={styles.bookCard}>
          <div className={styles.bookEmoji}>{emoji}</div>
          <div className={styles.bookCategory}>{category}</div>
          <Heading as="h3" className={styles.bookTitle}>{title}</Heading>
          <p className={styles.bookDescription}>{description}</p>
          <div className={styles.bookTags}>
            {tags.map((tag, idx) => (
              <span key={idx} className={styles.bookTag}>{tag}</span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  // 分类筛选状态
  const [activeCategory, setActiveCategory] = useState('全部');

  // 根据分类筛选书籍
  const filteredBooks = activeCategory === '全部' 
    ? BookList 
    : BookList.filter(book => book.category === activeCategory);

  return (
    <section className={styles.booksSection}>
      <div className="container">
        {/* 标题区域 */}
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            📚 技术书籍
          </Heading>
          <p className={styles.sectionSubtitle}>
            深入源码，掌握本质。精选技术书籍，助力你的编程之路。
          </p>
        </div>

        {/* 分类标签 */}
        <div className={styles.categoryTabs}>
          {categories.map((cat, idx) => (
            <button 
              key={idx} 
              className={clsx(
                styles.categoryTab, 
                activeCategory === cat && styles.categoryTabActive
              )}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 书籍网格 */}
        <div className="row">
          {filteredBooks.map((book, idx) => (
            <BookCard key={idx} {...book} />
          ))}
        </div>

        {/* 更多书籍提示 */}
        <div className={styles.moreBooks}>
          <p>更多书籍正在整理中，敬请期待...</p>
        </div>
      </div>
    </section>
  );
}
