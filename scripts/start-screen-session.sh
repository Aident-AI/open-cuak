#!/bin/bash

# Usage: ./start_screen_session.sh <session_name> <script_path> [script_args...]
# Example: ./start_screen_session.sh my_session /path/to/your_script.sh arg1 arg2

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <session_name> <script_path> [script_args...]"
  exit 1
fi

SESSION_NAME=$1
SCRIPT_PATH=$2
shift 2 # Shift past the first two arguments to access extra params
SCRIPT_ARGS="$@" # Capture all remaining arguments as script arguments

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Error: Script file '$SCRIPT_PATH' does not exist."
  exit 1
fi

# Check if a screen session with the same name already exists
if screen -list | grep -q "\.${SESSION_NAME}"; then
  echo "A screen session with the name '$SESSION_NAME' is already running."
  exit 0
fi

# Start a new screen session in detached mode with extra arguments
sudo chmod 777 "$SCRIPT_PATH"
screen -dmS "$SESSION_NAME" bash -c "$SCRIPT_PATH $SCRIPT_ARGS"

if screen -list | grep -q "\.${SESSION_NAME}"; then
  echo "Screen session '$SESSION_NAME' started successfully running '$SCRIPT_PATH' with arguments '$SCRIPT_ARGS'."
else
  echo "Failed to start screen session '$SESSION_NAME'."
fi
