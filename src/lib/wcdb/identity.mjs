// MD5 matches legacy message table names. It is not used for authentication.
export function md5(value) {
  const input = new TextEncoder().encode(String(value))
  const bytes = new Uint8Array(Math.ceil((input.length+9)/64)*64)
  bytes.set(input); bytes[input.length] = 128
  const view = new DataView(bytes.buffer)
  view.setUint32(bytes.length-8, input.length*8, true)
  view.setUint32(bytes.length-4, Math.floor(input.length/0x20000000), true)
  const shifts = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21]
  let a=0x67452301, b=0xefcdab89, c=0x98badcfe, d=0x10325476
  for (let offset=0; offset<bytes.length; offset+=64) {
    let aa=a, bb=b, cc=c, dd=d
    for (let i=0; i<64; i++) {
      const round=i>>4
      const f=round===0 ? (bb&cc)|(~bb&dd) : round===1 ? (dd&bb)|(~dd&cc) : round===2 ? bb^cc^dd : cc^(bb|~dd)
      const g=round===0 ? i : round===1 ? (5*i+1)%16 : round===2 ? (3*i+5)%16 : (7*i)%16
      const n=(aa+f+Math.floor(Math.abs(Math.sin(i+1))*0x100000000)+view.getUint32(offset+4*g,true))|0
      const shift=shifts[round*4+i%4]
      aa=dd; dd=cc; cc=bb; bb=(bb+((n<<shift)|(n>>>(32-shift))))|0
    }
    a=(a+aa)|0; b=(b+bb)|0; c=(c+cc)|0; d=(d+dd)|0
  }
  return [a,b,c,d].map(n=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,'0')).join('')).join('')
}
