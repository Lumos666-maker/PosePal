# PosePal 自拍模块实施说明文档

> 用途：自拍功能实现的输入说明
> 日期：2026-07-20

---

## 一、功能说明

### 1.1 目标
在现有 PosePal 场景模式的基础上，新增"自拍模式"：用户上传一张自拍人像照，AI 诊断脸型、肤色冷暖、眼型，并推荐适合的拍摄角度、光线和风格。

### 1.2 MVP 范围
- 只做一种风格：**日常甜美风**
- 脸型识别：圆脸/方圆脸、长脸/菱形脸（2 大类先落地）
- 肤色冷暖：暖皮、冷皮
- 眼型：单眼皮、双眼皮、内双

### 1.3 与场景模式的区别

| 维度 | 场景模式（已实现） | 自拍模式（待开发） |
|------|------------------|------------------|
| 输入 | 环境照（无人的咖啡厅、街道等） | 自拍人像照 |
| 分析对象 | 光线、背景、空间结构 | 脸型、肤色、眼型 |
| 输出 | 姿势+站位+相机角度 | 拍摄角度+光线+风格建议 |
| 图示 | AR 人形线稿叠加 | 参考图对照展示 |

---

## 二、数据结构

### 2.1 自拍诊断结果（AI 输出）

```typescript
interface SelfieDiagnosis {
  faceShape: "round" | "square_round" | "long" | "diamond";
  skinTone: "warm" | "cool";
  eyeType: "monolid" | "double_eyelid" | "inner_double";
  bestAngle: string;        // 如 "侧脸45°"
  bestLight: string;        // 如 "前侧光"
  styleSuggestion: string;  // 如 "日常甜美风"
  adjustmentTips: string[]; // 如 ["头发遮一侧下颌", "俯拍15°显瘦"]
}
```

### 2.2 姿势推荐（沿用现有 PoseCard，新增字段）

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| `angle` | string | 推荐角度（如"侧脸45°"） | 自拍专用 |
| `expression` | string | 表情指导（如"微笑不露齿，月牙眼"） | 摄影知识库 §3 |
| `light` | string | 推荐光线（如"前侧光"） | 自拍专用 |
| `avoid` | string | 避坑提示 | 摄影知识库 §3 |

### 2.3 JSON 输出示例

```json
{
  "selfie_diagnosis": {
    "face_shape": "round",
    "skin_tone": "warm",
    "eye_type": "double_eyelid",
    "best_angle": "侧脸45°",
    "best_light": "前侧光",
    "style_suggestion": "日常甜美风",
    "adjustment_tips": [
      "头发遮一侧下颌，显瘦",
      "俯拍15°，显下颌线",
      "脸朝光源方向微转"
    ]
  },
  "poses": [
    {
      "pose_name": "侧脸微笑看窗外",
      "angle": "侧脸45°",
      "expression": "微笑不露齿，月牙眼，下巴微抬10°",
      "light": "前侧光",
      "avoid": "不要瞪眼，眼神柔和放空"
    }
  ]
}
```

---

## 三、关键词库（直接用于 AI 提示词）

### 3.1 脸型识别

```
face_shape:
  round:
    features: [下颌角圆润, 颧骨稍宽, 脸部长宽比接近1:1]
    best_angle: [侧脸45°, 半侧脸, 俯拍15°]
    tips: [头发遮一侧下颌, 侧脸显轮廓, 俯拍显瘦]
  square_round:
    features: [下颌角方中带圆, 颧骨宽, 脸部偏短宽]
    best_angle: [侧脸45°, 俯拍15°]
    tips: [头发遮下颌角, 侧脸显瘦, 避免正脸平视]
  long:
    features: [额头高, 颧骨突出, 脸部长度明显大于宽度]
    best_angle: [平视正脸, 微侧脸15°]
    tips: [用刘海修饰额头, 碎发遮颧骨, 微笑缩短脸型]
  diamond:
    features: [额头窄, 颧骨突出, 下巴尖]
    best_angle: [平视正脸, 微侧脸15°]
    tips: [碎发遮颧骨, 避免紧贴头皮发型]
```

### 3.2 肤色冷暖

```
skin_tone:
  warm:
    features: [血管偏绿色, 底妆色号偏黄/桃色]
    best_light: [暖光, 夕阳调, 黄金时刻侧逆光]
    avoid_light: [冷白光, 荧光灯]
  cool:
    features: [血管偏蓝紫色, 底妆色号偏粉/象牙]
    best_light: [冷白光, 清冷调, 窗边柔光]
    avoid_light: [强暖黄光, 顶光]
```

### 3.3 眼型

```
eye_type:
  monolid:
    features: [无明显双眼皮褶皱]
    best_pose: [闭眼笑, 不看镜头侧脸, 低头抬眼]
    avoid: [强眼神光直视镜头, 仰头睁眼]
  double_eyelid:
    features: [有明显双眼皮褶皱]
    best_pose: [直视镜头, 强调眼神光, 微笑露齿]
  inner_double:
    features: [内折双眼皮, 睁眼时褶皱不明显]
    best_pose: [微垂眼看镜头, 侧脸45°, 半闭眼慵懒感]
```

### 3.4 自拍光线（从知识库提取，7 种）

```
selfie_light:
  front_side_light:
    status: can_shoot
    effect: 脸3/4受光，显瘦立体
    script: "神仙光线！显瘦又立体"
  side_light:
    status: can_shoot
    effect: 半张脸亮半张暗，电影感
    script: "侧光太高级了！亮面朝镜头"
  front_light:
    status: can_shoot
    effect: 全脸均匀受光，清新日常
    script: "光线均匀柔和！适合清新日常"
  soft_light:
    status: can_shoot
    effect: 无强烈阴影，不挑角度
    script: "柔光不挑角度，适合日系清新风"
  top_light:
    status: avoid
    effect: 眼窝鼻下深阴影，显老显憔悴
    advice: "移半步到窗边，让光从侧面来"
  back_light:
    status: caution
    effect: 发丝发光但脸暗
    advice: "侧身45°面向光源，让脸吃到边缘光"
  side_back_light:
    status: can_shoot
    effect: 发丝发光+轮廓光，氛围感满分
    script: "侧逆光yyds！头发丝发光脸不黑"
```

### 3.5 自拍角度

```
selfie_angle:
  high_15deg:        # 俯拍15°
    for: [round, square_round]
    effect: 显瘦、显下颌线
  eye_level:         # 平视正脸
    for: [long, diamond]
    effect: 自然、不拉长脸型
  side_45deg:        # 侧脸45°
    for: [all]
    effect: 显轮廓、显瘦、有故事感
  half_side_15deg:   # 半侧脸15°
    for: [all]
    effect: 自然、显立体
  look_up_eyes_down: # 低头抬眼
    for: [monolid]
    effect: 俏皮、害羞感、自然抓拍感
  side_chin_up_10:   # 微侧脸+下巴微抬10°
    for: [all]
    effect: 显下颌线、显气质
```

### 3.6 自拍风格

```
selfie_style:
  mvp: daily_sweet
  keywords:
    - 微笑不露齿
    - 月牙眼
    - 自然放松
    - 慵懒温柔
    - 俏皮可爱
```

### 3.7 自拍避雷

```
selfie_avoid:
  - 顶光直射脸 → 移到窗边
  - 强光眯眼 → 闭眼再睁开抓拍
  - 仰拍双下巴 → 改平视或俯拍15°
  - 手掌用力挤脸肉 → 轻托不挤压
  - 正对镜头站 → 侧身45°显薄
  - 瞪眼 → 眼神柔和放空
  - 耸肩 → 肩膀下沉放松
```

---

## 四、参考图使用说明

### 4.1 参考图位置

```
public/selfie-refs/
├── face-shapes/
│   └── face-shape-grid-8-types.jpeg    # 8种脸型对比图（3x3网格）
├── styles/
│   └── style-vibes-grid-6-types.jpeg   # 6种氛围感风格对比图（2x3网格）
├── lighting/
│   └── lighting-types-grid-9-types.png # 9种光线效果对比图（3x3网格，同模特）
├── sample-poses/
│   ├── pose-indoor-chanel-style.jpeg   # 室内优雅穿搭示例
│   ├── pose-wall-front-light.jpeg      # 墙前顺光人像示例
│   └── pose-golden-hour-backlight.jpeg # 黄金时刻侧逆光发丝发光示例
└── sample-scenes/
    ├── scene-cafe-interior.jpeg        # 咖啡厅室内场景
    ├── scene-art-gallery.jpeg          # 美术馆看展场景
    └── scene-forest-path.jpeg          # 户外森林小径场景
```

### 4.2 参考图用途

**这些图是给用户看的，不是给 AI 看的**。

| 使用场景 | 展示哪张图 | 作用 |
|---------|-----------|------|
| 分析出"圆脸" | `face-shapes/face-shape-grid-8-types.jpeg` | 让用户对照确认自己的脸型 |
| 推荐某风格 | `styles/style-vibes-grid-6-types.jpeg` | 让用户看到风格长什么样 |
| 光线分析 | `lighting/lighting-types-grid-9-types.png` | 让用户看到不同光线效果 |
| 推荐角度 | `sample-poses/pose-golden-hour-backlight.jpeg` | 让用户看到推荐角度的实际效果 |

### 4.3 代码引用方式

```tsx
// 在结果页展示参考图
<img src="/selfie-refs/face-shapes/face-shape-grid-8-types.jpeg" alt="8种脸型对比" />
<img src="/selfie-refs/lighting/lighting-types-grid-9-types.png" alt="9种光线效果" />
```

### 4.4 关于"参考图是否需要向量化"的说明

**不需要向量化**。原因：

1. GLM-4V 多模态能力本身就够用，能直接识别脸型/肤色/眼型
2. 参考图的作用是**给用户看**，帮用户理解"推荐的角度长什么样"
3. 图像向量化检索（CLIP）是另一套技术，适用于相似度匹配场景，不适用于这里的分类诊断

**如果后续想提升 AI 判断精度**，可以考虑把参考图作为 few-shot 示例传给 GLM-4V（每次调用多传几张示例图），但 MVP 阶段不需要。

---

## 五、AI 提示词结构建议

### 5.1 系统提示词（给 GLM-4V 用）

```
你是 PosePal 的自拍诊断 AI。用户会上传一张自拍人像照，你需要：

1. 识别脸型（圆脸/方圆脸/长脸/菱形脸）
   - 圆脸：下颌角圆润，颧骨稍宽，脸部长宽比接近1:1
   - 方圆脸：下颌角方中带圆，颧骨宽，脸部偏短宽
   - 长脸：额头高，颧骨突出，脸部长度明显大于宽度
   - 菱形脸：额头窄，颧骨突出，下巴尖

2. 识别肤色冷暖
   - 暖皮：血管偏绿色，底妆色号偏黄/桃色
   - 冷皮：血管偏蓝紫色，底妆色号偏粉/象牙

3. 识别眼型
   - 单眼皮：无明显双眼皮褶皱
   - 双眼皮：有明显双眼皮褶皱
   - 内双：内折双眼皮，睁眼时褶皱不明显

4. 根据识别结果，推荐：
   - best_angle（最佳拍摄角度）
   - best_light（最佳光线）
   - style_suggestion（风格建议，MVP固定为"日常甜美风"）
   - adjustment_tips（调整建议，2-3条）

5. 输出 JSON 格式：
{
  "selfie_diagnosis": {
    "face_shape": "...",
    "skin_tone": "...",
    "eye_type": "...",
    "best_angle": "...",
    "best_light": "...",
    "style_suggestion": "日常甜美风",
    "adjustment_tips": ["...", "..."]
  }
}
```

### 5.2 匹配规则（硬编码，不需要 AI 推理）

识别结果 → 推荐的映射关系**硬编码在代码里**，不让 AI 推理，保证稳定：

```typescript
const FACE_SHAPE_RECOMMENDATIONS = {
  round: {
    bestAngle: "侧脸45°",
    tips: ["头发遮一侧下颌", "俯拍15°显瘦", "脸朝光源微转"]
  },
  square_round: {
    bestAngle: "侧脸45°",
    tips: ["头发遮下颌角", "侧脸显瘦", "避免正脸平视"]
  },
  long: {
    bestAngle: "平视正脸",
    tips: ["用刘海修饰额头", "碎发遮颧骨", "微笑缩短脸型"]
  },
  diamond: {
    bestAngle: "平视正脸",
    tips: ["碎发遮颧骨", "避免紧贴头皮发型"]
  }
};

const SKIN_TONE_RECOMMENDATIONS = {
  warm: {
    bestLight: "前侧光",
    bestLightSource: "黄金时刻侧逆光",
    avoidLight: "冷白光、荧光灯"
  },
  cool: {
    bestLight: "窗边柔光",
    bestLightSource: "冷白光",
    avoidLight: "强暖黄光、顶光"
  }
};

const EYE_TYPE_RECOMMENDATIONS = {
  monolid: {
    bestPose: ["闭眼笑", "不看镜头侧脸", "低头抬眼"],
    avoid: ["强眼神光直视镜头", "仰头睁眼"]
  },
  double_eyelid: {
    bestPose: ["直视镜头", "强调眼神光", "微笑露齿"],
    avoid: []
  },
  inner_double: {
    bestPose: ["微垂眼看镜头", "侧脸45°", "半闭眼慵懒感"],
    avoid: []
  }
};
```

### 5.3 工作流程

```
用户上传自拍
  ↓
GLM-4V 识别（face_shape, skin_tone, eye_type）
  ↓
代码硬编码匹配（脸型→角度，肤色→光线，眼型→姿势）
  ↓
组装 SelfieDiagnosis 输出
  ↓
结果页展示：诊断结果 + 参考图 + 推荐姿势
```

---

## 六、结果页展示建议

### 6.1 布局

```
┌─────────────────────────────────────┐
│  你的自拍诊断                        │
│                                     │
│  脸型：圆脸                          │
│  肤色：暖皮                          │
│  眼型：双眼皮                        │
│                                     │
│  [参考图：8种脸型对比]               │
│  （让用户对照确认）                  │
│                                     │
│  ─────────────────                  │
│                                     │
│  推荐角度：侧脸45°                   │
│  推荐光线：前侧光                    │
│  推荐风格：日常甜美风                │
│                                     │
│  调整建议：                          │
│  • 头发遮一侧下颌，显瘦             │
│  • 俯拍15°，显下颌线                │
│  • 脸朝光源方向微转                 │
│                                     │
│  [参考图：光线效果对比]              │
│  [参考图：推荐角度示例]              │
│                                     │
│  ─────────────────                  │
│                                     │
│  推荐姿势：侧脸微笑看窗外            │
│  表情：微笑不露齿，月牙眼            │
│  避坑：不要瞪眼，眼神柔和放空        │
└─────────────────────────────────────┘
```

### 6.2 交互

- 诊断结果可点击查看参考图（弹窗或侧滑）
- 调整建议每条可点击展开详细说明
- 参考图支持点击放大查看

---

## 七、实施清单

- [ ] 新增 `src/routes/selfie-upload.tsx`（自拍上传页）
- [ ] 新增 `src/routes/selfie-result.tsx`（自拍结果页）
- [ ] 在 `src/lib/analyze-pose.functions.ts` 新增 `analyzeSelfie()` 函数
- [ ] 新增 `src/lib/selfie-knowledge.ts`（硬编码的脸型/肤色/眼型推荐规则）
- [ ] 上传页加"Selfie mode"入口（现有按钮已有，需接通逻辑）
- [ ] 结果页接入参考图展示
- [ ] 测试 GLM-4V 对脸型/肤色/眼型的识别准确度

---

## 八、与现有项目的关系

### 8.1 不影响现有功能
- 场景模式（Scene mode）保持不变
- 现有的 15 个姿势模板图、AR 合成逻辑、摄影知识库都继续使用
- 自拍模式是**新增分支**，不是替换

### 8.2 共用组件
- 上传组件（复用现有 `upload.tsx` 的上传逻辑）
- 分析中页（复用现有 `analyzing.tsx`）
- Logo、品牌视觉（复用现有）
- AI 调用封装（复用 GLM-4V 调用代码，换 prompt）

### 8.3 数据流
```
用户选"Selfie mode" → 上传自拍 → GLM-4V 分析 → 硬编码匹配推荐 → 结果页
```

---

*本文件为实施说明，不修改项目任何现有代码。参考图已放置在 `public/selfie-refs/` 目录。*
