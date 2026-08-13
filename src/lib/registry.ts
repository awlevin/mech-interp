import type { CourseModule } from "./types";

import linearAlgebra from "@/modules/linear-algebra";
import informationAndOptimization from "@/modules/information-and-optimization";
import tokensAndEmbeddings from "@/modules/tokens-and-embeddings";
import attention from "@/modules/attention";
import residualStream from "@/modules/residual-stream";
import trainingAndScaling from "@/modules/training-and-scaling";
import pretraining from "@/modules/pretraining";
import fineTuning from "@/modules/fine-tuning";
import rlhf from "@/modules/rlhf";
import rlvrReasoning from "@/modules/rlvr-reasoning";
import inferenceAndReliability from "@/modules/inference-and-reliability";
import interpMindset from "@/modules/interp-mindset";
import mathFramework from "@/modules/math-framework";
import superposition from "@/modules/superposition";
import sparseAutoencoders from "@/modules/sparse-autoencoders";
import causalMethods from "@/modules/causal-methods";
import circuitTracing from "@/modules/circuit-tracing";
import functionalEmotions from "@/modules/functional-emotions";
import globalWorkspace from "@/modules/global-workspace";
import steering from "@/modules/steering";
import editingAndLearning from "@/modules/editing-and-learning";
import safetyLandscape from "@/modules/safety-landscape";

/** Ordered course modules. Order here = course order. */
export const modules: CourseModule[] = [
  linearAlgebra,
  informationAndOptimization,
  tokensAndEmbeddings,
  attention,
  residualStream,
  trainingAndScaling,
  pretraining,
  fineTuning,
  rlhf,
  rlvrReasoning,
  inferenceAndReliability,
  interpMindset,
  mathFramework,
  superposition,
  sparseAutoencoders,
  causalMethods,
  circuitTracing,
  functionalEmotions,
  globalWorkspace,
  steering,
  editingAndLearning,
  safetyLandscape,
];

export function getModule(slug: string): CourseModule | undefined {
  return modules.find((m) => m.slug === slug);
}

export function modulesForPart(part: number): CourseModule[] {
  return modules.filter((m) => m.part === part);
}

export function adjacentModules(slug: string): {
  prev?: CourseModule;
  next?: CourseModule;
} {
  const i = modules.findIndex((m) => m.slug === slug);
  if (i === -1) return {};
  return { prev: modules[i - 1], next: modules[i + 1] };
}
