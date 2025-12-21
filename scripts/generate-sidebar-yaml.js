import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksDir = path.join(__dirname, '../src/books');

// 解析 toc.md 文件，生成侧边栏配置
function parseTocMd(tocPath) {
  if (!fs.existsSync(tocPath)) {
    return null;
  }

  const content = fs.readFileSync(tocPath, 'utf-8');
  const lines = content.split('\n');

  const sidebar = [];
  let currentSection = null;

  for (const line of lines) {
    // 匹配章节标题 (###)
    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      if (currentSection) {
        sidebar.push(currentSection);
      }
      currentSection = {
        text: sectionMatch[1].trim(),
        collapsed: false,
        items: []
      };
      continue;
    }

    // 匹配链接项 ([title](link))
    const linkMatch = line.match(/^\d+\.\s+\[(.+?)\]\((.+?)\)/);
    if (linkMatch && currentSection) {
      const title = linkMatch[1].trim();
      let link = linkMatch[2].trim();

      // 移除 .md 后缀
      if (link.endsWith('.md')) {
        link = link.slice(0, -3);
      }

      currentSection.items.push({
        text: title,
        link: link
      });
    }

    // 匹配无序列表链接 (- [title](link))
    const unorderedLinkMatch = line.match(/^-\s+\[(.+?)\]\((.+?)\)/);
    if (unorderedLinkMatch) {
      const title = unorderedLinkMatch[1].trim();
      let link = unorderedLinkMatch[2].trim();

      if (link.endsWith('.md')) {
        link = link.slice(0, -3);
      }

      // 如果是序言或目录，作为单独的项
      if (title.includes('序言') || title.includes('前言')) {
        sidebar.unshift({
          text: title,
          link: link
        });
      } else if (currentSection) {
        currentSection.items.push({
          text: title,
          link: link
        });
      }
    }
  }

  if (currentSection && currentSection.items.length > 0) {
    sidebar.push(currentSection);
  }

  return sidebar;
}

// 遍历所有书籍
console.log('开始生成侧边栏配置...\n');

const categories = fs.readdirSync(booksDir).filter(f =>
  fs.statSync(path.join(booksDir, f)).isDirectory()
);

let totalBooks = 0;
let generatedCount = 0;

for (const category of categories) {
  const categoryPath = path.join(booksDir, category);
  const books = fs.readdirSync(categoryPath).filter(f =>
    fs.statSync(path.join(categoryPath, f)).isDirectory()
  );

  console.log(`\n处理分类: ${category}`);

  for (const book of books) {
    totalBooks++;
    const bookZhPath = path.join(categoryPath, book, 'book_zh');

    if (!fs.existsSync(bookZhPath)) {
      console.log(`  ✗ ${book}: 没有 book_zh 目录`);
      continue;
    }

    const tocPath = path.join(bookZhPath, 'toc.md');
    const sidebarJsonPath = path.join(bookZhPath, 'sidebar.json');
    const sidebarYamlPath = path.join(bookZhPath, 'sidebar.yaml');

    // 解析 toc.md
    const sidebarConfig = parseTocMd(tocPath);

    if (sidebarConfig && sidebarConfig.length > 0) {
      // 生成 YAML 文件
      const yamlContent = yaml.dump(sidebarConfig, {
        indent: 2,
        lineWidth: -1
      });

      fs.writeFileSync(sidebarYamlPath, yamlContent, 'utf-8');
      generatedCount++;
      console.log(`  ✓ ${book}: 生成 sidebar.yaml (${sidebarConfig.length} 个章节)`);

      // 删除旧的 sidebar.json
      if (fs.existsSync(sidebarJsonPath)) {
        fs.unlinkSync(sidebarJsonPath);
        console.log(`    → 删除 sidebar.json`);
      }
    } else {
      console.log(`  ✗ ${book}: 无法解析 toc.md 或内容为空`);
    }
  }
}

console.log(`\n✅ 完成！`);
console.log(`   总计: ${totalBooks} 本书`);
console.log(`   生成: ${generatedCount} 个配置文件`);
