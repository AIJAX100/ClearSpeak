# ClearSpeak

ClearSpeak is a first MVP for a speech coaching web app. It lets a user paste or demo a transcript, detect filler words and weak phrases, see a clarity score, review highlighted transcript text, and export a simple report.

## Files

- `index.html` - app structure
- `styles.css` - app styling and responsive layout
- `app.js` - filler-word analysis, scoring, demo transcript, recording, upload preview, and export logic

## Test Locally

Open `index.html` in a browser.

Use **Try demo transcript** if microphone access is not available.

The **Record** button uses the browser's built-in speech recognition when supported. It works best from the published HTTPS GitHub Pages link in a modern browser. If speech recognition is not supported, the app falls back to saving an audio recording preview and you can still test the analyzer with pasted text.

## Deploy With GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and this `README.md`.
3. Go to the repository's **Settings** tab.
4. Open **Pages** in the left menu.
5. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Click **Save**.
7. Wait a minute or two for GitHub to publish the site.

Your app will be available at:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY-NAME/
```

## Next Feature

The next major feature should be automatic transcription:

```text
Upload or record audio -> transcribe audio -> fill transcript -> analyze speech
```
