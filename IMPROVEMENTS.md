# Spring FES Video - 改进建议文档

## 现有文档

当前仓库已经有这些文档：

- `README.md`
  说明这个仓库的实验背景、Agent 工作流和整体使用方式。
- `architecture.md`
  说明 Spring FES Video 的系统架构、业务流程、数据模型和 API 设计。
- `hello-nextjs/README.md`
  这是 `create-next-app` 默认生成的模板 README，目前和项目实际内容不匹配。
- `AGENTS.md` / `CLAUDE.md`
  说明 AI Agent 在这个仓库内的工作规范。

建议阅读顺序：

1. 先看 `README.md`
2. 再看 `architecture.md`
3. 需要看协作规则时再看 `AGENTS.md` 或 `CLAUDE.md`

## 当前文档缺口

目前最明显的问题不是“完全没有文档”，而是“文档和实际代码已经开始漂移”：

- `hello-nextjs/README.md` 还是默认 Next.js 模板，没有项目自己的启动说明。
- `architecture.md` 顶部模型说明已经落后于代码实现。
  现在代码里已经支持 `zhipu` 和 `minimax` 两个文本 provider，但文档顶部描述还偏旧。
- 环境变量虽然有 `.env.local.example`，但缺一个更直接的“最小可运行配置说明”。
- fork 仓库的 git 工作方式没有单独写清楚。

## 改进优先级

### P0: 补一份真正可用的启动文档

建议新增或替换 `hello-nextjs/README.md`，至少包含：

- 本地启动命令
- 必需环境变量
- 哪些页面在没有 Supabase 时可以打开
- 哪些功能依赖真实 Supabase 和 AI key
- 常见报错排查

目标：

- 新开发者 5 分钟内能把项目跑起来
- 不需要先读完整个 `architecture.md`

### P0: 保持架构文档和代码一致

建议更新 `architecture.md` 的这些内容：

- 文本模型 provider 说明改成当前真实实现
- 区分“代码支持”和“推荐配置”
- 把默认模型、可选环境变量和 base URL 写清楚
- 标出哪些能力是运行时强依赖，哪些只是可选 provider

目标：

- 避免“文档说一种，代码跑另一种”

### P1: 增加本地 Demo Mode 说明或实现

现在项目已经能在没有 Supabase 的情况下打开公开页面，但登录和项目流程仍然依赖真实 Supabase。

建议二选一：

- 方案 A：只写清楚“没有 Supabase 时只能看公开页”
- 方案 B：增加一个受控的 `DEMO_MODE=true`，允许本地演示页面流程

目标：

- 降低第一次体验门槛
- 方便做 UI 验证和演示

### P1: 增加环境配置分层说明

建议把环境变量按用途分成 3 层：

1. 站点必需
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. 文本生成
   `SCENE_TEXT_PROVIDER`
   `ZHIPU_*` / `MINIMAX_*`
3. 图片和视频生成
   `VOLC_*`

目标：

- 让用户知道“先配哪几个值就能先验证哪部分功能”

### P1: 增加 fork 仓库协作说明

这个仓库是 fork 下来的时，建议在文档里单独写一节：

- `origin` 指向自己的仓库时，可以直接提交和推送
- 推送到自己的 fork 不会自动影响上游仓库
- 如果后面要同步上游，再额外加 `upstream`

推荐命令：

```bash
git remote -v
git add .
git commit -m "your message"
git push origin main
```

如果要保留上游同步能力：

```bash
git remote add upstream <upstream-repo-url>
git fetch upstream
```

### P2: 增加测试说明和最小验收清单

建议新增一份简单的 QA 文档，至少写明：

- `npm run lint`
- `npm run build`
- 公开页面检查
- 登录/注册检查
- 创建项目检查
- 分镜/图片/视频生成检查

目标：

- 后续无论是人还是 Agent，都能按统一清单做验收

### P2: 修复 Next.js 文档债

目前仍有一个明确的技术债：

- Next 16 已提示 `middleware.ts` 推荐迁移到 `proxy.ts`

这不影响当前运行，但建议在后续版本中处理，避免未来升级时再补锅。

## 推荐的后续文档结构

如果继续整理，我建议最终收敛为下面这套：

- `README.md`
  仓库总览、实验背景、快速入口
- `docs/setup.md`
  本地启动、环境变量、常见问题
- `docs/architecture.md`
  架构和业务流程
- `docs/testing.md`
  验收流程和测试清单
- `docs/git-workflow.md`
  fork、提交、推送、同步上游

## 当前结论

这个项目“有文档”，但还没有形成一套对普通开发者足够友好的项目文档体系。

最值得优先做的不是继续堆文档数量，而是先把下面 3 件事做扎实：

1. 启动文档
2. 环境变量说明
3. 文档与代码的一致性维护
