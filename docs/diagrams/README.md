# Technical Diagram Set

`FYP-Technical-Diagrams.pdf` is the complete, print-ready set (A4, 28 pages): cover, list of figures,
notation key, and one page per diagram with explanatory notes and the source files each diagram was traced from.

The `svg/` folder holds every diagram as a standalone vector file, which Visio, PowerPoint, Word and
browsers can insert or open directly.

| Fig. | File | Diagram | Notation |
|---|---|---|---|
| 1 | `fig01.svg` | System context | DFD Level 0 |
| 2 | `fig02.svg` | System architecture | Layered block diagram |
| 3 | `fig03.svg` | Use cases | UML use case |
| 4 | `fig04.svg` | Deployment (Docker / hosting / Meta) | UML deployment |
| 5 | `fig05.svg` | Module dependencies | UML component |
| 6 | `fig06.svg` | Module structure | UML class notation |
| 7 | `fig07.svg` | Payloads and in-memory state | UML class (data model) |
| 8 | `fig08.svg` | Data flow, Level 1 | DFD (Gane & Sarson) |
| 9 | `fig09.svg` | Customer message notification process | Cross-functional swimlane |
| 10 | `fig10.svg` | Setup and go-live process | Phased process map |
| 11 | `fig11.svg` | Webhook request handling | Flowchart |
| 12 | `fig12a.svg`, `fig12b.svg` | Message forwarding logic (2 parts) | Flowchart |
| 13 | `fig13.svg` | Attachment forwarding with fallbacks | Flowchart |
| 14 | `fig14.svg` | WhatsApp delivery: retry and 24-hour window fallback | Flowchart |
| 15 | `fig15.svg` | Webhook signature verification | Flowchart |
| 16 | `fig16.svg` | Sender name resolution with cache | Flowchart |
| 17 | `fig17.svg` | Application start-up and configuration | Flowchart |
| 18 | `fig18.svg` | Credential test script | Flowchart |
| 19 | `fig19.svg` | Webhook verification handshake | UML sequence |
| 20 | `fig20.svg` | Text message forwarding | UML sequence |
| 21 | `fig21.svg` | Attachment forwarding with fallback | UML sequence |
| 22 | `fig22.svg` | 24-hour window and template fallback | UML sequence |
| 23 | `fig23.svg` | Webhook event lifecycle | UML state machine |
| 24 | `fig24.svg` | Outbound WhatsApp message lifecycle | UML state machine |
