/**
 * PosePal 摄影知识库（结构化数据）
 * --------------------------------
 * 来源：photography-kb.md（独立参考文件）
 * 内容：9 种光线类型 + 3 级状态 + 27 个姿势（3 场景 × 9）+ 姿势-光线匹配规则
 * 用途：给 analyze-pose.functions.ts 的 SCENE_PROMPT 提供结构化知识注入
 */

// ── 光线状态分级 ──
export type LightStatus = "shoot" | "adjust" | "avoid";

// ── 光线类型（9 种）──
export interface LightType {
  id: string;
  name: string;          // 中文名
  nameEn: string;        // 英文名（给 AI 输出用）
  /** 识别特征（给 AI 判断用） */
  recognizeHint: string;
  /** 适合场景 */
  suitableScenes: string;
  /** 状态：可拍 / 注意 / 避雷 */
  status: LightStatus;
  /** 口语化话术（中文，给前端展示用） */
  spokenTip: string;
  /** 英文调整建议（给 AI prompt 用） */
  adviceEn: string;
}

export const LIGHT_TYPES: LightType[] = [
  // ── 落地必拍 6 种 ──
  {
    id: "front-light",
    name: "顺光",
    nameEn: "Front Light (even)",
    recognizeHint: "Light source behind photographer, face evenly lit, no strong shadows",
    suitableScenes: "ID photos, casual daily records",
    status: "shoot",
    spokenTip: "光线均匀柔和！适合拍清新日常。注意别眯眼，可以闭眼再睁开抓拍。",
    adviceEn: "Even flattering light for fresh daily look. Avoid squinting — try closing then opening eyes to catch a natural moment.",
  },
  {
    id: "front-side-light",
    name: "前侧光",
    nameEn: "Front Side Light (45°)",
    recognizeHint: "Light from camera-front 45°, face 3/4 lit, faint shadow beside nose",
    suitableScenes: "Universal — best for amateurs",
    status: "shoot",
    spokenTip: "神仙光线！显瘦又立体。脸朝光源方向微转，朋友直接拍就好看。",
    adviceEn: "Magic light — slimming and dimensional. Turn face slightly toward the light source; even a friend snapping will look great.",
  },
  {
    id: "side-light",
    name: "正侧光",
    nameEn: "Side Light (90°)",
    recognizeHint: "Light from direct left/right, half face lit half shadow, strong contrast",
    suitableScenes: "Café window, sunset",
    status: "shoot",
    spokenTip: "侧光太高级了！亮的那半张脸朝向镜头，秒变电影女主。",
    adviceEn: "Cinematic side light. Face the lit half toward the camera for a movie-heroine look.",
  },
  {
    id: "back-light",
    name: "逆光",
    nameEn: "Back Light (silhouette)",
    recognizeHint: "Light source behind subject, face dark, background bright/hair glowing",
    suitableScenes: "Beach, sunset, atmospheric portraits",
    status: "adjust",
    spokenTip: "逆光氛围感满分！但脸会暗。侧身 45° 面向镜头，脸吃到边缘光就不黑脸。",
    adviceEn: "Atmospheric but face goes dark. Turn body 45° toward camera so the face catches rim light — no more dark face.",
  },
  {
    id: "side-back-light",
    name: "侧逆光",
    nameEn: "Side Back Light (rim)",
    recognizeHint: "Light from left/right behind, hair glowing + rim light on half face",
    suitableScenes: "Outdoors, golden hour",
    status: "shoot",
    spokenTip: "侧逆光 yyds！头发丝会发光，脸不黑还有轮廓。侧身站，脸朝镜头方向偏一点。",
    adviceEn: "Best rim light — hair glows, face stays lit with outline. Stand sideways, face slightly toward camera.",
  },
  {
    id: "top-light",
    name: "顶光",
    nameEn: "Top Light (overhead)",
    recognizeHint: "Light directly above, deep shadows in eye sockets / under nose / chin",
    suitableScenes: "Avoid!",
    status: "avoid",
    spokenTip: "当前是顶光，会显老显憔悴。建议移半步到窗边或屋檐下，让光从侧面来。",
    adviceEn: "Top light ages and tires the face. Move half a step to a window or under an eave so light comes from the side.",
  },
  // ── 进阶 3 种 ──
  {
    id: "butterfly-light",
    name: "蝴蝶光",
    nameEn: "Butterfly Light (paramount)",
    recognizeHint: "Light from upper-front, butterfly-shaped shadow under nose",
    suitableScenes: "Studio beauty shots, makeup display",
    status: "adjust",
    spokenTip: "蝴蝶光显高级但挑人。适合下巴尖、鼻梁高的女生，鼻影记得打重一点。",
    adviceEn: "Elegant but demanding. Suits girls with pointed chin and high nose bridge; nose shadow should be a bit heavier.",
  },
  {
    id: "rembrandt-light",
    name: "伦勃朗光",
    nameEn: "Rembrandt Light",
    recognizeHint: "Inverted triangle lit area on one side, other side dark",
    suitableScenes: "Professional, artistic",
    status: "shoot",
    spokenTip: "这是大师级布光！暗的那侧脸留一道倒三角光，艺术感拉满。",
    adviceEn: "Masterful lighting. Leave an inverted triangle of light on the shadow side for artistic depth.",
  },
  {
    id: "bottom-light",
    name: "底光",
    nameEn: "Bottom Light (horror)",
    recognizeHint: "Light from below (flashlight / floor reflection)",
    suitableScenes: "Horror effect only",
    status: "avoid",
    spokenTip: "底光会显恐怖，请立刻关闭下方光源，脸朝向主光源方向。",
    adviceEn: "Bottom light looks eerie. Turn off any lower light source immediately and face the main light.",
  },
];

// ── 构图提示规则 ──
export interface CompositionRule {
  id: string;
  trigger: string;   // 识别依据（英文，给 AI 判断）
  advice: string;    // 建议话术
}

export const COMPOSITION_RULES: CompositionRule[] = [
  {
    id: "frame-structure",
    trigger: "door frame, bookshelf gap, arch, or similar framing structure detected in background",
    advice: "检测到框架结构，可用作天然画框，人站中间有故事感。 / Frame structure detected — use it as a natural vignette; stand in the middle for narrative feel.",
  },
  {
    id: "cluttered-bg",
    trigger: "multiple people or messy exhibits/objects in background",
    advice: "背景较杂乱，建议低机位仰拍，用干净墙面或天空做背景。 / Cluttered background — try low-angle upward shot using clean wall or sky as backdrop.",
  },
  {
    id: "railing-grid",
    trigger: "window railing or grid lines in background",
    advice: "背景有栏杆，建议手机举高俯拍避开杂乱线条。 / Railing/grid in background — raise phone and shoot downward to avoid messy lines.",
  },
];

// ── 场景类型（3 个核心场景）──
export type SceneCategory = "cafe-table" | "exhibition-bookstore" | "outdoor-grass";

export interface SceneTypeDef {
  id: SceneCategory;
  nameCn: string;
  nameEn: string;
  /** 识别依据 */
  recognizeHints: string[];
}

export const SCENE_TYPES: SceneTypeDef[] = [
  {
    id: "cafe-table",
    nameCn: "咖啡厅/餐桌前",
    nameEn: "Café / dining table",
    recognizeHints: ["table top", "cups", "window", "pendant light", "chairs"],
  },
  {
    id: "exhibition-bookstore",
    nameCn: "看展/书店",
    nameEn: "Exhibition / bookstore",
    recognizeHints: ["door frame", "arch", "bookshelf", "exhibits", "display case"],
  },
  {
    id: "outdoor-grass",
    nameCn: "户外/草地/公园",
    nameEn: "Outdoors / grass / park",
    recognizeHints: ["grass", "trees", "open sky", "flowers", "path"],
  },
];

// ── 姿势类型分类 ──
export type PoseFraming = "full-body" | "half-body" | "back-view" | "dynamic";

// ── 姿势数据结构（统一 6 字段）──
export interface PoseEntry {
  /** 唯一 ID */
  id: string;
  /** 姿势名（中文） */
  name: string;
  /** 姿势名（英文，给 AI 输出用） */
  nameEn: string;
  /** 所属场景 */
  scene: SceneCategory;
  /** 入镜类型 */
  framing: PoseFraming;
  /** 适合光线 id 列表（对应 LIGHT_TYPES） */
  suitableLights: string[];
  /** 虚线动作轨迹（步骤化，中文） */
  trajectory: string;
  /** 英文版轨迹（给 AI prompt + CogView 用） */
  trajectoryEn: string;
  /** 朋友照着念的口令（中文） */
  spokenScript: string;
  /** 英文口令 */
  spokenScriptEn: string;
  /** 表情指导 */
  expression: string;
  /** 英文表情指导 */
  expressionEn: string;
  /** 避坑提示 */
  avoid: string;
  /** 英文避坑 */
  avoidEn: string;
  /** 映射到现有 POSE_TEMPLATES 的 templateId（最接近的预制模板） */
  templateId: string;
  /** 朝向 */
  facing: "front" | "left" | "right" | "3/4 left" | "3/4 right" | "back";
}

// ── 27 个姿势（3 场景 × 9 姿势）──
// 命名规则：{scene}-{index}，例如 cafe-1, exh-3, out-7
export const POSE_LIBRARY: PoseEntry[] = [
  // ═══════════ 场景一：餐桌前（9 个，坐姿为主）═══════════
  {
    id: "cafe-1",
    name: "拿杯看窗外",
    nameEn: "Cup Gaze Out Window",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["side-light"],
    trajectory: "正坐，手放桌上，脸正对前方 → 脸慢慢转向窗户方向，到侧脸 45° 停 → 右手抬起，握住杯把 → 杯子凑到嘴边（杯口贴下唇下方，不挡嘴）→ 眼神从看杯子→慢慢看向窗外远处",
    trajectoryEn: "Sit upright, hands on table, face forward → slowly turn face toward window to 45° profile → raise right hand, hold cup handle → bring cup to just below lower lip (not blocking mouth) → gaze shifts from cup to distant outside",
    spokenScript: "脸往窗户那边慢慢转，停。右手去拿杯子，抬起来凑到嘴边，先不喝。眼睛从杯子慢慢往窗外看出去，像在想事情。好，拍了。",
    spokenScriptEn: "Slowly turn your face toward the window, stop. Right hand picks up the cup, bring it to your mouth, don't drink yet. Eyes move from the cup slowly out the window, as if thinking. Good, snap.",
    expression: "嘴巴放松微闭，不要用力抿；眼神看向窗外远处，放空感，带一点点淡淡笑意；下巴微抬 10°，显下颌线",
    expressionEn: "Mouth relaxed, slightly closed, not pressed; gaze distant out window, vacant with faint smile; chin raised 10° to define jawline",
    avoid: "杯子别挡住嘴，放嘴唇下方一掌宽位置",
    avoidEn: "Don't let the cup block the mouth — place it a palm-width below the lips",
    templateId: "sit-front-knees-together",
    facing: "3/4 right",
  },
  {
    id: "cafe-2",
    name: "双手捧杯微笑",
    nameEn: "Two-Hand Cup Smile",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["front-light", "side-light"],
    trajectory: "坐直，双手放腿上 → 上半身往前倾 15°，胸口离桌边一拳 → 双手抬起，从两侧捧住杯子 → 下巴微微下沉，搁在杯口上方 → 抬头看镜头，嘴角上扬",
    trajectoryEn: "Sit upright, hands on lap → lean upper body forward 15°, chest a fist from table edge → raise both hands, cup the mug from both sides → chin rests slightly down, above cup rim → look up at camera, corners of mouth rise",
    spokenScript: "坐直。上半身往桌子这边倒一点，停。手抬起来捧住杯子。下巴放杯口上面，抬头看我。笑，不用露齿，嘴角上提就好。拍了。",
    spokenScriptEn: "Sit straight. Lean upper body toward the table a bit, stop. Hands up to cup the mug. Rest chin above the rim, look up at me. Smile, no teeth, just lift the corners. Snap.",
    expression: "微笑，嘴角往两边提，不露齿；眼神看镜头，眼睛微微弯成月牙形；下巴微收，搁在杯口，低头然后抬眼看镜头",
    expressionEn: "Smile, lift corners sideways, no teeth; eyes at camera, slightly curved into crescents; chin tucked, resting on rim, lower head then raise eyes to camera",
    avoid: "别耸肩，肩膀往下沉；笑的时候别眯眼过度",
    avoidEn: "Don't shrug — shoulders down; don't squint too much when smiling",
    templateId: "sit-front-knees-together",
    facing: "front",
  },
  {
    id: "cafe-3",
    name: "托腮看镜头",
    nameEn: "Chin Rest Smile",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["front-light", "side-light"],
    trajectory: "坐直，手放桌面 → 右手抬起，手肘撑桌面 → 手掌托住右侧下巴（轻放，不用力）→ 脸从正对→往右微转 15° → 眼神从平视→看镜头",
    trajectoryEn: "Sit upright, hands on table → raise right hand, elbow on table → palm supports right chin (rest lightly, no force) → face turns from forward to right 15° → gaze shifts to camera",
    spokenScript: "右手抬起来，手肘撑桌上，手掌托住右边下巴。脸往右转一点点，像要把脸轻轻搁在手上。看我，笑。拍了。",
    spokenScriptEn: "Right hand up, elbow on table, palm under right chin. Turn face slightly right, as if resting cheek on hand. Look at me, smile. Snap.",
    expression: "微笑或微张，自然放松；眼神直视镜头，柔和，带一点俏皮感；眉毛自然上抬一点点，显得有精神",
    expressionEn: "Smile or slightly open, natural; eyes straight to camera, soft, with a hint of playfulness; brows naturally raised a touch for energy",
    avoid: "手掌轻轻托，不要用力挤脸肉；手肘撑稳别晃",
    avoidEn: "Palm supports lightly — don't press and squeeze cheek; keep elbow steady",
    templateId: "sit-3q-right-leg-crossed",
    facing: "3/4 right",
  },
  {
    id: "cafe-4",
    name: "回眸抓拍",
    nameEn: "Turn-Back Glance",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["back-light", "side-light"],
    trajectory: "侧身坐，脸朝窗户，举手机假装拍窗外 → 听到口令，脖子带动脸慢慢向左转 → 脸转到一半，看向镜头 → 定住，眼神锁定镜头",
    trajectoryEn: "Sit sideways, face window, hold phone pretending to shoot outside → on cue, neck leads face turning left → at halfway, look to camera → freeze, eyes locked on lens",
    spokenScript: "侧身坐，脸朝窗户，举手机假装拍外面。我喊一二三你慢慢回头看我。一、二、三——回。慢一点，头不用转到底，看我就行。好，保持，拍了。",
    spokenScriptEn: "Sit sideways, face the window, hold phone up as if shooting outside. On one-two-three, slowly turn back to me. One, two, three — turn. Slowly, no need to turn all the way, just look at me. Good, hold, snap.",
    expression: "嘴巴微张，显得自然惊讶感；眼神回头看镜头，带一点\"咦？\"的意外表情；整体表情抓拍感，不要太刻意",
    expressionEn: "Mouth slightly open, natural surprise; eyes look back at camera with a 'huh?' feeling; candid feel, not forced",
    avoid: "回头时脖子往前伸，不要缩着；眼神别翻白眼",
    avoidEn: "Neck reaches forward when turning back, don't retract; don't roll eyes",
    templateId: "walk-looking-back",
    facing: "3/4 right",
  },
  {
    id: "cafe-5",
    name: "手持餐具看镜头",
    nameEn: "Fork Tease",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["front-light"],
    trajectory: "坐直，正对餐桌 → 右手拿叉/勺，叉一块食物 → 举到嘴边但先不吃 → 抬头看镜头，俏皮表情 → 张嘴做\"啊\"状",
    trajectoryEn: "Sit upright facing table → right hand holds fork/spoon, spear a bite → bring to mouth but don't eat → look up at camera, playful → open mouth in 'ahh' shape",
    spokenScript: "拿叉子叉一块蛋糕，举到嘴边。抬头看我，张嘴做'啊'的样子，像要喂我。别真吃啊，定住。拍了。",
    spokenScriptEn: "Fork a piece of cake, bring it to your mouth. Look up at me, open mouth like 'ahh', as if feeding me. Don't actually eat, hold. Snap.",
    expression: "嘴巴张成\"啊\"形，不要太大；眼神看镜头，带调皮感；整体表情可爱俏皮",
    expressionEn: "Mouth in 'ahh' shape, not too wide; eyes at camera, playful; overall cute and teasing",
    avoid: "食物别戳破，保持完整；嘴巴不要张太大",
    avoidEn: "Don't break the food, keep it intact; don't open mouth too wide",
    templateId: "sit-front-knees-together",
    facing: "front",
  },
  {
    id: "cafe-6",
    name: "双手交叠趴桌上",
    nameEn: "Arms Folded Lean",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["front-light", "side-light"],
    trajectory: "坐直，正对桌子 → 上半身往前趴，胸口贴桌边 → 双手交叠叠在桌上（手腕叠手腕）→ 下巴搁在手臂上 → 微微歪头看镜头",
    trajectoryEn: "Sit upright facing table → lean forward, chest to table edge → stack hands on table (wrist over wrist) → chin rests on forearm → tilt head slightly, look at camera",
    spokenScript: "往前趴下来，双手叠在桌上。下巴搁手上。头往左边歪一点点，看我，微笑。拍了。",
    spokenScriptEn: "Lean forward onto the table, stack your hands. Chin on your arms. Tilt head slightly left, look at me, smile. Snap.",
    expression: "微笑，带一点点慵懒感；眼神从下往上看镜头，温柔感；整体表情像午后晒太阳的猫，慵懒放松",
    expressionEn: "Smile with a lazy feel; eyes look up at camera, gentle; overall like an afternoon sun cat, languid and relaxed",
    avoid: "肩膀放松，不要耸肩；歪头角度别太大，15° 就够",
    avoidEn: "Shoulders relaxed, don't shrug; tilt no more than 15°",
    templateId: "sit-front-knees-together",
    facing: "front",
  },
  {
    id: "cafe-7",
    name: "侧脸不笑看窗外",
    nameEn: "Profile Window Aloof",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["side-light", "back-light"],
    trajectory: "正坐，脸正对前方 → 身体和脸同时转向窗户（侧脸 90°）→ 手轻握杯子放桌上 → 眼神看向窗外远处 → 面无表情，安静感",
    trajectoryEn: "Sit upright, face forward → body and face turn together to window (90° profile) → hand lightly holds cup on table → gaze out window to distance → no expression, serene",
    spokenScript: "整个人转向窗户，侧脸对着我。手握着杯子放桌上就好。看窗外，不要笑，放空。好，拍了。",
    spokenScriptEn: "Turn your whole self toward the window, profile to me. Hold the cup on the table. Look out the window, don't smile, blank out. Good, snap.",
    expression: "嘴巴闭合，自然放松，不笑；眼神看向远处，放空感，带一点点疏离；整体表情清冷、安静、故事感",
    expressionEn: "Mouth closed, relaxed, no smile; gaze distant, vacant with a hint of detachment; overall cool, quiet, narrative",
    avoid: "不要瞪眼，眼神柔和放空；肩膀别绷着",
    avoidEn: "Don't stare, keep gaze soft and vacant; shoulders not tense",
    templateId: "sit-side-looking-away",
    facing: "right",
  },
  {
    id: "cafe-8",
    name: "撩头发看窗外",
    nameEn: "Hair Tuck Window",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["side-light"],
    trajectory: "正坐，脸微侧 → 右手从桌面抬起 → 手指插入发根，轻轻撩起头发 → 手停在耳朵旁边 → 脸顺势转向窗户方向 → 眼神看窗外",
    trajectoryEn: "Sit upright, face slightly turned → right hand rises from table → fingers into hair roots, lightly lift → hand stops by ear → face follows toward window → gaze out window",
    spokenScript: "右手抬起来，撩一下头发，手停在耳朵旁边。脸顺着手的动作转向窗户。看窗外，不要看我。拍了。",
    spokenScriptEn: "Right hand up, flick hair once, hand stops by ear. Face follows the gesture toward the window. Look out the window, not at me. Snap.",
    expression: "嘴巴自然闭合，带一丝若有若无的笑意；眼神看向窗外，柔和的；整体表情自然、随性",
    expressionEn: "Mouth naturally closed, faint smile; gaze to window, soft; overall natural, casual",
    avoid: "撩头发时手指不要抓太紧，轻轻带过就好",
    avoidEn: "Don't grip hair tightly when tucking, just sweep lightly",
    templateId: "stand-touching-hair",
    facing: "3/4 right",
  },
  {
    id: "cafe-9",
    name: "低头切食物被抓拍",
    nameEn: "Cut Peek-Up",
    scene: "cafe-table",
    framing: "half-body",
    suitableLights: ["front-light", "side-light"],
    trajectory: "坐直，拿刀叉在切食物 → 低头专注切 → 听到口令，停住动作 → 保持低头，但眼神抬起来看镜头 → 定格",
    trajectoryEn: "Sit upright, knife and fork cutting food → head down focused on cutting → on cue, freeze action → keep head down, but raise eyes to camera → freeze",
    spokenScript: "假装在切牛排/蛋糕，低头看着盘子。好，停，保持低头，但眼睛抬起来看我。对，像偷瞄我那样。拍了。",
    spokenScriptEn: "Pretend to cut the steak/cake, head down looking at the plate. Good, stop, keep head down, but raise your eyes to me. Yes, like peeking. Snap.",
    expression: "嘴巴自然放松，或带一点被发现的浅笑；眼神从下往上看镜头，像\"偷瞄被抓到\"的感觉；整体表情俏皮、害羞、自然的被抓拍感",
    expressionEn: "Mouth relaxed or a caught smile; eyes look up at camera from below, like 'peeking got caught'; overall playful, shy, candid",
    avoid: "头不要抬起来，保持低头，只抬眼睛；动作停住不要晃",
    avoidEn: "Don't raise head, keep it down, only raise eyes; freeze the action, don't wobble",
    templateId: "sit-stool-elbows-knees",
    facing: "front",
  },

  // ═══════════ 场景二：看展/书店（9 个）═══════════
  {
    id: "exh-1",
    name: "侧身看展品",
    nameEn: "Profile Exhibit View",
    scene: "exhibition-bookstore",
    framing: "full-body",
    suitableLights: ["side-light", "front-light"],
    trajectory: "站在展品前，正对展品 → 身体转向右侧，侧身对展品（脚打开与肩同宽）→ 双手抱胸或手自然垂放 → 脸侧向 45° 看展品 → 定住，不看镜头",
    trajectoryEn: "Stand before exhibit, facing it → body turns right, sideways to exhibit (feet shoulder-width) → arms crossed or hands naturally down → face turns 45° toward exhibit → freeze, don't look at camera",
    spokenScript: "站在画前面，身体转向右边，侧身对着我。手抱胸，脸看画，别看我。好，保持，拍了。",
    spokenScriptEn: "Stand in front of the painting, body turn right, sideways to me. Arms crossed, face toward the painting, not me. Good, hold, snap.",
    expression: "嘴巴闭合，自然放松；眼神看展品，专注感；整体表情沉浸在欣赏中的安静感",
    expressionEn: "Mouth closed, natural; gaze on exhibit, focused; overall immersed and quiet",
    avoid: "身体不要正对展品，侧身显薄；脚尖朝右，脸朝画",
    avoidEn: "Don't face the exhibit straight — sideways looks slimmer; toes point right, face toward painting",
    templateId: "stand-side-looking-away",
    facing: "right",
  },
  {
    id: "exh-2",
    name: "背影看展品",
    nameEn: "Back View Exhibit",
    scene: "exhibition-bookstore",
    framing: "back-view",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "站在展品前，正对展品 → 直接背对镜头 → 双手背在身后或自然垂放 → 头微微侧向右边，露出一点点侧脸轮廓 → 定住，完全不看镜头",
    trajectoryEn: "Stand before exhibit, facing it → back to camera → hands behind back or naturally down → head slightly turned right, showing a hint of profile → freeze, never look at camera",
    spokenScript: "站到画前面，背对着我。手背到身后，头往右边转一点点，让我看到你一点点侧脸就行。别回头，保持。拍了。",
    spokenScriptEn: "Stand in front of the painting, back to me. Hands behind your back, head turn slightly right, let me see a hint of your profile. Don't turn back, hold. Snap.",
    expression: "嘴巴看不到，不用管；整体氛围安静、神秘、故事感；侧脸轮廓下巴微抬，显侧脸线条",
    expressionEn: "Mouth not visible; overall quiet, mysterious, narrative; profile chin slightly raised for jawline",
    avoid: "不要真的回头，会变成回眸不是背影；头顶别被展品切到",
    avoidEn: "Don't actually turn back — it becomes a glance, not a back view; head shouldn't be cut by the exhibit",
    templateId: "pose-back-view-standing",
    facing: "back",
  },
  {
    id: "exh-3",
    name: "回眸看镜头",
    nameEn: "Exhibit Turn-Back",
    scene: "exhibition-bookstore",
    framing: "full-body",
    suitableLights: ["side-light", "front-light"],
    trajectory: "背对镜头站在展品前 → 脚不动，上半身从腰部以上转身 → 脸转向镜头 → 手自然垂放或拿导览册 → 眼神锁定镜头",
    trajectoryEn: "Back to camera before exhibit → feet stay, upper body twists from waist → face turns to camera → hands naturally down or holding guide → eyes lock on lens",
    spokenScript: "站到画前面，背对我。好，上半身转回来看我，脚别动。手拿导览册放身前。脸转过来，看我笑。拍了。",
    spokenScriptEn: "Stand in front of the painting, back to me. Now turn upper body back to look at me, feet stay. Hold the guide in front. Turn face, smile at me. Snap.",
    expression: "嘴巴微笑，像被熟人叫住；眼神直视镜头，带一点惊喜感；整体表情温暖、自然",
    expressionEn: "Smile, like being called by a friend; eyes straight at camera, a hint of surprise; overall warm, natural",
    avoid: "只转上半身，脚保持不动",
    avoidEn: "Only turn upper body, feet stay put",
    templateId: "walk-looking-back",
    facing: "3/4 right",
  },
  {
    id: "exh-4",
    name: "手摸展品柜",
    nameEn: "Glass Case Touch",
    scene: "exhibition-bookstore",
    framing: "half-body",
    suitableLights: ["side-light", "front-light"],
    trajectory: "站在展柜前，正对展柜 → 身体微侧 15° → 右手抬起，手指轻轻放在展柜玻璃上 → 头侧向 45° 看镜头 → 表情温柔，定住",
    trajectoryEn: "Stand before display case, facing it → body slightly turned 15° → raise right hand, fingers lightly on glass → head turns 45° toward camera → gentle expression, freeze",
    spokenScript: "站到展柜前面，身体侧一点点。右手放玻璃上，手指张开。脸转过来看我，微笑。好，拍了。",
    spokenScriptEn: "Stand in front of the case, body slightly angled. Right hand on the glass, fingers spread. Turn face to me, smile. Good, snap.",
    expression: "嘴巴柔和微笑；眼神看镜头，温柔感；整体表情优雅、安静、有质感",
    expressionEn: "Soft smile; eyes at camera, gentle; overall elegant, quiet, textured",
    avoid: "手不要用力压玻璃，指尖轻放就好",
    avoidEn: "Don't press the glass — fingertips rest lightly",
    templateId: "lean-wall-shoulder",
    facing: "3/4 right",
  },
  {
    id: "exh-5",
    name: "扶墙看镜头",
    nameEn: "Wall Lean Smile",
    scene: "exhibition-bookstore",
    framing: "half-body",
    suitableLights: ["side-light", "front-light"],
    trajectory: "站在干净墙面前（不要有展品）→ 身体正对镜头，肩膀放松 → 右手抬起，手掌贴墙，高度在肩膀位置 → 左手自然下垂或拿手机 → 脸正对镜头，微笑",
    trajectoryEn: "Stand before a clean wall (no exhibits) → body faces camera, shoulders relaxed → raise right hand, palm on wall at shoulder height → left hand down or holding phone → face straight to camera, smile",
    spokenScript: "站到墙前面，正对我。右手抬起来，手掌贴墙上，高度在肩膀。左手拿手机自然放着。看我，笑。拍了。",
    spokenScriptEn: "Stand by the wall, facing me. Right hand up, palm flat on the wall at shoulder height. Left hand holds phone naturally. Look at me, smile. Snap.",
    expression: "嘴巴露齿笑或微笑；眼神直视镜头，有神；整体表情清爽、大方",
    expressionEn: "Open smile or soft; eyes straight at camera, bright; overall fresh, confident",
    avoid: "手掌平贴墙，不要抓墙；肩膀下沉放松",
    avoidEn: "Palm flat on wall, don't grab; shoulders down and relaxed",
    templateId: "lean-wall-shoulder",
    facing: "front",
  },
  {
    id: "exh-6",
    name: "走路抓拍",
    nameEn: "Walk-By Capture",
    scene: "exhibition-bookstore",
    framing: "dynamic",
    suitableLights: ["front-light"],
    trajectory: "离镜头 5 步远，站在走廊一端 → 朝镜头方向慢慢走 → 视线看前方或看展品 → 走到镜头前 3 步时，转头看镜头 → 继续走，抓拍",
    trajectoryEn: "5 steps from camera, stand at corridor end → walk slowly toward camera → gaze forward or at exhibits → at 3 steps from camera, turn head to lens → keep walking, capture",
    spokenScript: "从那边走廊走过来，走慢一点。眼睛看前面。走到第三个地砖的时候转头看我一下，继续走，别停。我连拍。走。",
    spokenScriptEn: "Walk toward me from the corridor, slowly. Eyes forward. When you reach the third floor tile, turn to look at me, keep walking, don't stop. I'll burst. Go.",
    expression: "嘴巴自然放松；眼神看前方→转头瞬间看镜头；整体表情动态抓拍感",
    expressionEn: "Mouth natural; eyes forward → turn-instant to camera; overall dynamic candid",
    avoid: "脚步不停，走慢；转头自然，不要甩头",
    avoidEn: "Keep stepping, walk slowly; turn naturally, no head whip",
    templateId: "walk-looking-back",
    facing: "3/4 right",
  },
  {
    id: "exh-7",
    name: "背影手摸画框",
    nameEn: "Frame Touch Back",
    scene: "exhibition-bookstore",
    framing: "back-view",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "站在画作前，背对镜头 → 双手抬起，手指轻触画框下沿 → 头微低，看着画 → 完全背影，不露脸",
    trajectoryEn: "Stand before painting, back to camera → raise both hands, fingers touch lower frame edge → head slightly down, looking at painting → full back, no face",
    spokenScript: "站到画前面，背对我。双手抬起来，手指摸画框下沿。头低一点看画。别回头。拍了。",
    spokenScriptEn: "Stand in front of the painting, back to me. Both hands up, fingers touch the bottom of the frame. Head down a bit, looking at the painting. Don't turn. Snap.",
    expression: "看不到脸，靠身体语言；手指轻触画框，有互动感；整体氛围文艺、安静",
    expressionEn: "Face not visible, body language; fingers lightly touching frame creates interaction; overall artistic, quiet",
    avoid: "手不要举太高，摸画框下沿就好；站直别驼背",
    avoidEn: "Don't raise hands too high, touch the lower frame; stand straight, no slouch",
    templateId: "pose-back-view-standing",
    facing: "back",
  },
  {
    id: "exh-8",
    name: "假装拍照",
    nameEn: "Fake Snap Playful",
    scene: "exhibition-bookstore",
    framing: "half-body",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "站在展品前，正对展品 → 举起手机假装拍展品 → 脸转向镜头，俏皮表情 → 定格",
    trajectoryEn: "Stand before exhibit, facing it → raise phone pretending to shoot exhibit → face turns to camera, playful expression → freeze",
    spokenScript: "站到展品前面，举手机假装拍它。然后脸转过来看我，俏皮一点。好，定住。拍了。",
    spokenScriptEn: "Stand before the exhibit, raise your phone pretending to shoot it. Then turn face to me, be playful. Good, freeze. Snap.",
    expression: "嘴巴俏皮笑，微嘟嘴；眼神看镜头，带调皮感；整体表情活泼、可爱",
    expressionEn: "Playful smile, slight pout; eyes at camera, mischievous; overall lively, cute",
    avoid: "手机不要挡脸，举到眼睛高度",
    avoidEn: "Phone shouldn't block face, raise to eye level",
    templateId: "stand-3q-right-hand-hip",
    facing: "3/4 right",
  },
  {
    id: "exh-9",
    name: "蹲下看低处展品",
    nameEn: "Crouch Low Exhibit",
    scene: "exhibition-bookstore",
    framing: "full-body",
    suitableLights: ["side-light", "front-light"],
    trajectory: "站着面对低处展品/展柜 → 单膝蹲下（或双脚并拢蹲下）→ 手撑膝盖或摸展柜 → 脸转向镜头微笑 → 全身展现在画面里",
    trajectoryEn: "Stand facing low exhibit/case → one-knee crouch (or feet-together crouch) → hand on knee or on case → face turns to camera, smile → full body in frame",
    spokenScript: "蹲下来，面对展柜。一只手撑膝盖上。脸转过来看我，笑。好，拍了。",
    spokenScriptEn: "Crouch down, facing the case. One hand on your knee. Turn face to me, smile. Good, snap.",
    expression: "嘴巴微笑或露齿笑；眼神从下往上看镜头（显高）；整体表情可爱、轻松",
    expressionEn: "Smile or open smile; eyes look up at camera from below (looks taller); overall cute, relaxed",
    avoid: "蹲姿要优雅，膝盖并拢或前后错开；不要正对镜头蹲",
    avoidEn: "Crouch elegantly, knees together or staggered; don't crouch square to camera",
    templateId: "sit-floor-legs-tucked",
    facing: "3/4 left",
  },

  // ═══════════ 场景三：户外/草地（9 个）═══════════
  {
    id: "out-1",
    name: "逆光侧身回头",
    nameEn: "Backlight Turn-Back",
    scene: "outdoor-grass",
    framing: "full-body",
    suitableLights: ["back-light", "side-back-light"],
    trajectory: "背对太阳站立，正对镜头方向 → 身体转向右侧 45°（让光从背后打过来）→ 听到口令，从腰部以上转身回头看镜头 → 脚不动，只转上半身 → 发丝被光照亮，定住",
    trajectoryEn: "Stand back to sun, facing camera → body turns right 45° (light from behind) → on cue, twist from waist to look back at camera → feet stay, only upper body turns → hair lit by sun, freeze",
    spokenScript: "背对太阳站，身体侧 45°。我喊一二三你回头看我，脚别动。一、二、三——回。头发被光照得发光了，好美，别动。拍了。",
    spokenScriptEn: "Stand back to the sun, body angled 45°. On one-two-three, turn back to look at me, feet stay. One, two, three — turn. Your hair is glowing in the light, so beautiful, don't move. Snap.",
    expression: "嘴巴微张，带一点点惊喜感；眼神温柔看镜头，像被叫住回头看；整体表情柔和的惊喜感，眼神带笑意；头发逆光下发丝边缘会发光，效果拉满",
    expressionEn: "Mouth slightly open, mild surprise; eyes warm on camera, like being called back; overall soft surprise, smiling eyes; hair edge glows in backlight, max effect",
    avoid: "回头时脖子往前伸，别缩着；脸正对镜头方向吃光",
    avoidEn: "Neck reaches forward when turning, don't retract; face toward camera to catch light",
    templateId: "walk-looking-back",
    facing: "3/4 right",
  },
  {
    id: "out-2",
    name: "张开双臂迎风",
    nameEn: "Arms Open Wind",
    scene: "outdoor-grass",
    framing: "full-body",
    suitableLights: ["back-light", "side-back-light"],
    trajectory: "背对镜头站，面朝开阔方向 → 双手从身体两侧慢慢抬起，举到肩膀高度 → 手心朝下或朝前 → 头微仰，眼睛看天空 → 感受风，定住",
    trajectoryEn: "Stand back to camera, facing open space → raise both hands slowly from sides to shoulder height → palms down or forward → head slightly back, eyes to sky → feel the wind, freeze",
    spokenScript: "背对我站到草地中间。双手慢慢张开，像要飞一样，举到肩膀高。头抬起来看天空。闭眼，感受风。好，拍了。",
    spokenScriptEn: "Stand back to me in the middle of the grass. Slowly open your arms, like flying, raise to shoulder height. Lift your head to the sky. Close eyes, feel the wind. Good, snap.",
    expression: "嘴巴自然闭合，嘴角带一点点笑；眼神闭眼或看天空，享受感；整体表情自由、舒展、放松",
    expressionEn: "Mouth closed, corner with a smile; eyes closed or to sky, savoring; overall free, expansive, relaxed",
    avoid: "肩膀别耸起来，下沉；手臂伸直别弯",
    avoidEn: "Shoulders not raised, sink them; arms straight, not bent",
    templateId: "pose-arms-open-wide",
    facing: "back",
  },
  {
    id: "out-3",
    name: "侧身看镜头微笑",
    nameEn: "Side Smile Camera",
    scene: "outdoor-grass",
    framing: "full-body",
    suitableLights: ["front-light", "side-back-light"],
    trajectory: "正对镜头站 → 身体转向左侧 45° → 双脚前后错开（前脚脚尖朝前，后脚横放）→ 双手自然垂放或拿花/帽子 → 脸转回来看镜头微笑",
    trajectoryEn: "Stand facing camera → body turns left 45° → feet staggered (front toe forward, back foot sideways) → hands naturally down or holding flower/hat → face turns back to camera, smile",
    spokenScript: "正对我。身体往左边转 45°，脚一前一后站。手拿帽子放身前。脸转回来看我，笑。拍了。",
    spokenScriptEn: "Face me. Turn body left 45°, feet one forward one back. Hold the hat in front. Turn face back to me, smile. Snap.",
    expression: "嘴巴微笑，露齿或不露齿都可；眼神直视镜头，温暖柔和；整体表情甜美、大方、清爽",
    expressionEn: "Smile, teeth or not both fine; eyes straight to camera, warm and soft; overall sweet, confident, fresh",
    avoid: "不要正对镜头站，侧身显薄显高",
    avoidEn: "Don't face camera square — sideways is slimmer and taller",
    templateId: "stand-3q-left-hand-hip",
    facing: "3/4 left",
  },
  {
    id: "out-4",
    name: "蹲下摸草地/花",
    nameEn: "Crouch Touch Grass",
    scene: "outdoor-grass",
    framing: "full-body",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "站在草地/花丛前 → 单膝蹲下或双脚并拢蹲下 → 一只手伸出去摸草地/花 → 另一只手搭在膝盖上 → 脸转向镜头微笑",
    trajectoryEn: "Stand before grass/flowers → one-knee crouch or feet-together crouch → one hand reaches to touch grass/flowers → other hand on knee → face turns to camera, smile",
    spokenScript: "蹲下来，一只手摸草地，另一只手放膝盖上。脸转过来看我，笑。好，拍了。",
    spokenScriptEn: "Crouch down, one hand touch the grass, other on knee. Turn face to me, smile. Good, snap.",
    expression: "嘴巴露齿笑或微笑；眼神看镜头，甜美；整体表情可爱、亲近自然",
    expressionEn: "Open smile or soft; eyes at camera, sweet; overall cute, close to nature",
    avoid: "蹲姿膝盖并拢或前后错开，避免走光；不要驼背",
    avoidEn: "Crouch with knees together or staggered, avoid exposure; don't slouch",
    templateId: "pose-crouch-touch-ground",
    facing: "3/4 left",
  },
  {
    id: "out-5",
    name: "背影看远方",
    nameEn: "Back View Distance",
    scene: "outdoor-grass",
    framing: "back-view",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "背对镜头站立 → 双手自然垂放或背在身后 → 头微仰，看远方天空/日落 → 完全不看镜头 → 安静定住",
    trajectoryEn: "Stand back to camera → hands naturally down or behind back → head slightly raised, looking at distant sky/sunset → never look at camera → quiet freeze",
    spokenScript: "站到那边，背对我。手背身后，抬头看远方。别回头，保持。好，拍了。",
    spokenScriptEn: "Stand over there, back to me. Hands behind your back, look up to the distance. Don't turn back, hold. Good, snap.",
    expression: "看不到脸；身体语言站直不驼背；整体氛围安静、治愈、有故事感",
    expressionEn: "Face not visible; body language upright, no slouch; overall quiet, healing, narrative",
    avoid: "站直别驼背；头发别挡完脖子",
    avoidEn: "Stand straight, no slouch; hair shouldn't fully block neck",
    templateId: "pose-back-view-standing",
    facing: "back",
  },
  {
    id: "out-6",
    name: "往前走回头抓拍",
    nameEn: "Walk Forward Glance",
    scene: "outdoor-grass",
    framing: "dynamic",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "离镜头 5 步远 → 朝镜头方向慢慢走 → 视线看前方地面 → 走到第 4 步时，转头看镜头 → 不停步，继续走，抓拍",
    trajectoryEn: "5 steps from camera → walk slowly toward camera → gaze forward at ground → at step 4, turn head to camera → keep stepping, capture",
    spokenScript: "从那边朝我走过来，走慢一点。眼睛看前面。好，走到第四个脚步的时候转头看我一下，别停，继续走。我连拍。走。",
    spokenScriptEn: "Walk toward me from over there, slowly. Eyes forward. Good, when you reach the fourth step, turn to look at me, don't stop, keep walking. I'll burst. Go.",
    expression: "嘴巴自然笑，像边走边笑；眼神转头瞬间看镜头，自然；整体表情被抓拍的自然瞬间",
    expressionEn: "Natural smile, like smiling while walking; eyes turn to camera in the moment, natural; overall candid natural moment",
    avoid: "别走太快，步伐放慢；转头自然，别甩头；不看镜头走路的时候也别低头看地",
    avoidEn: "Don't walk too fast, slow pace; turn naturally, no whip; when not looking at camera while walking, don't look down at ground",
    templateId: "walk-looking-back",
    facing: "3/4 right",
  },
  {
    id: "out-7",
    name: "手拿帽子/花束挡脸",
    nameEn: "Hat Hide Playful",
    scene: "outdoor-grass",
    framing: "half-body",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "正对镜头站立 → 右手拿帽子/花束举到胸前 → 微微挡住半边脸 → 脸微侧 15° → 俏皮表情看镜头",
    trajectoryEn: "Stand facing camera → right hand holds hat/bouquet at chest → slightly hides half face → face turns 15° → playful look at camera",
    spokenScript: "正对我。拿帽子举到胸前，挡住右边脸一半。脸侧一点点，看我笑。好，俏皮一点。拍了。",
    spokenScriptEn: "Face me. Hold the hat at your chest, hide half of the right face. Turn face a bit, smile at me. Good, be playful. Snap.",
    expression: "嘴巴俏皮笑、抿嘴笑；眼神看镜头，可爱调皮；整体表情活泼、俏皮、甜美",
    expressionEn: "Playful smile, pursed smile; eyes at camera, cute and mischievous; overall lively, playful, sweet",
    avoid: "帽子别挡完脸，留一只眼睛；不要用力压脸",
    avoidEn: "Don't fully block face, leave one eye visible; don't press the face",
    templateId: "stand-3q-right-hand-hip",
    facing: "3/4 right",
  },
  {
    id: "out-8",
    name: "伸懒腰动作",
    nameEn: "Stretch Skyward",
    scene: "outdoor-grass",
    framing: "full-body",
    suitableLights: ["back-light", "front-light"],
    trajectory: "正对镜头站立，双手自然垂放 → 双手举起过头顶 → 十指交叉或分开 → 身体微微后仰 → 闭眼或看天空",
    trajectoryEn: "Stand facing camera, hands naturally down → raise both hands overhead → fingers interlocked or apart → body slightly back → eyes closed or to sky",
    spokenScript: "站直。双手往上举过头顶，伸个懒腰。身体往后仰一点点，闭眼。好，保持，拍了。",
    spokenScriptEn: "Stand straight. Raise both hands overhead, stretch. Lean back a little, close eyes. Good, hold, snap.",
    expression: "嘴巴自然放松，微张；眼神闭眼或看天空；整体表情舒展、放松、治愈感",
    expressionEn: "Mouth relaxed, slightly open; eyes closed or to sky; overall expansive, relaxed, healing",
    avoid: "后仰幅度别太大，微仰就好；手伸直别弯",
    avoidEn: "Don't lean back too much, slight is enough; arms straight, not bent",
    templateId: "pose-arms-open-wide",
    facing: "front",
  },
  {
    id: "out-9",
    name: "背影手摸帽子/头发",
    nameEn: "Back Touch Hat",
    scene: "outdoor-grass",
    framing: "back-view",
    suitableLights: ["front-light", "side-light", "back-light", "side-back-light", "top-light"],
    trajectory: "背对镜头站立 → 右手抬起，手摸帽子边缘或头发 → 头微侧向右下方 → 露出侧脸轮廓和脖子线条 → 定住，不看镜头",
    trajectoryEn: "Stand back to camera → raise right hand, touch hat brim or hair → head slightly right-down → show profile and neck line → freeze, don't look at camera",
    spokenScript: "背对我站。右手抬起来摸帽子边缘，头往右边倒一点，让我看到你侧脸轮廓。别回头。好，拍了。",
    spokenScriptEn: "Stand back to me. Right hand up, touch the hat brim, head tilt right a bit, let me see your profile. Don't turn back. Good, snap.",
    expression: "看不到全脸，露出侧脸轮廓；脖子线条拉长，显气质；整体氛围文艺、有质感",
    expressionEn: "Full face not visible, profile shown; neck line elongated, elegant; overall artistic, textured",
    avoid: "摸帽子的手要自然，别抓太紧；站直别驼背",
    avoidEn: "Hand touching hat should be natural, not gripping; stand straight, no slouch",
    templateId: "stand-touching-hair",
    facing: "back",
  },
];

// ── 姿势-光线匹配规则（每个场景一张表）──
// 来源：知识库第 4.2-4.4 节，扩展到完整 9 光线
export interface PoseLightMatch {
  scene: SceneCategory;
  /** 光线 id → 该场景下适合的姿势 id 列表 */
  matches: Record<string, string[]>;
}

export const POSE_LIGHT_MATCHES: PoseLightMatch[] = [
  {
    scene: "cafe-table",
    matches: {
      "side-light": ["cafe-1", "cafe-2", "cafe-3", "cafe-6", "cafe-8"],
      "front-light": ["cafe-2", "cafe-3", "cafe-5", "cafe-6", "cafe-9"],
      "back-light": ["cafe-4", "cafe-7"],
      "side-back-light": ["cafe-4", "cafe-7"],
      "front-side-light": ["cafe-1", "cafe-2", "cafe-3", "cafe-6", "cafe-8", "cafe-9"],
      "rembrandt-light": ["cafe-1", "cafe-7"],
      "butterfly-light": ["cafe-2", "cafe-3", "cafe-5"],
      "top-light": [],      // 避雷，不推荐
      "bottom-light": [],   // 避雷，不推荐
    },
  },
  {
    scene: "exhibition-bookstore",
    matches: {
      "side-light": ["exh-1", "exh-3", "exh-4", "exh-5", "exh-6", "exh-8", "exh-9"],
      "front-light": ["exh-1", "exh-3", "exh-4", "exh-5", "exh-6", "exh-8", "exh-9"],
      "front-side-light": ["exh-1", "exh-3", "exh-4", "exh-5", "exh-6", "exh-8", "exh-9"],
      "back-light": ["exh-2", "exh-7"],          // 背影不受限
      "side-back-light": ["exh-2", "exh-7"],
      "top-light": ["exh-2", "exh-7"],            // 背影不受限
      "rembrandt-light": ["exh-1", "exh-3", "exh-4", "exh-5"],
      "butterfly-light": ["exh-4", "exh-5", "exh-8"],
      "bottom-light": [],
    },
  },
  {
    scene: "outdoor-grass",
    matches: {
      "back-light": ["out-1", "out-2", "out-5", "out-6", "out-8", "out-9"],
      "side-back-light": ["out-1", "out-2", "out-5", "out-6", "out-8", "out-9"],
      "front-light": ["out-3", "out-4", "out-6", "out-7"],
      "side-light": ["out-3", "out-4", "out-6", "out-7"],
      "front-side-light": ["out-3", "out-4", "out-6", "out-7"],
      "top-light": ["out-4", "out-5", "out-6", "out-7", "out-9"],
      "rembrandt-light": ["out-3", "out-5", "out-6"],
      "butterfly-light": ["out-3", "out-7"],
      "bottom-light": [],
    },
  },
];

// ── 工具函数 ──

/** 按 id 查找姿势 */
export function findPose(id: string): PoseEntry | undefined {
  return POSE_LIBRARY.find((p) => p.id === id);
}

/** 按场景获取姿势列表 */
export function getPosesByScene(scene: SceneCategory): PoseEntry[] {
  return POSE_LIBRARY.filter((p) => p.scene === scene);
}

/** 根据场景 + 光线 id 获取推荐姿势 id 列表 */
export function getMatchedPoseIds(scene: SceneCategory, lightId: string): string[] {
  const match = POSE_LIGHT_MATCHES.find((m) => m.scene === scene);
  if (!match) return [];
  return match.matches[lightId] ?? [];
}

/** 获取光线类型列表（给 AI prompt 用，精简版） */
export function getLightTypesForPrompt(): string {
  return LIGHT_TYPES.map(
    (l, i) =>
      `${i + 1}. id="${l.id}" — ${l.nameEn} (${l.name}) | status: ${l.status} | recognize: ${l.recognizeHint} | advice: ${l.adviceEn}`,
  ).join("\n");
}

/** 获取构图规则列表（给 AI prompt 用） */
export function getCompositionRulesForPrompt(): string {
  return COMPOSITION_RULES.map(
    (r, i) => `${i + 1}. trigger: ${r.trigger} → advice: ${r.advice}`,
  ).join("\n");
}

/** 获取场景类型列表（给 AI prompt 用） */
export function getSceneTypesForPrompt(): string {
  return SCENE_TYPES.map(
    (s, i) =>
      `${i + 1}. id="${s.id}" — ${s.nameEn} (${s.nameCn}) | recognize by: ${s.recognizeHints.join(", ")}`,
  ).join("\n");
}

/**
 * 获取指定场景下所有姿势的精简列表（给 AI prompt 用）
 * 为了控制 prompt 长度，只输出关键字段：id、名、framing、适合光线、facing、templateId、trajectoryEn
 * spokenScript / expression / avoid 等详情由代码端通过 findPose(poseId) 反查
 */
export function getPoseLibraryForPrompt(scene: SceneCategory): string {
  const poses = getPosesByScene(scene);
  return poses
    .map(
      (p, i) =>
        `${i + 1}. id="${p.id}" | ${p.nameEn} | ${p.framing} | lights: ${p.suitableLights.join(",")} | facing: ${p.facing} | templateId: ${p.templateId} | ${p.trajectoryEn}`,
    )
    .join("\n");
}

/**
 * 获取姿势-光线匹配规则（给 AI prompt 用）
 */
export function getPoseLightMatchesForPrompt(): string {
  return POSE_LIGHT_MATCHES.map((m) => {
    const lines = Object.entries(m.matches)
      .filter(([, ids]) => ids.length > 0)
      .map(([lightId, poseIds]) => `  - ${lightId}: ${poseIds.join(", ")}`);
    return `Scene "${m.scene}":\n${lines.join("\n")}`;
  }).join("\n\n");
}
