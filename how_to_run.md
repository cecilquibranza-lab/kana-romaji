# KanaType — How to Run

KanaType is a React + Vite Japanese reading-speed trainer. It loads verified N5 grammar examples from the local OpenJLPT dataset in `public/data/openjlpt-n5.json`.

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

Settings are saved in the browser's local storage.

## Data attribution

The application includes OpenJLPT grammar data under `public/data/`. Attribution and license information are available in [OPENJLPT-NOTICE.md](./public/data/OPENJLPT-NOTICE.md).
