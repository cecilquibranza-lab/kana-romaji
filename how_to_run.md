# KanaType — How to Run

KanaType is a React + Vite Japanese reading-speed trainer. It loads N1–N5 grammar examples from the local OpenJLPT datasets in `public/data/` and shuffles them for each practice session.

## Requirements

- Node.js 20 or newer
- pnpm

## Install dependencies

From the project directory:

```powershell
pnpm install
```

## Start the development server

```powershell
pnpm dev
```

Open the URL printed by Vite, normally:

```text
http://localhost:5173/
```

In the Figma Make environment, the configured preview server may use port `8443`.

## Create a production build

```powershell
pnpm build
```

To preview the production build locally:

```powershell
pnpm preview
```

## Using the app

1. Read the Japanese sentence and its furigana.
2. Type the romaji in the input field.
3. Press `Enter` after entering the correct answer.
4. Use the settings button to change the timer, sentence length, translation visibility, or theme.
5. Use focus mode to hide the surrounding navigation and statistics.

Settings are saved in the browser's local storage. The romaji answer is shown as underscores instead of a text box; type on the keyboard to fill the slots.

## Data attribution

The application includes OpenJLPT grammar data under `public/data/`. Attribution and license information are available in [OPENJLPT-NOTICE.md](./public/data/OPENJLPT-NOTICE.md).
