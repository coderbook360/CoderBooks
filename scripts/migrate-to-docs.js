/**
 * 迁移脚本：将 sourcebooks 内容合并到 docs
 * 
 * 功能：
 * 1. 读取 books-config.json 获取书籍映射关系
 * 2. 将 sourcebooks/{folder}/book_zh/* 迁移到 docs/{path}/*
 * 3. 跳过已存在的文件（避免覆盖 docs 中已有的内容）
 * 4. 迁移非内容文件（如 .book_check, .book_guide 等）到备份目录
 * 
 * 使用方式：node scripts/migrate-to-docs.js [--dry-run]
 *   --dry-run  仅预览，不执行实际操作
 * 
 * @author AI Agent
 * @date 2024-12
 */

const fs = require('fs');
const path = require('path');

// 路径定义
const ROOT_DIR = path.join(__dirname, '..');
const SOURCEBOOKS_DIR = path.join(ROOT_DIR, 'sourcebooks');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const CONFIG_PATH = path.join(ROOT_DIR, 'books-config.json');
const BACKUP_DIR = path.join(ROOT_DIR, '.sourcebooks-backup');

// 命令行参数
const DRY_RUN = process.argv.includes('--dry-run');

// 统计信息
const stats = {
  copied: 0,
  skipped: 0,
  errors: 0,
  dirs: 0
};

/**
 * 递归复制目录
 * @param {string} src 源目录
 * @param {string} dest 目标目录
 * @param {string} relativePath 相对路径（用于日志）
 */
function copyDir(src, dest, relativePath = '') {
  // 创建目标目录
  if (!fs.existsSync(dest)) {
    if (!DRY_RUN) {
      fs.mkdirSync(dest, { recursive: true });
    }
    stats.dirs++;
    console.log(`  📁 创建目录: ${relativePath || dest}`);
  }

  const items = fs.readdirSync(src, { withFileTypes: true });

  for (const item of items) {
    const srcPath = path.join(src, item.name);
    const destPath = path.join(dest, item.name);
    const itemRelativePath = path.join(relativePath, item.name);

    if (item.isDirectory()) {
      copyDir(srcPath, destPath, itemRelativePath);
    } else {
      // 检查目标文件是否存在
      if (fs.existsSync(destPath)) {
        // 比较文件内容
        const srcContent = fs.readFileSync(srcPath, 'utf-8');
        const destContent = fs.readFileSync(destPath, 'utf-8');
        
        if (srcContent === destContent) {
          console.log(`  ⏭️ 跳过（相同）: ${itemRelativePath}`);
        } else {
          console.log(`  ⚠️ 跳过（已存在但不同）: ${itemRelativePath}`);
        }
        stats.skipped++;
      } else {
        if (!DRY_RUN) {
          fs.copyFileSync(srcPath, destPath);
        }
        console.log(`  ✅ 复制: ${itemRelativePath}`);
        stats.copied++;
      }
    }
  }
}

/**
 * 处理单本书的迁移
 * @param {Object} book 书籍配置
 */
function migrateBook(book) {
  const sourceBookPath = path.join(SOURCEBOOKS_DIR, book.folder, 'book_zh');
  const targetPath = path.join(DOCS_DIR, book.path);

  console.log(`\n📖 ${book.title}`);
  console.log(`   源: sourcebooks/${book.folder}/book_zh`);
  console.log(`   目标: docs/${book.path}`);

  // 检查源目录是否存在
  if (!fs.existsSync(sourceBookPath)) {
    console.log(`   ⚠️ 源目录不存在，跳过`);
    return;
  }

  // 执行复制
  copyDir(sourceBookPath, targetPath, book.path);
}

/**
 * 备份 sourcebooks 中的非内容文件
 */
function backupMetaFiles() {
  console.log('\n📦 备份元数据文件...');
  
  if (!fs.existsSync(SOURCEBOOKS_DIR)) {
    console.log('   sourcebooks 目录不存在');
    return;
  }

  const books = fs.readdirSync(SOURCEBOOKS_DIR, { withFileTypes: true })
    .filter(item => item.isDirectory());

  for (const bookDir of books) {
    const bookPath = path.join(SOURCEBOOKS_DIR, bookDir.name);
    const items = fs.readdirSync(bookPath, { withFileTypes: true });

    for (const item of items) {
      // 跳过 book_zh 和 book_en 目录
      if (item.name === 'book_zh' || item.name === 'book_en') {
        continue;
      }

      const srcPath = path.join(bookPath, item.name);
      const destPath = path.join(BACKUP_DIR, bookDir.name, item.name);

      if (!DRY_RUN) {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        
        if (item.isDirectory()) {
          // 递归复制目录
          copyDir(srcPath, destPath, `backup/${bookDir.name}/${item.name}`);
        } else {
          fs.copyFileSync(srcPath, destPath);
          console.log(`   ✅ 备份: ${bookDir.name}/${item.name}`);
        }
      } else {
        console.log(`   📋 将备份: ${bookDir.name}/${item.name}`);
      }
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始迁移 sourcebooks -> docs\n');
  
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
      migrateBook(book);
    }
  }

  // 备份元数据文件
  backupMetaFiles();

  // 输出统计
  console.log('\n' + '='.repeat(50));
  console.log('📊 迁移统计:');
  console.log(`   ✅ 复制文件: ${stats.copied}`);
  console.log(`   ⏭️ 跳过文件: ${stats.skipped}`);
  console.log(`   📁 创建目录: ${stats.dirs}`);
  console.log(`   ❌ 错误: ${stats.errors}`);
  console.log('='.repeat(50));

  if (DRY_RUN) {
    console.log('\n💡 这是预览模式。执行实际迁移请运行:');
    console.log('   node scripts/migrate-to-docs.js');
  } else {
    console.log('\n✅ 迁移完成！');
    console.log('\n📝 后续步骤:');
    console.log('   1. 检查 docs/ 目录内容是否正确');
    console.log('   2. 运行 npm start 验证网站');
    console.log('   3. 确认无误后可删除 sourcebooks/ 目录');
    console.log('   4. 元数据文件已备份到 .sourcebooks-backup/');
  }
}

main();
