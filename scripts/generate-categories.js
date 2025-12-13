/**
 * 自动生成 _category_.json 脚本
 * 
 * 功能：
 * 1. 扫描 docs 下所有书籍目录
 * 2. 解析 toc.md 获取章节标题和顺序
 * 3. 为每个子目录生成 _category_.json
 * 
 * 使用方式：node scripts/generate-categories.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const CONFIG_PATH = path.join(__dirname, '..', 'books-config.json');

// 目录名称到中文标签的映射（作为备用）
const FOLDER_LABELS = {
  // 通用章节名
  'overview': '概览',
  'preface': '序言',
  'foundations': '基础',
  'introduction': '导论',
  'appendix': '附录',
  'conclusion': '总结',
  'practice': '实战',
  'project': '项目实践',
  'advanced': '进阶',
  
  // Mini-Vite 特定
  'dev-server': '开发服务器',
  'plugins': '插件系统',
  'dep-optimization': '依赖优化',
  'env-mode': '环境与变量',
  'module-graph': '模块图与转换',
  'hmr': 'HMR 热更新',
  'build': '构建与预览',
  'ssr': 'SSR 服务端渲染',
  
  // Mini-Vue3 特定
  'reactivity': '响应式系统',
  'reactivity-advanced': '响应式进阶',
  'scheduler': '调度器系统',
  'renderer': '渲染器',
  'diff': 'Diff 算法',
  'component': '组件系统',
  'compiler': '编译器',
  'keep-alive': 'KeepAlive',
  'teleport': 'Teleport',
  'suspense': 'Suspense',
  
  // LeetCode 系列
  'array': '数组',
  'string': '字符串',
  'string-matching': '字符串匹配',
  'linked-list': '链表',
  'stack-queue': '栈与队列',
  'hash-table': '哈希表',
  'heap': '堆',
  'binary-tree': '二叉树',
  'bst': '二叉搜索树',
  'bit-manipulation': '位运算',
  'monotonic-stack': '单调栈',
  'graph-basics': '图论基础',
  'dfs': '深度优先搜索',
  'bfs': '广度优先搜索',
  'graph-traversal': '图遍历',
  'topological-sort': '拓扑排序',
  'union-find': '并查集',
  'shortest-path': '最短路径',
  'mst': '最小生成树',
  'search-advanced': '高级搜索',
  'bipartite': '二分图',
  'memoization': '记忆化搜索',
  'linear-dp': '线性 DP',
  'knapsack': '背包问题',
  'state-machine': '状态机 DP',
  'sequence-dp': '序列 DP',
  'interval-dp': '区间 DP',
  'game-dp': '博弈 DP',
  'state-compression': '状态压缩',
  'digit-dp': '数位 DP',
  'tree-dp': '树形 DP',
  'dp-optimization': 'DP 优化',
  'comprehensive': '综合练习',
  
  // Acorn.js 系列
  'lexical-analysis': '词法分析',
  'syntactic-analysis': '语法分析',
  'expressions': '表达式解析',
  'ast-manipulation': 'AST 操作',
  'semantics': '语义分析',
  
  // Hammer.js 系列
  'gesture-theory': '手势理论',
  'recognizers': '识别器',
  'input': '输入处理',
  'events': '事件系统',
  
  // AI Prompt 系列
  'methodology': '方法论',
  'engineering': '工程实践',
  'evaluation': '评估方法',
  
  // 清晰思考
  'method': '思维方法',
  
  // UnoCSS
  'basics': '基础入门',
  'presets': '预设配置',
  'rules': '规则系统',
  'transformers': '转换器',
  'integrations': '集成',
};

/**
 * 解析 toc.md 获取章节信息
 * @param {string} tocPath toc.md 文件路径
 * @returns {Map<string, {label: string, position: number}>} 目录名 -> {标签, 位置}
 */
function parseToc(tocPath) {
  const result = new Map();
  
  if (!fs.existsSync(tocPath)) {
    console.log(`  ⚠️ toc.md 不存在: ${tocPath}`);
    return result;
  }
  
  const content = fs.readFileSync(tocPath, 'utf-8');
  const lines = content.split('\n');
  
  let currentSection = null;
  let sectionPosition = 0;
  
  for (const line of lines) {
    // 匹配章节标题，如：### 第 1 部分: 设计概览 (Design Overview)
    // 或：## 第一部分：解析器基石
    // 或：### 第一部分：框架设计哲学 (Framework Design Philosophy)
    const sectionMatch = line.match(/^#{2,3}\s+(.+)/);
    if (sectionMatch) {
      sectionPosition++;
      const sectionTitle = sectionMatch[1].trim();
      
      // 提取中文部分（去掉英文括号部分）
      let label = sectionTitle
        .replace(/\s*\([^)]+\)\s*$/, '')  // 移除 (English) 部分
        .replace(/\s*（[^）]+）\s*$/, '') // 移除 （中文括号） 部分
        .trim();
      
      currentSection = { label, position: sectionPosition };
      continue;
    }
    
    // 匹配章节链接，如：1. [目标与架构总览](overview/goals-and-architecture.md)
    // 或：1. [手势库的世界](./getting-started/introduction.md)
    const linkMatch = line.match(/^\d+\.\s+\[.+\]\((?:\.\/)?([^\/]+)\/.+\.md\)/);
    if (linkMatch && currentSection) {
      const dirName = linkMatch[1];
      if (!result.has(dirName)) {
        result.set(dirName, {
          label: currentSection.label,
          position: currentSection.position
        });
      }
    }
  }
  
  return result;
}

/**
 * 为指定目录生成 _category_.json
 * @param {string} dirPath 目录路径
 * @param {string} label 中文标签
 * @param {number} position 位置
 */
function generateCategoryJson(dirPath, label, position) {
  const categoryPath = path.join(dirPath, '_category_.json');
  
  const category = {
    label: label,
    position: position,
    link: {
      type: 'generated-index',
      description: `${label}相关章节`
    }
  };
  
  fs.writeFileSync(categoryPath, JSON.stringify(category, null, 2), 'utf-8');
  console.log(`    ✅ ${path.basename(dirPath)} -> "${label}" (position: ${position})`);
}

/**
 * 处理单本书
 * @param {string} bookPath 书籍目录路径（docs/{分类}/{书名}）
 */
function processBook(bookPath) {
  const bookName = path.basename(bookPath);
  console.log(`\n📖 处理书籍: ${bookName}`);
  
  // 解析 toc.md
  const tocPath = path.join(bookPath, 'toc.md');
  const tocInfo = parseToc(tocPath);
  
  // 获取所有子目录
  const items = fs.readdirSync(bookPath, { withFileTypes: true });
  const dirs = items.filter(item => item.isDirectory()).map(item => item.name);
  
  if (dirs.length === 0) {
    console.log('  ⚠️ 没有子目录');
    return;
  }
  
  let position = 0;
  for (const dir of dirs) {
    position++;
    const dirPath = path.join(bookPath, dir);
    
    // 优先使用 toc.md 中的信息
    if (tocInfo.has(dir)) {
      const info = tocInfo.get(dir);
      generateCategoryJson(dirPath, info.label, info.position);
    } 
    // 使用预定义的映射
    else if (FOLDER_LABELS[dir]) {
      generateCategoryJson(dirPath, FOLDER_LABELS[dir], position);
    }
    // 使用目录名首字母大写
    else {
      const label = dir.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      generateCategoryJson(dirPath, label, position);
      console.log(`    ⚠️ 未找到中文标签，使用默认: ${label}`);
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始生成 _category_.json 文件...\n');
  console.log(`📁 文档目录: ${DOCS_DIR}`);
  
  // 读取 books-config.json 获取所有书籍路径
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ books-config.json 不存在');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  
  for (const category of config.categories) {
    console.log(`\n📂 分类: ${category.label}`);
    
    for (const book of category.books) {
      const bookPath = path.join(DOCS_DIR, book.path);
      // 优先使用 book_zh 子目录
      const bookZhPath = path.join(bookPath, 'book_zh');
      
      if (fs.existsSync(bookZhPath)) {
        processBook(bookZhPath);
      } else if (fs.existsSync(bookPath)) {
        processBook(bookPath);
      } else {
        console.log(`\n⏭️ 跳过 ${book.title}: 目录不存在 (${book.path})`);
      }
    }
  }
  
  console.log('\n\n✅ 完成！所有 _category_.json 文件已生成。');
  console.log('   请运行 npm start 查看效果。');
}

main();
