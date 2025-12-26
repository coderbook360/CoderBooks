#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查 toc.md 中引用的文件是否存在
"""

import os
import re
from pathlib import Path

def extract_md_links(content):
    """提取markdown链接，排除锚点链接"""
    # 匹配 [标题](路径.md) 格式，不包含 # 开头的锚点
    pattern = r'\[([^\]]+)\]\(([^)#]+?\.md)\)'
    matches = re.findall(pattern, content)
    return [(title, path) for title, path in matches if not path.startswith('#')]

def check_toc_files(toc_path):
    """检查一个toc.md文件"""
    toc_file = Path(toc_path)
    if not toc_file.exists():
        print(f"❌ TOC文件不存在: {toc_path}")
        return None

    toc_dir = toc_file.parent
    content = toc_file.read_text(encoding='utf-8')

    links = extract_md_links(content)

    missing_files = []
    existing_files = []

    for title, relative_path in links:
        full_path = (toc_dir / relative_path).resolve()

        if not full_path.exists():
            missing_files.append({
                'title': title,
                'relative_path': relative_path,
                'full_path': str(full_path)
            })
        else:
            existing_files.append(relative_path)

    return {
        'toc': toc_path,
        'total': len(links),
        'existing': len(existing_files),
        'missing': len(missing_files),
        'missing_files': missing_files
    }

def main():
    toc_files = [
        r'e:\CoderBooks\src\books\web-frontend\mini-pinia\book_zh\toc.md',
        r'e:\CoderBooks\src\books\graphics\3d-math\book_zh\toc.md'
    ]

    print("=" * 80)
    print("检查 TOC 文件中的缺失文件")
    print("=" * 80)

    all_results = []

    for toc_file in toc_files:
        book_name = "Mini-Pinia" if "mini-pinia" in toc_file else "3D Math"
        print(f"\n\n📚 检查书籍: {book_name}")
        print(f"📄 TOC文件: {toc_file}")
        print("-" * 80)

        result = check_toc_files(toc_file)

        if result is None:
            continue

        all_results.append(result)

        print(f"\n📊 统计:")
        print(f"  • 总链接数: {result['total']}")
        print(f"  • 存在文件: {result['existing']} ({result['existing']/result['total']*100:.1f}%)")
        print(f"  • 缺失文件: {result['missing']} ({result['missing']/result['total']*100:.1f}%)")

        if result['missing_files']:
            print(f"\n❌ 缺失文件列表 ({result['missing']} 个):")
            print()
            for i, file_info in enumerate(result['missing_files'], 1):
                print(f"  {i}. 【{file_info['title']}】")
                print(f"     相对路径: {file_info['relative_path']}")
                print(f"     完整路径: {file_info['full_path']}")
                print()
        else:
            print("\n✅ 所有文件都存在！")

    # 总结
    print("\n" + "=" * 80)
    print("📋 总结报告")
    print("=" * 80)

    for result in all_results:
        book_name = "Mini-Pinia" if "mini-pinia" in result['toc'] else "3D Math"
        status = "✅ 完整" if result['missing'] == 0 else f"❌ 缺失 {result['missing']} 个文件"
        print(f"\n{book_name}: {status}")
        print(f"  进度: {result['existing']}/{result['total']} ({result['existing']/result['total']*100:.1f}%)")

if __name__ == '__main__':
    main()
