# 打包 H5 游戏包体：只收运行必需的 index.html / css / js（白名单），
# 因此 .git、docs、上架素材、.gitignore、AGENTS.md、README.md、node_modules、tests、scripts 等都不会进入压缩包。
# 平台要求：zip 解压后只有一个文件夹，且文件夹内含入口文件 index.html，所以所有内容都放进顶层目录 TOP/。
# 用法: python scripts/build-h5-zip.py [输出zip路径]
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'moshou-h5.zip')
INCLUDE = ['index.html', 'css', 'js']
TOP = 'moshou-h5'
SKIP_NAMES = {'.DS_Store', 'Thumbs.db'}

files = []
for item in INCLUDE:
    full = os.path.join(ROOT, item)
    if os.path.isfile(full):
        files.append(item)
    else:
        for base, dirs, names in os.walk(full):
            dirs.sort()
            for name in sorted(names):
                if name in SKIP_NAMES or name.endswith(('.md', '.map')):
                    continue
                files.append(os.path.relpath(os.path.join(base, name), ROOT).replace(os.sep, '/'))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if os.path.exists(OUT):
    os.remove(OUT)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for rel in files:
        z.write(os.path.join(ROOT, rel), TOP + '/' + rel)
print(f'{len(files)} 个文件 -> {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB)')
