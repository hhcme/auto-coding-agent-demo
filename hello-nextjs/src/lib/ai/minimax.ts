import type { SceneDescription } from "@/types/ai";
import { resolveAllowedApiBaseUrl } from "@/lib/ai/network";
import {
  buildStyleGuidance,
  parseScenesJson,
  STORY_TO_SCENES_SYSTEM_PROMPT,
  STORY_TO_SCENES_USER_PROMPT_TEMPLATE,
} from "@/lib/ai/scene-text-common";

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const DEFAULT_MINIMAX_BASE_URL = "https://api.minimax.io/v1";
const MINIMAX_ALLOWED_HOSTS = ["api.minimax.io", "api.minimaxi.com"];
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 60000;

interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

interface MiniMaxChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class MiniMaxApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorCode?: string,
  ) {
    super(message);
    this.name = "MiniMaxApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isMiniMaxConfigured(): boolean {
  return !!MINIMAX_API_KEY;
}

function getMiniMaxBaseUrl(): string {
  try {
    return resolveAllowedApiBaseUrl(
      process.env.MINIMAX_BASE_URL,
      DEFAULT_MINIMAX_BASE_URL,
      MINIMAX_ALLOWED_HOSTS,
      "MINIMAX_BASE_URL",
    );
  } catch (error) {
    throw new MiniMaxApiError(
      error instanceof Error ? error.message : "Invalid MINIMAX_BASE_URL",
    );
  }
}

async function chatCompletion(
  messages: MiniMaxMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {},
): Promise<MiniMaxChatCompletionResponse> {
  if (!MINIMAX_API_KEY) {
    throw new MiniMaxApiError("MINIMAX_API_KEY is not configured");
  }

  const requestBody = {
    model: MINIMAX_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream: false,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const baseUrl = getMiniMaxBaseUrl();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new MiniMaxApiError(
          payload.error?.message || payload.base_resp?.status_msg || `HTTP error ${response.status}`,
          response.status,
          payload.error?.code,
        );
      }

      clearTimeout(timeoutId);
      return payload as MiniMaxChatCompletionResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      if (error instanceof MiniMaxApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw error;
        }
      }

      if ((error as Error).name === "AbortError") {
        throw new MiniMaxApiError("Request timed out");
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  clearTimeout(timeoutId);
  throw new MiniMaxApiError(
    `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
  );
}

export async function storyToScenes(
  story: string,
  style?: string,
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);
  const userPrompt = STORY_TO_SCENES_USER_PROMPT_TEMPLATE.replace("{story}", story).replace(
    "{styleGuidance}",
    styleGuidance,
  );

  const response = await chatCompletion(
    [
      { role: "system", name: "MiniMax AI", content: STORY_TO_SCENES_SYSTEM_PROMPT },
      { role: "user", name: "user", content: userPrompt },
    ],
    { temperature: 0.8, maxTokens: 4096 },
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new MiniMaxApiError("Empty response from model");
  }

  return parseScenesJson(content).scenes;
}

export async function regenerateScenes(
  story: string,
  style?: string,
  previousScenes?: SceneDescription[],
  feedback?: string,
): Promise<SceneDescription[]> {
  const styleGuidance = buildStyleGuidance(style);
  let additionalContext = "";

  if (previousScenes && previousScenes.length > 0) {
    additionalContext += `\n\n之前生成的场景（供参考）：\n${previousScenes
      .map((scene) => `场景 ${scene.order_index}: ${scene.description}`)
      .join("\n")}`;
  }

  if (feedback) {
    additionalContext += `\n\n用户反馈（请根据此改进）：${feedback}`;
  }

  const userPrompt = `请将以下故事拆分为视频场景${additionalContext}：

${story}

${styleGuidance}`;

  const response = await chatCompletion(
    [
      { role: "system", name: "MiniMax AI", content: STORY_TO_SCENES_SYSTEM_PROMPT },
      { role: "user", name: "user", content: userPrompt },
    ],
    { temperature: 0.9, maxTokens: 4096 },
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new MiniMaxApiError("Empty response from model");
  }

  return parseScenesJson(content).scenes;
}
