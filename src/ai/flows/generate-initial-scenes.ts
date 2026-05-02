'use server';

/**
 * @fileOverview A flow to generate initial video scenes from a text prompt.
 *
 * - generateInitialScenes - A function that generates video scenes.
 * - GenerateInitialScenesInput - The input type for the generateInitialScenes function.
 * - GenerateInitialScenesOutput - The return type for the generateInitialScenes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialScenesInputSchema = z.object({
  prompt: z.string().describe('The main text prompt for video generation.'),
  aspectRatio: z.enum(['horizontal', 'vertical']).describe('The aspect ratio of the video.'),
  duration: z.number().describe('The target duration of the video in seconds.'),
  sceneCount: z.number().min(1).max(30).default(6).describe('Desired number of scenes to generate.'),
});
export type GenerateInitialScenesInput = z.infer<typeof GenerateInitialScenesInputSchema>;

const SceneSchema = z.object({
  title: z.string().describe('The title of the scene.'),
  narration: z.string().describe('The narration script for the scene (used for TTS).'),
  duration: z.number().describe('The duration of the scene in seconds.'),
  visualKeywords: z.string().describe('Comma-separated visual keywords/tags for searching images/videos (e.g., "sunset, beach, ocean waves").'),
  transitionImageQuery: z.string().describe('A short 2-5 word image-only query for finding a transition image for this scene.'),
  narrationVisualQuery: z.string().describe('A concise 3-6 word query for finding narration visuals for this scene. May be used for image or video search.'),
  audioKeywords: z.string().describe('Short, simple audio search keywords - max 3-4 basic terms (e.g., "piano", "ambient music", "nature sounds", "drums").'),
  audioSearchQuery: z.string().describe('A concise audio search query for scene-level sound lookup, usually 2-4 words.'),
  transitionType: z.enum(['fade', 'slide', 'zoom', 'wipe']).default('fade').describe('The transition effect to use when moving to this scene.'),
  subtitleTransition: z.enum(['fade', 'slide', 'none']).default('fade').describe('How subtitles transition in this scene.'),
});

const GenerateInitialScenesOutputSchema = z.array(SceneSchema);
export type GenerateInitialScenesOutput = z.infer<typeof GenerateInitialScenesOutputSchema>;

export async function generateInitialScenes(input: GenerateInitialScenesInput): Promise<GenerateInitialScenesOutput> {
  return generateInitialScenesFlow(input);
}

const initialScenesPrompt = ai.definePrompt({
  name: 'initialScenesPrompt',
  input: {schema: GenerateInitialScenesInputSchema},
  output: {schema: GenerateInitialScenesOutputSchema},
  prompt: `You are an expert AI video scene planner. Generate a structured set of video scenes from the prompt below.

Video parameters:
- Total duration: {{duration}} seconds, {{aspectRatio}} aspect ratio
- Target scene count: ~{{sceneCount}} (adjust for natural pacing)
- Pacing: intro and outro scenes slightly shorter; middle scenes carry more weight

Prompt: {{{prompt}}}

For each scene, produce the following fields:

**title**: Concise, descriptive scene title.

**narration**: 2–3 sentences of engaging, natural-sounding narration for text-to-speech. Use active voice and vary sentence length for rhythm. Intro scene should hook the viewer; middle scenes deliver depth; the final scene closes with impact or a call to action.

**duration**: Duration in seconds. All scene durations must sum to approximately {{duration}} seconds total.

**visualKeywords**: 4–6 comma-separated keywords optimized for Pixabay image/video search. Lead with the most specific visual subject and setting, then add mood or style qualifiers. Use concrete, visually-searchable nouns and descriptors — avoid abstract concepts. Example for a travel opener: "aerial city skyline, golden hour cityscape, urban architecture, cinematic, travel". Tailor terms to the {{aspectRatio}} aspect ratio (e.g., tall compositions for vertical, wide establishing shots for horizontal).

**transitionImageQuery**: A separate short image-only search query for the transition visual. Keep it to 2–5 words. It should be concise and visually concrete, such as "warship silhouette", "oil tanker strait", or "stormy sea horizon". Do not write a sentence.

**narrationVisualQuery**: A separate short query for narration visuals. Keep it to 3–6 words. It can be used for image or video search, so it may be slightly broader or more cinematic than the transition query. Example: "naval patrol in strait", "aerial port at dusk", "military convoy desert road".

**audioKeywords**: 2–3 mood/genre terms optimized for Freesound and music libraries. Match the emotional tone of the scene. Choose terms like: "cinematic ambient", "piano melody", "upbeat acoustic guitar", "tense orchestral", "soft electronic", "nature soundscape", "corporate upbeat", "inspirational strings", "calm lo-fi", "dramatic percussion". Keep it to 2–3 terms only — do not use scene-specific topics.

**audioSearchQuery**: A separate concise audio query for scene search. Keep it to 2–4 searchable terms, such as "tense orchestral", "dramatic percussion", or "ambient naval hum".

**transitionType**: Choose based on scene energy and position in the video:
- "fade" — calm, reflective, or opening/closing scenes
- "slide" — sequential narrative flow or scene-to-scene progression
- "zoom" — reveals, emphasis moments, or high-energy scenes
- "wipe" — contrast, before/after comparisons, or dramatic scene shifts
Vary transitions across the video for visual interest.

**subtitleTransition**: Choose based on scene mood:
- "fade" — neutral, documentary, or informational tone
- "slide" — dynamic, active, or upbeat scenes
- "none" — impact moments where subtitles should appear instantly

Return the scenes as a JSON array. Ensure all scene durations sum to approximately {{duration}} seconds.
`,
});

const generateInitialScenesFlow = ai.defineFlow(
  {
    name: 'generateInitialScenesFlow',
    inputSchema: GenerateInitialScenesInputSchema,
    outputSchema: GenerateInitialScenesOutputSchema,
  },
  async input => {
    const {output} = await initialScenesPrompt(input);
    return output!;
  }
);
