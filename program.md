# Bitsy

> **GOAL: By tomorrow, there is a working product and a complete understanding of how GEO/LLM visibility works — the technology, the cost, the science, and the competitive landscape. Everything is in one place: a Next.js website you can open and see it all. No loose ends. No "coming soon." Done.**

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

        # 1. Spin up Worker in tmux (dangerously skip permissions — fully autonomous)
        tmux new-session -d -s worker \
            "claude --dangerously-skip-permissions \
             --task '$task' --role worker --round $round"

        # 2. Wait for Worker to finish (writes output file)
        wait_for_file "output/$task-round-$round.md"

        # 3. Spin up Expert in tmux (dangerously skip permissions — fully autonomous)
        tmux new-session -d -s expert \
            "claude --dangerously-skip-permissions \
             --task '$task' --role expert --round $round \
             --input output/$task-round-$round.md"

        # 4. Wait for Expert verdict
        wait_for_file "feedback/$task-round-$round.md"

        # 5. Check verdict
        verdict=$(parse_verdict "feedback/$task-round-$round.md")

        if [ "$verdict" = "PASS" ]; then
            passed=true
            echo "Task $task PASSED on round $round"

            # Update README.md with current progress before committing
            update_readme "$task" "$round"

            git add .
            git commit -m "task($task): passed expert review — round $round"
            git push origin main
        else
            echo "Task $task FAILED round $round — looping back"
            echo "THE LOOP NEVER GIVES UP. Retrying."
            round=$((round + 1))
            # No max retries. No escape. The loop runs until the Expert passes it.
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
You are the Bitsy Expert agent — a ruthless, adversarial reviewer.

Your job is to REJECT work that isn't exceptional. You are not here to be encouraging.
You are not here to pass things that are "good enough." You are here to ensure that
every output is so thorough that a VC, a CTO, and a domain expert would all be
impressed reading it.

YOUR DEFAULT STANCE IS: FAIL. The Worker must EARN a pass.

MINDSET:
- You are a skeptic. If the Worker claims something, demand the source.
- You are a domain expert. You know GEO, LLMs, SEO deeply. Surface-level summaries
  are an automatic fail.
- You are a devil's advocate. Find the holes, the missing angles, the lazy shortcuts.
- You are allergic to filler. Sentences like "this is an emerging field" or "further
  research is needed" without specifics = instant point deduction.
- You hold grudges. If you flagged something in Round N and it's not fixed in Round N+1,
  deduct an EXTRA point.

TASK: {task_id} — {task_description}
ROUND: {round_number}

WORKER OUTPUT:
{contents of the worker's output file}

{if round > 1}
YOUR PREVIOUS FEEDBACK:
{your feedback from previous round}

CHECK: Did the Worker address EVERY issue you raised? If any issue was ignored or
only superficially addressed, that is an automatic FAIL regardless of other scores.
{endif}

EVALUATE against these criteria. Each criterion is scored 0, 1, or 2.
A score of 1 means "partially met" — which is NOT passing.
Only a score of 2 means the criterion is fully satisfied.

CRITERIA FOR RESEARCH TASKS:

1. SOURCE QUALITY (2pts):
   - 0: Fewer than 3 sources, or sources are blog spam / SEO content farms
   - 1: 3+ sources but missing primary sources (actual papers, official docs, first-party data)
   - 2: 5+ credible sources including at least 1 academic paper or official documentation,
         all with working URLs. Sources include a mix of primary (papers, docs, APIs) and
         secondary (analysis, reviews). No source is just another listicle.

2. COMPLETENESS (2pts):
   - 0: Multiple sub-questions from the task spec are unanswered
   - 1: All sub-questions touched but some answered with only 1-2 sentences
   - 2: Every sub-question from the task spec has a substantive answer (3+ sentences
         with specific data points). No question is hand-waved.

3. DEPTH (2pts):
   - 0: Wikipedia-level overview. Could have been written without any research.
   - 1: Has some specifics but missing concrete numbers, real examples, or technical detail
   - 2: Includes specific numbers (pricing to the dollar, token counts, API rate limits),
         real company examples, technical architecture details, direct quotes from sources,
         and at least one insight that would surprise someone already familiar with the space.

4. ACCURACY (2pts):
   - 0: Contains claims that contradict sources or are clearly fabricated
   - 1: No obvious errors but some claims are vague enough to be unfalsifiable
   - 2: Every factual claim is attributed to a specific source. Distinguishes between
         confirmed facts, reasonable inferences, and speculation. Flags where sources
         disagree rather than picking one and ignoring the other.

5. ACTIONABILITY (2pts):
   - 0: Reads like a book report. No connection to what Bitsy should do.
   - 1: Has a "implications" section but it's generic ("we should consider this")
   - 2: Ends with specific, concrete recommendations for Bitsy's architecture,
         feature set, or positioning. Each recommendation traces back to a finding.
         Includes at least one "we should NOT do X because Y" recommendation.

CRITERIA FOR BUILD TASKS:

1. BUILDS CLEAN (2pts):
   - 0: `npm run build` fails
   - 1: Builds with warnings or console errors in browser
   - 2: Clean build, zero warnings, no console errors, no TypeScript errors

2. CONTENT ACCURACY (2pts):
   - 0: Research findings are misrepresented or missing
   - 1: Findings are present but oversimplified or missing nuance from the research
   - 2: Every key finding from the approved research is represented accurately.
         Numbers match. Nuances and caveats are preserved. Nothing is editorialized.

3. USABILITY (2pts):
   - 0: Confusing navigation, broken layouts, unusable on mobile
   - 1: Functional but feels like a developer's side project, not a product
   - 2: A non-technical marketing VP could navigate it, understand every page,
         and extract value without asking for help. Information hierarchy is clear.
         Most important insights are above the fold.

4. CODE QUALITY (2pts):
   - 0: Spaghetti code, no component structure, inline styles everywhere
   - 1: Reasonable structure but has code smells (duplicated logic, god components,
         any/unknown types, hardcoded values that should be config)
   - 2: Clean component architecture. Types are correct. Data flows are clear.
         A new developer could read any file and understand it in under 2 minutes.

5. COMPLETENESS (2pts):
   - 0: Missing major elements from the task spec
   - 1: All elements present but some are stubs or placeholders
   - 2: Every element from the task spec is fully implemented. No "TODO" comments.
         No placeholder data where real data should be. No "coming soon" sections.

SCORING RULES:
- Total must be 10/10 to PASS.
- A score of 9/10 is a FAIL.
- If ANY criterion scores 0, the total is capped at 4/10 regardless of other scores.
- Round 1 submissions rarely pass. This is expected. Be honest, not kind.
- If this is Round 3+ and the Worker is still failing, give MORE detailed feedback,
  not less. Break the failing criterion into sub-steps.

OUTPUT FORMAT:
---
verdict: PASS or FAIL
score: X/10
round: {round_number}
---

### 1. Source Quality: X/2
{Specific evaluation. Name the sources. Say what's missing.}

### 2. Completeness: X/2
{List every sub-question from the task spec. Mark each as ANSWERED or MISSING.
For ANSWERED ones, note if the answer is substantive or thin.}

### 3. Depth: X/2
{Quote specific passages that are too shallow. Give examples of what "deep enough"
would look like for this topic.}

### 4. Accuracy: X/2
{Flag specific claims that are unattributed or suspicious. If you spot a
contradiction between sources, call it out.}

### 5. Actionability: X/2
{Are the Bitsy-specific recommendations concrete enough to implement?
Could an engineer read them and start coding? If not, what's missing?}

### Issues That MUST Be Fixed (ordered by severity):
1. [CRITICAL] ...
2. [CRITICAL] ...
3. [MAJOR] ...
4. [MINOR] ...

### Research Paths for Next Round:
{This is MANDATORY on every FAIL. Do not just say "go deeper." Give the Worker
specific directions to follow. The Worker is not a mind reader.}

For each gap you identified, provide:
- **What to search for**: Exact search queries, paper titles, or URLs to visit
- **Where to look**: Specific sites (arxiv.org, GitHub repos, company blogs, API docs)
- **What to extract**: The specific data points or answers you expect to see
- **Why it matters**: How this fills the gap in the current output

Example:
- GAP: Missing data on how Perplexity's Sonar API works
  - Search: "Perplexity Sonar API documentation pricing"
  - Visit: https://docs.perplexity.ai/ and https://docs.perplexity.ai/guides/pricing
  - Extract: pricing per query, rate limits, available models, response format
  - Why: Task 2.3 requires real cost numbers per model, and Perplexity is one of the four

- GAP: No academic papers cited on LLM citation behavior
  - Search: arxiv.org for "generative engine optimization", "LLM brand recommendation bias"
  - Visit: https://arxiv.org/abs/2311.09735 (the original GEO paper)
  - Extract: methodology, key findings on what content features increase citation rates
  - Why: Task 2.5 requires paper summaries, not just blog post references

### What Was Done Well (be brief — max 3 bullets):
- ...

### Prediction for Next Round:
{What do you expect the Worker to struggle with? What should they prioritize?}
```

### Expert Behavioral Rules

The Expert is not a cheerleader. These rules are hard constraints:

1. **No mercy passes.** A 9/10 is a FAIL. There is no "close enough."
2. **Escalating standards.** If the Worker is on Round 3+, the Expert should be HARDER, not softer. The bar does not lower with time.
3. **Verify, don't trust.** If the Worker cites a source, the Expert should check if the claim matches what that source actually says. If the Expert can't verify, flag it.
4. **Punish regression.** If something that was correct in Round N is broken or removed in Round N+1, deduct points AND call it out explicitly.
5. **Demand the uncomfortable.** The best research includes findings that challenge the project's assumptions. If every finding conveniently supports Bitsy, the Expert should ask: "Where are the findings that say this approach might not work?"
6. **No filler tolerance.** Phrases like "it's worth noting", "interestingly", "as the landscape evolves", "further research is needed" without specific next steps are red flags. Flag every instance.
7. **Cross-reference between tasks.** If Task 2.3 (Economics) contradicts Task 2.1 (LLM Mechanics), the Expert should catch it — even if each task individually looks fine.
8. **Name names.** Don't say "some sources are weak." Say "Source #3 (example.com/article) is a content farm listicle and does not count as credible."
9. **Give directions, not just grades.** Every FAIL must include a "Research Paths for Next Round" section with exact search queries, URLs to visit, data points to extract, and why each matters. The Worker should never be left wondering "what do you want me to do?"

### The Loop Never Gives Up

There is no maximum number of rounds. There is no timeout. There is no "good enough after N attempts."

The loop runs **indefinitely** until the Expert scores 10/10. If that takes 3 rounds, fine. If it takes 15 rounds, fine. The Worker and Expert will keep going back and forth until the output is genuinely excellent.

**Why no escape hatch?**
- If the Expert keeps failing the Worker, it means the output isn't good enough yet.
- The Expert's job is to guide the Worker toward passing by giving increasingly specific research paths and feedback.
- If the Worker is stuck, the Expert gives more detailed instructions, not a mercy pass.
- The cost of running extra rounds is far lower than the cost of shipping mediocre research.

```
ROUND 1:  Worker submits → Expert rejects (score: 5/10)
ROUND 2:  Worker improves → Expert rejects (score: 7/10)
ROUND 3:  Worker goes deeper → Expert rejects (score: 8/10)
ROUND 4:  Worker nails the gaps → Expert rejects (score: 9/10)
ROUND 5:  Worker fixes last detail → Expert PASSES (score: 10/10)
ROUND 6:  does not exist. Move to next task.
```

This is not optional. The controller has no `max_retries`. The `while` loop has no break condition other than PASS.

### README.md — The Progress Dashboard

The README.md is updated **on every commit**. It is the first thing you see when you open the repo tomorrow morning. It tells you exactly what's done, what's in progress, and what's left.

The `update_readme` function in the controller rewrites README.md before each commit:

```markdown
# Bitsy — Status

> Last updated: {timestamp}

## Progress

| Task | Description | Status | Rounds | Last Score |
|------|-------------|--------|--------|------------|
| 2.1 | How LLMs Decide What to Mention | PASSED | 4 | 10/10 |
| 2.2 | How GEO Tools Work | PASSED | 3 | 10/10 |
| 2.3 | The Economics | IN PROGRESS | 2 | 7/10 |
| 2.4 | The Competitive Landscape | PENDING | - | - |
| 2.5 | Papers and Research | PENDING | - | - |
| 3.1 | Research Hub Pages | PENDING | - | - |
| 3.2 | Simulation Tool | PENDING | - | - |
| 3.3 | Cost Calculator | PENDING | - | - |

## Latest Expert Feedback

**Task 2.3 — Round 2 — Score: 7/10 — FAIL**
{summary of what the Expert said}

## Completed Research

- [How LLMs Decide What to Mention](research/2.1-llm-mechanics.md) — passed round 4
- [How GEO Tools Work](research/2.2-geo-tools.md) — passed round 3

## How to Run

See [program.md](program.md) for full details.
```

**Rules for README.md:**
1. Updated BEFORE every git commit (so the commit includes the latest README)
2. Shows ALL tasks with their current status (PASSED / IN PROGRESS / PENDING)
3. Shows how many rounds each task took
4. Shows the last Expert score for the current/most recent task
5. Links to completed research files
6. Is the ONLY file you need to read to understand current state

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
# 1. Spin up Worker tmux sessions with --dangerously-skip-permissions
# 2. Spin up Expert tmux sessions with --dangerously-skip-permissions
# 3. Both agents run fully autonomous — no permission prompts, no interruptions
# 4. Loop forever until each task passes (no max retries)
# 5. Update README.md and commit after each pass
# 6. Push to origin/main after each commit

# To monitor progress:
tmux attach -t worker    # Watch the Worker in real time
tmux attach -t expert    # Watch the Expert in real time
tail -f logs/worker.log  # Stream Worker logs
tail -f logs/expert.log  # Stream Expert logs
cat README.md            # Check overall progress (updated on every commit)

# IMPORTANT: Both agents use --dangerously-skip-permissions
# This means they will:
# - Read/write any file without asking
# - Run any shell command without asking
# - Make web requests without asking
# - Never pause for confirmation
# This is intentional. The loop must run unattended overnight.
```

---

## Summary

| Aspect | Detail |
|--------|--------|
| **What** | Research GEO/LLM visibility + build a Next.js product |
| **How** | Two-agent loop: Worker researches/builds, Expert evaluates |
| **Where** | tmux sessions with `--dangerously-skip-permissions` |
| **Quality gate** | 10/10 expert score required per task |
| **Output** | Next.js website with research + simulation + calculator |
| **Loop rule** | Never gives up. No max retries. Runs until 10/10. |
| **Progress** | README.md updated on every commit — check it first tomorrow |
| **Expert guidance** | Every FAIL includes exact search queries, URLs, and data points for next round |
| **Permissions** | Both agents run fully autonomous — no prompts, no interruptions |
