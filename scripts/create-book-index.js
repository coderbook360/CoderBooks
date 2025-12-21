import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksDir = path.join(__dirname, '../src/books');

// 遍历所有分类目录
const categories = fs.readdirSync(booksDir);

categories.forEach(category => {
  const categoryPath = path.join(booksDir, category);
  if (!fs.statSync(categoryPath).isDirectory()) return;

  // 遍历每个书籍目录
  const books = fs.readdirSync(categoryPath);

  books.forEach(bookDir => {
    const bookPath = path.join(categoryPath, bookDir);
    if (!fs.statSync(bookPath).isDirectory()) return;

    const bookZhPath = path.join(bookPath, 'book_zh');
    if (!fs.existsSync(bookZhPath)) return;

    const indexPath = path.join(bookZhPath, 'index.md');

    // 如果 index.md 不存在，则创建
    if (!fs.existsSync(indexPath)) {
      const prefacePath = path.join(bookZhPath, 'preface.md');
      const tocPath = path.join(bookZhPath, 'toc.md');

      let content = `# ${bookDir}\n\n`;

      // 如果有 preface.md，添加链接
      if (fs.existsSync(prefacePath)) {
        content += `## [前言](./preface.md)\n\n`;
      }

      // 如果有 toc.md，添加链接
      if (fs.existsSync(tocPath)) {
        content += `## [目录](./toc.md)\n\n`;
      }

      // 列出所有章节目录
      const chapters = fs.readdirSync(bookZhPath).filter(file => {
        const filePath = path.join(bookZhPath, file);
        return fs.statSync(filePath).isDirectory();
      });

      if (chapters.length > 0) {
        content += `## 章节\n\n`;
        chapters.forEach(chapter => {
          content += `- [${chapter}](./${chapter}/)\n`;
        });
      }

      fs.writeFileSync(indexPath, content, 'utf-8');
      console.log(`Created: ${indexPath}`);
    }
  });
});

console.log('Done!');
