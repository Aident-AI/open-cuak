#!/bin/bash

if [ -z "$1" ]; then
  echo "No number of commits provided. Usage: ./script.sh [last-n-commits]"
  exit 1
fi

git rebase --exec 'git commit --amend --no-edit -S' -i HEAD~$1
git push
git branch -D py
