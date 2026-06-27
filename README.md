# Reality Tools

Reality Tools is a local, no-backend React demo for practical decision support. It includes three rule-based tools that help users stress-test hard decisions, inspect suspicious messages, and turn messy meeting notes into accountable follow-up.

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage
- lucide-react icons

## Features

- Decision Court: courtroom-style analysis with prosecutor, defense, witnesses, judge verdict, risk score, confidence score, risk drivers, appeal evidence, and next action.
- ScamLens: defensive scam analysis for suspicious messages with signal detection, phrase highlighting, risk scoring, explanation, safe response guidance, and action checklist.
- MeetingRealityCheck: meeting note extraction for decisions, owners, due dates, open questions, vague statements, follow-up email, and next agenda.
- Three strong demo examples per tool.
- Saved local history using localStorage.
- Delete saved history items.
- Export each result as `.txt`.
- Dark dashboard UI with responsive layouts.

## How To Run

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

For a production build:

```bash
npm run build
```

## Known Limitations

- No backend and no external API.
- Analysis is deterministic and rule-based, so it cannot understand nuance like a real reasoning model.
- ScamLens is defensive only and should not be treated as a guarantee that a message is safe or unsafe.
- Meeting extraction works best when notes are line-based and include clear words like `decided`, `will`, `owner`, `due`, or `TBD`.
- localStorage history is browser-local and can be cleared by the user or browser settings.

## Future Improvements

- Add import/export for full history.
- Add richer confidence explanations and scenario comparison tables.
- Add editable action-item owners and due dates.
- Add printable reports.
- Add optional client-only test fixtures for regression checking rule outputs.
