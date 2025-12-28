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
  audioKeywords: z.string().describe('Short, simple audio search keywords - max 3-4 basic terms (e.g., "piano", "ambient music", "nature sounds", "drums").'),
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
  prompt: `You are an AI video scene planner. Given the following prompt and parameters, generate a set of video scenes.

  The final video should be approximately {{duration}} seconds long and have a {{aspectRatio}} aspect ratio.
  Try to produce around {{sceneCount}} scenes (adjust if needed for pacing) and distribute the total duration across them.

  Prompt: {{{prompt}}}

  Each scene should include:
  - A title for context
  - A 2-3 sentence narration script (this will be used for text-to-speech)
  - An estimated duration (in seconds) that contributes to the total video length of {{duration}} seconds.
  - Visual keywords for searching images/videos on Pixabay (comma-separated, e.g., "sunset, beach, ocean waves, nature")
  - Audio keywords for searching scene-specific background audio on Freesound (use SIMPLE, GENERIC terms that are common in sound libraries - max 3-4 words, e.g., "ambient music", "nature sounds", "piano", "drums beat", "wind", "rain")
  - Transition type: choose from "fade", "slide", "zoom", or "wipe" - vary the transitions to keep the video dynamic
  - Subtitle transition: choose from "fade", "slide", or "none" - vary to match the scene's mood

  Important: Make sure visual keywords are descriptive and specific for the {{aspectRatio}} aspect ratio.
  Important: Audio keywords must be SHORT and SIMPLE - use basic sound/music terms that any sound library would have (e.g., "piano", "guitar", "ambient", "drums", "nature", "rain", "wind"). Avoid complex or overly specific phrases.
  
  Return the scenes as a JSON array.
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
