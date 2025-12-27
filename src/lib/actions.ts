'use server';

import {
  generateInitialScenes,
  GenerateInitialScenesInput,
  GenerateInitialScenesOutput,
} from '@/ai/flows/generate-initial-scenes';
import {
  modifyKeywordsWithSuggestions,
  ModifyKeywordsInput,
  ModifyKeywordsOutput,
} from '@/ai/flows/modify-keywords-with-suggestions';
import { getServerFirestore } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';

export type UserConfig = {
  geminiApiKey?: string;
  pixabayKey?: string;
  freesoundKey?: string;
};

export type MediaResult = {
  id: string;
  type: 'audio' | 'video' | 'image';
  title: string;
  url: string;
  previewUrl?: string;
  duration?: number;
  tags?: string[];
};

async function getUserConfig(userId: string): Promise<UserConfig> {
  const firestore = await getServerFirestore();
  const snap = await getDoc(doc(firestore, 'users', userId));
  return (snap.data() as UserConfig) ?? {};
}

function normalizeSearchQuery(query: string, { maxKeywords = 8, maxLength = 100 } = {}) {
  const keywords = query
    .split(/[, ]+/)
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, maxKeywords);
  const joined = keywords.join(' ');
  return joined.slice(0, maxLength);
}

/**
 * Server action to generate initial scenes from a text prompt.
 * @param input The user's prompt and configuration.
 * @returns A promise that resolves to the generated scenes or throws an error.
 */
export async function generateScenesAction(
  input: GenerateInitialScenesInput & { userId: string; userConfig?: UserConfig }
): Promise<GenerateInitialScenesOutput> {
  if (!input.prompt || input.prompt.trim().length < 10) {
    throw new Error('Prompt is too short. Please provide a more detailed description.');
  }

  const { userId, userConfig, ...sceneInput } = input;
  let geminiApiKey = userConfig?.geminiApiKey;
  if (!geminiApiKey) {
    try {
      geminiApiKey = (await getUserConfig(userId)).geminiApiKey;
    } catch (err) {
      console.error('Failed to load user config for Gemini key', err);
    }
  }
  if (!geminiApiKey) {
    throw new Error('Gemini API key missing. Save your key in Settings.');
  }

  try {
    const scenes = await generateInitialScenes(sceneInput, geminiApiKey);
    return scenes;
  } catch (error) {
    const message =
      error instanceof Error && /API key/i.test(error.message)
        ? 'Gemini API key missing. Save your key in Settings.'
        : 'Failed to generate scenes due to a server error.';
    console.error('Error in generateInitialScenes flow:', error);
    throw new Error(message);
  }
}

/**
 * Server action to get alternative keyword suggestions.
 * @param input The input containing scene details and new keywords.
 * @returns A promise that resolves to the suggested keywords.
 */
export async function getKeywordSuggestionsAction(
  input: ModifyKeywordsInput & { userId: string; userConfig?: UserConfig }
): Promise<ModifyKeywordsOutput> {
  const { userId, userConfig, ...suggestionInput } = input;
  let geminiApiKey = userConfig?.geminiApiKey;
  if (!geminiApiKey) {
    try {
      geminiApiKey = (await getUserConfig(userId)).geminiApiKey;
    } catch (err) {
      console.error('Failed to load user config for Gemini key', err);
    }
  }
  if (!geminiApiKey) {
    throw new Error('Gemini API key missing. Save your key in Settings.');
  }

  try {
    const result = await modifyKeywordsWithSuggestions(suggestionInput, geminiApiKey);
    return result;
  } catch (error) {
    console.error('Error in modifyKeywordsWithSuggestions flow:', error);
    throw new Error('Failed to get keyword suggestions due to a server error.');
  }
}

/**
 * Search Pixabay for visuals (images/videos).
 */
export async function searchVisualMediaAction({
  query,
  mediaType,
  userId,
  userConfig,
}: {
  query: string;
  mediaType: 'video' | 'image';
  userId: string;
  userConfig?: UserConfig;
}): Promise<MediaResult[]> {
  let apiKey = userConfig?.pixabayKey;
  if (!apiKey) {
    try {
      apiKey = (await getUserConfig(userId)).pixabayKey;
    } catch (err) {
      console.error('Failed to load user config for Pixabay key', err);
    }
  }
  if (!apiKey) {
    throw new Error('Pixabay API key missing. Save your Pixabay key in Settings.');
  }

  const safeQuery = normalizeSearchQuery(query);

  const endpoint =
    mediaType === 'video'
      ? `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(safeQuery)}&per_page=8&safesearch=true`
      : `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(safeQuery)}&per_page=12&image_type=photo&safesearch=true`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error('Failed to fetch media from Pixabay.');
  }
  const data = await res.json();

  if (mediaType === 'video') {
    return (data.hits || []).map((hit: any) => {
      const videoUrl = hit.videos?.medium?.url || hit.videos?.small?.url;
      return {
        id: String(hit.id),
        type: 'video',
        title: hit.tags || 'Pixabay Video',
        url: videoUrl,
        previewUrl: hit.picture_id ? `https://i.vimeocdn.com/video/${hit.picture_id}_295x166.jpg` : undefined,
        tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
      } satisfies MediaResult;
    });
  }

  return (data.hits || []).map((hit: any) => ({
    id: String(hit.id),
    type: 'image',
    title: hit.tags || 'Pixabay Image',
    url: hit.largeImageURL || hit.webformatURL,
    previewUrl: hit.previewURL,
    tags: hit.tags ? String(hit.tags).split(',').map((t: string) => t.trim()) : [],
  }));
}

/**
 * Search Freesound for audio tracks.
 */
export async function searchAudioMediaAction({
  query,
  userId,
  userConfig,
}: {
  query: string;
  userId: string;
  userConfig?: UserConfig;
}): Promise<MediaResult[]> {
  let apiKey = userConfig?.freesoundKey;
  if (!apiKey) {
    try {
      apiKey = (await getUserConfig(userId)).freesoundKey;
    } catch (err) {
      console.error('Failed to load user config for Freesound key', err);
    }
  }
  if (!apiKey) {
    throw new Error('Freesound API key missing. Save your Freesound key in Settings.');
  }

  const safeQuery = normalizeSearchQuery(query);

  const endpoint = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(
    safeQuery
  )}&fields=id,name,previews,duration,tags&token=${apiKey}&page_size=10`;

  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error('Failed to fetch audio from Freesound.');
  }
  const data = await res.json();

  return (data.results || []).map((hit: any) => ({
    id: String(hit.id),
    type: 'audio',
    title: hit.name || 'Freesound Audio',
    url: hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3'],
    previewUrl: hit.previews?.['preview-hq-ogg'] || hit.previews?.['preview-lq-ogg'],
    duration: hit.duration,
    tags: hit.tags || [],
  }));
}
