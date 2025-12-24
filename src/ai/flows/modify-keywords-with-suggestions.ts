'use server';

/**
 * @fileOverview This file defines a Genkit flow to modify keywords suggested by Gemini and get alternative suggestions.
 *
 * - modifyKeywordsWithSuggestions - A function that takes scene details and new keywords, and returns alternative keyword suggestions from Gemini.
 * - ModifyKeywordsInput - The input type for the modifyKeywordsWithSuggestions function.
 * - ModifyKeywordsOutput - The return type for the modifyKeywordsWithSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModifyKeywordsInputSchema = z.object({
  sceneDescription: z.string().describe('The description of the scene.'),
  existingKeywords: z.array(z.string()).describe('The existing keywords for the scene.'),
  newKeywords: z.array(z.string()).describe('The new keywords to consider.'),
});
export type ModifyKeywordsInput = z.infer<typeof ModifyKeywordsInputSchema>;

const ModifyKeywordsOutputSchema = z.object({
  suggestedKeywords: z.array(z.string()).describe('Alternative keyword suggestions from Gemini.'),
});
export type ModifyKeywordsOutput = z.infer<typeof ModifyKeywordsOutputSchema>;

export async function modifyKeywordsWithSuggestions(input: ModifyKeywordsInput): Promise<ModifyKeywordsOutput> {
  return modifyKeywordsWithSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'modifyKeywordsPrompt',
  input: {schema: ModifyKeywordsInputSchema},
  output: {schema: ModifyKeywordsOutputSchema},
  prompt: `You are an AI assistant helping a user fine-tune keywords for a video scene.\n\nThe scene is described as: {{{sceneDescription}}}.\n\nThe existing keywords are: {{#each existingKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.\n\nThe user wants to consider these new keywords: {{#each newKeywords}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.\n\nBased on the scene description and the new keywords, suggest alternative keywords that could improve image and audio selection for the scene. Provide only the keywords, comma separated.\n`,
});

const modifyKeywordsWithSuggestionsFlow = ai.defineFlow(
  {
    name: 'modifyKeywordsWithSuggestionsFlow',
    inputSchema: ModifyKeywordsInputSchema,
    outputSchema: ModifyKeywordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {
      suggestedKeywords: output?.suggestedKeywords ?? [],
    };
  }
);
