import type { SceneDescription } from "@/types/ai";
import * as minimax from "@/lib/ai/minimax";
import * as zhipu from "@/lib/ai/zhipu";

export type SceneTextProvider = "zhipu" | "minimax";

function getProvider(): SceneTextProvider {
  const provider = (process.env.SCENE_TEXT_PROVIDER || "zhipu").toLowerCase();

  if (provider === "zhipu" || provider === "minimax") {
    return provider;
  }

  throw new SceneTextApiError(
    `Unsupported SCENE_TEXT_PROVIDER: ${provider}`,
    "configuration",
  );
}

export class SceneTextApiError extends Error {
  constructor(
    message: string,
    public code: "configuration" | "provider_error",
    public provider?: SceneTextProvider,
  ) {
    super(message);
    this.name = "SceneTextApiError";
  }
}

export function getSceneTextConfigHint(): string {
  const provider = getProvider();
  if (provider === "minimax") {
    return "Please set MINIMAX_API_KEY.";
  }
  return "Please set ZHIPU_API_KEY.";
}

export function isSceneTextConfigured(): boolean {
  const provider = getProvider();
  return provider === "minimax"
    ? minimax.isMiniMaxConfigured()
    : zhipu.isZhipuConfigured();
}

function toSceneTextError(error: unknown, provider: SceneTextProvider): SceneTextApiError {
  if (error instanceof SceneTextApiError) {
    return error;
  }

  if (error instanceof minimax.MiniMaxApiError || error instanceof zhipu.ZhipuApiError) {
    return new SceneTextApiError(error.message, "provider_error", provider);
  }

  return new SceneTextApiError(
    error instanceof Error ? error.message : "Unknown AI provider error",
    "provider_error",
    provider,
  );
}

export async function storyToScenes(
  story: string,
  style?: string,
): Promise<SceneDescription[]> {
  const provider = getProvider();

  try {
    return provider === "minimax"
      ? await minimax.storyToScenes(story, style)
      : await zhipu.storyToScenes(story, style);
  } catch (error) {
    throw toSceneTextError(error, provider);
  }
}

export async function regenerateScenes(
  story: string,
  style?: string,
  previousScenes?: SceneDescription[],
  feedback?: string,
): Promise<SceneDescription[]> {
  const provider = getProvider();

  try {
    return provider === "minimax"
      ? await minimax.regenerateScenes(story, style, previousScenes, feedback)
      : await zhipu.regenerateScenes(story, style, previousScenes, feedback);
  } catch (error) {
    throw toSceneTextError(error, provider);
  }
}
