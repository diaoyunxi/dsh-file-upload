/**
 * @deepseek-ai/dsh-file-upload — 文件上传插件
 *
 * 提供 HTTP 文件上传端点，接受任意文件类型，保存到 /tmp 目录，
 * 并通过 session 日志通知 AI 文件已上传。
 *
 * @module @deepseek-ai/dsh-file-upload
 */

import { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

// Type-only imports to trigger declaration merging on Context
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-agent-loop'
import type {} from '@deepseek-ai/dsh-session'

/** 上传到 /tmp 的默认目录 */
const DEFAULT_UPLOAD_DIR = '/tmp/dsh-uploads'

/** 最大文件大小（100MB） */
const MAX_FILE_SIZE = 100 * 1024 * 1024

export const name = 'file-upload'
export const inject = ['webServer']

/** 插件配置接口 */
export interface Config {
  /** 上传文件保存目录 */
  uploadDir?: string
  /** 最大文件大小（字节） */
  maxFileSize?: number
}

/** 上传的文件元数据 */
export interface UploadedFile {
  /** 唯一标识符 */
  id: string
  /** 原始文件名 */
  originalName: string
  /** 保存路径 */
  path: string
  /** 文件大小（字节） */
  size: number
  /** MIME 类型 */
  mimeType: string
  /** 上传时间 */
  uploadedAt: string
}

/**
 * 解析 multipart/form-data 请求体
 * @param req - HTTP 请求对象
 * @returns 解析后的字段和文件
 */
function parseMultipartForm(
  req: IncomingMessage,
): Promise<{ fields: Record<string, string>; files: Array<{ field: string; name: string; type: string; data: Buffer }> }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalSize = 0
    const BODY_LIMIT = 200 * 1024 * 1024 // 200MB hard limit to prevent OOM
    let boundary: string | undefined

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length
      if (totalSize > BODY_LIMIT) {
        req.destroy()
        reject(new Error('Request body exceeds size limit'))
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks)
        const contentType = req.headers['content-type'] as string || ''
        const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
        boundary = match ? (match[1] || match[2]) : undefined

        if (!boundary) {
          resolve({ fields: {}, files: [] })
          return
        }

        const fields: Record<string, string> = {}
        const files: Array<{ field: string; name: string; type: string; data: Buffer }> = []

        // 分割边界
        const boundaryBuffer = Buffer.from(`--${boundary}`)
        const parts = body.split(boundaryBuffer)

        for (const part of parts) {
          if (part.length === 0 || part.toString().trim() === '--') continue

          // 解析头部
          const headerEnd = part.indexOf('\r\n\r\n')
          if (headerEnd === -1) continue

          const headers = part.slice(0, headerEnd).toString()
          const content = part.slice(headerEnd + 4)

          // 提取字段名
          const nameMatch = headers.match(/name="([^"]+)"/)
          if (!nameMatch) continue

          const fieldName = nameMatch[1]

          // 检查是否是文件
          const filenameMatch = headers.match(/filename="([^"]+)"/)
          if (filenameMatch) {
            const filename = filenameMatch[1]
            const mimeType = headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]?.trim() || 'application/octet-stream'
            // 移除末尾的 --\r\n
            const fileData = content.slice(0, -4)
            files.push({ field: fieldName, name: filename, type: mimeType, data: fileData })
          } else {
            // 普通表单字段
            const value = content.slice(0, -4).toString()
            fields[fieldName] = value
          }
        }

        resolve({ fields, files })
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

/**
 * 保存上传的文件到指定目录
 * @param ctx - Cordis 上下文
 * @param file - 上传的文件数据
 * @param uploadDir - 目标目录
 * @returns 已上传文件的元数据
 */
export function saveUploadedFile(ctx: Context, file: { name: string; type: string; data: Buffer }, uploadDir: string): UploadedFile {
  // 确保目录存在
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  const fileId = randomUUID()
  // Validate extension: only allow safe extensions, reject executables and scripts
  const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.com', '.cpl', '.dll', '.hta', '.inf',
    '.ins', '.isp', '.jse', '.lnk', '.msc', '.msi', '.msp', '.mst',
    '.pif', '.ps1', '.ps2', '.reg', '.rgs', '.scr', '.sct', '.sh',
    '.shb', '.shs', '.vb', '.vbe', '.vbs', '.ws', '.wsc', '.wsf',
    '.wsh',
  ])
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
  if (BLOCKED_EXTENSIONS.has(extension)) {
    throw new Error(`Blocked file type: ${extension}`)
  }
  const savedPath = join(uploadDir, `${fileId}${extension}`)

  // 写入文件
  writeFileSync(savedPath, file.data)

  const stats = statSync(savedPath)

  const uploadedFile: UploadedFile = {
    id: fileId,
    originalName: file.name,
    path: savedPath,
    size: stats.size,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
  }

  ctx.logger.info(`文件已上传: ${file.name} -> ${savedPath} (${stats.size} bytes)`)
  return uploadedFile
}

/**
 * 列出 /tmp 目录中最近上传的文件
 * @param uploadDir - 上传目录
 * @param limit - 返回数量限制
 * @returns 文件列表
 */
export function listUploadedFiles(uploadDir: string, limit: number = 20): UploadedFile[] {
  if (!existsSync(uploadDir)) {
    return []
  }

  const entries = readdirSync(uploadDir, { withFileTypes: true })
  const files: UploadedFile[] = entries
    .filter(d => d.isFile())
    .map((d) => {
      const stats = statSync(join(uploadDir, d.name))
      return {
        id: d.name,
        originalName: d.name,
        path: join(uploadDir, d.name),
        size: stats.size,
        mimeType: 'application/octet-stream',
        uploadedAt: stats.mtime.toISOString(),
      }
    })
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, limit)

  return files
}

/**
 * 注册文件上传 API 端点
 * @param ctx - Cordis 上下文
 * @param config - 插件配置
 */
export function apply(ctx: Context, config: Config = {}): void {
  const webServer = ctx.webServer as WebServer
  const uploadDir = config.uploadDir || DEFAULT_UPLOAD_DIR
  const maxFileSize = config.maxFileSize || MAX_FILE_SIZE

  // 确保上传目录存在
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }

  // 注册上传端点
  webServer.register({
    kind: 'exact',
    path: '/api/upload',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      // 设置 CORS 头
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (req.method === 'GET') {
        // 列出已上传文件
        const limit = parseInt(req.url?.split('?')[1]?.split('limit=')[1] || '20')
        const files = listUploadedFiles(uploadDir, limit)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ files }))
        return
      }

      if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      // Pre-check Content-Length to reject oversized payloads early,
      // preventing OOM from buffering the entire body before per-file size check.
      const contentLength = parseInt(req.headers['content-length'] || '0', 10)
      if (contentLength > maxFileSize * 2) {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Request body too large' }))
        return
      }

      try {
        const { files } = await parseMultipartForm(req)

        if (files.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'No files uploaded' }))
          return
        }

        const uploadedFiles: UploadedFile[] = []

        for (const file of files) {
          if (file.data.length > maxFileSize) {
            res.writeHead(413, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `File ${file.name} exceeds maximum size` }))
            return
          }

          const uploadedFile = saveUploadedFile(ctx, file, uploadDir)
          uploadedFiles.push(uploadedFile)
        }

        // 通知 AI 文件已上传
        ctx.logger.info(`文件上传通知: ${uploadedFiles.map(f => f.originalName).join(', ')}`)

        // 发送事件到 session 日志
        const notifyMessage = `已上传 ${uploadedFiles.length} 个文件到 ${uploadDir}:\n${uploadedFiles.map(f => `- ${f.originalName} (${f.size} bytes) -> ${f.path}`).join('\n')}\n\nAI 可以决定如何使用这些文件。`

        // 记录到日志
        ctx.emit('file-upload/uploaded', { files: uploadedFiles, message: notifyMessage })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: true,
          files: uploadedFiles,
          message: notifyMessage,
        }))
      } catch (error) {
        ctx.logger.error(`文件上传失败: ${error}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    },
  })

  // 注册列出文件端点
  webServer.register({
    kind: 'exact',
    path: '/api/upload/list',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(200)
        res.end()
        return
      }

      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      try {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const files = listUploadedFiles(uploadDir, limit)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ files }))
      } catch (error) {
        ctx.logger.error(`列出文件失败: ${error}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    },
  })

  ctx.logger.info('文件上传插件已启用，端点: POST /api/upload')
}
