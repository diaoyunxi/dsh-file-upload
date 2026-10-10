# dsh-file-upload

> **注意：** 本文档中引用的 `src/`、`api/`、`client/` 目录及 `package.json` 文件属于宿主项目（host project），而非本插件仓库。本仓库仅包含 DSH 插件本身的代码。


DeepSeek Harness 文件上传插件包，包含后端 HTTP 上传服务和前端拖拽上传 UI。

## 插件列表

### 1. 后端插件: @deepseek-ai/dsh-file-upload

- **路径**: `packages/extensions/file-upload/`
- **功能**: 提供 `POST /api/upload` HTTP 接口，接收任意类型文件，保存到 `/tmp/dsh-uploads/`
- **安装**: 在 `cordis.yml` 中添加:
  ```yaml
  - id: file-upload
    name: '@deepseek-ai/dsh-file-upload'
    inject: [webServer]
    config:
      uploadDir: '/tmp/dsh-uploads'
      maxFileSize: 104857600
  ```

### 2. 前端插件: @deepseek-ai/dsh-client-ui-file-upload

- **路径**: `packages/client/ui-file-upload/`
- **功能**: 在对话输入框添加拖拽上传区域，支持任意文件类型
- **安装**: 需要同时修改主项目的以下文件（见下方说明）

## 安装步骤

> **注意**: 步骤 2-5 中引用的文件路径均相对于 **宿主项目**（deepseek-harness）根目录，而非本插件仓库。
> 这些文件（`slots.ts`、`apply.ts`、`cordis.patch.yml`、`package.json`）属于宿主项目的 `ui-conversation` 和 `web-app` 包，
> 本仓库仅包含插件代码，不包含宿主项目源码。

### 1. 复制插件到 deepseek-harness

```bash
# 复制后端插件
cp -r packages/extensions/file-upload /path/to/deepseek-harness/packages/extensions/

# 复制前端插件
cp -r packages/client/ui-file-upload /path/to/deepseek-harness/packages/client/
```

### 2. 修改 slots.ts

文件: `packages/client/ui-conversation/src/client/contract/slots.ts`（位于宿主项目中）

在 `conversation.input.attachments` 之后添加:

```typescript
/** Optional file upload rail: drag-and-drop arbitrary files, uploads to server. */
'conversation.input.files': {
  kind: 'single'
  scope: 'session-maybe'
  owner: FileUploadOwnerProps
}
```

添加 owner props 类型（在 `InputControlOwnerProps` 之后）:

```typescript
/** Owner props for the file upload rail slot. */
export interface FileUploadOwnerProps {
  files: readonly { id: string; file: File; status: string; path?: string }[]
  canAcceptDrop: boolean
  onAddFiles: (files: readonly File[]) => void
  onRemoveFile: (id: string) => void
  maxSizeLabel?: string
}
```

更新 `ComposerBarProps` 类型:

```typescript
export type ComposerBarProps =
  PropsRuntime<'conversation.composer.bar'>
  & PropsRenderSlots<
    'conversation.input.attachments' | 'conversation.input.files' | 'conversation.input.plan' | 'conversation.input.model'
  >
  & InjectFace<ComposerBarInjected>
  & PropsLocale<'conversation'>
```

### 3. 修改 apply.ts

文件: `packages/client/ui-conversation/src/client/apply.ts`

在 `children` 中添加新槽位:

```typescript
children: {
  'conversation.input.attachments': { kind: 'single', scope: 'session-maybe' },
  'conversation.input.files': { kind: 'single', scope: 'session-maybe' },
  'conversation.input.plan': { kind: 'single', scope: 'session' },
  'conversation.input.model': { kind: 'single', scope: 'session' },
},
```

### 4. 修改 cordis.patch.yml

文件: `packages/bundle/web-app/cordis.patch.yml`

添加前端插件注册:

```yaml
- id: ui-file-upload
  name: '@deepseek-ai/dsh-client-ui-file-upload'
```

### 5. 修改 package.json

文件: `packages/bundle/web-app/package.json`

添加依赖:

```json
"@deepseek-ai/dsh-client-ui-file-upload": "workspace:^"
```

### 6. 构建并运行

```bash
cd /path/to/deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## 功能特性

- ✅ 支持任意文件类型上传
- ✅ 拖拽上传到对话输入框
- ✅ 显示上传进度
- ✅ 上传完成后通知 AI（通过 session log）
- ✅ 文件保存到 `/tmp/dsh-uploads/`
- ✅ 默认限制 100MB

## 已知限制

- 前端插件需要修改主项目的 slot 定义
- 仅支持 Web 界面使用
