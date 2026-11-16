import assert from "node:assert/strict";
import { test } from "node:test";
import { feedPosts, parseLfxTimeline, unescapeHtml } from "../src/lib/feeds";
import { pickFirstIssues } from "../src/lib/first-issues";
import type { FirstIssue } from "../src/lib/github";
import { ASKS } from "../src/lib/watch";

test("asking for an issue, and what isn't asking", () => {
  for (const yes of ["I'd like to take this one.", "@openwisp-companion assign", "Could a maintainer assign it to me?", "I'd like to claim this.", "@lead Can I please work on this issue?"]) assert.ok(ASKS.test(yes), yes);
  for (const no of ["@someone Are you still working on this issue?", "Thanks, looks right.", "See the assignment rules in CONTRIBUTING."]) assert.ok(!ASKS.test(no), no);
});

test("LFX timeline rows become dates in the table's year", () => {
  const md = "| Activity | Dates (2027) |\n|---|---|\n| Project Proposals Open | Wed, Jan 6 - Wed, Jan 27, 18:00 UTC |\n| Mentee Applications Open | Wed, Feb 3, 00:00 UTC - Tue, Feb 16, 23:59 UTC |\n| Mentorship Program Begins | Mon, Mar 8 |";
  assert.deepEqual(parseLfxTimeline(md), [
    { name: "proposals", label: "Project proposals", start: "2027-01-06", end: "2027-01-27" },
    { name: "apply", label: "Mentee applications", start: "2027-02-03", end: "2027-02-16" },
    { name: "begins", label: "Mentorship begins", start: "2027-03-08", end: null },
  ]);
  assert.deepEqual(parseLfxTimeline("no table here"), []);
});

test("Atom with several links, and RSS with CDATA", () => {
  const atom = `<feed><entry><title type='text'>GSoC news</title><link rel='replies' href='x'/><link rel='alternate' type='text/html' href='https://blog/a'/><published>2026-11-10T00:00:00Z</published></entry></feed>`;
  assert.deepEqual(feedPosts(atom), [{ title: "GSoC news", url: "https://blog/a", published: "2026-11-10T00:00:00.000Z" }]);
  const rss = `<rss><item><title><![CDATA[Bitcoin&amp;apos;s fuzzer]]></title><link>https://sob/b</link><pubDate>Thu, 12 Nov 2026 16:00:00 +0000</pubDate></item></rss>`;
  assert.equal(feedPosts(rss)[0].title, "Bitcoin's fuzzer");
  assert.equal(unescapeHtml("&#8217;23 &#x2014; &quot;ok&quot;"), "’23 — \"ok\"");
});

test("good first issues: no repeats, 30+ stars, two per repo", () => {
  const issue = (id: string, repo: string, stars: number): FirstIssue => ({ id, number: 1, title: id, url: id, createdAt: "", comments: { totalCount: 0 }, repository: { nameWithOwner: repo, stargazerCount: stars, primaryLanguage: null } });
  const out = pickFirstIssues([[issue("a", "big/repo", 900), issue("b", "big/repo", 900), issue("c", "big/repo", 900), issue("d", "tiny/repo", 5)], [issue("a", "big/repo", 900), issue("e", "mid/repo", 100)]]);
  assert.deepEqual(out.map((i) => i.id), ["a", "b", "e"]);
});
