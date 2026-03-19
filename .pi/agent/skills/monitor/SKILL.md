---
name: monitor
description: Monitor a tmux session for errors and apply incremental backoff between checks.
---

# Monitor Skill

Watch a tmux session for errors with exponential backoff.

## Usage

```bash
# Watch session 'gwb' for errors (exits with code 1 on error)
./watch-tmux.sh gwb
```

## Error Patterns Detected

- `failed to fetch`
- `invalid json`
- `rate limiting`
- `error:` / `Error:` / `ERROR:`
- `Exception` / `exception`
- `unexpected`

## Incremental Backoff

| Check | Sleep |
|-------|-------|
| 1st | 2 min |
| 2nd | 4 min |
| 3rd | 8 min |
| 4th | 16 min |
| 5th | 32 min |
| 6th+ | 1 hour (max) |

## Example: Monitor Dev Server

```bash
SESSION="gwb"

# Start dev server in tmux
tmux new-session -d -s $SESSION 'npm run dev'
sleep 5

# Monitor loop
SLEEP=120
while true; do
    echo "[$(date '+%H:%M:%S')] Checking..."
    ./watch-tmux.sh $SESSION
    if [ $? -eq 1 ]; then
        echo "Error detected! Restarting..."
        tmux send-keys -t $SESSION C-c
        sleep 2
        tmux send-keys -t $SESSION "npm run dev" Enter
        SLEEP=120
    else
        echo "OK, sleeping ${SLEEP}s"
        sleep $SLEEP
        [ $SLEEP -lt 3600 ] && SLEEP=$((SLEEP * 2))
    fi
done
```
