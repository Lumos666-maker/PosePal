# PosePal 📸

> Before you shoot, meet your AI photographer.

PosePal 是拍照前的 AI 搭子：拍一张现场环境照，AI 就看懂光线与背景，给出适合你的姿势和取景技巧卡片，让每个女生不靠摄影师也能轻松拍出好看的照片。

---

## ✨ 核心功能

### 场景拍照模式

上传一张你所在环境的照片（咖啡厅、美术馆、街道、公园…），PosePal 会：

- **诊断光线**：识别 9 种光线类型（顺光/侧光/逆光/侧逆光/顶光/底光/蝴蝶光/伦勃朗光/前侧光），给出"可拍/调整/避雷"三级状态
- **识别场景**：匹配咖啡厅、看展、户外 3 大场景类别
- **推荐姿势**：从 27 个精选姿势库中按"场景 × 光线"匹配规则选 3 个不同姿势
- **线稿叠加**：将姿势线稿合成叠加到你的原图上，直观预览效果
- **口语化口令**：每个姿势配有朋友能照着念的中文口令，不会拍照的同伴也能执行

### 自拍模式

上传一张自拍，PosePal 会：

- **识别脸型**：圆脸 / 方圆脸 / 长脸 / 菱形脸 → 推荐最佳角度
- **分析肤色**：暖皮 / 冷皮 → 推荐最佳光线
- **判断眼型**：单眼皮 / 双眼皮 / 内双 → 推荐最佳姿势
- **风格建议**：MVP 风格固定为"日常甜美风"

### 其他

- 🌐 **中英文切换**：全站支持中英文双语
- 📐 **构图提示**：框架结构 / 背景杂乱 / 栏杆网格 3 种构图规则
- 🎯 **参照物校准**：用桌椅门窗等真实高度校准线稿大小，避免人物过大

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vite 8 + React 19 + TypeScript |
| 路由/SSR | TanStack Router + TanStack Start |
| 样式 | TailwindCSS 4 |
| UI 组件 | Radix UI |
| AI 模型 | 智谱 GLM-4V-Flash（视觉理解）+ CogView（文生图） |
| 姿态检测 | MediaPipe PoseLandmarker |
| 部署 | Vercel |

---

## 📁 项目结构

```
src/
├── lib/
│   ├── photography-kb.ts          # 摄影知识库（27 姿势 + 9 光线 + 3 场景 + 匹配规则）
│   ├── selfie-knowledge.ts       # 自拍知识库（4 脸型 + 2 肤色 + 3 眼型）
│   ├── analyze-pose.functions.ts # 核心AI分析函数（GLM-4V 调用 + JSON 解析）
│   ├── generate-pose-image.functions.ts # CogView 文生图
│   ├── pose-overlay.ts           # 线稿合成叠加（Canvas + MediaPipe）
│   ├── pose-templates.ts         # 姿势线稿模板注册
│   ├── zhipu-jwt.ts              # 智谱 API JWT 签名
│   ├── zhipu-config.ts           # 智谱 API 配置（环境变量读取）
│   └── i18n.tsx                  # 中英文国际化
├── routes/
│   ├── __root.tsx                # 根布局
│   ├── index.tsx                 # 首页（Hero + About）
│   ├── upload.tsx                # 上传页（场景/自拍模式切换 + 示例场景）
│   ├── analyzing.tsx             # 分析中（加载动画 + 4 步进度）
│   └── results.tsx               # 结果页（线稿叠加 + 诊断信息 + 姿势卡片）
└── styles.css

public/
├── poses/                        # 姿势线稿（白底单人 JPG）
├── scenes/                       # 示例场景（Beach/Cafe/Street/Travel）
└── selfie-refs/                  # 自拍参考图（脸型/风格/光线/样片）

docs/                             # 项目文档（PRD / 知识库 / 自拍模块说明 / 提交文档）
user-guides/                      # 用户指南（部署 / GitHub 推送 / 功能介绍）
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，并填入你的智谱 API Key：

```bash
cp .env.example .env.local
```

```bash
# 智谱 API Key（免费申请：https://bigmodel.cn）
ZHIPU_API_KEY=your_key_here

# 可选：模型名（默认 glm-4v-flash）
ZHIPU_VISION_MODEL=glm-4v-flash

# 可选：DEMO 模式（不调用 AI，用预设数据预览）
DEMO_MODE=false
```

### 3. 启动开发服务器

```bash
npm run dev
```

### 4. 构建

```bash
npm run build
```

---

## 📖 工作原理

```
用户上传照片
    │
    ▼
GLM-4V 视觉分析（JWT 签名 + 重试 + 健壮 JSON 解析）
    │
    ├── 场景模式：识别场景类别 + 光线类型 + 构图规则
    │   → 从 27 姿势库按"场景×光线"匹配规则选 3 个姿势
    │   → 输出 poseId + templateId + layoutBox
    │
    └── 自拍模式：识别脸型 + 肤色 + 眼型
        → 代码硬编码匹配推荐角度/光线/风格
        → 组装 SelfieDiagnosis
    │
    ▼
代码端 normalizeAnalysis 后处理
    ├── 按 poseId 去重
    ├── 从知识库反查 spokenScript / expression / avoid
    └── 钳制 layoutBox 到合法范围
    │
    ▼
前端渲染
    ├── 场景模式：加载姿势线稿 → 合成叠加到原图（参照物校准大小）
    └── 自拍模式：直接展示诊断结果 + 推荐建议
```

---

## 📚 知识库

### 场景姿势库（27 个）

| 场景 | 姿势数 | 典型姿势 |
|------|--------|---------|
| 咖啡厅/餐桌 | 9 | 拿杯看窗外、双手捧杯微笑、托腮看镜头、回眸抓拍… |
| 看展/书店 | 9 | 侧身看展品、背影看展品、回眸看镜头、扶墙看镜头… |
| 户外/草地 | 9 | 逆光侧身回头、张开双臂迎风、侧身看镜头微笑、蹲下摸草地… |

每个姿势包含 6 个字段：动作轨迹 / 口语化口令 / 表情指导 / 避坑提示（中英双语）+ 朝向 / templateId。

### 自拍知识库

- **4 种脸型**：圆脸 / 方圆脸 / 长脸 / 菱形脸
- **2 种肤色**：暖皮 / 冷皮
- **3 种眼型**：单眼皮 / 双眼皮 / 内双
- **7 种自拍光线** + **6 种自拍角度** + **7 条避雷**

---

## 📝 License

MIT

---

Crafted for the ones who want the shot, not the stress. 💗
