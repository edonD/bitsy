#!/bin/bash
# controller.sh — The Bitsy Loop
# Orchestrates Worker and Expert agents in tmux sessions.
# Never gives up. Runs until every task scores 10/10.

set -euo pipefail

BITSY_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BITSY_DIR"

mkdir -p research feedback logs

# Task definitions
declare -A TASK_DESC
TASK_DESC["2.1"]="How LLMs Decide What to Mention — training data, signals, recency, frequency, structured data"
TASK_DESC["2.2"]="How GEO Tools Work Under the Hood — polling, parsing, multi-model, simulation architecture"
TASK_DESC["2.3"]="The Economics — API costs per model, cost modeling, break-even analysis"
TASK_DESC["2.4"]="The Competitive Landscape — every GEO/LLMO tool, pricing, features, gaps, user complaints"
TASK_DESC["2.5"]="The Science — academic papers, research findings, GEO methodologies"
TASK_DESC["3.1"]="Build Research Hub Pages — Next.js pages for all research findings"
TASK_DESC["3.2"]="Build Simulation Tool — interactive prototype for LLM visibility simulation"
TASK_DESC["3.3"]="Build Cost Calculator — interactive cost estimation tool"

TASKS=("2.1" "2.2" "2.3" "2.4" "2.5" "3.1" "3.2" "3.3")

# Track status for README
declare -A TASK_STATUS
declare -A TASK_ROUNDS
declare -A TASK_SCORE
for task in "${TASKS[@]}"; do
    TASK_STATUS["$task"]="PENDING"
    TASK_ROUNDS["$task"]="—"
    TASK_SCORE["$task"]="—"
done

# Git push auth — uses GITHUB_TOKEN env var. Set it before running:
# export GITHUB_TOKEN="ghp_..."
GIT_REMOTE_URL="https://edonD:${GITHUB_TOKEN}@github.com/edonD/bitsy.git"

update_readme() {
    local current_task="$1"
    local current_round="$2"
    local timestamp
    timestamp=$(date -u '+%Y-%m-%d %H:%M UTC')

    cat > "$BITSY_DIR/README.md" << READMEEOF
# Bitsy — Status

> Last updated: $timestamp

## What is Bitsy?

An autonomous research-and-build loop for understanding how companies get discovered inside LLMs (Generative Engine Optimization / GEO). See [program.md](program.md) for full details.

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
READMEEOF

    for task in "${TASKS[@]}"; do
        echo "| $task | ${TASK_DESC[$task]%% —*} | ${TASK_STATUS[$task]} | ${TASK_ROUNDS[$task]} | ${TASK_SCORE[$task]} |" >> "$BITSY_DIR/README.md"
    done

    # Add latest feedback summary if there's a current task failing
    local latest_feedback=""
    if [ -f "$BITSY_DIR/feedback/${current_task}-round-${current_round}.md" ]; then
        latest_feedback=$(head -30 "$BITSY_DIR/feedback/${current_task}-round-${current_round}.md")
    fi

    cat >> "$BITSY_DIR/README.md" << READMEEOF

## Completed Research
READMEEOF

    for task in "${TASKS[@]}"; do
        if [ "${TASK_STATUS[$task]}" = "PASSED" ]; then
            if [[ "$task" == 2.* ]]; then
                echo "- [${TASK_DESC[$task]%% —*}](research/${task}.md) — passed round ${TASK_ROUNDS[$task]}" >> "$BITSY_DIR/README.md"
            else
                echo "- ${TASK_DESC[$task]%% —*} — passed round ${TASK_ROUNDS[$task]}" >> "$BITSY_DIR/README.md"
            fi
        fi
    done

    if [ -n "$latest_feedback" ]; then
        cat >> "$BITSY_DIR/README.md" << READMEEOF

## Latest Expert Feedback (Task $current_task — Round $current_round)

\`\`\`
$latest_feedback
\`\`\`
READMEEOF
    fi

    cat >> "$BITSY_DIR/README.md" << READMEEOF

## How to Run

\`\`\`bash
./controller.sh
\`\`\`

See [program.md](program.md) for full architecture details.
READMEEOF
}

git_commit_and_push() {
    local msg="$1"
    cd "$BITSY_DIR"
    git add -A
    git commit -m "$msg

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>" || true
    git remote set-url origin "$GIT_REMOTE_URL" 2>/dev/null || true
    git push origin main 2>/dev/null || true
    git remote set-url origin "https://github.com/edonD/bitsy.git" 2>/dev/null || true
}

wait_for_signal() {
    local signal_file="$1"
    local timeout_seconds="${2:-1800}" # 30 min default
    local elapsed=0
    while [ ! -f "$signal_file" ] && [ $elapsed -lt $timeout_seconds ]; do
        sleep 5
        elapsed=$((elapsed + 5))
    done
    if [ ! -f "$signal_file" ]; then
        echo "WARNING: Timed out waiting for $signal_file after ${timeout_seconds}s"
        return 1
    fi
    return 0
}

run_worker() {
    local task="$1"
    local round="$2"
    local task_desc="${TASK_DESC[$task]}"
    local signal_file="$BITSY_DIR/logs/worker-${task}-round-${round}.done"
    local output_file

    rm -f "$signal_file"

    # Determine output path
    if [[ "$task" == 2.* ]]; then
        output_file="research/${task}.md"
    else
        output_file="site/BUILD_TASK_${task}.md"
    fi

    # Build the prompt
    local prompt="You are the Bitsy Worker agent. You are working in $BITSY_DIR.

TASK: $task — $task_desc
ROUND: $round

Read $BITSY_DIR/program.md first to understand the full project context and your role."

    if [ "$round" -gt 1 ]; then
        local prev_round=$((round - 1))
        if [ -f "$BITSY_DIR/feedback/${task}-round-${prev_round}.md" ]; then
            prompt="$prompt

PREVIOUS EXPERT FEEDBACK (you MUST address every issue):
$(cat "$BITSY_DIR/feedback/${task}-round-${prev_round}.md")

Fix every issue the Expert raised. Do not start from scratch — improve your previous output."
        fi
    fi

    prompt="$prompt

INSTRUCTIONS:
1. Read program.md to understand what this task requires.
2. Research this topic thoroughly using web search, URL fetching, and reading sources.
3. Start from https://tryscope.app/ and fan out — find every competitor, paper, blog post, and tool.
4. Write your findings to: $BITSY_DIR/$output_file
5. Be extremely thorough. The Expert will score you on: source quality, completeness, depth, accuracy, actionability.
6. Include URLs for every source. Include specific numbers, quotes, and data points.
7. When you are completely done, run: touch $signal_file"

    # Kill any existing worker session
    tmux kill-session -t bitsy-worker 2>/dev/null || true

    # Launch in tmux
    echo "[$(date)] Starting Worker — Task $task Round $round" >> "$BITSY_DIR/logs/controller.log"
    tmux new-session -d -s bitsy-worker \
        "claude --dangerously-skip-permissions -p '$(echo "$prompt" | sed "s/'/'\\\\''/g")' 2>&1 | tee $BITSY_DIR/logs/worker-${task}-round-${round}.log; touch $signal_file"
}

run_expert() {
    local task="$1"
    local round="$2"
    local task_desc="${TASK_DESC[$task]}"
    local signal_file="$BITSY_DIR/logs/expert-${task}-round-${round}.done"
    local feedback_file="$BITSY_DIR/feedback/${task}-round-${round}.md"

    rm -f "$signal_file"

    local prompt="You are the Bitsy Expert agent — a ruthless, adversarial reviewer. You are working in $BITSY_DIR.

TASK: $task — $task_desc
ROUND: $round

Read $BITSY_DIR/program.md first to understand the Expert evaluation criteria and your role.

Then read the Worker's output for this task. For research tasks, check $BITSY_DIR/research/${task}.md. For build tasks, check the site/ directory.

YOUR DEFAULT STANCE IS: FAIL. The Worker must EARN a pass.

EVALUATE against the criteria in program.md (10 points total, must score 10/10 to pass).

CRITICAL RULES:
- Score 0, 1, or 2 per criterion. Only 2 means fully satisfied.
- 9/10 is a FAIL. Only 10/10 passes.
- On every FAIL, you MUST provide specific research paths: exact search queries, URLs to visit, data points to extract.
- Be specific. Name weak sources. Quote shallow passages. Say exactly what is missing.
- If this is Round 2+, check if the Worker addressed your previous feedback. If not, automatic FAIL.

Write your full evaluation to: $BITSY_DIR/$feedback_file

The FIRST LINE of your feedback file must be either:
VERDICT: PASS
or:
VERDICT: FAIL

Follow with your full scored evaluation.

When you are completely done, run: touch $signal_file"

    # Kill any existing expert session
    tmux kill-session -t bitsy-expert 2>/dev/null || true

    # Launch in tmux
    echo "[$(date)] Starting Expert — Task $task Round $round" >> "$BITSY_DIR/logs/controller.log"
    tmux new-session -d -s bitsy-expert \
        "claude --dangerously-skip-permissions -p '$(echo "$prompt" | sed "s/'/'\\\\''/g")' 2>&1 | tee $BITSY_DIR/logs/expert-${task}-round-${round}.log; touch $signal_file"
}

# ============================================================
# MAIN LOOP
# ============================================================

echo "======================================"
echo "  BITSY LOOP — STARTING"
echo "  $(date)"
echo "  Tasks: ${TASKS[*]}"
echo "======================================"
echo "" >> "$BITSY_DIR/logs/controller.log"
echo "====== BITSY LOOP STARTED $(date) ======" >> "$BITSY_DIR/logs/controller.log"

for task in "${TASKS[@]}"; do
    echo ""
    echo "=== Task $task: ${TASK_DESC[$task]} ==="
    TASK_STATUS["$task"]="IN PROGRESS"
    passed=false
    round=1

    while [ "$passed" = false ]; do
        echo "--- Task $task — Round $round ---"
        TASK_ROUNDS["$task"]="$round"

        # 1. Run Worker
        echo "  [Worker] Launching in tmux session 'bitsy-worker'..."
        run_worker "$task" "$round"

        echo "  [Worker] Waiting for completion..."
        if ! wait_for_signal "$BITSY_DIR/logs/worker-${task}-round-${round}.done" 1800; then
            echo "  [Worker] Timed out. Retrying round."
            round=$((round + 1))
            continue
        fi
        echo "  [Worker] Done."

        # 2. Run Expert
        echo "  [Expert] Launching in tmux session 'bitsy-expert'..."
        run_expert "$task" "$round"

        echo "  [Expert] Waiting for completion..."
        if ! wait_for_signal "$BITSY_DIR/logs/expert-${task}-round-${round}.done" 1800; then
            echo "  [Expert] Timed out. Retrying round."
            round=$((round + 1))
            continue
        fi
        echo "  [Expert] Done."

        # 3. Check verdict
        local_feedback="$BITSY_DIR/feedback/${task}-round-${round}.md"
        if [ -f "$local_feedback" ]; then
            verdict_line=$(head -1 "$local_feedback")
            if echo "$verdict_line" | grep -qi "PASS"; then
                passed=true
                TASK_STATUS["$task"]="PASSED"
                TASK_SCORE["$task"]="10/10"
                echo "  >>> Task $task PASSED on round $round <<<"

                update_readme "$task" "$round"
                git_commit_and_push "task($task): passed expert review — round $round"
            else
                score=$(grep -oP 'score:\s*\K[0-9]+/10' "$local_feedback" 2>/dev/null | head -1 || echo "?/10")
                TASK_SCORE["$task"]="$score"
                echo "  >>> Task $task FAILED round $round (score: $score) — looping back <<<"
                echo "  THE LOOP NEVER GIVES UP."

                update_readme "$task" "$round"
                git_commit_and_push "task($task): round $round failed ($score) — retrying"

                round=$((round + 1))
            fi
        else
            echo "  [Expert] No feedback file found. Retrying round."
            round=$((round + 1))
        fi
    done
done

echo ""
echo "======================================"
echo "  BITSY LOOP — ALL TASKS COMPLETE"
echo "  $(date)"
echo "======================================"

update_readme "done" "0"
git_commit_and_push "all tasks complete — bitsy loop finished"
