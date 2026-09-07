# Français Learning Web

一个面向中文用户的法语学习网站原型。当前使用 **FastAPI + 原生 HTML/CSS/JavaScript**，刻意保持前后端职责分离，方便未来把 SwiftUI（iOS/macOS）作为新的客户端接入同一套 API。

## 当前功能

- 顶部四栏导航：学习 / 语法 / 拼写 / 设置
- 学习：在同一词书选择器中使用原有双语词书或 CEFR A1–B2 词书；原有词书训练释义，CEFR 词书训练词性
- 拼写：自动使用“学习”中当前选择的词书；原有词书支持中文 / 英文 / 法文提示，CEFR 词书使用遮字补全
- 语法：综合、代词、动词、介词、时态、句式六种模式
- 设置：主题色、重点色、正确卡片色、错误卡片色；浏览器本地持久化
- UI 风格：低圆角、无毛玻璃、无阴影，强调信息层级与清晰边界
- Python API：词书、单词、语法、拼写数据均通过 `/api/...` 暴露
- CEFR 分级数据：导入 FLELex/Beacco 的 A1、A2、B1、B2 共 8,767 个词元，已作为词书接入学习与拼写

## 目录

```text
french-learning-web/
├── app/
│   └── main.py              # FastAPI 服务与 API
├── data/
│   ├── words.json           # 单词与词书数据
│   ├── cefr_words.json      # A1-B2 分级词库（由 FLELex 生成）
│   └── FLELex_LICENSE.md    # 数据来源、许可与引用说明
│   └── grammar.json         # 语法题库
├── static/
│   ├── index.html           # SPA 页面
│   ├── css/styles.css       # 全部界面样式
│   └── js/app.js            # 前端状态、交互、判题、主题设置
├── tests/test_api.py        # API 基础测试
├── requirements.txt
└── README.md
```

## 本地启动

推荐 Python 3.11+。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

浏览器打开：`http://127.0.0.1:8000`

API 文档：`http://127.0.0.1:8000/docs`

## 测试

```bash
pytest -q
```

## API

- `GET /api/books`：词书列表
- `GET /api/words?book=a1-core&limit=20&shuffle=true`：单词学习题
- `GET /api/grammar?mode=mixed&limit=20&shuffle=true`：语法题
- `GET /api/spelling?book=a1-core&limit=12&shuffle=true`：指定词书的拼写训练数据
- `GET /api/cefr/levels`：A1-B2 等级、数量与数据来源
- `GET /api/cefr/words?level=A1&query=etre&tag=VER&page=1&page_size=48`：分级词库检索
- `GET /api/health`：服务健康状态

## CEFR 词库数据

分级词库来自 UCLouvain/CENTAL 的 **FLELex / Beacco with TreeTagger parts of speech**，许可为 **CC BY-NC-SA 4.0**。CEFR 描述语言能力等级，但并不存在唯一的官方固定词汇清单；这些等级是基于法语教学资源推断的教学参考分级。

重新导入官方 TSV：

```bash
python scripts/import_flelex.py
```

详细来源和引用方式见 `data/FLELex_LICENSE.md`。

## 向 iOS / macOS 演进

推荐下一阶段：

1. 将 `data/*.json` 迁移到 SQLite/PostgreSQL，并加入用户、学习进度、错题记录模型。
2. 保持 `/api/...` 为稳定契约，增加 Pydantic response model 与 API 版本前缀，例如 `/api/v1/...`。
3. iOS/macOS 使用 SwiftUI + URLSession 调用同一 API；主题颜色映射到 SwiftUI `Color`。
4. 为“不背单词”式体验加入发音、例句音频、熟悉度、遗忘曲线和 spaced repetition 调度。
5. 增加账号与跨设备同步后，再把 Web 本地 `localStorage` 设置迁移到用户云端设置。

## 拼写模式说明

- 中文提示 → 拼写法语
- 英文提示 → 拼写法语
- 法文提示 → 拼写英文释义

这是当前原型对“中文/英文/法文提示”的实现约定；后续可以把法文提示改为音频提示、首字母提示或中文释义默写。
