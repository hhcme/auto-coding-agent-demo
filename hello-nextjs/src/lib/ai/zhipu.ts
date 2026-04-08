/**
 * Zhipu AI API wrapper for GLM model interactions.
 * Handles chat completions for story-to-scenes conversion.
 */

import type {
  ZhipuChatMessage,
  ZhipuChatCompletionResponse,
  SceneDescription,
} from "@/types/ai";
import { resolveAllowedApiBaseUrl } from "@/lib/ai/network";
import {
  buildStyleGuidance,
  parseScenesJson,
  STORY_TO_SCENES_SYSTEM_PROMPT,
  STORY_TO_SCENES_USER_PROMPT_TEMPLATE,
} from "@/lib/ai/scene-text-common";

// Configuration
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY;
const DEFAULT_ZHIPU_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const ZHIPU_ALLOWED_HOSTS = ["open.bigmodel.cn"];
const ZHIPU_MODEL = process.env.ZHIPU_MODEL || "glm-4";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Custom error class for Zhipu API errors
 */
export class ZhipuApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string
  ) {
    super(message);
    this.name = "ZhipuApiError";
  }
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if the API key is configured
 */
export function isZhipuConfigured(): boolean {
  return !!ZHIPU_API_KEY;
}

function getZhipuBaseUrl(): string {
  try {
    return resolveAllowedApiBaseUrl(
      process.env.ZHIPU_BASE_URL,
      DEFAULT_ZHIPU_BASE_URL,
      ZHIPU_ALLOWED_HOSTS,
      "ZHIPU_BASE_URL",
    );
  } catch (error) {
    throw new ZhipuApiError(
      error instanceof Error ? error.message : "Invalid ZHIPU_BASE_URL",
    );
  }
}

/**
 * Make a chat completion request to Zhipu AI
 */
async function chatCompletion(
  messages: ZhipuChatMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<ZhipuChatCompletionResponse> {
  if (!ZHIPU_API_KEY) {
    throw new ZhipuApiError("ZHIPU_API_KEY is not configured");
  }

  const requestBody = {
    model: ZHIPU_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let lastError: Error | null = null;
  const baseUrl = getZhipuBaseUrl();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ZHIPU_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ZhipuApiError(
          errorData.error?.message || `HTTP error ${response.status}`,
          response.status,
          errorData.error?.code
        );
      }

      clearTimeout(timeoutId);
      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on certain errors
      if (error instanceof ZhipuApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error; // Auth errors shouldn't be retried
        }
      }

      // Abort errors shouldn't be retried
      if ((error as Error).name === "AbortError") {
        throw new ZhipuApiError("Request timed out");
      }

      // Retry for other errors
      if (attempt < MAX_RETRIES) {
        console.warn(`Zhipu API attempt ${attempt} failed, retrying...`, error);
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  clearTimeout(timeoutId);
  throw new ZhipuApiError(
    `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

/**
 * Convert a story into scene descriptions
 * @param story - The user's story text
 * @param style - Optional visual style for the scenes
 * @returns Array of scene descriptions
 */
export async function storyToScenes(
  story: string,
  style?: string
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);
  const userPrompt = STORY_TO_SCENES_USER_PROMPT_TEMPLATE.replace("{story}", story).replace(
    "{styleGuidance}",
    styleGuidance
  );

  const messages: ZhipuChatMessage[] = [
    { role: "system", content: STORY_TO_SCENES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.8,
    maxTokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ZhipuApiError("Empty response from model");
  }

  try {
    return parseScenesJson(content).scenes;
  } catch (error) {
    throw new ZhipuApiError(
      error instanceof Error ? error.message : "Failed to parse scene JSON",
    );
  }
}

/**
 * Regenerate scenes with additional guidance
 * @param story - The original story text
 * @param style - Visual style for the scenes
 * @param previousScenes - Previously generated scenes (for reference)
 * @param feedback - User feedback for improvement
 */
export async function regenerateScenes(
  story: string,
  style?: string,
  previousScenes?: SceneDescription[],
  feedback?: string
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);

  let additionalContext = "";
  if (previousScenes && previousScenes.length > 0) {
    additionalContext += `\n\n之前生成的场景（供参考）：\n${previousScenes
      .map((s) => `场景 ${s.order_index}: ${s.description}`)
      .join("\n")}`;
  }

  if (feedback) {
    additionalContext += `\n\n用户反馈（请根据此改进）：${feedback}`;
  }

  const userPrompt = `请将以下故事拆分为视频场景${additionalContext}：

${story}

${styleGuidance}`;

  const messages: ZhipuChatMessage[] = [
    { role: "system", content: STORY_TO_SCENES_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.9,
    maxTokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new ZhipuApiError("Empty response from model");
  }

  try {
    return parseScenesJson(content).scenes;
  } catch (error) {
    throw new ZhipuApiError(
      error instanceof Error ? error.message : "Failed to parse scene JSON",
    );
  }
}
