# LessonRemix

LessonRemix is a browser-only studio for building interactive lessons. Combine short reading blocks, multiple-choice checks, and reflection prompts. Preview the learner experience and export a standalone HTML file that works offline.

## Features

- Create and reorder lesson blocks with live student preview.
- Immediate quiz feedback and a completion summary.
- Download a self-contained lesson as one HTML file.
- Export and import a project JSON backup.
- Automatic local browser storage; no account, server, or API key.
- Responsive layout and keyboard-accessible controls.

The editor starts with a clearly editable sample lesson, *The art of noticing*. Replace it with your own content or start a new lesson.

## Use

Open `index.html` in a modern browser or visit the GitHub Pages site in this repository's About section. Edit the lesson, select **Student preview**, then select **Export lesson** to download an HTML file you can share or open without an internet connection.

## Privacy and safety

Drafts live in your browser's local storage. Exported HTML files include the lesson content you authored, but no private editor data or answers typed by learners. The exported player renders lesson content as text, and embedded JSON is escaped to prevent a lesson title from injecting markup. Browser storage can be cleared by the user, so download a JSON backup for important work.

## Development

There are no runtime dependencies or build steps. Node.js 20+ is needed only for tests:

```sh
npm test
```

## Deployment

Publish the repository root from `main` with GitHub Pages. This project does not require any secrets.

## License

MIT — see [LICENSE](LICENSE).
