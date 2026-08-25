# Social Media Planner

Plan a whole month of posts for all your clients, in one place.

**One file. Nothing to install. Nothing to pay for.**

---

## How to open it

Double-click **`index.html`**. It opens in Chrome, Edge, Safari — any browser.

That's it. There is no setup, no sign-up, no internet needed.

To keep it handy, drag `index.html` onto your desktop, or bookmark it in your browser.

---

## What it does

- **Plan a whole month in one go.** Pick a client, tick which days you post on, paste all your captions — one per line — and press one button. The full month appears on the calendar.
- **All your clients in one calendar,** each with their own colour so you can tell them apart at a glance.
- **Facebook, Instagram and LinkedIn** on every post — tick whichever ones apply.
- **Track each post** as Idea → Ready → Approved → Posted, so you always know what is waiting on the client.
- **Send the plan to your client** — press Print / PDF and you get a clean month sheet to share on WhatsApp or email for approval.
- **Post in seconds.** Open a post, press Copy, press the Facebook / Instagram / LinkedIn button, paste. Done.
- **Export to Excel** any time.
- **Drag a post** from one day to another to move it.

---

## Where is my data kept?

Inside your own browser, on your own computer. It is never uploaded anywhere, and nobody else can see your clients' content.

**Because of that, please download a backup once a week.** Go to the **Backup** tab and press *Download backup file*. If you ever change computer or clear your browser, that file brings everything back.

To use the planner on a second device, put `index.html` and your backup file in Google Drive or Dropbox, then press *Restore from backup* on the other device.

---

## Connecting Facebook, Instagram and LinkedIn

There are three honest ways. The **Connections** tab inside the planner explains each one in full, but in short:

| | What you do | Cost | Set-up |
|---|---|---|---|
| **Way 1** | Plan here → Copy → paste on the platform | Free | None |
| **Way 2** *(recommended)* | Plan and get approval here → schedule them free in Meta Business Suite and LinkedIn | Free | None |
| **Way 3** | Plan here → the planner hands approved posts to an automation tool, which posts them by itself | Server needed | One-time |

**Why the planner cannot post by itself:** for a post to go out while your laptop is closed, something has to stay switched on 24 hours a day. A single HTML file cannot do that. It would also need secret keys, and those must never sit inside a file that anyone can open — that is how accounts get stolen.

So Way 3 gives the planner a hand-over point instead: you paste in one web address (a "webhook") in the Connections tab, and the planner sends the approved posts there. That address can be n8n, Make or Zapier, which then does the posting.

**My honest advice: start with Way 2 today.** It is free, official, and takes one sitting a month. Only build Way 3 once you have enough clients that the manual step actually hurts.

---

## Quick start — 5 minutes

1. **Clients** tab → add each client once (name, Facebook, Instagram, LinkedIn, usual hashtags).
2. Green **Plan Whole Month** button → pick the client, tick the days, paste your captions → *Create the posts*.
3. **Print / PDF** → send to the client for approval → mark the approved ones green.
4. On the day: open the post → **Copy** → open the platform → paste → mark **Posted**.
5. **Backup** tab → download the backup file.

Never used it before? The **How to use** tab inside the planner repeats all of this.

---

## For whoever maintains this later

Plain HTML, CSS and JavaScript — no build step, no framework, no dependencies to install. The Tailwind styles are pre-built and sit inside a `<style>` block in the file, so the page works with no internet at all.

If you add or change Tailwind class names, regenerate that block:

```bash
npm i tailwindcss@3.4.17
npx tailwindcss -i in.css -o out.css --minify   # content: social-planner/index.html
```

Then paste the result back into the `<style>` block near the top of `index.html`.

Data is stored in `localStorage` under the key `social_planner_v1`, shaped as `{ clients: [], posts: [], settings: {} }`. The backup file is exactly that object as JSON.
