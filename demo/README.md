# Prestige Estates — AI Lead Response (demo)

Single file. No build, no backend, no dependencies.

## Deploy to Vercel
Import the repo, set **Root Directory** to `demo`, framework preset **Other**. Nothing else.
Or drag this folder onto vercel.com/new.

## Customise per client
1. **Brand and lead data** — `SC` object in the `<script>`: brokerage name in the phone header, lead names, phone numbers, ad campaign names, areas and budgets.
2. **Qualification model** — the `score` steps and the `.rules` paragraph: field weights, the Cold/Warm/Hot thresholds, and the follow-up penalty.
3. **Scripts and pipeline** — the three `steps` arrays are the conversations; column names live in the `.kanban` markup.
