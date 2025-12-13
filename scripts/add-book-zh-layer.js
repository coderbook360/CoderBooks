/**
 * 重组脚本：为 docs 目录添加 book_zh 层级
 * 
 * 功能：
 * 1. 读取 books-config.json 获取所有书籍路径
 * 2. 将 docs/{分类}/{书名}/* 移动到 docs/{分类}/{书名}/book_zh/
 * 3. 保留目录结构不变
 * 
 * 使用方式：node scripts/add-book-zh-layer.js [--dry-run]
 *   --dry-run  仅预览，不执行实际操作
 * 
 * @author AI Agent
 * @date 2024-12
 */

const fs = require('fs');
const path = require('path');

// 路径定义
const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const CONFIG_PATH = path.join(ROOT_DIR, 'books-config.json');

// 命令行参数
const DRY_RUN = process.argv.includes('--dry-run');

// 统计信息
const stats = {
  moved: 0,
  dirs: 0,
  books: 0
};

/**
 * 递归移动目录内容
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 */
function moveContents(src, dest) {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    if (!DRY_RUN) {
      fs.mkdirSync(dest, { recursive: true });
    }
    stats.dirs++;
  }

  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    // 跳过 book_zh 目录本身（如果已存在）
    if (item.name === 'book_zh') {
      continue;
    }

    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);

    if (item.isDirectory()) {
      // 递归移动子目录
      moveContents(srcPath, destPath);
      // 删除空的源目录
      if (!DRY_RUN) {
        try {
          fs.rmdirSync(srcPath);
        } catch (e) {
          // 目录非空，稍后处理
        }
      }
    } else {
      // 移动文件
      if (!DRY_RUN) {
        fs.renameSync(srcPath, destPath);
      }
      console.log(`  ✅ ${item.name}`);
      stats.moved++;
    }
  }
}

/**
 * 处理单本书
 * @param {Object} book 书籍配置
 */
function processBook(book) {
  const bookPath = path.join(DOCS_DIR, book.path);
  const bookZhPath = path.join(bookPath, 'book_zh');

  console.log(`\n📖 ${book.title}`);
  console.log(`   路径: docs/${book.path}`);

  // 检查书籍目录是否存在
  if (!fs.existsSync(bookPath)) {
    console.log(`   ⚠️ 目录不存在，跳过`);
    return;
  }

  // 检查是否已经有 book_zh 目录
  if (fs.existsSync(bookZhPath)) {
    // 检查 book_zh 是否是唯一内容
    const items = fs.readdirSync(bookPath);
    if (items.length === 1 && items[0] === 'book_zh') {
      console.log(`   ⏭️ 已有 book_zh 结构，跳过`);
      return;
    }
    console.log(`   ⚠️ 已存在 book_zh，将合并内容`);
  }

  // 获取当前目录下的所有项目（除了 book_zh）
  const items = fs.readdirSync(bookPath, { withFileTypes: true })
    .filter(item => item.name !== 'book_zh');

  if (items.length === 0) {
    console.log(`   ⏭️ 目录为空，跳过`);
    return;
  }

  console.log(`   📦 移动 ${items.length} 项到 book_zh/`);

  // 创建 book_zh 目录
  if (!fs.existsSync(bookZhPath) && !DRY_RUN) {
    fs.mkdirSync(bookZhPath, { recursive: true });
  }

  // 移动每个项目
  for (const item of items) {
    const srcPath = path.join(bookPath, item.name);
    const destPath = path.join(bookZhPath, item.name);

    if (item.isDirectory()) {
      moveContents(srcPath, destPath);
      // 尝试删除空源目录
      if (!DRY_RUN) {
        try {
          fs.rmdirSync(srcPath);
        } catch (e) {
          // ignore
        }
      }
    } else {
      if (!DRY_RUN) {
        fs.renameSync(srcPath, destPath);
      }
      console.log(`  ✅ ${item.name}`);
      stats.moved++;
    }
  }

  stats.books++;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始为 docs 目录添加 book_zh 层级\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN 模式：仅预览，不执行实际操作\n');
  }

  // 读取配置
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ books-config.json 不存在');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

  // 遍历所有分类和书籍
  for (const category of config.categories) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📂 分类: ${category.label}`);
    console.log(`${'='.repeat(50)}`);

    for (const book of category.books) {
      processBook(book);
    }
  }

  // 输出统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 重组统计:');
  console.log(`   📖 处理书籍: ${stats.books}`);
  console.log(`   ✅ 移动文件: ${stats.moved}`);
  console.log(`   📁 创建目录: ${stats.dirs}`);
  console.log('='.repeat(50));

  if (DRY_RUN) {
    console.log('\n💡 这是预览模式。执行实际操作请运行:');
    console.log('   node scripts/add-book-zh-layer.js');
  } else {
    console.log('\n✅ 重组完成！');
    console.log('\n📝 后续步骤:');
    console.log('   1. 更新 docusaurus.config.ts 中的 path 配置');
    console.log('   2. 更新 generate-sidebars.js 和 generate-categories.js');
    console.log('   3. 运行 npm start 验证网站');
  }
}

main();
