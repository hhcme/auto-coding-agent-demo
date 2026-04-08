import type { SceneDescription, StoryToScenesResult } from "@/types/ai";

export const STORY_TO_SCENES_SYSTEM_PROMPT = `你是一个专业的视频脚本编剧。你的任务是将用户提供的短故事拆分成适合制作短视频的独立场景。

## 输出要求
1. 将故事拆分为 4-8 个场景（根据故事长度调整）
2. 每个场景应该：
   - 有清晰的视觉描述
   - 包含场景中的人物、动作、环境
   - 适合 5-10 秒的视频展示
   - 场景之间有连贯性

3. 必须以 JSON 格式输出，格式如下：
{
  "scenes": [
    {
      "order_index": 1,
      "description": "场景的详细视觉描述"
    }
  ]
}

## 注意事项
- 不要输出任何额外文字，只输出 JSON
- 确保每个场景描述足够详细，可以用于生成图片
- 场景描述应该包含：场景环境、人物动作、情绪氛围、光影效果`;

export const STORY_TO_SCENES_USER_PROMPT_TEMPLATE = `请将以下故事拆分为视频场景：

{story}

{styleGuidance}`;

export function buildStyleGuidance(style?: string): string {
  const styleMap: Record<string, string> = {
    realistic: "风格指导：写实风格，真实感强，自然光影",
    anime: "风格指导：日本动漫风格，色彩鲜艳，线条清晰",
    cartoon: "风格指导：卡通风格，夸张可爱，色彩明亮",
    cinematic: "风格指导：电影质感，大气磅礴，专业运镜",
    watercolor: "风格指导：水彩画风格，柔和淡雅，艺术感强",
    oil_painting: "风格指导：油画风格，厚重质感，色彩浓郁",
    sketch: "风格指导：素描风格，线条为主，黑白灰调",
    cyberpunk: "风格指导：赛博朋克风格，霓虹灯光，科技感",
    fantasy: "风格指导：奇幻风格，魔法元素，梦幻色彩",
    scifi: "风格指导：科幻风格，未来感，高科技元素",
  };

  if (style && styleMap[style]) {
    return `\n${styleMap[style]}`;
  }

  return "\n风格指导：写实风格";
}

function extractBalancedJsonCandidate(content: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function normalizeSceneResult(result: StoryToScenesResult): StoryToScenesResult {
  if (!result.scenes || !Array.isArray(result.scenes)) {
    throw new Error("Invalid response structure: missing scenes array");
  }

  return {
    scenes: result.scenes.map((scene, index): SceneDescription => ({
      order_index: scene.order_index ?? index + 1,
      description: scene.description,
    })),
  };
}

export function parseScenesJson(content: string): StoryToScenesResult {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const fencedContent = fencedMatch?.[1]?.trim();

  const directCandidates = [fencedContent, content]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());

  for (const candidate of directCandidates) {
    try {
      return normalizeSceneResult(JSON.parse(candidate) as StoryToScenesResult);
    } catch {
      // Fall through to balanced extraction.
    }
  }

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== "{") {
      continue;
    }

    const candidate = extractBalancedJsonCandidate(content, index);
    if (!candidate) {
      continue;
    }

    try {
      return normalizeSceneResult(JSON.parse(candidate) as StoryToScenesResult);
    } catch {
      // Continue scanning later candidates.
    }
  }

  throw new Error("Failed to parse scenes from response");
}
