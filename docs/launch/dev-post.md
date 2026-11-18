---
title: A GitHub dashboard that never sends your token to its own server
tags: github, security, webdev, opensource
status: draft, not posted. Byline Vanshaj Poonia, from Vanshaj's own DEV account. The day is still open.
---

I built Spool to list every PR, issue, review request and mention you have open on GitHub, sorted by whose move it is. To do that it has to read GitHub as you, which usually means an OAuth app and a server that keeps your token in a database.

I didn't want that server. In Spool you paste a token once, it stays in your browser, and every call goes from your browser straight to `api.github.com`. Here is how that works, what the browser enforces, and what it costs.

## The token stays in localStorage

The sign-on form checks the token against `GET /user`, then saves it in the browser's `localStorage` with your login and avatar. Nothing about it is posted to Spool's own routes. Settings shows what is stored, and can export it, import it on another browser or erase it.

A classic token with no scopes is enough to read public repos, PRs, issues and discussions. Tick `repo` only if you want private repos on the board. Fine-grained tokens with public read access work too. Spool never writes to GitHub, so it never needs a write scope.

## GitHub answers browsers directly

GitHub's API accepts cross-origin requests from any site, so a web page can call it with a token in the `Authorization` header. Spool uses the GraphQL endpoint for the heavy reads, because one request can carry several searches as aliases (trimmed):

```graphql
query Board($prs: String!, $issues: String!) {
  prs: search(query: $prs, type: ISSUE, first: 100) { issueCount nodes { ...PR } }
  issues: search(query: $issues, type: ISSUE, first: 60) { issueCount nodes { ...Issue } }
}
```

The board runs one aliased search per kind of thread (yours, assigned to you, review requests, mentions, threads you commented on, discussions), paints each group as it lands, then fills in PR details and claims. On my own account that brought the first threads from about 13 seconds to about 4. Follows go eight searches to a request. A refresh reuses details for threads that haven't changed, which took a refresh from 6 requests to 3.

Every response carries `x-ratelimit-remaining`, and Spool keeps the latest numbers so Settings can show your allowance and the app can stay under it.

## A content security policy as the backstop

Keeping the token in the browser is only half the promise. The other half is that no script on the page can send it anywhere except GitHub. Production responses carry this policy:

```
connect-src 'self' https://api.github.com;
img-src 'self' data: blob: https://avatars.githubusercontent.com https://summerofcode.withgoogle.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

`connect-src` covers `fetch`, XHR, WebSockets and `sendBeacon`, so a request to any other host fails in the browser. `img-src` closes the old trick of putting a secret in an image URL. `form-action` stops a form posting it elsewhere.

A policy can't cover everything. A script that runs on the page could still navigate the whole tab to another site with the token in the URL. So the policy is the backstop, and the real defence is not running code you don't control: Spool loads no analytics and no third-party scripts, its fonts are self-hosted, and React escapes every string it renders from GitHub.

## The server only touches public data

Some sources don't let browsers in, or need parsing: Google Summer of Code's program API, Y Combinator's apply page, the Product Hunt feed, a few program blogs. Spool's own routes fetch those, cache them for an hour, and give up on a slow source after 15 seconds. None of those requests carry your token.

Guests without a token also get good first issues and young repos through the server, so they don't spend GitHub's 60 unauthenticated calls an hour on searches. The server can run those searches with a token of its own that has no scopes, and without one it searches unauthenticated.

## What it costs

- **Notifications only while a tab is open.** There's no server holding your token, so nothing can check GitHub while Spool is closed. Push to a closed browser would need exactly the server this design avoids.
- **One browser at a time.** Your token and everything you save live in one browser profile. Export and import move them, by hand.
- **Your browser profile is the vault.** Anyone with access to it can read `localStorage`. That's the same trust you already give it for your GitHub session, but it's worth saying.
- **Rate limits are yours.** GitHub limits searches per minute and GraphQL points per hour for each token, so the board batches, caches and skips lookups it doesn't need.

## Try it

The sample board needs no token: [spool.vanshajpoonia.com/board?demo=1](https://spool.vanshajpoonia.com/board?demo=1). With a token, paste it on the landing page and watch your network tab. Every request goes to Spool's own pages or to `api.github.com`.

The code is public: [github.com/VanshajPoonia/spool](https://github.com/VanshajPoonia/spool). The policy lives in `next.config.ts`, and the GitHub client in `src/lib/github.ts`.

If something's missing or broken, Send feedback in Settings or Cmd+K opens an issue on the repo. I read every one.
