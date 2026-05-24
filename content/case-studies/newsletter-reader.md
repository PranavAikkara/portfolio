# Newsletter Reader

> A small, personal web app I built because my inbox was burying the emails I actually wanted to read.

## What I built
A web app that connects to my Gmail, identifies messages from the newsletters I'm subscribed to, and renders them in a dedicated reader view. Single page, chronological, clean typography, nothing else on screen. My inbox stays chaotic. The reader stays quiet.

## The decision that mattered
The framing was the only real choice. The problem looks like "too many newsletters," but it isn't — I want those newsletters; that's why I subscribed. The problem is *newsletters mixed with everything else*. Receipts, work threads, promotions, notifications. By the time I find the newsletter I wanted to read, the moment's gone.

Once I framed it that way, the build was small. I didn't need to forward, copy, or restructure anything. The newsletters still live in Gmail. The reader just pulls them into a view where they're the only thing on screen.

## How I built it
This is a personal project, so the bar is "useful to me, no production constraints." I used Claude Code to scaffold the Gmail API integration and the reader view, kept the design minimal on purpose, and shipped a working version quickly. No notable obstacles — the Gmail API behaved, the rendering was straightforward, and the app does the thing I wanted it to do.

## Why I'm including it here
Not because it's technically interesting — it isn't. I'm including it because it's the kind of project I'm proud of for a different reason: I noticed a small daily annoyance, built the smallest thing that fixes it, and it's still useful to me months later. A lot of my work is like that.
