import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import * as fs from 'fs';
import * as path from 'path';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

// ========== 动态读取书籍配置 ==========
interface BookConfig {
  id: string;
  title: string;
  subtitle: string;
  folder: string;
  path: string;
  route?: string; // 可选的自定义路由
}

interface GroupConfig {
  label: string;
  books: BookConfig[];
}

interface CategoryConfig {
  id: string;
  label: string;
  description: string;
  books?: BookConfig[];  // 可选，如果有 groups 则为空
  groups?: GroupConfig[]; // 可选，支持分组
}

interface BooksConfig {
  categories: CategoryConfig[];
}

// 读取 books-config.json
const booksConfigPath = path.resolve(__dirname, 'books-config.json');
const booksConfig: BooksConfig = JSON.parse(fs.readFileSync(booksConfigPath, 'utf-8'));

// 动态生成文档插件配置
function generateDocPlugins() {
  const plugins: Array<[string, Record<string, string>]> = [];
  
  for (const category of booksConfig.categories) {
    // 获取所有书籍（支持分组和不分组）
    const allBooks: BookConfig[] = [];
    if (category.groups) {
      // 如果有分组，从所有分组中收集书籍
      for (const group of category.groups) {
        allBooks.push(...group.books);
      }
    } else if (category.books) {
      // 如果没有分组，直接使用 books
      allBooks.push(...category.books);
    }
    
    // 为每本书创建插件配置
    for (const book of allBooks) {
      const bookPath = `docs/${book.path}/book_zh`;
      const routeSegment = book.route || book.path.split('/').pop() || book.id;
      
      plugins.push(['@docusaurus/plugin-content-docs', {
        id: book.id,
        path: bookPath,
        routeBasePath: `books/${routeSegment}`,
        sidebarPath: `./${bookPath}/sidebar.json`,
      }]);
    }
  }
  
  return plugins;
}

// 动态生成导航栏下拉菜单
function generateNavbarItems() {
  const items: Array<Record<string, unknown>> = [];
  
  for (const category of booksConfig.categories) {
    let dropdownItems: Array<Record<string, unknown>> = [];
    
    if (category.groups) {
      // 如果有分组，渲染分组标题和书籍
      for (const group of category.groups) {
        // 添加分组标题（不可点击）
        dropdownItems.push({
          type: 'html',
          value: `<div style="padding: 0.5rem 1rem; font-weight: 600; color: var(--ifm-color-emphasis-700); font-size: 0.85rem;">${group.label}</div>`,
        });
        // 添加分组下的书籍
        dropdownItems.push(...group.books.map(book => ({
          to: `/books/${book.route || book.path.split('/').pop()}`,
          label: book.title,
        })));
      }
    } else if (category.books) {
      // 如果没有分组，直接渲染书籍列表
      dropdownItems = category.books.map(book => ({
        to: `/books/${book.route || book.path.split('/').pop()}`,
        label: book.title,
      }));
    }
    
    items.push({
      type: 'dropdown',
      label: category.label,
      position: 'left',
      items: dropdownItems,
    });
  }
  
  // 添加 GitHub 链接
  items.push({
    href: 'https://github.com/coderbook360/CoderBooks',
    label: 'GitHub',
    position: 'right',
  });
  
  return items;
}

// 动态生成页脚链接（每个分类取前3本书）
function generateFooterLinks() {
  return booksConfig.categories.map(category => {
    // 获取所有书籍（支持分组和不分组）
    let allBooks: BookConfig[] = [];
    if (category.groups) {
      for (const group of category.groups) {
        allBooks.push(...group.books);
      }
    } else if (category.books) {
      allBooks = category.books;
    }
    
    return {
      title: category.label.replace(/^[^\s]+\s/, ''), // 移除 emoji
      items: allBooks.slice(0, 3).map(book => ({
        label: book.title,
        to: `/books/${book.route || book.path.split('/').pop()}`,
      })),
    };
  });
}

const config: Config = {
  title: 'CoderBooks',
  tagline: '深入源码，掌握本质 | 前端工程师的技术书籍库',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://coderbook360.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: process.env.GITHUB_ACTIONS ? '/CoderBooks/' : '/',

  // GitHub pages deployment config.
  organizationName: 'coderbook360', // GitHub org/user name
  projectName: 'CoderBooks', // repo name
  trailingSlash: false,

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  // 多文档实例插件 - 从 books-config.json 动态生成
  plugins: generateDocPlugins(),

  // Markdown 配置 - 使用宽松模式处理非标准语法
  markdown: {
    format: 'detect', // 自动检测 md/mdx 格式
    mermaid: false,
    preprocessor: ({filePath, fileContent}) => {
      // 转义可能被误解析为 JSX 的语法，如 <L=1> <n=5> 等
      return fileContent.replace(/<([a-zA-Z])=/g, '&lt;$1=');
    },
  },

  presets: [
    [
      'classic',
      {
        docs: false, // 禁用默认 docs
        blog: false, // 禁用博客
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'CoderBooks',
      logo: {
        alt: 'CoderBooks Logo',
        src: 'img/logo.svg',
      },
      items: generateNavbarItems(),
    },
    footer: {
      style: 'dark',
      links: generateFooterLinks(),
      copyright: `Copyright © ${new Date().getFullYear()} CoderBooks. 深入源码，掌握本质。`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
