import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksDir = path.join(__dirname, 'src', 'books');

function findAllBookZhDirs(dir, prefix = '') {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.isDirectory()) {
      if (item.name === 'book_zh') {
        results.push({ path: fullPath, name: prefix });
      } else {
        results.push(...findAllBookZhDirs(fullPath, relativePath));
      }
    }
  }

  return results;
}

console.log('Checking for missing index.md files...\n');

const bookZhDirs = findAllBookZhDirs(booksDir);
const missing = [];

for (const dir of bookZhDirs) {
  const indexPath = path.join(dir.path, 'index.md');
  const tocPath = path.join(dir.path, 'toc.md');

  if (!fs.existsSync(indexPath)) {
    missing.push({
      book: dir.name,
      hasIndex: false,
      hasToc: fs.existsSync(tocPath)
    });
  }
}

if (missing.length === 0) {
  console.log('✅ All books have index.md files!');
} else {
  console.log(`❌ Found ${missing.length} books without index.md:\n`);

  for (const item of missing) {
    console.log(`📚 ${item.book}`);
    console.log(`   index.md: ❌`);
    console.log(`   toc.md: ${item.hasToc ? '✅' : '❌'}`);
    console.log('');
  }
}

console.log(`\nTotal books checked: ${bookZhDirs.length}`);
