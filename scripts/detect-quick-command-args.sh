#!/bin/bash

source ./scripts/detect-docker-compose.sh

detect_command_args() {
  local args="$*"

  local COMPOSE_FILE
  local DOCKER_CMD
  local DOCKER_COMPOSE_CMD
  local DOCKER_CONTEXT
  local IS_BUILD

  DOCKER_COMPOSE_CMD=$(detect_docker_compose) || return 1
  DOCKER_CONTEXT=""

  if [[ "$args" == *"--colima"* ]]; then
    DOCKER_CMD="docker_cmd() { docker --context colima \"\$@\"; }"
    DOCKER_CONTEXT="--colima"
    if [[ "$DOCKER_COMPOSE_CMD" == "docker compose" ]]; then
      # For Docker Compose V2, use --context flag
      DOCKER_COMPOSE_CMD="docker --context colima compose"
    else
      # For legacy docker-compose, use DOCKER_HOST from context inspection
      DOCKER_COMPOSE_CMD="DOCKER_HOST=\$(docker context inspect colima -f '{{.Endpoints.docker.Host}}') docker-compose"
    fi
  else
    DOCKER_CMD="docker_cmd() { docker \"\$@\"; }"
  fi

  if [[ "$args" == *"--build"* ]]; then
    COMPOSE_FILE="docker/docker-compose.build.yaml"
    IS_BUILD=true
  else
    COMPOSE_FILE="docker/docker-compose.local-prod.yaml"
    IS_BUILD=false
  fi

  echo "COMPOSE_FILE=\"$COMPOSE_FILE\""
  echo "DOCKER_COMPOSE_CMD=\"$DOCKER_COMPOSE_CMD\""
  echo "DOCKER_CONTEXT=\"$DOCKER_CONTEXT\""
  echo "IS_BUILD=$IS_BUILD"
  echo $DOCKER_CMD
}
