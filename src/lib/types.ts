import type { GenerateInitialScenesOutput } from '@/ai/flows/generate-initial-scenes';
import type { ImagePlaceholder } from './placeholder-images';

// A single scene from the AI, augmented with a client-side ID and selected asset
export type Scene = GenerateInitialScenesOutput[number] & {
  id: string;
  asset?: ImagePlaceholder;
};

// The entire video project, as stored in Firestore
export type VideoProject = {
  id: string;
  userId: string;
  name: string;
  prompt: string;
  scenes: Scene[];
  creationDate: string; // ISO string
  lastModified: string; // ISO string
};

// Represents the different stages of the video creation workflow
export type WorkflowStep = 'prompt' | 'editing' | 'export' | 'dashboard';
