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
});
export type GenerateInitialScenesInput = z.infer<typeof GenerateInitialScenesInputSchema>;

const SceneSchema = z.object({
  title: z.string().describe('The title of the scene.'),
  narration: z.string().describe('The narration snippet for the scene.'),
  visualPrompt: z.string().describe('The visual prompt for image/video generation.'),
  duration: z.number().describe('The duration of the scene in seconds.'),
  musicMood: z.string().describe('Keywords describing the desired music mood.'),
  sfxKeywords: z.string().describe('Keywords for scene-specific sound effects.'),
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
  prompt: `You are an AI video scene planner. Given the following prompt, generate a set of video scenes.

  Prompt: {{{prompt}}}

  Each scene should include:
  - A title for context
  - A 2-3 sentence narration snippet
  - A visual prompt for image/video generation
  - An estimated duration (in seconds) to match the overall target video length (if known, otherwise, estimate reasonable duration).
  - Music mood keywords (e.g., \"inspiring, cinematic, light\")
  - SFX keywords (for scene-specific sound effects, e.g., \"wind howling, door opening\")

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
