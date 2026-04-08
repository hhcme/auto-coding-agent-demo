import type { VideoStyle } from "@/types/ai";

export const VIDEO_STYLE_OPTIONS: {
  id: VideoStyle;
  name: string;
  description: string;
}[] = [
  {
    id: "realistic",
    name: "写实风格",
    description: "逼真的照片级效果，接近真实世界",
  },
  {
    id: "anime",
    name: "动漫风格",
    description: "日式动漫风格，色彩鲜艳明亮",
  },
  {
    id: "cartoon",
    name: "卡通风格",
    description: "可爱的卡通风格，适合儿童内容",
  },
  {
    id: "cinematic",
    name: "电影风格",
    description: "电影质感，戏剧性的光影效果",
  },
  {
    id: "watercolor",
    name: "水彩风格",
    description: "柔和的水彩画效果，艺术感强",
  },
  {
    id: "oil_painting",
    name: "油画风格",
    description: "经典油画质感，厚重有层次",
  },
  {
    id: "sketch",
    name: "素描风格",
    description: "黑白线条素描，简洁有韵味",
  },
  {
    id: "cyberpunk",
    name: "赛博朋克",
    description: "未来科技感，霓虹灯光效果",
  },
  {
    id: "fantasy",
    name: "奇幻风格",
    description: "魔法奇幻世界，神秘梦幻",
  },
  {
    id: "scifi",
    name: "科幻风格",
    description: "硬科幻风格，太空与科技",
  },
];

export const VIDEO_STYLE_NAME_MAP = Object.fromEntries(
  VIDEO_STYLE_OPTIONS.map((option) => [option.id, option.name]),
) as Record<VideoStyle, string>;

export function getVideoStyleName(style?: string | null) {
  if (!style) {
    return null;
  }

  return VIDEO_STYLE_NAME_MAP[style as VideoStyle] ?? style;
}
