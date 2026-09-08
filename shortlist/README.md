# Shortlist

A hiring console prototype for a six person recruiting team running seven open roles,
sourcing through joining date. One file, no build step, no dependencies.

Open `shortlist/index.html` in a browser, or serve the folder with any static server.

## What is in it

Fourteen screens, all connected and clickable:

1. Cover page, `#/`
2. Today, `#/today`
3. Roles, `#/roles`
4. Role pipeline board with drag and drop, `#/role/r1`
5. Candidate profile, `#/candidate/CAN-2291`
6. Screening scorecard, `#/scorecard/CAN-2189`
7. Interview scheduling with a conflict warning, `#/schedule/CAN-2166`
8. Feedback comparison for a split panel, `#/feedback/CAN-2291`
9. Offers, `#/offers`
10. Talent pool with filters and saved searches, `#/talent`
11. Outreach templates and sequence, `#/outreach`
12. Automation rules and the rule builder, `#/rules`
13. Reports, `#/reports`
14. Command palette, Cmd K or Ctrl K from anywhere

Plus the four states that usually get skipped: loading (the console boot), empty
(talent pool with no matches), a confirmation before a destructive move, and an
error (`#/broken`, reached by booking a slot where an interviewer is double booked).

## How it holds together

One `state` object owns the candidates. Dragging a card between columns on the
pipeline board updates the stage counts on that board, the in play count on the
roles table, and the sidebar, in the same render. Filters, sorting, saved searches
and the command palette all read the same state, so no two numbers can disagree.

Form values are kept for the session, so a half written scorecard survives a trip
to the candidate profile and back.

Today in the prototype is Thursday 10 September 2026. Every date, notice period and
compensation figure is sample data written to be internally consistent, and no real
candidate appears anywhere.
