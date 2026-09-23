// Deliberately fictional data. Used only after explicit ?demo=1 opt-in.
import { normalizeContact, normalizeRoom, normalizeSession, dateKey, toDate } from './data'
export const demoEnabled = typeof window !== 'undefined' && (window.__CHATLOG_PREVIEW__ === true || new URLSearchParams(window.location.search).get('demo') === '1')
export const clock = () => typeof window !== 'undefined' && window.__CHATLOG_NOW__ ? new Date(window.__CHATLOG_NOW__) : new Date()
export const assetUrl = name => {
  if (typeof window !== 'undefined' && window.__CHATLOG_ASSETS__?.[name]) return window.__CHATLOG_ASSETS__[name]
  return `${process.env.BASE_URL || '/'}brand/${name}`
}
const people = ['周知意','陈一川','林小满','许亦舟','江望舒','程语','苏南','叶明','陈小禾','陆星野','余弦','顾远','沈予安','宋清','季夏','梁悦','吴晓','方可','唐乐','许晴','顾宁','陈舒','魏澄','白祺']
export const demoContacts = people.map((name,i) => normalizeContact({UserName:`wxid_demo_${i+1}`,NickName:name,Remark:i%3===0?name:'',Alias:['zhou_zy','yichuan','lin_m'][i] || `friend_${i+1}`}))
const groups = ['产品设计讨论组','周末出走计划','前端技术交流','一起读书吧','城市漫游俱乐部','项目协作空间','生活里的小事','每周一部电影','开源共建小组']
export const demoRooms = groups.map((name,i)=>normalizeRoom({Name:`demo_room_${i+1}@chatroom`,NickName:name,Owner:people[i],UserCount:[12,8,126,32,46,18,6,21,63][i]}))
const ordered = [demoRooms[0],demoContacts[0],demoRooms[1],demoContacts[1],demoRooms[2],demoContacts[2],...demoRooms.slice(3),...demoContacts.slice(3)]
const previews=['下一版的交互细节，我们明天一起过一下。','周末去看展吗？','照片整理好了，发在这里。','那个方案已经同步到文档里了。','分享一篇很有意思的技术文章。','留白很舒服，期待下一版！']
export const demoSessions = ordered.map((item,i) => {const d=clock();d.setMinutes(d.getMinutes()-i*67);return normalizeSession({id:item.id,name:item.name,lastMessageTime:d.toISOString(),content:previews[i%previews.length],isChatRoom:item.kind==='room'})})
const messages=['大家早上好，昨天讨论的设计方向我整理了一下。整体希望更轻一点，把注意力留给内容。','同意。导航可以更安静，搜索要足够直接。','这里先把聊天记录调整为左右分栏，日期和关键词收进筛选面板。','留白很舒服！这版看起来终于不像后台系统了。','那就按这个方向继续，下午再一起看细节。','这周末一起去看看展览吧，顺便拍拍照片。','项目设计稿已经更新，文档也整理好了。','分享一下今天看到的有趣想法。设计还是要多打磨细节。','照片里有好多值得记录的瞬间。','明天上午一起过一下交互和项目计划？']
export const demoLogs = []
if(demoEnabled)for(let s=0;s<10;s++){
  const session=demoSessions[s]
  for(let day=0;day<90;day++){
    const count=4+Math.round((Math.sin(day*.48)+1)*5)+((day+s*3)%5)
    for(let i=0;i<count;i++){
      const date=clock();date.setDate(date.getDate()-day);date.setHours([8,9,10,11,12,12,13,14,16,18,19,20,20,21,22][(i*3+day+s)%15],(i*7+s*11)%60,0,0)
      let content=messages[(i+day+s)%messages.length], type=1
      const index=day*count+i
      if(index%17===8){content=`![图片](/brand/${['landscape.svg','studio.svg','night.svg','garden.svg'][(s+day)%4]})`;type=3}
      else if(index%31===14){content='![文件](/demo/design-notes.pdf)';type=49}
      else if(index%37===19){content='![语音](/demo/voice-note.wav)';type=34}
      else if(index%43===24){content='![视频](/demo/weekend.mp4)';type=43}
      demoLogs.push({id:`demo_${s}_${day}_${i}`,senderName:i%4===2?'我':people[(i+s)%people.length],senderId:i%4===2?'demo_self':`demo_sender_${(i+s)%people.length}`,isSelf:i%4===2,time:date.toISOString(),content,type,talkerId:session.id,talkerName:session.name,isChatRoom:session.kind==='room'})
    }
  }
}
demoLogs.sort((a,b)=>toDate(b.time)-toDate(a.time))
export async function demoQuery(kind,params={}){
  await new Promise(resolve=>setTimeout(resolve,120))
  if(kind==='contacts')return {data:demoContacts,headers:{}}
  if(kind==='chatrooms')return {data:demoRooms,headers:{}}
  if(kind==='sessions')return {data:demoSessions,headers:{}}
  let logs=demoLogs
  if(params.talker){const talkers=String(params.talker).split(',');logs=logs.filter(l=>talkers.includes(l.talkerId)||talkers.includes(l.talkerName))}
  if(params.keyword)logs=logs.filter(l=>l.content.toLowerCase().includes(String(params.keyword).toLowerCase()))
  if(params.time){const [start,end=start]=String(params.time).split('~');logs=logs.filter(l=>dateKey(l.time)>=start && dateKey(l.time)<=end)}
  const total=logs.length,offset=Number(params.offset)||0,limit=Number(params.limit)||20
  return {data:logs.slice(offset,offset+limit),headers:{'x-total-count':String(total)},total}
}
// Useful in tests, without real names, credentials, or network requests.
export const demoMeta={fictional:true,contactCount:demoContacts.length,groupCount:demoRooms.length,sessionCount:demoSessions.length}
