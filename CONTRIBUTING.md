# 贡献指南

感谢你对 dsh-file-upload 项目的关注！

## 项目结构

```
packages/
├── client/ui-file-upload/   # Cordis 客户端 UI 组件
│   └── src/                 # React/TSX 组件
└── extensions/file-upload/  # Cordis 插件扩展
    └── src/                 # TypeScript 插件逻辑
```

## 开发环境

- **运行时：** Node.js 18+
- **包管理：** npm/yarn
- **语言：** TypeScript 5+

## 安全注意事项

本项目处理文件上传功能，修改时请特别注意：

- 文件扩展名白名单校验（防止路径穿越 CWE-22）
- 请求体大小限制（防止 DoS CWE-770）
- multipart 解析的安全性
- 上传文件的存储路径隔离

## 代码规范

- TypeScript 严格模式
- 组件遵循函数式组件 + Hooks 模式
- 提交前运行 `npm run build` 确保编译通过

## 提交 Pull Request

1. Fork 本仓库并创建功能分支
2. 确保 TypeScript 编译通过
3. 如涉及安全相关修改，请在 PR 描述中说明威胁模型
4. 遵循 Conventional Commits 规范提交
