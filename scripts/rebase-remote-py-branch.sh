#!/bin/bash

git checkout origin/py --force && git branch py --force
git checkout main && git rebase -i py
