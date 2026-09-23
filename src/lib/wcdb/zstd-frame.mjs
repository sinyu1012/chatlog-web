import { LIMITS, fail } from './common.mjs'

// Inspect a single Zstandard frame before permitting bounded decompression.
export function validateZstd(bytes) {
  if (bytes.length<6 || bytes[0]!==0x28 || bytes[1]!==0xb5 || bytes[2]!==0x2f || bytes[3]!==0xfd) fail('ZSTD_FORMAT','不是支持的 Zstd 数据帧')
  const descriptor=bytes[4], single=!!(descriptor&32), sizeFlag=descriptor>>6
  if (descriptor&8) fail('ZSTD_FORMAT','Zstd 保留标记无效')
  let position=5, windowSize=0
  if (!single) { const w=bytes[position++]; windowSize=2**(10+(w>>3))*(1+(w&7)/8) }
  const readNumber=length=>{
    if (position+length>bytes.length) fail('ZSTD_FORMAT','Zstd 数据帧不完整')
    let n=0n
    for (let i=0;i<length;i++) n|=BigInt(bytes[position++])<<BigInt(8*i)
    return n
  }
  if (readNumber([0,1,2,4][descriptor&3])!==0n) fail('DICTIONARY_REQUIRED','需要 Zstd 字典')
  const sizeLength=sizeFlag===0 ? (single?1:0) : [0,2,4,8][sizeFlag]
  let size=readNumber(sizeLength)
  if (sizeFlag===1) size+=256n
  if (sizeLength && size>BigInt(LIMITS.textBytes)) fail('CONTENT_LIMIT','正文解压后超过 1 MiB')
  if (single) windowSize=Number(size)
  if (windowSize>LIMITS.windowBytes) fail('CONTENT_LIMIT','Zstd 窗口超过安全上限')
  let last=false
  while (!last) {
    if (position+3>bytes.length) fail('ZSTD_FORMAT','Zstd 块不完整')
    const header=bytes[position]|(bytes[position+1]<<8)|(bytes[position+2]<<16)
    position+=3; last=!!(header&1)
    const type=(header>>1)&3, length=header>>>3
    if (type===3 || length>128*1024) fail('ZSTD_FORMAT','Zstd 块无效')
    position+=type===1?1:length
    if (position>bytes.length) fail('ZSTD_FORMAT','Zstd 块被截断')
  }
  if (descriptor&4) position+=4
  if (position!==bytes.length) fail('ZSTD_FORMAT','暂不支持拼接或不完整的 Zstd 数据帧')
}
