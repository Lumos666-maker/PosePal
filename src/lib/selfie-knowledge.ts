/**
 * PosePal 自拍知识库（硬编码推荐规则）
 * --------------------------------
 * 来源：selfie-module-implementation.md 第 3 节关键词库 + 第 5.2 节匹配规则
 * 用途：AI 只识别脸型/肤色/眼型，推荐规则硬编码在代码里保证稳定
 */

// ── 脸型 4 类 ──
export type FaceShape = "round" | "square_round" | "long" | "diamond";

export interface FaceShapeRule {
  id: FaceShape;
  nameCn: string;
  nameEn: string;
  features: string;
  bestAngle: string;
  tips: string[];
}

export const FACE_SHAPES: FaceShapeRule[] = [
  {
    id: "round",
    nameCn: "圆脸",
    nameEn: "Round",
    features: "soft jawline, wide cheekbones, face length ≈ face width",
    bestAngle: "Side 45° + overhead 15°",
    tips: ["Hair covers one side of jawline to slim", "Overhead 15° tilt to define jawline", "Turn face slightly toward the light source"],
  },
  {
    id: "square_round",
    nameCn: "方圆脸",
    nameEn: "Square-Round",
    features: "square-ish jawline with rounded corners, wide cheekbones, face slightly short and wide",
    bestAngle: "Side 45° + overhead 15°",
    tips: ["Hair covers jaw corners", "Side profile slims the face", "Avoid straight-on at eye level"],
  },
  {
    id: "long",
    nameCn: "长脸",
    nameEn: "Long",
    features: "high forehead, prominent cheekbones, face length noticeably > width",
    bestAngle: "Straight-on + slight 15° side turn",
    tips: ["Use bangs/fringe to shorten forehead", "Loose hair at cheekbones to add width", "Smile to shorten face length"],
  },
  {
    id: "diamond",
    nameCn: "菱形脸",
    nameEn: "Diamond",
    features: "narrow forehead, prominent cheekbones, pointed chin",
    bestAngle: "Straight-on + slight 15° side turn",
    tips: ["Loose hair at cheekbones to soften", "Avoid slicked-back hairstyles", "Slight turn to reduce cheekbone width"],
  },
];

// ── 肤色冷暖 2 类 ──
export type SkinTone = "warm" | "cool";

export interface SkinToneRule {
  id: SkinTone;
  nameCn: string;
  nameEn: string;
  features: string;
  bestLight: string;
  bestLightSource: string;
  avoidLight: string;
}

export const SKIN_TONES: SkinToneRule[] = [
  {
    id: "warm",
    nameCn: "暖皮",
    nameEn: "Warm",
    features: "wrist veins appear greenish, foundation shade leans yellow/peach",
    bestLight: "Front side light (45°)",
    bestLightSource: "Golden hour side-back light",
    avoidLight: "Cool white light, fluorescent",
  },
  {
    id: "cool",
    nameCn: "冷皮",
    nameEn: "Cool",
    features: "wrist veins appear blue-purple, foundation shade leans pink/ivory",
    bestLight: "Window soft light",
    bestLightSource: "Cool white light",
    avoidLight: "Strong warm yellow light, top light",
  },
];

// ── 眼型 3 类 ──
export type EyeType = "monolid" | "double_eyelid" | "inner_double";

export interface EyeTypeRule {
  id: EyeType;
  nameCn: string;
  nameEn: string;
  features: string;
  bestPoses: string[];
  avoid: string;
}

export const EYE_TYPES: EyeTypeRule[] = [
  {
    id: "monolid",
    nameCn: "单眼皮",
    nameEn: "Monolid",
    features: "no visible double-eyelid crease",
    bestPoses: ["Closed-eye smile", "Side profile not looking at camera", "Head down, eyes up at camera"],
    avoid: "Strong catchlight staring into lens, head tilted up with eyes wide open",
  },
  {
    id: "double_eyelid",
    nameCn: "双眼皮",
    nameEn: "Double eyelid",
    features: "visible double-eyelid crease",
    bestPoses: ["Look straight into camera", "Emphasize catchlight in eyes", "Smile showing teeth"],
    avoid: "",
  },
  {
    id: "inner_double",
    nameCn: "内双",
    nameEn: "Inner double",
    features: "folded-in double eyelid, crease not visible when eyes open",
    bestPoses: ["Eyes slightly downcast looking at camera", "Side 45°", "Half-closed eyes for a languid feel"],
    avoid: "",
  },
];

// ── 自拍光线 7 种 ──
export interface SelfieLightRule {
  id: string;
  nameCn: string;
  nameEn: string;
  status: "can_shoot" | "caution" | "avoid";
  effect: string;
  script?: string;
  advice?: string;
}

export const SELFIE_LIGHTS: SelfieLightRule[] = [
  { id: "front_side_light", nameCn: "前侧光", nameEn: "Front Side Light (45°)", status: "can_shoot", effect: "3/4 face lit, slimming and dimensional", script: "神仙光线！显瘦又立体" },
  { id: "side_light", nameCn: "侧光", nameEn: "Side Light (90°)", status: "can_shoot", effect: "Half face lit, half shadow, cinematic", script: "侧光太高级了！亮面朝镜头" },
  { id: "front_light", nameCn: "顺光", nameEn: "Front Light (even)", status: "can_shoot", effect: "Even full-face light, fresh daily look", script: "光线均匀柔和！适合清新日常" },
  { id: "soft_light", nameCn: "柔光", nameEn: "Soft Light", status: "can_shoot", effect: "No harsh shadows, flattering at any angle", script: "柔光不挑角度，适合日系清新风" },
  { id: "top_light", nameCn: "顶光", nameEn: "Top Light", status: "avoid", effect: "Deep shadows in eye sockets/nose/chin, ages face", advice: "Move half a step to a window so light comes from the side" },
  { id: "back_light", nameCn: "逆光", nameEn: "Back Light", status: "caution", effect: "Hair glows but face goes dark", advice: "Turn body 45° toward light source so face catches rim light" },
  { id: "side_back_light", nameCn: "侧逆光", nameEn: "Side Back Light (rim)", status: "can_shoot", effect: "Hair glows + rim light on face, max atmosphere", script: "侧逆光 yyds！头发丝发光脸不黑" },
];

// ── 自拍角度 6 种 ──
export interface SelfieAngleRule {
  id: string;
  nameCn: string;
  nameEn: string;
  forFaceShapes: FaceShape[] | "all";
  effect: string;
}

export const SELFIE_ANGLES: SelfieAngleRule[] = [
  { id: "high_15deg", nameCn: "俯拍15°", nameEn: "Overhead 15°", forFaceShapes: ["round", "square_round"], effect: "Slimming, defines jawline" },
  { id: "eye_level", nameCn: "平视正脸", nameEn: "Eye level", forFaceShapes: ["long", "diamond"], effect: "Natural, doesn't elongate face" },
  { id: "side_45deg", nameCn: "侧脸45°", nameEn: "Side 45°", forFaceShapes: "all", effect: "Defines contours, slimming, storyful" },
  { id: "half_side_15deg", nameCn: "半侧脸15°", nameEn: "Half side 15°", forFaceShapes: "all", effect: "Natural, dimensional" },
  { id: "look_up_eyes_down", nameCn: "低头抬眼", nameEn: "Head down, eyes up", forFaceShapes: "all", effect: "Playful, shy, candid feel" },
  { id: "side_chin_up_10", nameCn: "微侧脸+下巴微抬10°", nameEn: "Side + chin up 10°", forFaceShapes: "all", effect: "Defines jawline, elegant" },
];

// ── 自拍避雷 7 条 ──
export const SELFIE_AVOIDS: string[] = [
  "Top light directly on face → move to a window",
  "Squinting in bright light → close eyes then open to catch a natural moment",
  "Upward angle shows double chin → use eye level or overhead 15°",
  "Hand pressing face flesh → support lightly, don't squeeze",
  "Standing square to camera → turn body 45° to look slimmer",
  "Staring wide-eyed → keep gaze soft and relaxed",
  "Shrugged shoulders → relax shoulders down",
];

// ── 自拍风格（MVP 固定一种）──
export const SELFIE_STYLE_MVP = {
  id: "daily_sweet",
  nameCn: "日常甜美风",
  nameEn: "Daily Sweet",
  keywords: ["微笑不露齿", "月牙眼", "自然放松", "慵懒温柔", "俏皮可爱"],
};

// ── 工具函数 ──
export function findFaceShapeRule(id: string): FaceShapeRule | undefined {
  return FACE_SHAPES.find((r) => r.id === id);
}
export function findSkinToneRule(id: string): SkinToneRule | undefined {
  return SKIN_TONES.find((r) => r.id === id);
}
export function findEyeTypeRule(id: string): EyeTypeRule | undefined {
  return EYE_TYPES.find((r) => r.id === id);
}

export function getFaceShapesForPrompt(): string {
  return FACE_SHAPES.map((f, i) => `${i + 1}. id="${f.id}" — ${f.nameEn} (${f.nameCn}) | recognize: ${f.features}`).join("\n");
}
export function getSkinTonesForPrompt(): string {
  return SKIN_TONES.map((s, i) => `${i + 1}. id="${s.id}" — ${s.nameEn} (${s.nameCn}) | recognize: ${s.features}`).join("\n");
}
export function getEyeTypesForPrompt(): string {
  return EYE_TYPES.map((e, i) => `${i + 1}. id="${e.id}" — ${e.nameEn} (${e.nameCn}) | recognize: ${e.features}`).join("\n");
}

// ── 参考图路径 ──
export const SELFIE_REF_IMAGES = {
  faceShapes: "/selfie-refs/face-shapes/face-shape-grid-8-types.jpeg",
  lighting: "/selfie-refs/lighting/lighting-types-grid-9-types.png",
  styles: "/selfie-refs/styles/style-vibes-grid-6-types.jpeg",
  samplePoses: {
    goldenHourBacklight: "/selfie-refs/sample-poses/pose-golden-hour-backlight.jpeg",
    indoorChanel: "/selfie-refs/sample-poses/pose-indoor-chanel-style.jpeg",
    wallFrontLight: "/selfie-refs/sample-poses/pose-wall-front-light.jpeg",
  },
  sampleScenes: {
    cafe: "/selfie-refs/sample-scenes/scene-cafe-interior.jpeg",
    gallery: "/selfie-refs/sample-scenes/scene-art-gallery.jpeg",
    forest: "/selfie-refs/sample-scenes/scene-forest-path.jpeg",
  },
} as const;
