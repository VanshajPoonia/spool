# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript, chosen by the user. Server route handlers fetch public feeds that block browsers or need parsing (GSoC program API, YC apply page, Product Hunt Atom feed). GitHub data is fetched from the browser with the user's own token.

## Users

Primary: the owner (Vanshaj), an active open source contributor who has PRs, issues and comment threads spread across many repos they do not own, plus their own repos, and who also tracks programs like GSoC, YC batches and launches on Product Hunt. Used daily, often several times a day, as a personal command center.

Later: other open source contributors with the same scattered workload. The product is built single-user first but structured so accounts can be added without a rewrite.

## Product Purpose

Bring every open source thread the user has out in the world into one place and say what needs them next: PRs waiting on review, PRs with requested changes, issues they claimed, comments awaiting their reply, review requests, per-repo progress, new repos that match their interests, and program deadlines (GSoC, YC) and launches (Product Hunt) worth acting on.

Success: the user opens it, sees in seconds what is waiting on them versus what they are waiting on, and never loses a PR to silence again.

## Positioning

Discovery tools (ossium) find repos and bounties; assessment tools (githolt) judge whether a repo will merge outside PRs. This product manages what happens after you have started: the contributor's own open threads across every repo, sorted by who owes the next move. Repo assessment in the style of githolt is a planned later feature, not v1.

## Operating Context

- GitHub is the system of record. The user's personal access token is pasted once and stored only in their browser (localStorage). Nothing is sent to a server owned by the product; GitHub's REST API is called directly from the browser.
- Public feeds are read through the app's own server routes: GSoC (`summerofcode.withgoogle.com/api/program/` and `/api/program/<year>/organizations/`), YC (`ycombinator.com/apply`, batch + deadline fields), Product Hunt (`producthunt.com/feed`, Atom).
- User-set interests (languages, topics) drive repo discovery and GSoC org matching.
- Local-only state: pins, snoozes, notes, interests, dismissed items.

## Capabilities and Constraints

- v1: GitHub token connect; inbox of open threads grouped by who owes the next move; PRs, issues, review requests, mentions/comments; per-repo progress; interest-matched new repos; opportunities (GSoC timeline + matched orgs, YC batch deadline, Product Hunt launches); local notes/snooze/pin.
- A demo mode with clearly labeled synthetic data lets the app be explored without a token.
- GitHub search API limit: 30 requests/minute authenticated. Fetches must be batched and cached.
- Not in v1: OAuth, multi-user accounts, repo-worthiness scoring (githolt-style), writing to GitHub (the product is read-only toward GitHub).

## Brand Commitments

- Name: Spool (chosen by Claude at the user's request; the user can rename). A spool is where loose threads get wound up; contributors' PRs, issues and comments are threads.
- Letter-built face characters that change expression across the page are a requested signature (inspired by githolt's kaomoji, must not copy it).
- Copy must be plain and specific. No filler, no hype adjectives, no "supercharge / seamless / unlock" register.
- Rich motion and interactive elements are requested on the landing page; the home page should be the showpiece.

## Evidence on Hand

- No users, testimonials, metrics, logos or press. None may be invented.
- Live public data (GSoC 2026 milestones and orgs, YC Winter 2027 deadline Nov 2 with decisions Dec 11, Product Hunt feed) is real and can be shown as such.
- Any sample PRs/repos on the landing page or in demo mode are synthetic and must be labeled.

## Product Principles

1. Who moves next is the primary sort. Every thread is either waiting on the user or waiting on someone else.
2. Silence is a state. Time since last activity is always visible; stale threads surface on their own.
3. Local and read-only. The token never leaves the browser; the product never writes to GitHub.
4. Opportunities are filtered by the user's interests, never a firehose.
5. Fast to scan, then fast to act: every row links straight to the place on GitHub where the next move happens.

## Accessibility & Inclusion

Honor `prefers-reduced-motion` everywhere (the landing page's heavy motion must degrade to static). Keyboard navigation for the whole app. WCAG AA contrast for text.
