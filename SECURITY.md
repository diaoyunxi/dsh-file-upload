# 安全策略

## 报告安全漏洞

如果你发现了安全漏洞，请通过以下方式报告：

1. **请勿**在公开的 GitHub Issue 中报告安全漏洞
2. 请通过 GitHub 的 [Security Advisories](https://github.com/diaoyunxi/dsh-file-upload/security/advisories/new) 页面提交报告

## 安全范围

以下属于本项目的安全关注点：

- 文件上传路径穿越（CWE-22）
- 请求体大小限制与 DoS 防护（CWE-770）
- 危险文件类型拦截
- multipart 解析安全性
- 客户端组件的 XSS 防护
