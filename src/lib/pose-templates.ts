/**
 * 预制姿势模板库
 * ----------------
 * 用预制模板图代替 CogView 实时生成，解决：
 *  - 男性化问题（模板统一为女性形象）
 *  - 重生成道具问题（模板无道具）
 *  - 超出画布问题（模板已精确裁剪）
 *  - 风格不一致问题（模板风格统一）
 *  - 生成速度慢问题（模板瞬间加载）
 *
 * 每个模板是一张透明背景 PNG，画的是中性优雅的女性姿势线稿。
 * GLM-4V 分析场景时从模板库中选择最匹配的 3 个，输出 templateId。
 * 合成阶段直接用模板图 + layoutBox 合成到用户原图。
 */

import { findPose as findPoseInKb, type PoseEntry } from "./photography-kb";

export type PoseCategory = "standing" | "sitting" | "leaning" | "dynamic";

export interface PoseTemplate {
  /** 唯一 ID，用于 GLM-4V 引用 */
  id: string;
  /** 模板图片路径（public 目录下） */
  src: string;
  /** 姿势类别 */
  category: PoseCategory;
  /** 简短姿势描述（英文，给 GLM-4V 理解用） */
  description: string;
  /** 朝向 */
  facing: "front" | "left" | "right" | "3/4 left" | "3/4 right" | "back";
  /** 适用场景标签（GLM-4V 匹配用） */
  suitableFor: string[];
  /** 姿势关键词（用于语义匹配） */
  keywords: string[];
}

/**
 * 预制姿势模板库 —— 15 个常见姿势
 * 图片路径: /poses/{id}.png
 */
export const POSE_TEMPLATES: PoseTemplate[] = [
  // ── 站姿（6 个）──
  {
    id: "stand-front-arms-down",
    src: "/poses/stand-front-arms-down.jpg",
    category: "standing",
    description: "Standing front-facing, arms relaxed at sides, weight even",
    facing: "front",
    suitableFor: ["any wall", "open space", "simple background", "portrait"],
    keywords: ["standing", "front", "arms down", "relaxed", "neutral"],
  },
  {
    id: "stand-3q-right-hand-hip",
    src: "/poses/stand-3q-right-hand-hip.jpg",
    category: "standing",
    description: "Standing 3/4 right, one hand on hip, weight on one leg",
    facing: "3/4 right",
    suitableFor: ["window", "doorway", "corner", "street", "café"],
    keywords: ["standing", "3/4", "hand on hip", "contrapposto", "confident"],
  },
  {
    id: "stand-3q-left-hand-hip",
    src: "/poses/stand-3q-left-hand-hip.jpg",
    category: "standing",
    description: "Standing 3/4 left, one hand on hip, weight on one leg",
    facing: "3/4 left",
    suitableFor: ["window", "doorway", "corner", "street", "café"],
    keywords: ["standing", "3/4", "hand on hip", "contrapposto", "confident"],
  },
  {
    id: "stand-side-looking-away",
    src: "/poses/stand-side-looking-away.jpg",
    category: "standing",
    description: "Standing side profile, looking away into the distance",
    facing: "right",
    suitableFor: ["window", "balcony", "vista", "street", "scenic view"],
    keywords: ["standing", "side", "profile", "looking away", "contemplative"],
  },
  {
    id: "stand-touching-hair",
    src: "/poses/stand-touching-hair.jpg",
    category: "standing",
    description: "Standing, one hand touching hair, soft elegant mood",
    facing: "3/4 right",
    suitableFor: ["bedroom", "dressing room", "soft light", "boudoir", "window"],
    keywords: ["standing", "touching hair", "elegant", "soft", "feminine"],
  },
  {
    id: "stand-leaning-forward-table",
    src: "/poses/stand-leaning-forward-table.jpg",
    category: "leaning",
    description: "Standing, leaning forward with both hands resting on a table edge",
    facing: "front",
    suitableFor: ["table", "desk", "counter", "bar", "café"],
    keywords: ["leaning", "table", "hands on table", "forward", "interactive"],
  },

  // ── 坐姿（5 个）──
  {
    id: "sit-front-knees-together",
    src: "/poses/sit-front-knees-together.jpg",
    category: "sitting",
    description: "Seated front-facing, knees together, hands on lap",
    facing: "front",
    suitableFor: ["chair", "stool", "bench", "sofa", "bed", "step"],
    keywords: ["sitting", "front", "knees together", "hands on lap", "proper"],
  },
  {
    id: "sit-3q-right-leg-crossed",
    src: "/poses/sit-3q-right-leg-crossed.jpg",
    category: "sitting",
    description: "Seated 3/4 right, legs crossed, one hand on knee",
    facing: "3/4 right",
    suitableFor: ["chair", "sofa", "stool", "bench", "café", "lounge"],
    keywords: ["sitting", "3/4", "legs crossed", "elegant", "ladylike"],
  },
  {
    id: "sit-side-looking-away",
    src: "/poses/sit-side-looking-away.jpg",
    category: "sitting",
    description: "Seated side profile, looking away, contemplative mood",
    facing: "right",
    suitableFor: ["window", "bench", "stool", "ledge", "balcony"],
    keywords: ["sitting", "side", "looking away", "contemplative", "window"],
  },
  {
    id: "sit-floor-legs-tucked",
    src: "/poses/sit-floor-legs-tucked.jpg",
    category: "sitting",
    description: "Sitting on floor, legs tucked to one side, hands on lap",
    facing: "3/4 left",
    suitableFor: ["floor", "rug", "grass", "bed", "low surface"],
    keywords: ["sitting", "floor", "legs tucked", "casual", "cozy"],
  },
  {
    id: "sit-stool-elbows-knees",
    src: "/poses/sit-stool-elbows-knees.jpg",
    category: "sitting",
    description: "Seated on a stool, elbows resting on knees, leaning forward",
    facing: "front",
    suitableFor: ["stool", "bar stool", "counter", "café", "bar"],
    keywords: ["sitting", "stool", "elbows on knees", "leaning", "casual"],
  },

  // ── 靠姿（2 个）──
  {
    id: "lean-wall-arms-crossed",
    src: "/poses/lean-wall-arms-crossed.jpg",
    category: "leaning",
    description: "Leaning back against a wall, arms crossed, relaxed",
    facing: "front",
    suitableFor: ["wall", "doorway", "column", "brick wall", "urban"],
    keywords: ["leaning", "wall", "arms crossed", "cool", "urban"],
  },
  {
    id: "lean-wall-shoulder",
    src: "/poses/lean-wall-shoulder.jpg",
    category: "leaning",
    description: "Leaning one shoulder against a wall, hand in pocket",
    facing: "3/4 left",
    suitableFor: ["wall", "column", "doorway", "alley", "street"],
    keywords: ["leaning", "shoulder", "wall", "casual", "editorial"],
  },

  // ── 动态（2 个）──
  {
    id: "walk-looking-back",
    src: "/poses/walk-looking-back.jpg",
    category: "dynamic",
    description: "Walking, turning head to look back at the camera",
    facing: "3/4 right",
    suitableFor: ["street", "path", "hallway", "corridor", "open space"],
    keywords: ["walking", "looking back", "dynamic", "candid", "movement"],
  },
  {
    id: "turn-arms-out",
    src: "/poses/turn-arms-out.jpg",
    category: "dynamic",
    description: "Mid-turn, arms slightly out, flowing movement",
    facing: "3/4 left",
    suitableFor: ["open space", "garden", "beach", "field", "rooftop"],
    keywords: ["turning", "arms out", "flowing", "dynamic", "joyful"],
  },
  {
    id: "stand-hands-in-pockets",
    src: "/poses/stand-hands-in-pockets.jpg",
    category: "standing",
    description: "Standing, hands in pockets, casual relaxed slouch",
    facing: "3/4 right",
    suitableFor: ["street", "cafe", "gallery", "outdoor", "casual"],
    keywords: ["hands in pockets", "casual", "relaxed", "slouch", "street"],
  },
  {
    id: "walk-natural-arms",
    src: "/poses/walk-natural-arms.jpg",
    category: "dynamic",
    description: "Walking naturally, arms relaxed at sides, mid-step",
    facing: "front",
    suitableFor: ["street", "park", "path", "corridor", "outdoor"],
    keywords: ["walking", "natural", "arms relaxed", "mid-step", "candid"],
  },
  {
    id: "pose-head-back-relax",
    src: "/poses/pose-head-back-relax.jpg",
    category: "standing",
    description: "Standing, head tilted back looking up, hands behind back, relaxed",
    facing: "front",
    suitableFor: ["beach", "park", "outdoor", "rooftop", "open space"],
    keywords: ["head back", "looking up", "relaxed", "expansive", "outdoor"],
  },
  {
    id: "pose-back-view-standing",
    src: "/poses/pose-back-view-standing.jpg",
    category: "standing",
    description: "Standing back view, hands behind back, head slightly turned showing profile",
    facing: "back",
    suitableFor: ["gallery", "exhibition", "beach", "park", "window", "scenic view"],
    keywords: ["back view", "from behind", "profile", "mysterious", "narrative"],
  },
  {
    id: "pose-crouch-touch-ground",
    src: "/poses/pose-crouch-touch-ground.jpg",
    category: "dynamic",
    description: "Crouching, one knee down, one hand touching ground, other on knee",
    facing: "3/4 left",
    suitableFor: ["park", "grass", "garden", "beach", "flowers", "ground level"],
    keywords: ["crouching", "kneeling", "touching ground", "low angle", "nature"],
  },
  {
    id: "pose-arms-open-wide",
    src: "/poses/pose-arms-open-wide.jpg",
    category: "dynamic",
    description: "Standing, both arms open wide at shoulder height, palms forward, expansive",
    facing: "front",
    suitableFor: ["beach", "park", "field", "rooftop", "mountain", "open space"],
    keywords: ["arms open", "wide", "expansive", "freedom", "joyful", "outdoor"],
  },
];

/** 按 ID 查找模板 */
export function findTemplate(id: string): PoseTemplate | undefined {
  return POSE_TEMPLATES.find((t) => t.id === id);
}

/** 获取所有模板的简短列表（给 GLM-4V prompt 用） */
export function getTemplateListForPrompt(): string {
  return POSE_TEMPLATES.map(
    (t, i) =>
      `${i + 1}. id="${t.id}" — ${t.description} (facing: ${t.facing}, good for: ${t.suitableFor.join(", ")})`,
  ).join("\n");
}

/** Fallback：如果 GLM-4V 没选模板，用这几个 */
export const FALLBACK_TEMPLATE_IDS = [
  "stand-3q-right-hand-hip",
  "stand-front-arms-down",
  "stand-hands-in-pockets",
  "pose-back-view-standing",
  "sit-front-knees-together",
];

/**
 * 通过 poseId（来自摄影知识库）反查对应的姿势详情（中英文字段）。
 * 给前端 results 页面展示中文口令、表情指导、避坑提示用。
 */
export function findPoseByPoseId(poseId: string): PoseEntry | undefined {
  if (!poseId) return undefined;
  return findPoseInKb(poseId);
}
