# Post Planner - Social Media Scheduler

A one-page planner for scheduling a whole month of client posts (Facebook, Instagram, LinkedIn).

## How to open it

Double-click `index.html`. That's it. It opens in Chrome / Edge / any browser.
No installing, no signup, no internet needed.

Tip: right-click the file and "Send to > Desktop (create shortcut)" so it is one click away every day.

## How to use it (2 minutes)

1. **Add your clients** - left side, click **+ Add**. Name, a colour, and their Facebook / Instagram / LinkedIn handles.
2. **Plan the month in one go** - click **Fill Whole Month** at the top. Pick the client, tick the days they post on (like Mon, Wed, Fri), pick the time. All the posts for the month are created at once.
3. **Write each post** - click a post on the calendar. Caption, hashtags, design link, note for the designer, and the type (Post / Reel / Story / Carousel / Video / Live).
4. **Move a post** - drag it from one date and drop it on another.
5. **Track it** - every post goes Draft -> Approved -> Posted. The colours on the calendar show where things stand.
6. **Send to the client** - **Print / PDF** gives a clean one-page calendar to email or WhatsApp. **Excel** gives a sheet.
7. **Keep it safe** - **Save Backup** once a week keeps a file on your computer. On a new laptop, **Open Backup** brings everything back.

## Where is my data?

Inside your own browser, on your own computer. Nothing goes online, nobody else can see it.
Two things to know:
- If you clear your browser history/data, it can be erased - so take a backup file now and then.
- A different browser (or a different laptop) starts empty until you load a backup file there.

## Note

This is a planner, not an auto-poster. It tells you exactly what to post and when. You still post
from the client's own account, or paste it into Meta Business Suite / LinkedIn.

## For a developer (if you ever change the design)

Plain HTML, CSS and JavaScript in one file. The Tailwind CSS is compiled and pasted inside
the file so it works with no internet. If you change or add Tailwind classes, rebuild the styles:

```
npx tailwindcss@3 -i in.css -o out.css --content index.html --minify
```

then replace the contents of the `<style>` block at the top of `index.html`.
