#!/bin/bash
set -e
REMOTE="https://vladilslavandrosov-prog:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/vladilslavandrosov-prog/doma-yuga.git"
echo "=== Подтягиваю изменения с GitHub ==="
git pull --rebase "$REMOTE" main
echo "=== Пушу в GitHub ==="
git push "$REMOTE" main
echo "=== Готово! ==="
