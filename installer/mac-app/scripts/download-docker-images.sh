#!/bin/bash

# Script to pull Docker images, save them as .tar files, and compress them into .tar.gz files
# with parallel processing for better performance and visual progress bars

set -e

# Directory to save the Docker images
OUTPUT_DIR="./images"

# Clear the images directory if it already exists
if [ -d "$OUTPUT_DIR" ]; then
  echo "Clearing existing images directory..."
  rm -rf "$OUTPUT_DIR"
fi

mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/logs"
mkdir -p "$OUTPUT_DIR/slots" # Directory to manage slot files

# List of Docker images to pull
IMAGES=(
  # Supabase
  "supabase/studio:20250113-83c9420"
  "kong:2.8.1"
  "supabase/gotrue:v2.167.0"
  "postgrest/postgrest:v12.2.0"
  "supabase/realtime:v2.34.7"
  "supabase/storage-api:v1.14.5"
  "darthsim/imgproxy:v3.8.0"
  "supabase/postgres-meta:v0.84.2"
  "supabase/edge-runtime:v1.67.0"
  "supabase/logflare:1.4.0"
  "supabase/postgres:15.8.1.020"
  "timberio/vector:0.28.1-alpine"
  "supabase/supavisor:1.1.56"

  # OpenCuak
  "ghcr.io/aident-ai/open-cuak-web:stable"
  "ghcr.io/aident-ai/open-cuak-browserless:stable"
)

# Maximum number of parallel processes
MAX_PARALLEL=4

# Terminal control codes for colors
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

# Terminal control codes for cursor movement
CLEAR_LINE="\033[2K"
CURSOR_UP="\033[1A"
HIDE_CURSOR="\033[?25l"
SHOW_CURSOR="\033[?25h"

# Debug file for tracking slot assignments
DEBUG_FILE="$OUTPUT_DIR/slot_debug.log"
touch "$DEBUG_FILE"

# Initialize mutex for terminal output using mkdir (atomic operation in POSIX systems)
MUTEX_DIR="$OUTPUT_DIR/.mutex"
mkdir -p "$(dirname "$MUTEX_DIR")"

# Function to acquire mutex
acquire_mutex() {
  # Try to create the mutex directory - this is an atomic operation
  # If it succeeds, we have the lock
  while ! mkdir "$MUTEX_DIR" 2>/dev/null; do
    # If mkdir fails, someone else has the lock, so wait a bit and try again
    sleep 0.05
  done
}

# Function to release mutex
release_mutex() {
  # Remove the mutex directory to release the lock
  rmdir "$MUTEX_DIR" 2>/dev/null
}

# Initialize progress display area
initialize_progress_display() {
  echo "Starting Docker image download and compression process in parallel (max $MAX_PARALLEL at once)..."
  echo ""

  # Print initial empty progress lines
  for ((i = 0; i < $MAX_PARALLEL; i++)); do
    echo "[$i] <available>"
  done
}

# Function to read slot data
read_slot_data() {
  local slot=$1
  local slot_file="$OUTPUT_DIR/slots/slot_$slot"

  if [ -f "$slot_file" ]; then
    # Read the slot file content (format: image|percent|phase|size)
    IFS='|' read -r image percent phase size <"$slot_file"
    echo "$image" "$percent" "$phase" "$size"
  else
    echo "" "0" "" ""
  fi
}

# Function to update progress display
update_progress_display() {
  acquire_mutex

  # Hide cursor
  echo -ne "$HIDE_CURSOR"

  # Move cursor up to the beginning of the progress display area
  for ((i = 0; i < $MAX_PARALLEL; i++)); do
    echo -ne "$CURSOR_UP"
  done

  # Display each progress slot
  for ((i = 0; i < $MAX_PARALLEL; i++)); do
    # Clear the current line
    echo -ne "$CLEAR_LINE"

    # Read slot data
    read -r image percent phase size <<<$(read_slot_data $i)

    if [[ -n "$image" && "$image" != "reserved" ]]; then
      # Determine color based on phase
      local color="$RESET"
      case "$phase" in
      "pulling") color="$BLUE" ;;
      "saving") color="$YELLOW" ;;
      "compressing") color="$GREEN" ;;
      "completed") color="$GREEN" ;;
      "error") color="$RED" ;;
      esac

      # Create progress bar
      local bar_size=20
      local filled=$((percent * bar_size / 100))
      local bar="["
      for ((j = 0; j < filled; j++)); do
        bar+="#"
      done
      for ((j = filled; j < bar_size; j++)); do
        bar+=" "
      done
      bar+="]"

      # Display progress line
      if [[ "$phase" == "completed" && -n "$size" ]]; then
        printf "[$i] $color%s$RESET: $bar $percent%% - $phase - $size\n" "$image"
      else
        printf "[$i] $color%s$RESET: $bar $percent%% - $phase\n" "$image"
      fi
    else
      printf "[$i] <available>\n"
    fi
  done

  # Show cursor again
  echo -ne "$SHOW_CURSOR"

  release_mutex
}

# Function to find and reserve an available slot atomically
find_and_reserve_slot() {
  local found_slot=-1

  # Try to find an available slot
  for ((i = 0; i < $MAX_PARALLEL; i++)); do
    local slot_file="$OUTPUT_DIR/slots/slot_$i"

    # Try to create the slot file atomically
    if ! [ -f "$slot_file" ] && touch "$slot_file" 2>/dev/null; then
      # Successfully created the file, reserve this slot
      echo "reserved|0||" >"$slot_file"
      found_slot=$i
      echo "Reserved slot $found_slot" >>"$DEBUG_FILE"
      break
    fi
  done

  # If we found a slot, return it
  if [[ $found_slot -ne -1 ]]; then
    echo $found_slot
    return
  fi

  # If no slot is available, wait for one
  while true; do
    sleep 0.5

    for ((i = 0; i < $MAX_PARALLEL; i++)); do
      local slot_file="$OUTPUT_DIR/slots/slot_$i"

      # Try to create the slot file atomically
      if ! [ -f "$slot_file" ] && touch "$slot_file" 2>/dev/null; then
        # Successfully created the file, reserve this slot
        echo "reserved|0||" >"$slot_file"
        found_slot=$i
        echo "Reserved slot $found_slot after waiting" >>"$DEBUG_FILE"
        break
      fi
    done

    if [[ $found_slot -ne -1 ]]; then
      echo $found_slot
      return
    fi
  done
}

# Function to update progress for a specific slot
update_progress() {
  local slot=$1
  local image=$2
  local percent=$3
  local phase=$4
  local size=$5
  local slot_file="$OUTPUT_DIR/slots/slot_$slot"

  # Update the slot file
  echo "$image|$percent|$phase|$size" >"$slot_file"

  # Update the display
  update_progress_display
}

# Function to release a slot
release_slot() {
  local slot=$1
  local slot_file="$OUTPUT_DIR/slots/slot_$slot"

  echo "Releasing slot $slot" >>"$DEBUG_FILE"

  # Remove the slot file to mark it as available
  rm -f "$slot_file"

  # Update the display
  update_progress_display
}

# Process an image: pull, save as tar, and compress
process_image() {
  local IMAGE="$1"
  local SLOT="$2"
  local FILENAME=$(echo "$IMAGE" | tr '/:' '_')
  local LOG_FILE="$OUTPUT_DIR/logs/${FILENAME}.log"

  echo "Processing $IMAGE in slot $SLOT" >>"$DEBUG_FILE"

  # Update status to pulling
  update_progress "$SLOT" "$IMAGE" 0 "pulling"

  # Pull the image with progress tracking
  {
    # Create a named pipe for monitoring docker pull output
    local pull_pipe=$(mktemp -u)
    mkfifo "$pull_pipe"

    # Start docker pull with output to the pipe
    docker pull "$IMAGE" 2>&1 >"$pull_pipe" &
    local pull_pid=$!

    # Monitor the pipe for progress updates
    while IFS= read -r line; do
      echo "$line" >>"$LOG_FILE"
      if [[ "$line" =~ ([0-9]+)% ]]; then
        local percent="${BASH_REMATCH[1]}"
        update_progress "$SLOT" "$IMAGE" "$percent" "pulling"
      fi
    done <"$pull_pipe"

    # Clean up pipe
    rm "$pull_pipe"

    # Wait for pull to complete
    wait $pull_pid
    if [ $? -ne 0 ]; then
      update_progress "$SLOT" "$IMAGE" 100 "error"
      echo "Error pulling $IMAGE" >>"$LOG_FILE"
      return 1
    fi
  }

  # Update status to saving
  update_progress "$SLOT" "$IMAGE" 0 "saving"

  # Save the image as .tar with progress tracking
  {
    # Start saving in background
    docker save "$IMAGE" >"$OUTPUT_DIR/$FILENAME.tar" &
    local save_pid=$!

    # Monitor progress
    while kill -0 $save_pid 2>/dev/null; do
      if [ -f "$OUTPUT_DIR/$FILENAME.tar" ]; then
        local size=$(stat -f %z "$OUTPUT_DIR/$FILENAME.tar" 2>/dev/null || echo 0)
        # Estimate progress (this is approximate since we don't know final size)
        # Using a heuristic based on typical compression ratios
        local percent=$((size / 1000000)) # Rough estimate: 1MB ~= 1%
        if [ $percent -gt 100 ]; then
          percent=99
        fi
        update_progress "$SLOT" "$IMAGE" "$percent" "saving"
      fi
      sleep 0.5
    done

    # Check if save was successful
    wait $save_pid
    if [ $? -ne 0 ]; then
      update_progress "$SLOT" "$IMAGE" 100 "error"
      echo "Error saving $IMAGE" >>"$LOG_FILE"
      return 1
    fi
  }

  # Update status to compressing
  update_progress "$SLOT" "$IMAGE" 0 "compressing"

  # Compress the .tar file with progress tracking
  {
    local source_size=$(stat -f %z "$OUTPUT_DIR/$FILENAME.tar")

    # Start compression in background
    gzip -f "$OUTPUT_DIR/$FILENAME.tar" &
    local compress_pid=$!

    # Monitor progress
    while kill -0 $compress_pid 2>/dev/null; do
      if [ -f "$OUTPUT_DIR/$FILENAME.tar.gz" ]; then
        local current_size=$(stat -f %z "$OUTPUT_DIR/$FILENAME.tar.gz" 2>/dev/null || echo 0)
        # Estimate progress based on compressed size vs original
        local percent=$((current_size * 100 / source_size))
        if [ $percent -gt 100 ]; then
          percent=99
        fi
        update_progress "$SLOT" "$IMAGE" "$percent" "compressing"
      fi
      sleep 0.5
    done

    # Check if compression was successful
    wait $compress_pid
    if [ $? -ne 0 ]; then
      update_progress "$SLOT" "$IMAGE" 100 "error"
      echo "Error compressing $IMAGE" >>"$LOG_FILE"
      return 1
    fi
  }

  # Get file sizes for reporting
  COMPRESSED_SIZE=$(stat -f %z "$OUTPUT_DIR/$FILENAME.tar.gz")
  COMPRESSED_SIZE_MB=$(echo "scale=2; $COMPRESSED_SIZE / 1048576" | bc)

  # Update status to completed
  update_progress "$SLOT" "$IMAGE" 100 "completed" "${COMPRESSED_SIZE_MB}MB"

  # Log completion
  echo "$IMAGE:$COMPRESSED_SIZE_MB" >>"$OUTPUT_DIR/completed.txt"

  # Wait a moment to show completed status before releasing slot
  sleep 2

  # Release the slot
  release_slot "$SLOT"
}

# Initialize progress display
initialize_progress_display

# Create a file to track completed images
touch "$OUTPUT_DIR/completed.txt"

# Array to store PIDs of background processes
PIDS=()

# Function to clean up background processes and temporary resources
cleanup() {
  echo -ne "$SHOW_CURSOR" # Ensure cursor is visible on exit
  echo "Cleaning up..."
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
    fi
  done
  # Clean up mutex directory if it still exists
  rmdir "$MUTEX_DIR" 2>/dev/null || true
  # Clean up slot files
  rm -rf "$OUTPUT_DIR/slots"
  exit
}

# Trap signals to ensure cleanup is called on script exit
trap cleanup SIGINT SIGTERM

# Process all images
for IMAGE in "${IMAGES[@]}"; do
  SLOT=$(find_and_reserve_slot)
  process_image "$IMAGE" "$SLOT" &
  PIDS+=("$!")
  sleep 0.5
done

# Wait for all background processes to complete
wait

# Call cleanup explicitly in case of normal exit
cleanup

echo ""
echo "All Docker images have been pulled, saved, and compressed in parallel!"
echo "Images are available in the $OUTPUT_DIR directory"
echo "-------------------------------------------"
echo "Summary of compressed images:"
ls -lh "$OUTPUT_DIR"/*.tar.gz | awk '{print $9, "(" $5 ")"}'
