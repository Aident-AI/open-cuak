#!/bin/bash

detect_docker_compose() {
  if ! command -v docker &>/dev/null; then
    echo "Error: docker is not installed."
    echo "Please install it first @ https://www.docker.com/products/docker-desktop/"
    exit 1
  fi

  # Check for either docker-compose or docker compose
  if docker compose version &>/dev/null; then
    echo "docker compose"
  elif command -v docker-compose &>/dev/null; then
    echo "docker-compose"
  else
    echo "Error: Neither 'docker-compose' nor 'docker compose' is installed." >&2
    echo "Please install one of them first @ https://github.com/Aident-AI/open-cuak#%EF%B8%8F-environment-setup" >&2
    return 1
  fi
}
