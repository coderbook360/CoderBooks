import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksDir = path.join(__dirname, '../src/books');

// 新的分类映射
const categoryMapping = {
  // Web 前端
  'web-frontend': {
    label: '🌐 Web 前端',
    books: [
      { old: 'frontend-engineer/browser-principles', name: 'browser-principles' },
      { old: 'frontend-engineer/design-patterns-architecture', name: 'design-patterns' },
      { old: 'frontend-engineer/engineering-system', name: 'engineering' },
      { old: 'frontend-engineer/frontend-solutions', name: 'solutions' },
      { old: 'frontend-engineer/jquery-source-analysis', name: 'jquery' },
      { old: 'frontend-engineer/performance-optimization', name: 'performance' },
      { old: 'frontend-engineer/v8', name: 'v8-engine' },
      { old: 'frontend-engineer/mini-vue3', name: 'mini-vue3' },
      { old: 'frontend-engineer/mini-react', name: 'mini-react' },
      { old: 'frontend-engineer/mini-vue-router', name: 'mini-vue-router' },
      { old: 'frontend-engineer/mini-pinia', name: 'mini-pinia' },
      { old: 'frontend-engineer/mini-redux', name: 'mini-redux' },
      { old: 'frontend-engineer/mini-webpack', name: 'mini-webpack' },
      { old: 'frontend-engineer/mini-vite', name: 'mini-vite' },
      { old: 'frontend-engineer/mini-rollup', name: 'mini-rollup' },
      { old: 'frontend-engineer/mini-acornjs', name: 'mini-acornjs' },
      { old: 'frontend-engineer/mini-axios', name: 'mini-axios' },
      { old: 'frontend-engineer/mini-dayjs', name: 'mini-dayjs' },
      { old: 'frontend-engineer/mini-lodash-es', name: 'mini-lodash' },
      { old: 'frontend-engineer/mini-path-to-regexp', name: 'mini-path-to-regexp' },
      { old: 'frontend-engineer/mini-ramdajs', name: 'mini-ramda' },
      { old: 'frontend-engineer/mini-rxjs', name: 'mini-rxjs' },
      { old: 'frontend-engineer/mini-zod', name: 'mini-zod' },
      { old: 'frontend-engineer/mini-gsap', name: 'mini-gsap' },
      { old: 'frontend-engineer/mini-hammerjs', name: 'mini-hammer' },
      { old: 'frontend-engineer/mini-zeptojs', name: 'mini-zepto' },
      { old: 'frontend-engineer/unocss', name: 'unocss' },
      { old: 'frontend-engineer/vscode-vim', name: 'vscode-vim' },
    ]
  },
  // Node.js
  'nodejs': {
    label: '💚 Node.js',
    books: [
      { old: 'nodejs-fullstack/transition-guide', name: 'getting-started' },
      { old: 'nodejs-fullstack/core-principles', name: 'core-principles' },
      { old: 'nodejs-fullstack/api-design', name: 'api-design' },
      { old: 'nodejs-fullstack/database-orm', name: 'database-orm' },
      { old: 'nodejs-fullstack/filesystem-stream', name: 'filesystem-stream' },
      { old: 'nodejs-fullstack/network-programming', name: 'network' },
      { old: 'nodejs-fullstack/security', name: 'security' },
      { old: 'nodejs-fullstack/web-framework-design', name: 'web-framework' },
      { old: 'nodejs-fullstack/real-projects', name: 'projects' },
      { old: 'nodejs-fullstack/nodejs-source', name: 'nodejs-source' },
      { old: 'nodejs-fullstack/engineering-practice', name: 'engineering' },
      { old: 'nodejs-fullstack/microservices-distributed', name: 'microservices' },
      { old: 'nodejs-fullstack/mini-npm', name: 'mini-npm' },
      { old: 'nodejs-fullstack/mini-sentry', name: 'mini-sentry' },
      { old: 'nodejs-fullstack/mini-vitest', name: 'mini-vitest' },
    ]
  },
  // 数据结构与算法
  'algorithm': {
    label: '📊 数据结构与算法',
    books: [
      { old: 'algorithm-engineer/ds-foundations', name: 'data-structures' },
      { old: 'algorithm-engineer/algo-techniques', name: 'algorithms' },
      { old: 'algorithm-engineer/advanced-ds', name: 'advanced-ds' },
      { old: 'algorithm-engineer/dp-mastery', name: 'dynamic-programming' },
      { old: 'algorithm-engineer/graph-search', name: 'graph-algorithms' },
      { old: 'algorithm-engineer/competitive', name: 'competitive-programming' },
    ]
  },
  // 图形学
  'graphics': {
    label: '🎨 图形学',
    books: [
      { old: 'graphics-engineer/webgl', name: 'webgl' },
      { old: 'graphics-engineer/canvas', name: 'canvas' },
      { old: 'graphics-engineer/threejs', name: 'threejs' },
      { old: 'graphics-engineer/3d-math', name: '3d-math' },
      { old: 'graphics-engineer/advanced-rendering', name: 'advanced-rendering' },
      { old: 'graphics-engineer/mini-pixijs', name: 'mini-pixi' },
      { old: 'graphics-engineer/mini-fabricjs', name: 'mini-fabric' },
    ]
  },
  // 通用技能
  'general': {
    label: '🎯 通用技能',
    books: [
      { old: 'general-skills/ai-tools', name: 'ai-tools' },
      { old: 'general-skills/ai-prompt', name: 'ai-prompt' },
      { old: 'general-skills/thinking', name: 'thinking-methods' },
      { old: 'general-skills/clear-thinking', name: 'clear-thinking' },
    ]
  }
};

// 执行重组
console.log('开始重组目录...\n');

// 1. 创建新的分类目录
for (const [newCategory, config] of Object.entries(categoryMapping)) {
  const newCategoryPath = path.join(booksDir, newCategory);
  if (!fs.existsSync(newCategoryPath)) {
    fs.mkdirSync(newCategoryPath, { recursive: true });
    console.log(`✓ 创建分类目录: ${newCategory}`);
  }
}

// 2. 移动书籍
for (const [newCategory, config] of Object.entries(categoryMapping)) {
  console.log(`\n处理分类: ${config.label}`);

  for (const book of config.books) {
    const oldPath = path.join(booksDir, book.old);
    const newPath = path.join(booksDir, newCategory, book.name);

    if (fs.existsSync(oldPath)) {
      // 如果新路径已存在，先删除
      if (fs.existsSync(newPath)) {
        fs.rmSync(newPath, { recursive: true, force: true });
      }

      fs.renameSync(oldPath, newPath);
      console.log(`  ✓ ${book.old} → ${newCategory}/${book.name}`);
    } else {
      console.log(`  ✗ 未找到: ${book.old}`);
    }
  }
}

// 3. 删除旧的空分类目录
const oldCategories = ['frontend-engineer', 'nodejs-fullstack', 'algorithm-engineer', 'graphics-engineer', 'general-skills'];
console.log('\n清理旧分类目录...');
for (const oldCat of oldCategories) {
  const oldCatPath = path.join(booksDir, oldCat);
  if (fs.existsSync(oldCatPath)) {
    try {
      fs.rmSync(oldCatPath, { recursive: true, force: true });
      console.log(`✓ 删除: ${oldCat}`);
    } catch (err) {
      console.log(`✗ 无法删除 ${oldCat}: ${err.message}`);
    }
  }
}

console.log('\n✅ 目录重组完成！');
