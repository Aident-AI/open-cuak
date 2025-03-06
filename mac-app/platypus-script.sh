#!/bin/bash

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

APP_NAME="Open-CUAK"
APP_DIR="$HOME/.open-cuak"
LIBEXEC_DIR="$(dirname "$(realpath "$0")")"

# Detect the OS (if needed for other commands)
OS_TYPE=$(uname)
BASH_CMD="bash"
if [ "$OS_TYPE" == "Linux" ]; then
  echo "Linux detected, using sudo"
  BASH_CMD="sudo -E bash"
fi

# -----------------------------
# Static Dialog for Informative Commands
# -----------------------------
display_dialog() {
  local title="$1"
  local cmd="$2"
  local show_loading="${3:-false}"
  local output
  local loading_pid

  if [ "$show_loading" = true ]; then
    osascript -e "display dialog \"Loading, please wait...\" with title \"$APP_NAME - $title\" buttons {\"OK\"} giving up after 9999" &
    loading_pid=$!
  fi

  output=$(eval "$cmd" 2>&1)

  if [ "$show_loading" = true ]; then
    kill "$loading_pid" 2>/dev/null
  fi

  osascript -e "display dialog \"$(echo -e "$output")\" with title \"$APP_NAME - $title\" buttons {\"OK\"} default button \"OK\""
}

# -----------------------------
# Run Long-Running Commands in Terminal
# -----------------------------
# This function activates Terminal (bringing it to the front) and tells it to run:
#   open-cuak <command>
run_in_terminal() {
  local cmd="$1"
  osascript -e "tell application \"Terminal\" to activate" \
    -e "tell application \"Terminal\" to do script \"$cmd\""
}

# -----------------------------
# Argument Parsing and Menu Mapping
# -----------------------------
# Remove any leading number and period (if passed from a menu)
parse_argument() {
  local arg="$1"
  if [[ "$arg" =~ ^[0-9]+\.\ (.*)$ ]]; then
    arg="${BASH_REMATCH[1]}"
  fi
  echo "$arg"
}

# Map the displayed menu label to the internal command keyword.
get_command() {
  local search_term="$1"
  local command=""

  for option in "${MENU_OPTIONS[@]}"; do
    local label="${option%%<||>*}"
    if [ "$label" = "$search_term" ]; then
      command="${option#*<||>}"
      break
    fi
  done

  echo "$command"
}

# -----------------------------
# Execute the Command Based on Keyword
# -----------------------------
execute_command() {
  local result=""
  case "$1" in
  init)
    run_in_terminal "open-cuak init"
    ;;
  start)
    run_in_terminal "open-cuak start"
    ;;
  stop)
    run_in_terminal "open-cuak stop"
    ;;
  restart)
    run_in_terminal "open-cuak restart"
    ;;
  status)
    display_dialog "Status" "open-cuak status" false
    ;;
  stats)
    run_in_terminal "open-cuak stats"
    ;;
  clear)
    run_in_terminal "open-cuak clear"
    ;;
  version)
    display_dialog "Version" "open-cuak version" true
    ;;
  *)
    run_in_terminal "$1"
    ;;
  esac
}

# -----------------------------
# Menu for Terminal Testing (Optional)
# -----------------------------
MENU_OPTIONS=(
  "🆕  Initialize<||>init"
  "▶️  Start Services<||>start"
  "⏹️  Stop Services<||>stop"
  "🔄  Restart Services<||>restart"
  "🧹  Clear Services<||>clear"
  "🔍  Check Services Status<||>status"
  "ℹ️  Check Version<||>version"
  "📊  View Docker Stats<||>stats"
)

show_menu() {
  for ((i = 0; i < ${#MENU_OPTIONS[@]}; i++)); do
    option="${MENU_OPTIONS[$i]}"
    label="${option%%<||>*}"
    echo "$label"
  done
}

# -----------------------------
# Main Execution
# -----------------------------
if [ $# -eq 0 ]; then
  show_menu
else
  raw_arg=$(parse_argument "$1")
  command=$(get_command "$raw_arg")
  execute_command "$command"
fi
