'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from './use-toast';
import type { MediaResult } from '@/lib/actions';

// ─── Freesound helpers ──────────────────────────────────────────────────────

// Adjectives and generic descriptors that are rarely useful Freesound tags
const AUDIO_NOISE_WORDS = new Set([
  'soft', 'gentle', 'calm', 'slow', 'fast', 'loud', 'quiet', 'deep', 'light',
  'dark', 'warm', 'cool', 'smooth', 'rough', 'clean', 'mixed', 'full', 'long',
  'short', 'low', 'high', 'upbeat', 'dramatic', 'epic', 'happy', 'sad',
  'peaceful', 'tense', 'relaxing', 'soothing', 'inspirational', 'energetic',
  'mellow', 'lively', 'bright', 'heavy', 'rich', 'pure', 'raw', 'sweet',
  'simple', 'complex', 'modern', 'classic', 'subtle', 'strong', 'nice',
]);

/**
 * Builds an ordered list of Freesound query strings to try, from most
 * specific to most generic. The caller stops at the first that returns results.
 */
function buildAudioQueryCandidates(rawText: string): string[] {
  const words = rawText
    .split(/[,\s]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 2);

  const substantive = words.filter(w => !AUDIO_NOISE_WORDS.has(w));
  const rest = words.filter(w => AUDIO_NOISE_WORDS.has(w));

  const candidates: string[] = [];
  // Two substantive words: focused but not an exact-phrase trap
  if (substantive.length >= 2) candidates.push(substantive.slice(0, 2).join(' '));
  // Each substantive word alone
  for (const w of substantive) candidates.push(w);
  // Descriptor words as last-resort before generic fallback
  for (const w of rest) candidates.push(w);
  // Universal fallback
  candidates.push('music');

  return [...new Set(candidates)];
}

async function fetchFreesoundPage(query: string, apiKey: string): Promise<MediaResult[]> {
  const url =
    `https://freesound.org/apiv2/search/text/` +
    `?query=${encodeURIComponent(query)}` +
    `&fields=id,name,previews,duration,tags` +
    `&token=${apiKey}` +
    `&page_size=10` +
    `&sort=rating_desc` +
    `&filter=duration:[3 TO *]`; // skip clips shorter than 3 s
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch audio.');
  const data = await res.json();
  return (data.results || []).map((hit: any) => ({
    id: String(hit.id),
    type: 'audio' as const,
    title: hit.name || 'Freesound Audio',
    url: hit.previews?.['preview-hq-mp3'] || hit.previews?.['preview-lq-mp3'],
    previewUrl: hit.previews?.['preview-hq-ogg'] || hit.previews?.['preview-lq-ogg'],
    duration: hit.duration,
    tags: hit.tags || [],
  }));
}

// ─── Hook ────────────────────────────────────────────────────────────────────

type AudioSearchState = {
  query: string;
  results: MediaResult[];
  isLoading: boolean;
  error: string | null;
  showResults: boolean;
};

/**
 * Manages all state for a single Freesound audio search slot.
 * Includes progressive-fallback: tries simpler queries automatically when
 * the original returns zero results, so the user almost always sees something.
 */
export function useAudioSearch(initialQuery: string, apiKey?: string) {
  const { toast } = useToast();
  // Ref keeps the current query readable inside `search` without adding it
  // to useCallback deps (avoids recreating the function on every keystroke).
  const queryRef = useRef(initialQuery);

  const [state, setState] = useState<AudioSearchState>({
    query: initialQuery,
    results: [],
    isLoading: false,
    error: null,
    showResults: true,
  });

  const setQuery = useCallback((query: string) => {
    queryRef.current = query;
    setState(s => ({ ...s, query }));
  }, []);

  const toggleResults = useCallback(() => {
    setState(s => ({ ...s, showResults: !s.showResults }));
  }, []);

  const hideResults = useCallback(() => {
    setState(s => ({ ...s, showResults: false }));
  }, []);

  const search = useCallback(async (overrideQuery?: string) => {
    if (!apiKey) {
      setState(s => ({ ...s, error: 'Freesound API key missing. Save it in Settings.' }));
      return;
    }
    setState(s => ({ ...s, isLoading: true, error: null }));
    const candidates = buildAudioQueryCandidates(overrideQuery ?? queryRef.current);
    try {
      for (const candidate of candidates) {
        const results = await fetchFreesoundPage(candidate, apiKey);
        if (results.length > 0) {
          setState(s => ({ ...s, isLoading: false, results, showResults: true }));
          return;
        }
      }
      setState(s => ({ ...s, isLoading: false, results: [] }));
      toast({ title: 'No audio found', description: 'Try different keywords.', variant: 'destructive' });
    } catch (err) {
      setState(s => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch audio.',
      }));
    }
  }, [apiKey, toast]);

  return { ...state, setQuery, toggleResults, hideResults, search };
}
