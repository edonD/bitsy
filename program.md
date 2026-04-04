# Bitsy

**An autonomous research-and-build loop for understanding how companies get discovered inside LLMs.**

Inspired by [Tryscope](https://tryscope.app/) — an A/B testing platform for AI search campaigns that simulates how ChatGPT recommends brands before you publish.

Bitsy is not just a tool — it's a self-improving pipeline. It researches GEO (Generative Engine Optimization), synthesizes findings, builds a deliverable Next.js website, and uses a **two-agent loop** (Worker + Expert) to ensure every output meets a quality bar before committing.

### Starting Point — What We've Already Found

These are the sites, tools, and sources discovered during initial research. The Worker agent should use these as a starting point and go deeper from here.

| Source | URL | What It Is |
|--------|-----|------------|
| Tryscope | https://tryscope.app/ | Pre-publish A/B testing for AI search. Persona-based simulation, polls 50x/day across ChatGPT, Claude, Gemini, Perplexity. Our primary inspiration. |
| AthenaHQ | https://athenahq.ai/ | Full-stack GEO monitoring ($295-900/mo). Founded by ex-Google Search and DeepMind staff. |
| Otterly AI | https://otterly.ai/ | Brand mention tracking from $29/mo. Country-specific monitoring, free tier. |
| SE Ranking | https://seranking.com/ | Traditional SEO + AI visibility tracking in unified dashboards. From $103/mo. |
| Semrush AIO | https://www.semrush.com/ | Enterprise AI visibility module. Granular mention tracking, sentiment, competitive benchmarking. |
| Scrunch AI | https://scrunch.ai/ | Prompt-level monitoring with competitor replacement detection. From $250/mo. |
| XFunnel | https://xfunnel.ai/ | Conversion attribution from AI search. Custom pricing. |
| LLMClicks | https://llmclicks.ai/ | Mention rate, share of voice, hallucination tracking. From $49/mo. |
| Goodie AI | https://goodie.ai/ | ChatGPT mention frequency tracking. From ~$49/mo. |
| Peec AI | https://peec.ai/ | Inclusion detection and historical trends. From EUR 89/mo. |
| Knowatoa | https://knowatoa.com/ | Focused on sales/lead-generating queries. From $49/mo. |
| Geordy.ai | https://geordy.ai/ | Automated content transformation for AI readiness. |
| Frase | https://frase.io/ | Answer engine optimization with content briefs. From $38/mo. |
| Surfer SEO | https://surferseo.com/ | On-page optimization with NLP entity focus. From $79/mo. |
| HubSpot Search Grader | https://website.grader.com/ | Free AI readiness scoring and technical diagnostics. |
| a16z GEO article | https://a16z.com/geo-over-seo/ | "GEO over SEO" — the $80B+ SEO market is cracking. Key industry analysis. |
| Search Engine Land (GEO) | https://searchengineland.com/what-is-generative-engine-optimization-geo-444418 | Comprehensive guide on what GEO is and how to win AI mentions. |
| Search Engine Land (LLM tracking) | https://searchengineland.com/llm-optimization-tracking-visibility-ai-discovery-463860 | LLM optimization in 2026: tracking, visibility, and what's next. |

**The Worker must not stop at these.** These are starting points. The research tasks in Section 2 require going deeper — finding the papers these sites reference, the GitHub repos behind them, the pricing pages, the user reviews, the technical architecture docs.

---

## Section 1: The Aim

### What Are We Solving?

When someone asks ChatGPT "what's the best CRM?", some companies show up and others don't. This is the new battleground — **LLM visibility**. Traditional SEO (Google rankings) is dying. The new game is:

- **SEO** = Search Engine Optimization (Google, Bing — links and keywords)
- **GEO** = Generative Engine Optimization (ChatGPT, Claude, Gemini, Perplexity — how AI models mention, rank, and recommend companies)

**Bitsy's aim is to build a complete understanding of this space and turn it into a product:**

1. **Understand the mechanics** — How do LLMs decide which companies to mention? What signals matter? What's the science behind it?
2. **Quantify the cost** — What does it cost to monitor LLM visibility? API calls, token usage, polling frequency — real numbers.
3. **Simulate visibility** — Given a company and its competitors, run queries across LLMs and measure who gets mentioned, how often, in what position, with what sentiment.
4. **Package it** — Build a Next.js website that presents all research, findings, and the simulation tool in one place you can open tomorrow and see everything.

### Why a Loop?

This is too complex for a single pass. Research is iterative. You find a paper, it references another paper, that changes your understanding, which changes the architecture. Bitsy works in a **continuous loop**:

```
┌─────────────────────────────────────────────────────────┐
│                    THE BITSY LOOP                       │
│                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   │  WORKER  │───▶│  OUTPUT  │───▶│  EXPERT  │         │
│   │  (tmux)  │    │  (file)  │    │  (tmux)  │         │
│   └──────────┘    └──────────┘    └────┬─────┘         │
│        ▲                               │               │
│        │         ┌──────────┐          │               │
│        │         │ PASS?    │◀─────────┘               │
│        │         └────┬─────┘                          │
│        │              │                                 │
│        │     ┌────────┴────────┐                       │
│        │     │                 │                        │
│        │    NO                YES                       │
│        │     │                 │                        │
│        └─────┘          ┌─────▼─────┐                  │
│                         │  COMMIT   │                  │
│                         │  & NEXT   │                  │
│                         └───────────┘                  │
└─────────────────────────────────────────────────────────┘
```

Nothing gets committed until the Expert agent says it's done.

---

## Section 2: Research — Understand the Technology

### What the Worker Agent Must Research

The Worker spins up in a tmux session and systematically researches these topics. Each topic is a **research task** that enters the loop independently.

#### Task 2.1: How LLMs Decide What to Mention

- How do training data pipelines work? (CommonCrawl, licensed datasets, RLHF)
- What makes a company "stick" in an LLM's weights vs. get forgotten?
- Role of recency — how often are models retrained? What's the data cutoff lag?
- Role of frequency — does appearing on 1,000 pages matter more than appearing on 10 authoritative ones?
- Role of structured data — do schema.org, JSON-LD, FAQ pages help?
- **Find and cite**: Academic papers (e.g., the original GEO paper from Princeton/Georgia Tech/IIT Delhi), blog posts from a16z, Search Engine Land, industry reports.

#### Task 2.2: How GEO Tools Work Under the Hood

- Polling architecture — how do tools like Tryscope, AthenaHQ, Otterly poll LLMs?
- Statistical methods — how many samples per query are needed for confidence?
- Response parsing — how do you extract brand mentions, sentiment, position from free text?
- Multi-model comparison — how do you normalize results across GPT, Claude, Gemini, Perplexity?
- Pre-publication simulation — how does Tryscope simulate "what if I change my content"?
- **Find and cite**: Tryscope docs, AthenaHQ blog, any open-source implementations on GitHub.

#### Task 2.3: The Economics

- Cost per API call across models (GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku, Gemini Pro, Gemini Flash, Perplexity Sonar)
- Cost modeling: X queries × Y models × Z samples/day = $/month
- Where can you cut costs without losing signal? (Cheaper models for polling, expensive models for deep dives)
- Comparison to traditional SEO tool pricing (Semrush $130-500/mo, Ahrefs $99-999/mo)
- Break-even analysis: at what price point does a GEO SaaS become viable?

#### Task 2.4: The Competitive Landscape

- Map every GEO/LLMO tool: name, pricing, features, funding, team size
- What's missing in the market? Where are the gaps?
- What do users complain about in existing tools? (Check Reddit, Twitter/X, G2 reviews)
- Open-source alternatives — does anything exist on GitHub?

#### Task 2.5: The Science — Papers and Research

Key papers and sources to find, read, and summarize:
- "GEO: Generative Engine Optimization" (Princeton/Georgia Tech/IIT Delhi)
- Any follow-up papers on LLM citation behavior
- a16z's "GEO over SEO" analysis
- Brandlight's research on traditional vs. AI search overlap
- Y Combinator's projections on search volume decline
- Any papers on LLM recommendation bias, brand mention frequency, or retrieval-augmented generation relevance

### How Research Enters the Loop

```
For each research task (2.1 through 2.5):

1. WORKER tmux session:
   - Searches the internet (web search, fetch URLs, find papers)
   - Reads and synthesizes findings
   - Writes a structured output file: research/<task_id>.md
   - Includes: summary, key findings, sources with URLs, implications for Bitsy

2. EXPERT tmux session spins up:
   - Reads the research output
   - Evaluates against expert criteria:
     □ Are the sources credible and cited with URLs?
     □ Are the key questions from the task answered?
     □ Is anything missing or superficial?
     □ Are there contradictions that need resolving?
     □ Would a product manager have enough info to make decisions?
   - Returns a verdict: PASS or FAIL with specific feedback

3. If FAIL:
   - Worker receives feedback
   - Goes back to research the gaps
   - Rewrites the output
   - Expert re-evaluates
   - Loop continues until PASS

4. If PASS:
   - Output gets committed to git
   - Next task begins
```

### Expert Evaluation Criteria (Research)

The Expert uses a **point system**. Each research task must score 10/10 before passing:

| Criterion | Points | What It Means |
|-----------|--------|---------------|
| Source quality | 2 | At least 3 credible sources with URLs |
| Completeness | 2 | All sub-questions in the task are answered |
| Depth | 2 | Goes beyond surface-level — includes numbers, specifics, quotes |
| Accuracy | 2 | No contradictions, hallucinations, or unsupported claims |
| Actionability | 2 | Findings directly inform what Bitsy should build |

**Total: 10 points. Must score 10/10 to pass. Any point lost = back to Worker.**

---

## Section 3: Build — The Deliverable

### What Gets Built

A **Next.js website** that serves as both a research repository and a working product prototype. When you open it tomorrow, you see everything.

#### 3.1: Research Hub (Pages)

Every research task from Section 2 becomes a page on the site:

```
/                        → Landing page: what is Bitsy, what is GEO
/research/llm-mechanics  → Task 2.1 findings
/research/geo-tools      → Task 2.2 findings
/research/economics      → Task 2.3 findings (with interactive cost calculator)
/research/landscape      → Task 2.4 findings (competitive comparison table)
/research/papers         → Task 2.5 findings (paper summaries with links)
```

#### 3.2: Simulation Tool (Interactive)

A working prototype where you can:

```
/simulate                → Enter a company name + competitors + queries
/simulate/results        → See which LLMs mention which brands
/simulate/compare        → Side-by-side model comparison
/simulate/trends         → Historical data (if you've run multiple times)
```

#### 3.3: Cost Calculator (Interactive)

```
/calculator              → Input: number of queries, models, samples/day
                           Output: estimated monthly cost, recommended config
```

### Tech Stack

```
Framework:    Next.js 14+ (App Router)
Styling:      Tailwind CSS
Charts:       Recharts or Nivo
Database:     SQLite via Prisma (local-first, zero setup)
LLM APIs:     OpenAI, Anthropic, Google AI SDKs
Deployment:   Works locally (npm run dev), deployable to Vercel
```

### How Building Enters the Loop

```
For each build task (3.1, 3.2, 3.3):

1. WORKER tmux session:
   - Reads the approved research from Section 2
   - Builds the Next.js pages/components
   - Writes working code that renders correctly
   - Tests: does it build? does it render? does the data display?

2. EXPERT tmux session spins up:
   - Reviews the code and rendered output
   - Evaluates against expert criteria:
     □ Does the page accurately represent the research findings?
     □ Is the UI clean and readable?
     □ Does the code build without errors (npm run build)?
     □ Is the data model correct?
     □ Are interactive elements functional?
   - Returns: PASS or FAIL with specific feedback

3. If FAIL:
   - Worker fixes issues based on feedback
   - Expert re-evaluates
   - Loop until PASS

4. If PASS:
   - Code gets committed to git
   - Next build task begins
```

### Expert Evaluation Criteria (Build)

| Criterion | Points | What It Means |
|-----------|--------|---------------|
| Builds clean | 2 | `npm run build` succeeds with no errors |
| Content accuracy | 2 | Research findings are correctly represented |
| Usability | 2 | A non-technical person can navigate and understand |
| Code quality | 2 | No hacks, proper components, typed where needed |
| Completeness | 2 | All required elements from the task spec are present |

**Total: 10/10 required to pass.**

---

## Section 4: The Loop Engine — How It All Runs

### Architecture

Bitsy uses **tmux** to run Worker and Expert agents in separate sessions. A controller script orchestrates the loop.

```
bitsy/
├── program.md              ← You are here
├── controller.sh           ← Main loop orchestrator
├── worker.sh               ← Worker agent launcher
├── expert.sh               ← Expert agent launcher
├── tasks.json              ← Task queue with status tracking
├── research/               ← Research outputs (written by Worker, reviewed by Expert)
│   ├── 2.1-llm-mechanics.md
│   ├── 2.2-geo-tools.md
│   ├── 2.3-economics.md
│   ├── 2.4-landscape.md
│   └── 2.5-papers.md
├── feedback/               ← Expert feedback per task per iteration
│   ├── 2.1-round-1.md
│   ├── 2.1-round-2.md
│   └── ...
├── site/                   ← Next.js website
│   ├── package.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── research/
│   │   │   ├── simulate/
│   │   │   └── calculator/
│   │   └── components/
│   └── ...
└── logs/                   ← Execution logs
    ├── worker.log
    └── expert.log
```

### Controller Flow (Pseudocode)

```bash
#!/bin/bash
# controller.sh — The Bitsy Loop

TASKS=("2.1" "2.2" "2.3" "2.4" "2.5" "3.1" "3.2" "3.3")

for task in "${TASKS[@]}"; do
    echo "=== Starting task: $task ==="
    passed=false
    round=1

    while [ "$passed" = false ]; do
        echo "--- Round $round ---"

        # 1. Spin up Worker in tmux
        tmux new-session -d -s worker \
            "claude --task '$task' --role worker --round $round"

        # 2. Wait for Worker to finish (writes output file)
        wait_for_file "output/$task-round-$round.md"

        # 3. Spin up Expert in tmux
        tmux new-session -d -s expert \
            "claude --task '$task' --role expert --round $round \
             --input output/$task-round-$round.md"

        # 4. Wait for Expert verdict
        wait_for_file "feedback/$task-round-$round.md"

        # 5. Check verdict
        verdict=$(parse_verdict "feedback/$task-round-$round.md")

        if [ "$verdict" = "PASS" ]; then
            passed=true
            echo "Task $task PASSED on round $round"
            git add .
            git commit -m "task($task): passed expert review — round $round"
        else
            echo "Task $task FAILED round $round — looping back"
            round=$((round + 1))
        fi
    done
done

echo "=== All tasks complete ==="
git push origin main
```

### Worker Agent Prompt Template

```
You are the Bitsy Worker agent.

TASK: {task_id} — {task_description}
ROUND: {round_number}

{if round > 1}
PREVIOUS EXPERT FEEDBACK:
{feedback from previous round}

Fix the issues identified above. Do not start from scratch — improve your previous output.
{endif}

INSTRUCTIONS:
1. Research this topic thoroughly using web search, URL fetching, and paper reading.
2. Write your findings to: research/{task_id}.md (for research tasks) or build the code (for build tasks).
3. Be thorough. The Expert will evaluate on: source quality, completeness, depth, accuracy, actionability.
4. Include URLs for every source.
5. When done, write "WORKER_DONE" to signal completion.
```

### Expert Agent Prompt Template

```
You are the Bitsy Expert agent.

TASK: {task_id} — {task_description}
ROUND: {round_number}

WORKER OUTPUT:
{contents of the worker's output file}

EVALUATE the Worker's output against these criteria (2 points each, 10 total):

1. SOURCE QUALITY (2pts): Are there at least 3 credible sources with working URLs?
2. COMPLETENESS (2pts): Are all sub-questions in the task specification answered?
3. DEPTH (2pts): Does it go beyond surface-level? Numbers, specifics, quotes?
4. ACCURACY (2pts): Any contradictions, hallucinations, or unsupported claims?
5. ACTIONABILITY (2pts): Do findings directly inform what Bitsy should build?

OUTPUT FORMAT:
---
verdict: PASS or FAIL
score: X/10
---

### Source Quality: X/2
{evaluation}

### Completeness: X/2
{evaluation}

### Depth: X/2
{evaluation}

### Accuracy: X/2
{evaluation}

### Actionability: X/2
{evaluation}

### Specific Issues to Fix (if FAIL):
- Issue 1: ...
- Issue 2: ...

### What Was Done Well:
- ...
```

---

## Section 5: Execution Order

Everything runs sequentially. Each task must PASS before the next begins.

```
Phase 1: Research (all must pass before building)
  ├── Task 2.1: How LLMs Decide What to Mention
  ├── Task 2.2: How GEO Tools Work Under the Hood
  ├── Task 2.3: The Economics
  ├── Task 2.4: The Competitive Landscape
  └── Task 2.5: The Science — Papers and Research

Phase 2: Build (uses approved research as input)
  ├── Task 3.1: Research Hub Pages
  ├── Task 3.2: Simulation Tool
  └── Task 3.3: Cost Calculator

Phase 3: Final Review
  └── Expert does a full-site review
      - All pages render
      - All research is accurately represented
      - Simulation tool works end-to-end
      - Cost calculator produces correct numbers
      - Site builds and runs locally
```

---

## Section 6: How to Run Bitsy

```bash
# Clone the repo
git clone https://github.com/edonD/bitsy.git
cd bitsy

# Set API keys
export OPENAI_API_KEY="..."
export ANTHROPIC_API_KEY="..."
export GOOGLE_AI_API_KEY="..."

# Start the loop
./controller.sh

# The controller will:
# 1. Spin up Worker tmux sessions for each task
# 2. Spin up Expert tmux sessions to evaluate
# 3. Loop until each task passes
# 4. Commit after each pass
# 5. Push when all tasks are done

# To monitor progress:
tmux attach -t worker    # Watch the Worker
tmux attach -t expert    # Watch the Expert
tail -f logs/worker.log  # Stream Worker logs
tail -f logs/expert.log  # Stream Expert logs
```

---

## Summary

| Aspect | Detail |
|--------|--------|
| **What** | Research GEO/LLM visibility + build a Next.js product |
| **How** | Two-agent loop: Worker researches/builds, Expert evaluates |
| **Where** | tmux sessions, git commits on pass |
| **Quality gate** | 10/10 expert score required per task |
| **Output** | Next.js website with research + simulation + calculator |
| **Loop rule** | Nothing gets committed until Expert exhausts all points |
