import { Decompress } from 'fzstd'
import { LIMITS, fail } from './common.mjs'
import { validateZstd } from './zstd-frame.mjs'

// This is column decompression, not database decryption.
export function decodeColumn(value, marker) {
  try {
    if (value == null || value === '') return { text:'', status:'ok' }
    if (marker != null && (!Number.isInteger(Number(marker)) || Number(marker)<0 || Number(marker)>5)) fail('COMPRESSION_UNKNOWN','未知 WCDB 压缩类型')
    const compression = marker == null ? null : Number(marker)>>1
    if (compression === 1) fail('DICTIONARY_REQUIRED','需要 Zstd 字典')
    let bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
    if (!(bytes instanceof Uint8Array)) fail('CONTENT_TYPE','无法识别的正文字段类型')
    if (bytes.length > LIMITS.textBytes) fail('CONTENT_LIMIT','正文超过 1 MiB')
    const zstd = bytes[0]===0x28 && bytes[1]===0xb5 && bytes[2]===0x2f && bytes[3]===0xfd
    if (compression === 2 || zstd) {
      validateZstd(bytes)
      const chunks = []; let length = 0
      const decoder = new Decompress(chunk => {
        length += chunk.length
        if (length > LIMITS.textBytes) fail('CONTENT_LIMIT','正文解压后超过 1 MiB')
        chunks.push(chunk.slice())
      })
      decoder.push(bytes, true)
      bytes = new Uint8Array(length); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    }
    return { text:new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\0+$/,''), status:'ok' }
  } catch (error) {
    const known=['COMPRESSION_UNKNOWN','DICTIONARY_REQUIRED','CONTENT_TYPE','CONTENT_LIMIT','ZSTD_FORMAT'].includes(error.code)
    return { text:'', status:known ? error.code : 'DECODE_FAILED', reason:known ? error.message : '正文编码或压缩数据无效' }
  }
}
