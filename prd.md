**Competitive Intelligence Agent — PRD**   
(written & playbook by Sehrish Syed in collaboration with Bassalat Sajjad)  
(sounding member \- Ali Majid)  
Made for the PMM+growth teams; Distribution Hubs, Leadership and Product folks

Venture-agnostic. Drop-in for any PMM team. Customizable via config (competitors, sources, product pillars, geos, ICPs).

## **Objective:**

Stand up an always-on **Competitive Intelligence Agent** that functions as an internal analyst desk. It **collects → contextualizes → compares → recommendations** across competitors, analyst ecosystems, and GTM motions—so PMM, Sales, Product, and Leadership can respond faster and win more.

**North Star:** Minimize “surprise” competitor moves and translate signals into owned actions that influence **pipeline, win rate, pricing/packaging, and roadmap**.

**MVP target:** A usable v0.1 in one week with automated collection, instant critical alerts, and a weekly brief.

## **Primary Users & Jobs-to-Be-Done**

* **PMM (Owner):** Maintain complete narrative, messaging, pricing/packaging, launch response.  
  *JTBD:* “Tell me what changed this week and what we should do about it.”  
* **Sales / Partnerships:** Objection handling, trigger-based outreach, battlecards.  
  *JTBD:* “Give me timely talk-tracks and proof points.”  
* **Product & Engineering:** Parity/gap calls, integration bets, roadmap inputs.  
  *JTBD:* “Surface threats/opportunities tied to our product pillars.”  
* **Leadership (CEO/CPO):** Directional calls with clear decision asks.  
  *JTBD:* “What requires an executive move now?”

**Distribution Hubs:**

**SEO / Web Ops (Distribution Hub)** — Search visibility & intent capture from category shifts and competitor content.  
*JTBD:* “Which topics/keywords are heating up, what gaps exist vs. competitors, and what pages should we publish or update next?”  
*Agent outputs:* Topic briefs with SERP comps, priority keyword list (MoM shift), competitor page diff, watchlist for new competitor clusters.  
*Cadence:* Weekly prioritized backlog \+ instant alerts on competitor pillar pages launching.

**Content Marketing (Distribution Hub)** — Narrative fuel for blogs, reports, webinars, email, and enablement.  
*JTBD:* “What are the 3–5 stories we must tell this week, and which assets should we create to win the conversation?”  
*Agent outputs:* Storylines with angle \+ proof, outline drafts, quote snippets from analysts, stat pack, CTA suggestions tied to active campaigns.  
*Cadence:* Weekly content pack \+ event/topic alerts.

**Performance Marketing / Growth (Distribution Hub)** — Budget allocation and creative/messaging tests aligned to market moves.  
*JTBD:* “Where should we shift spend or spin up tests based on competitor launches or category noise?”  
*Agent outputs:* Campaign recommendations (channels/ICPs), ad copy variants vs. competitor claims, offer/playbook suggestions, negative/competitive keyword updates.  
*Cadence:* Weekly test plan \+ real-time alerts on high-impact competitor offers or pricing changes.

**Creative / Brand (Distribution Hub)** — Visual/messaging systems for rapid response and category leadership.  
*JTBD:* “What design/messaging cues are winning the market—and how do we show up distinctly and faster?”  
*Agent outputs:* Swipe file of competitor GTM assets, do/don’t guidance, modular templates for rapid turnarounds (social, display, event), brand guardrails vs. look-alikes.  
*Cadence:* Bi-weekly refresh \+ drop-in kits tied to big moves/events.

**Scope of Intelligence (Signals to Monitor)**

**A. Corporate Moves**

* Funding (amount, stage, investors, stated use of funds)  
* M\&A, strategic partnerships/alliances, notable customer wins  
* Office/region expansions, hiring spikes by function/geo

**B. Analyst & Category Landscape**

* New or renamed categories (e.g., “AI SOC”, “Agentic Remediation”; generic)  
* Vendor placement/mentions in MQ/Wave/MarketScape/Hype Cycle/Quadrants  
* Analyst blogs, notes, or podcasts that shift narrative

**C. Product / Feature / Integrations**

* Release notes, changelogs, docs, public roadmaps etc  
* New integrations (ecosystem tools, marketplaces, cloud providers)  
* Packaging/tiers/usage models; trials/freemium; SLAs  
* Notable product expansions 

**D. Overlap \- Us vs Them**

* Product-pillar mapping (parity/edge/gap)  
* Implications for messaging, pricing, enablement, roadmap

**E. Brand & GTM Motions**

* Major PR, launches, bold campaigns, category creation attempts  
* Event presence (industry conferences), regional pushes, co-marketing  
* Pricing/discounts, marketplace listings, channel programs

## **Data Sources (Configurable)**

* Funding/M\&A: Crunchbase/PitchBook, PRNewswire/BusinessWire, company press rooms, tech media  
* Analysts: Gartner/Forrester/IDC/GigaOm portals & public excerpts; analyst blogs/podcasts  
* Product: competitor websites, release notes RSS, docs, status pages, GitHub  
* GTM/Brand: newsroom/blog RSS, conference agendas, marketplaces  
* Hiring/Expansion: LinkedIn Jobs, company careers, Glassdoor location tags  
* Ambient: Google Alerts, curated social (LinkedIn company pages)  
  *(All pluggable; start with public sources, add paid as available.)*

**Operating Model (Pipeline)**

* Collect updates (every day).  
  Pull news and pages from set sources (RSS, APIs, light scrapes). Tools can be Relay/Zapier/Make; small Python if needed.  
* Label what we found.  
  Tag each item with: company, type (Corporate / Analyst / Product / GTM), location, team/function, and date.  
* Clean it up.  
  Remove duplicates and group similar stories so we don’t read the same thing twice.  
* Explain it simply.  
  Generate a short summary (2–3 lines) and add a single line: “Why this matters.”  
* Compare to our product.  
  Map each item to our product pillars and mark if it’s parity, our edge, or our gap.  
* Rank by importance.  
  Score items using clear rules (severity). Highest-impact items go first.  
* Share and assign.  
  Send alerts and a weekly brief. Open tasks in our work tool with an owner and due date.  
* Store for later.  
  Save everything in a searchable space so we can see trends and build the monthly radar.

**Configuration Basics (so it works for any company/venture)**

* Who we track (Competitors list):  
  A simple list of companies the agent should watch. *Example:* \["AcmeSec", "ShieldAI", "CloudGuard"\].  
* How our product is organized (Product pillars):  
  6–8 important pillars that describe a product.   
* *Examples:* Discovery, Detection, Response, Compliance, Integrations, Automation/AI, Marketplace, Services.  
* Where and who matters most (Priority regions & ICPs):  
  The countries/regions and ideal customer types that are most important to you, so the agent can rank news accordingly.  
* Who should act on what:  
  A simple map from “type of news” → “default owner(s)”.  
  *Example:* Funding → PMM \+ Exec; Feature parity → PM \+ Eng; Pricing change → PMM \+ Sales.  
* What counts as big vs. medium (Severity thresholds):  
  Your cutoffs for urgency.  
  *Examples:* Funding ≥ $20M \= Critical; Hiring spike ≥ 20 roles \= Major; Pricing change shifting TCO by \>15% \= Critical.  
* When and where to send updates (Cadence):  
  The channels and timing.  
  *Examples:* Critical alerts → Slack \#PMM/GTM central or Email now; Weekly brief → Monday 9:00; Monthly radar → 1st business day via email \+ Notion.

**Severity Rules (you can change the numbers)**

| Critical — act now (instant alert) Funding/Big money news (e.g., funding ≥ $20M), IPO, or acquisition New/changed analyst category or key inclusion that will affect deals Major partnership with a big platform (AWS/Azure/GCP, major SIEM/EDR) Pricing/packaging change that shifts total cost by more than X% Huge customer logo win in our target ICP Marketplace launch or new private-offer listing*What we do:* Send immediate Slack alert \+ open a task with owner & due date.  | Major — important (hourly digest) Competitor reaches feature parity on a core product pillar Expands into one of our priority regions Noticeable hiring spike (more than N roles) in relevant teams Big co-marketing push or headline event presence*What we do:* Include in hourly digest \+ create tasks as needed.  | Minor — good to know (weekly summary) General PR, blog posts, or content without clear business impact*What we do:* Add to the weekly brief; no tasks unless requested.  |
| :---- | :---- | :---- |

**Deliverables & Report Format**

* ## **Instant Alert (Slack/Teams)**

**When to use:** Critical items that need eyes **now**.

**Include:**

* **Title:** \[CRITICAL\] {Competitor} {Event}  
* **What happened:** 1–2 short lines  
* **Why it matters:** 1 clear line  
* **Actions:** bullets with **owner → action → due date**  
* **Sources:** links

**Template:**

\[CRITICAL\] AcmeSec raises $35M Series B

What happened: AcmeSec announced a $35M Series B led by XYZ. Press release says funds go to AI automation \+ EMEA sales.

Why it matters: Expect faster parity on automation \+ more deals in EMEA.

Actions:  
\- @PMM → Update battlecard funding section → 2025-10-02  
\- @SalesLead-EMEA → Prep compete talk-track for Q4 pipeline → 2025-10-03

Sources: {link1}, {link2}

* ## **Weekly Brief (Email \+ Notion/Confluence)**

**When to send:** Every **Monday 9:00** (team timezone).

**At a glance (header):**

* Items tracked | \#Critical | \#Major | Actions opened/closed | MTTD (mean time to detect)

**Sections:**

1. **Executive Summary (≤120 words):** What changed, biggest risk/opportunity, any decisions needed.  
2. **Top 5 Moves (cards):**  
   * *Fields:* Signal type | What happened | Why it matters | Severity | Our response (owner → action → due) | Sources  
3. **Feature Tracker (table):**  
   * *Columns:* Competitor | Launch/Change | Pillar | Parity/Edge/Gap | Proposed Response  
4. **Analyst & Category Watch:** Short bullets \+ useful quote snippets.  
5. **GTM & Brand Motions (table):**  
   * *Columns:* Event/PR | Region | ICP relevance | Enablement needed  
6. **Hiring & Expansion Heatmap:** Small chart or quick bullets (where they’re hiring/growing).  
7. **Action Register:**  
   * *Columns:* ID | Owner | Action | Due | Status | Outcome metric

**Subject template:**  
Competitive Brief — Week of {MMM DD}

**Card template (for Top 5 Moves):**

\[Product\] ShieldAI — Launches “Auto-Triage”  
What happened: New L2 triage feature with SIEM integration.  
Why it matters: Direct overlap with our Automation pillar.  
Severity: Major  
Our response: @PM → Evaluate parity; @PMM → add talk-track; due 2025-10-05  
Sources: {link1}

* ## **Monthly Radar (Visual \+ Short Narrative)**

**When to send:** **1st business day** of the month.

**What to include:**

* **Spider chart:** Your **configurable product pillars** (e.g., Discovery, Detection, Response, Compliance, Integrations, Automation/AI, Marketplace, Services).  
* **Trend deltas:** What moved up/down vs last month (annotate the driver next to each spoke).  
* **Narrative (3 short paragraphs):**  
  1. **What changed:** The big shifts this month.  
  2. **Risks & opportunities:** Where we’re exposed or can press advantage.  
  3. **Decision asks:** Clear yes/no or options for leadership.

**Narrative template:**

What changed: Two competitors advanced on Automation/AI; one added Marketplace listing. Our Detection edge held.

Risks/opportunities: Risk of parity on triage by Q1; opportunity to push Compliance as a differentiator in NAMER.

Decision asks: Approve Q4 content sprint on “Automated Triage ROI”; greenlight partner co-marketing in Marketplace (Option A/B).

### **Quick Checklist**

* **Instant Alert:** Short, urgent, action-first.  
* **Weekly Brief:** What happened → why it matters → what we’ll do → who owns it.  
* **Monthly Radar:** Picture of where we stand → what moved → decisions to make.

## **Governance & Roles (generic)**

* **PMM (Owner):** taxonomy, severity rules, pillar mapping, editorial review, monthly radar narrative.  
* **MarTech/RevOps:** connectors, pipelines, dashboards, task routing, uptime.  
* **Sales Enablement:** incorporate outputs into battlecards/talk-tracks.  
* **Product:** review parity/edge/gap calls monthly; confirm implications.  
* **Exec Sponsor:** receives critical alerts; approves strategic responses.

**Routing Table (examples):**

* Funding/M\&A → PMM \+ Exec sponsor  
* Analyst category/placement → PMM (+ Partnerships if sponsorship)  
* Feature parity on core pillar → Product Manager \+ Eng Lead (+ PMM for messaging)  
* Hyperscaler/platform alliance → Partnerships \+ PMM  
* Regional expansion in priority geos → Sales Leadership

## **Acceptance Criteria (MVP)**

* Track **≥5 priority competitors** end-to-end.  
* **Critical** and **Major** alert flows verified with live/simulated events.  
* **Weekly brief** publishes automatically with Top-5, Feature Tracker, Analyst notes, GTM motions, Action Register.  
* Actions are created with correct owners via routing rules.  
* Repository is searchable by competitor and signal\_type; monthly radar exports successfully.

**3 most critical parts** of the Teammate Working Agreement—short, clear, and usable by anyone:

### **1\) Role & Responsibilities**

* **Role:** Competitive Intelligence Teammate (AI)  
* **Mission:** Find important competitor/market moves, explain why they matter, and turn them into actions.  
* **What it does every day:**  
  1. **Monitor** set sources (news, analysts, product pages).  
  2. **Explain** in plain English \+ one line “Why this matters.”  
  3. **Assign** next steps to the right owner with a due date.  
  4. **Report** via alerts and a weekly brief.

### **2\) Autonomy & Approvals**

* **Can do on its own:** tag items, send **Major/Minor** updates, open small tasks (≤4 hours effort).  
* **Needs a quick thumbs-up:** message tweaks, small enablement updates, minor targeting/SEO/content changes.  
* **Requires approval:** pricing/packaging changes, public statements, roadmap shifts, budget moves.

### **3\) SLAs & Communication**

* **Critical alerts:** post to Slack/Teams **within 15 minutes** of detection (include: what happened, why it matters, actions \+ owners \+ due).  
* **Major items:** included in an **hourly digest**.  
* **Weekly brief:** every **Monday 9:00** with Top-5 moves, actions, and open issues.  
* **Task hygiene:** create tasks for Critical/Major items immediately; nudge owners 24h before due; escalate if overdue by 24h.

**One-line template (for alerts):**  
\[CRITICAL\] {Competitor} {Event} — Why it matters: {impact}. Actions: @Owner → {step} → {YYYY-MM-DD}. Sources: {links}  
