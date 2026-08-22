# Post Planner - Social Media Scheduler

A one-page planner for scheduling a whole month of client posts (Facebook, Instagram, LinkedIn).

## How to open it

Double-click `index.html`. That's it. It opens in Chrome / Edge / any browser.
No installing, no signup, no internet needed.

Tip: right-click the file and "Send to > Desktop (create shortcut)" so it is one click away every day.

## How to use it (2 minutes)

1. **Add your clients** - left side, click **+ Add**. Name, a colour, and their Facebook / Instagram / LinkedIn handles.
2. **Plan the month in one go** - click **Fill Whole Month** at the top. Pick the client, tick the days they post on (like Mon, Wed, Fri), pick the time. All the posts for the month are created at once.
3. **Write each post** - click a post on the calendar. Caption, hashtags, note for the designer, and the type (Post / Reel / Story / Carousel / Video / Live).
4. **Add the picture or video** - inside the post click **Choose pictures / videos**, or drag the files straight in. They show up right on the calendar, so the client sees the plan together with the artwork. Click any picture to see it big, or to save it back to your computer. You can still paste a Drive / Canva link instead if you prefer.
5. **Move a post** - drag it from one date and drop it on another.
6. **Track it** - every post goes Draft -> Approved -> Posted. The colours on the calendar show where things stand.
7. **Send to the client** - **Print / PDF** gives a clean one-page calendar to email or WhatsApp. **Excel** gives a sheet with every caption, hashtag and file name.
8. **Keep it safe** - **Save Backup** once a week keeps a file on your computer. It asks you one question: *plan only* (a small file) or *plan + pictures* (a big file that carries the artwork too). On a new laptop, **Open Backup** brings everything back.

## Where is my data?

Inside your own browser, on your own computer. Nothing goes online, nobody else can see it.
Pictures and videos are kept in the browser's own file store, so even big video files are fine
(up to 200 MB each). The sidebar shows how much room they are using.
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
