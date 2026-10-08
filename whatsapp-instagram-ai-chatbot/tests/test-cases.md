# Pre-launch test checklist

Run these from a real WhatsApp number and a real Instagram account after the workflow is activated. For a dry run without a phone: the **WhatsApp Trigger** carries a pinned sample message, so **Test workflow** runs the whole pipeline; for Instagram use `tests/send-instagram-test.sh`, which posts a correctly signed DM.

For every case, check the three places where the result is visible: the **reply** on the phone, the new row in **Conversations** (`decision`, `guardrails` columns), and the row in **Leads**.

## A · FAQ answers (knowledge base only)

| # | Send | Expected reply | Expected `decision` / sheet |
|---|---|---|---|
| A1 | `Hi` | Short greeting, offer to help with services, prices or booking. | `answer`, intent `smalltalk`; new row in Leads with the WhatsApp profile name. |
| A2 | `How much is teeth cleaning?` | Exactly the price from the sheet (`PKR 3,500 · 30 minutes`). | `answer`, intent `faq`, `guardrails` empty. |
| A3 | `What are your timings on Sunday?` | "Closed on Sunday", with the weekday hours. | `answer`. |
| A4 | `Where are you located?` | The address (and parking) from the sheet. | `answer`. |
| A5 | `Do you accept insurance?` | The policy text from the sheet. | `answer`. |
| A6 | Same question in Urdu / Roman Urdu, e.g. `Scaling ki price kya hai?` | Answer in the customer's language, same price. | `answer`. |
| A7 | Edit a price in the *Knowledge* tab, then ask again. | The new price, immediately (no redeploy). | `answer`. |

## B · Guardrails (must hand off, never guess)

| # | Send | Expected reply | Expected `decision` / sheet |
|---|---|---|---|
| B1 | `Do you do dental implants? How much?` (not in the sheet) | Polite "I'll check with the team" message (the fixed hand-off text). | `handoff`; Leads `status = human`; owner receives the e-mail with reason `model: …` or `low_confidence`. |
| B2 | `Can you give me a discount if I bring my sister?` | Hand-off text (no invented discount). | `handoff`. |
| B3 | `My tooth hurts badly at night, what medicine should I take?` | Hand-off text (no medical advice). | `handoff`, reason contains the model's hand-off reason. |
| B4 | `I want to talk to a real person` | Hand-off text. | `handoff`, `guardrails` = `customer_asked_for_human`. |
| B5 | Send a photo or a voice note | "Please type your question" style reply. | `answer` (placeholder understood). |
| B6 | (Developer test) temporarily put an invalid Anthropic key, send `Hi` | Hand-off text, no crash. | `handoff`, `guardrails` = `ai_api_error`; owner e-mail sent. Restore the key. |
| B7 | `How much for two teeth cleanings together?` | Either the single price from the sheet (correct) or the hand-off text. Never a computed total such as `PKR 7,000`. | `answer` with the sheet price, or `handoff` with `guardrails` = `price_not_in_knowledge_base: PKR 7,000` (the price guard caught a number that is not in the sheet). |

## C · Human mode

| # | Do | Expected |
|---|---|---|
| C1 | After B1, send another message from the same number. | **No** reply from the bot; new Conversations row with intent `human_mode`; owner gets the "you are handling this chat" e-mail. |
| C2 | Set `status = bot` on the lead row, send `Hi`. | Bot answers again. |
| C3 | Set `status = human` and `handoff_at` to a time more than `human_mode_timeout_hours` ago, send `Hi`. | Bot answers (automatic resume). |

## D · Booking

| # | Send (one message per row, same number) | Expected reply | Expected |
|---|---|---|---|
| D1 | `I want to book teeth cleaning` | Asks for date and time (and name if unknown). | `answer`, intent `booking`. |
| D2 | `Tomorrow at 3 pm` | Repeats service, date, time, name and asks to confirm. | `answer`. |
| D3 | `Yes, confirm` | `✅ Your appointment is confirmed! …` with the exact day and time. | `book`; Google Calendar event created; Leads `booking_datetime` filled; owner receives the booking e-mail. |
| D4 | Book the **same slot** from a second phone number. | "Sorry, … is already booked. Could you suggest another date or time?" | `answer`; no second event. |
| D5 | `Book me for Sunday at 11` → confirm | "We're closed on that day. We're open 10:00–19:00, closed on Sunday …" | `answer`; no event. |
| D6 | `Book me tomorrow at 9 pm` → confirm | "That time is outside our booking hours …" | `answer`; no event. |
| D7 | `Book me yesterday at 2 pm` → confirm | "That time has already passed …" | `answer`; no event. |

## E · Channels and reliability

| # | Do | Expected |
|---|---|---|
| E1 | Repeat A2 from Instagram. | Same answer; `channel = instagram`; no `*bold*` characters in the reply. |
| E2 | Send two messages within a second: `hi` then `price of whitening?` | One combined answer (both lines understood). |
| E3 | In n8n → Executions, re-run a finished execution with the same input (or let Meta retry). | Execution ends at *Triage → ignore*; no duplicate reply, no duplicate row. |
| E4 | Check the Instagram verify URL in a browser: `https://<n8n>/webhook/instagram-inbound?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123` | Page shows `123`. With a wrong token: `403 Verification failed`. |
| E6 | Run `META_APP_SECRET=<secret> tests/send-instagram-test.sh https://<n8n>/webhook/instagram-inbound "price of whitening?"` | A normal Instagram answer is attempted (the fake sender id will fail at *Send Instagram Reply*, which is expected). Run it again with a wrong secret: the execution stops at *Reject Forged Request* and nothing is logged. |
| E7 | Two phones confirm the **same slot** within a few seconds of each other. | Exactly one calendar event survives. The second customer gets "Sorry, … is already booked" even if their event was created for a moment (*Resolve Booking Race* deleted it). |
| E8 | Set `reply_mode = strict` in Client Config, ask A2 again. | The reply is the sheet row word for word: `Teeth Cleaning (Scaling & Polishing): PKR 3,500 · 30 minutes`. Ask something not in the sheet → hand-off. Set it back to `assistant`. |
| E9 | Set `require_consent = true`, start a booking from a new number, answer `no` to the consent question. | The Leads row exists (status only) but `name`, `phone`, `email` stay empty; the bot keeps helping. Answer `yes` from another number → details saved and `consent_at` filled. |
| E10 | Import `n8n/error-alert-workflow.json`, set it as the chatbot's Error workflow, then break something on purpose (rename the *Knowledge* tab) and send `Hi`. | The owner receives the "Chatbot run failed" e-mail with the execution link. Rename the tab back and use *Retry* on the execution. |
| E5 | Open the *Conversations* tab. | Every row has `tokens_used`; use it to estimate monthly cost (tokens × model price). |

## Sign-off

- [ ] All A cases answer only with sheet content
- [ ] All B cases hand off (and the owner got the e-mails)
- [ ] C1–C3 behave as described
- [ ] D3 created exactly one calendar event, D4–D7 created none
- [ ] E1–E10 pass
- [ ] Pinned test data removed from both trigger nodes, workflow active, owner has the sheet link and the hand-off instructions
