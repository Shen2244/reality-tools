# Reality Tools

Reality Tools is an AI-first web app for practical reality checks: decisions, suspicious messages, and messy meeting notes. The UI is intentionally low-friction: paste one sentence or paragraph, click analyze, and get structured output.

Live app: https://reality-tools.vercel.app/

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Vercel serverless function at `/api/analyze`
- OpenAI API through a server-side `OPENAI_API_KEY`
- localStorage for browser-local History
- lucide-react icons

## Features

- Decision Court: infers a decision question, options, stakes, deadline, risk tolerance, missing information, hidden assumptions, verdict, risk score, confidence score, and best next action from a messy decision prompt.
- ScamLens: evaluates suspicious messages with both likely legitimate signals and suspicious signals, risk score, risk level, confidence, phrase highlighting, safe response, and verification steps.
- MeetingRealityCheck: extracts decisions, action items, owners, due dates, unresolved questions, vague statements, follow-up email, and next agenda from raw notes.
- AI-first analysis with local fallback if AI is unavailable.
- Demo examples for all tools, including regression examples.
- Save to local History, delete History items, and export `.txt` reports.
- Responsive dark dashboard UI.

## How To Run

```bash
npm install
cp .env.example .env.local
```

Add your key to `.env.local`:

```text
OPENAI_API_KEY=your_api_key_here
```

Start the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Vercel Setup

Set the environment variable in Vercel Project Settings:

```text
OPENAI_API_KEY=your_api_key_here
```

Do not prefix the key with `VITE_`. The key is used only by the serverless API route and must never be exposed to browser code.

Recommended Vercel settings:

- Framework Preset: Vite
- Build Command: `npm run build` or `pnpm run build`
- Output Directory: `dist`

## Fallback Behavior

If `/api/analyze` is unavailable, missing an API key, or returns an error, the frontend shows:

```text
AI analysis is temporarily unavailable. Showing limited local analysis.
```

The local fallback still produces a result and supports Save, History, and `.txt` export.

## Security Notes

- Never commit real API keys.
- Keep `OPENAI_API_KEY` server-side only.
- The API validates tool names, limits request size, asks for structured JSON, validates returned shape before rendering, and clamps scores to 0-100.
- ScamLens is defensive only and must not be used to write scam messages, improve impersonation, or bypass detection.

## Known Limitations

- ScamLens cannot guarantee a message is safe. It analyzes only the provided message, sender, visible domain, and claimed organization.
- Users should verify through official websites, apps, or known phone numbers.
- Meeting extraction can miss nuance when notes are extremely short or ambiguous.
- History is localStorage-based and browser-local.
- No login, database, payment, or user accounts.

## Future Improvements

- Add editable inferred inputs after AI analysis.
- Add import/export for full History.
- Add lightweight regression fixtures.
- Add richer mobile report views.
- Add optional model configuration through a server-side environment variable.
