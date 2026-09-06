#!/usr/bin/env bash
# main의 배포 파일만 gh-pages 브랜치에 올린다 (docs·test·tools·.claude 제외).
# 사용: bash tools/deploy-pages.sh   (main에 커밋·푸시한 뒤 실행)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WT="$ROOT/.deploy-pages"
FILES=(index.html coolprep.html orapang.html plenvu.html plan.html og.png robots.txt sitemap.xml README.md)

cd "$ROOT"
git fetch -q origin gh-pages
if [ ! -d "$WT/.git" ] && [ ! -f "$WT/.git" ]; then
  git worktree add -q "$WT" gh-pages
fi

cd "$WT"
git checkout -q gh-pages
git pull -q --ff-only origin gh-pages
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +

cd "$ROOT"
cp "${FILES[@]}" "$WT/"
cp -r css js "$WT/"
touch "$WT/.nojekyll"

cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "변경 없음 — 배포할 것이 없습니다."
  exit 0
fi
SRC_SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
git commit -q -m "deploy: main ${SRC_SHA}"
git push -q origin gh-pages
echo "배포됨: gh-pages $(git rev-parse --short HEAD) (main ${SRC_SHA}) → https://ohhyunsuk-bit.github.io/jangbium/"
