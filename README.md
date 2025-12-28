# VideoGenius

AI-assisted storyboard builder that saves user settings and projects in Firestore, fetches media from third-party providers, and exports a backend-ready JSON payload for rendering.

## Quick start
1) Install deps: `npm install`
2) Run dev server: `npm run dev` (defaults to port 9002)
3) Create a `.env` (do **not** commit secrets):
   ```
   GEMINI_API_KEY=<your-google-api-key>
   ```
4) Sign in, open **Settings**, and save:
   - Google API Key (Gemini) — required
   - Pixabay API Key — visuals search
   - Freesound API Key — audio search
   - Optional: AWS creds + Polly voice/engine, output directory

## Data model (Firestore)
- `users/{userId}` — profile/config document
  - `geminiApiKey`, `pixabayKey`, `freesoundKey`, `geminiTextModel`, `geminiImageModel`
  - `ttsProvider` (`gTTS` | `AmazonPolly`), `pollyVoice`, `pollyEngine`
  - `awsAccessKeyId`, `awsSecretAccessKey`, `awsRegion`, `outputDirectory`
  - `displayName`, `email`, `photoURL`, timestamps (createdAt/lastLogin)
- `users/{userId}/projects/{projectId}` — video project

### VideoProject schema
```ts
type MediaResult = {
  id: string;
  type: 'audio' | 'video' | 'image';
  title: string;
  url: string;
  previewUrl?: string;
  duration?: number;
  tags?: string[];
};

type Scene = {
  id: string;
  title: string;
  narration: string;              // narration script (used for TTS)
  duration: number;
  visualKeywords: string;          // comma-separated keywords for image/video search
  audioKeywords: string;           // comma-separated keywords for audio search
  asset?: { id: string; description: string; imageUrl: string; imageHint: string };
  selectedVisual?: MediaResult;     // legacy
  transitionVisual?: MediaResult;   // image for transitions
  narrationVideo?: MediaResult;     // media used during narration
  selectedAudio?: MediaResult;      // legacy
  bgAudio?: MediaResult;            // scene-level background audio
};

type VideoProject = {
  id: string;
  userId: string;
  name: string;
  prompt: string;
  aspectRatio?: 'horizontal' | 'vertical';
  targetDurationSeconds?: number;
  desiredSceneCount?: number;
  globalBgAudio?: MediaResult;      // optional track across the whole video
  scenes: Scene[];
  creationDate: string;             // ISO
  lastModified: string;             // ISO
  renderOptions?: {
    ttsProvider?: 'gTTS' | 'AmazonPolly';
    voiceId?: string;
    engine?: string;
    model?: string;
    notes?: string;
  };
};
```

## Frontend workflow
1) **New Project** (`/new-project`)
   - Collects prompt, aspect ratio, target duration, desired scene count.
   - Calls `generateScenesAction` (server) using the user’s stored Gemini key to create initial scenes.
   - AI generates streamlined scenes with `visualKeywords` and `audioKeywords` for efficient media searching.
2) **Scene Editor** (`/projects/:projectId`)
   - **Transition image**: choose from 40+ curated high-quality assets.
   - **Narration visual**: search Pixabay for images/videos using editable `visualKeywords`.
   - **Scene background audio**: search Freesound using editable `audioKeywords`.
   - **Global background audio**: optional track applied to the whole video.
   - **Content editing**: edit scene title, narration (used for TTS), and duration.
   - **AI keyword suggestions**: available for visual keywords (uses Gemini).
   - **Keywords are directly editable**: update `visualKeywords` or `audioKeywords` to refine searches.
   - **Validation**: blocks export until each scene has transition visual, narration visual, and scene bg audio.
3) **Export**
   - Choose TTS provider/voice/engine/model and add render notes.
   - Export JSON contains scenes, media selections, global audio, and renderOptions.

## Server actions & keys
- `generateScenesAction`, `getKeywordSuggestionsAction` use Gemini key from the user profile (not process env).
- `searchVisualMediaAction` uses Pixabay key; `searchAudioMediaAction` uses Freesound key.
- Keys are read from Firestore user document at runtime; env key is only for local dev bootstrap.

## Example export payload
```json
{
  "id": "project-123",
  "userId": "user-abc",
  "name": "Space Wonders",
  "prompt": "A cinematic journey across galaxies...",
  "aspectRatio": "horizontal",
  "targetDurationSeconds": 90,
  "desiredSceneCount": 6,
  "globalBgAudio": {
    "id": "784221",
    "type": "audio",
    "title": "Ambient cosmic bed",
    "url": "https://cdn.freesound.org/previews/784/784221_12846320-hq.mp3",
    "previewUrl": "https://cdn.freesound.org/previews/784/784221_12846320-hq.ogg",
    "duration": 76,
    "tags": ["ambient","space","cinematic"]
  },
  "scenes": [
    {
      "id": "scene-1",
      "title": "Seeds of Discontent",
      "narration": "For years, ... deep sense of injustice...",
      "duration": 8,
      "visualKeywords": "protest, crowd, historical, revolution",
      "audioKeywords": "alarm, war, siren, dramatic",
      "transitionVisual": {
        "id": "12",
        "type": "image",
        "title": "A vast library with shelves full of books.",
        "url": "https://images.unsplash.com/photo-1568667256531-7d5ac92eaa7a",
        "previewUrl": "https://images.unsplash.com/photo-1568667256531-7d5ac92eaa7a"
      },
      "narrationVideo": {
        "id": "22634",
        "type": "video",
        "title": "protest crowd footage",
        "url": "https://cdn.pixabay.com/video/..._large.mp4",
        "previewUrl": "https://cdn.pixabay.com/video/..._large.jpg"
      },
      "bgAudio": {
        "id": "784221",
        "type": "audio",
        "title": "AMBWar_Siren",
        "url": "https://cdn.freesound.org/previews/784/784221_12846320-hq.mp3",
        "previewUrl": "https://cdn.freesound.org/previews/784/784221_12846320-hq.ogg",
        "duration": 76,
        "tags": ["alarm","war","siren"]
      }
    }
  ],
  "renderOptions": {
    "ttsProvider": "AmazonPolly",
    "voiceId": "Joanna",
    "engine": "neural",
    "model": "gemini-2.5-flash",
    "notes": "Render in 1080p; keep CTA at end."
  },
  "creationDate": "2024-05-01T12:00:00.000Z",
  "lastModified": "2024-05-01T12:30:00.000Z"
}
```

## Backends tips
- Enforce required scene media: `transitionVisual`, `narrationVideo`, `bgAudio` (editor already validates).
- If `globalBgAudio` is present, apply across the timeline; otherwise use per-scene `bgAudio`.
- Use `renderOptions` to pick TTS provider/voice/model; fall back to user defaults if absent.
- Respect asset URLs: Pixabay video/image and Freesound previews are already the “best available” picked in UI.- Scene `narration` field contains the text-to-speech script.
- `visualKeywords` and `audioKeywords` are for reference only (used during media search in the UI).

## Key optimizations (Latest)
- **Simplified scene schema**: Removed redundant fields (`visualPrompt`, `musicMood`, `sfxKeywords`, `globalAudioKeywords`).
- **Streamlined keywords**: Single `visualKeywords` for visual search, single `audioKeywords` for audio search.
- **Direct editing**: Keywords are editable in the UI and immediately used for searches.
- **Expanded asset library**: 40+ curated transition images (up from 12) covering diverse categories.
- **Cleaner UX**: Removed confusing "Narration Prompt" and "Extra prompt" fields.