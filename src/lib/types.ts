import type { GenerateInitialScenesOutput } from '@/ai/flows/generate-initial-scenes';
import type { ImagePlaceholder } from './placeholder-images';
import type { MediaResult } from './actions';

// A single scene from the AI, augmented with a client-side ID and selected asset
export type Scene = GenerateInitialScenesOutput[number] & {
  id: string;
  asset?: ImagePlaceholder;
  selectedVisual?: MediaResult;
  selectedAudio?: MediaResult;
  transitionVisual?: MediaResult; // visual used for scene transitions (image/video)
  narrationVideo?: MediaResult; // video used during narration
  bgAudio?: MediaResult; // background audio selected for the scene
  callToAction?: string; // optional CTA overlay text
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
export type WorkflowStep = 'editing' | 'export';
