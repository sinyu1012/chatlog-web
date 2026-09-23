// Bounded literal word frequency; no sentiment or personality inference.
export function createWordCounter() {
  const words=new Map()
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh-CN',{granularity:'word'}):null
  const stop=new Set(['我们','你们','这个','那个','就是','可以','没有','一个','什么','好的','哈哈','今天','明天','然后','现在','谢谢','the','and','this','that','with'])
  let limited=false
  return {
    add(content) {
      const text=content.replace(/https?:\/\/\S+/g,' ')
      const tokens=segmenter?[...segmenter.segment(text)].filter(s=>s.isWordLike).map(s=>s.segment):(text.match(/[\p{L}]{2,16}/gu) || [])
      for (const token of tokens) {
        const word=token.toLowerCase()
        if (word.length<2 || word.length>16 || stop.has(word) || !/\p{L}/u.test(word)) continue
        if (!words.has(word) && words.size>=20000) {limited=true;continue}
        words.set(word,(words.get(word) || 0)+1)
      }
    },
    finish() {return {words:[...words].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,15),wordLimit:limited}}
  }
}
