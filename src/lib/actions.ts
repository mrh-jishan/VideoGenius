'use server';

import {
  generateInitialScenes,
  GenerateInitialScenesOutput,
} from '@/ai/flows/generate-initial-scenes';
import {
  modifyKeywordsWithSuggestions,
  ModifyKeywordsInput,
  ModifyKeywordsOutput,
} from '@/ai/flows/modify-keywords-with-suggestions';

/**
 * Server action to generate initial scenes from a text prompt.
 * @param prompt The user's text prompt.
 * @returns A promise that resolves to the generated scenes or throws an error.
 */
export async function generateScenesAction(
  prompt: string
): Promise<GenerateInitialScenesOutput> {
  if (!prompt || prompt.trim().length < 10) {
    throw new Error('Prompt is too short. Please provide a more detailed description.');
  }
  try {
    const scenes = await generateInitialScenes({ prompt });
    return scenes;
  } catch (error) {
    console.error('Error in generateInitialScenes flow:', error);
    throw new Error('Failed to generate scenes due to a server error.');
  }
}

/**
 * Server action to get alternative keyword suggestions.
 * @param input The input containing scene details and new keywords.
 * @returns A promise that resolves to the suggested keywords.
 */
export async function getKeywordSuggestionsAction(
  input: ModifyKeywordsInput
): Promise<ModifyKeywordsOutput> {
  try {
    const result = await modifyKeywordsWithSuggestions(input);
    return result;
  } catch (error) {
    console.error('Error in modifyKeywordsWithSuggestions flow:', error);
    throw new Error('Failed to get keyword suggestions due to a server error.');
  }
}
