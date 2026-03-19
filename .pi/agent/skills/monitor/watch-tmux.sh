#!/bin/bash
# Watcher script that monitors tmux session for errors
# Only prints error lines that match patterns - keeps context clean
# Usage: ./watch-tmux.sh [session-name]

SESSION="${1:-gwb}"
ERROR_PATTERN="(failed to fetch|invalid json|rate limiting|error:|Error:|ERROR:|Exception|exception|Failed to)"

LAST_CHECK=""
POLL_COUNT=0

while true; do
    POLL_COUNT=$((POLL_COUNT + 1))
    
    # Capture recent tmux output
    CURRENT=$(tmux capture-pane -t "$SESSION" -p 2>/dev/null | tail -30)
    
    # Check for errors - only print matching lines
    if echo "$CURRENT" | grep -iE "$ERROR_PATTERN" > /dev/null 2>&1; then
        echo ""
        echo "!!! ERROR DETECTED at $(date '+%H:%M:%S') !!!"
        echo "$CURRENT" | grep -iE "$ERROR_PATTERN" | head -10
        echo ""
        exit 1
    fi
    
    # Only log heartbeat every 30 polls (once per minute with 2s sleep)
    if [ $((POLL_COUNT % 30)) -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] Still watching... (no errors)"
    fi
    
    sleep 2
done
