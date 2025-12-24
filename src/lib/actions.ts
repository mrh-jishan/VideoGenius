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

/**
 * Server action to generate initial scenes from a text prompt.
 * @param input The user's prompt and configuration.
 * @returns A promise that resolves to the generated scenes or throws an error.
 */
export async function generateScenesAction(
  input: GenerateInitialScenesInput
): Promise<GenerateInitialScenesOutput> {
  if (!input.prompt || input.prompt.trim().length < 10) {
    throw new Error('Prompt is too short. Please provide a more detailed description.');
  }
  try {
    const scenes = await generateInitialScenes(input);
    return scenes;
  } catch (error) {
    const message =
      error instanceof Error && /API key/i.test(error.message)
        ? 'Gemini API key missing. Set GEMINI_API_KEY or GOOGLE_API_KEY on the server.'
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
