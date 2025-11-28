import { defineConfig } from 'vitepress'
import { zhSidebar, enSidebar } from './generated/sidebar.js'
import { zhNav, enNav } from './generated/nav.js'

export default defineConfig({
  title: "CoderBooks",
  description: "程序员的进阶技术迷你书 / Mini Tech Books for Programmers",
  
  // GitHub Pages 部署时使用仓库名作为 base
  // 如果部署到 https://<username>.github.io/CoderBooks/
  base: process.env.GITHUB_ACTIONS ? '/CoderBooks/' : '/',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  locales: {
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/',
      themeConfig: {
        nav: zhNav,
        sidebar: zhSidebar,
        outline: { label: '页面导航' },
        lastUpdated: { text: '最后更新于' },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        search: {
          provider: 'local',
          options: {
            translations: {
              button: { buttonText: '搜索文档' },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: { selectText: '选择', navigateText: '切换' }
              }
            }
          }
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: enNav,
        sidebar: enSidebar,
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
        search: {
          provider: 'local'
        }
      }
    }
  },

  themeConfig: {
    logo: '/logo.png',
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/coderbook360/CoderBooks' }
    ],

    footer: {
      message: 'Released under the MIT License',
      copyright: 'Copyright © 2024 CoderBooks'
    }
  }
})
