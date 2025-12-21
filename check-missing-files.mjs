import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const booksDir = path.join(__dirname, 'src', 'books');

function findAllBookYamls(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findAllBookYamls(fullPath));
    } else if (item.name === 'book.yaml' && fullPath.includes('book_zh')) {
      results.push(fullPath);
    }
  }

  return results;
}

function checkBook(bookYamlPath) {
  const bookDir = path.dirname(bookYamlPath);
  const relativePath = path.relative(booksDir, bookYamlPath)
    .replace(/\\/g, '/')
    .replace('/book_zh/book.yaml', '');

  try {
    const content = fs.readFileSync(bookYamlPath, 'utf-8');
    const bookConfig = yaml.load(content);

    if (!bookConfig.toc || !Array.isArray(bookConfig.toc)) {
      return null;
    }

    const missing = [];

    for (const item of bookConfig.toc) {
      if (item.link) {
        const filePath = path.join(bookDir, item.link + '.md');
        if (!fs.existsSync(filePath)) {
          missing.push({ text: item.text, link: item.link });
        }
      }
    }

    if (missing.length > 0) {
      return {
        book: relativePath,
        total: bookConfig.toc.length,
        missing: missing
      };
    }
  } catch (error) {
    console.error(`Error checking ${relativePath}:`, error.message);
  }

  return null;
}

console.log('Checking all books for missing files...\n');

const bookYamls = findAllBookYamls(booksDir);
const issues = [];

for (const bookYaml of bookYamls) {
  const result = checkBook(bookYaml);
  if (result) {
    issues.push(result);
  }
}

if (issues.length === 0) {
  console.log('✅ All books are complete! No missing files found.');
} else {
  console.log(`❌ Found ${issues.length} books with missing files:\n`);

  for (const issue of issues) {
    console.log(`📚 ${issue.book}`);
    console.log(`   Total chapters: ${issue.total}, Missing: ${issue.missing.length}`);
    for (const item of issue.missing) {
      console.log(`   ❌ ${item.link}.md - "${item.text}"`);
    }
    console.log('');
  }
}
