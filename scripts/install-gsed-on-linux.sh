#!/bin/bash

sudo apt install -y sed

if [ ! -L /usr/bin/gsed ]; then
  sudo ln -s /usr/bin/sed /usr/bin/gsed
  echo "Symbolic link /usr/bin/gsed created."
else
  echo "Symbolic link /usr/bin/gsed already exists."
fi
