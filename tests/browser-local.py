"""Production WASM/OPFS regression using explicitly fictional SQLite fixtures."""
import importlib.util
import json
import sqlite3
import subprocess
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'images/wcdb'
OUT.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('fixtures',ROOT/'tests/make-local-fixtures.py')
fixtures=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixtures)
checks=[]
def checked(name):
    checks.append(name); print('PASS:',name,flush=True)
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not Path(self.path.split('?')[0]).suffix:self.path='/index.html'
        super().do_GET()
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8780),partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
INIT="""
window.__fixtureFiles=[];
document.addEventListener('change',event=>{if(event.target.type==='file' && event.target.files.length)window.__fixtureFiles=Array.from(event.target.files)},true);
const NativeWorker=window.Worker;
window.Worker=class extends NativeWorker {constructor(url,options){super(url,options);if(options?.name==='chatlog-local-archive')window.__localWorker=this;}};
window.__rpcSequence=1000000;
window.__localRpc=(method,args={})=>new Promise((resolve,reject)=>{
 const id=++window.__rpcSequence,worker=window.__localWorker;
 const timer=setTimeout(()=>reject(new Error('test RPC timed out: '+method)),30000);
 const listen=event=>{if(event.data.id!==id || event.data.event)return;worker.removeEventListener('message',listen);clearTimeout(timer);event.data.error?reject(new Error(event.data.error.message)):resolve(event.data.result)};
 worker.addEventListener('message',listen);worker.postMessage({id,method,args});
});
"""
def rpc(page,method,args=None):
    return page.evaluate('([method,args])=>window.__localRpc(method,args)',[method,args or {}])
try:
  with tempfile.TemporaryDirectory() as temporary, sync_playwright() as p:
    directory=Path(temporary); fixture=fixtures.build(directory)
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1050},timezone_id='Asia/Shanghai',accept_downloads=True)
    context.add_init_script(INIT)
    errors=[]; requests=[]
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('request',lambda request:requests.append((request.method,request.url)))
    page.route('**/api/v1/**',lambda route:route.fulfill(status=200,content_type='application/json',body='[]'))
    try:
      page.goto('http://127.0.0.1:8780/sources')
      expect(page.get_by_role('heading',name='数据来源',exact=True)).to_be_visible()
      page.get_by_label('档案名称',exact=True).fill('演示档案 · 合成 SQLite')
      page.get_by_label('选择多个数据库',exact=True).set_input_files(fixture['files'])
      page.locator('.source-import input[type=checkbox]').nth(0).check()
      page.locator('.source-import input[type=checkbox]').nth(1).check()
      page.get_by_role('button',name='导入本地档案',exact=True).click()
      page.wait_for_function("document.querySelector('.source-metrics') || document.querySelector('.source-error')",timeout=60000)
      assert not page.locator('.source-error').count(),page.locator('body').inner_text()
      expect(page.locator('.source-metrics strong').first).to_have_text('60')
      status=rpc(page,'status'); archive=status['archiveId']
      assert status['report']['messages']==60 and status['report']['unparsed']==4
      checked('real SQLite import: two message shards, contacts, sessions, compression report')
      assert status['report']['lastMessageAt'].startswith('2026-')
      checked('historical archive extent is recorded')
      page.screenshot(path=str(OUT/'sources.png'),full_page=True)
      messages=rpc(page,'chatlog',{'limit':200})
      assert messages['total']==60 and len({item['id'] for item in messages['data']})==60
      assert any(item['serverId']=='9007199254740993' for item in messages['data'])
      checked('composite IDs prevent shard collisions and preserve 64-bit server IDs')
      assert any(item['content']=='中文设计 压缩正文验证' for item in messages['data'])
      assert any(item['isSelf'] for item in messages['data'])
      checked('Zstd content decoded and sender identities mapped per shard')
      assert rpc(page,'chatlog',{'keyword':'春风','limit':20})['total']==2
      checked('two-character Chinese search reaches both shards beyond first page')
      assert rpc(page,'chatlog',{'keyword':'设计%_'})['total']==2
      assert rpc(page,'chatlog',{'keywords':['春风','压缩'],'match':'any'})['total']==6
      assert rpc(page,'chatlog',{'keywords':['中文','压缩'],'match':'all'})['total']==4
      checked('literal wildcard characters and full-index AND/OR filters')
      first=rpc(page,'chatlog',{'limit':20,'offset':0});second=rpc(page,'chatlog',{'limit':20,'offset':20})
      assert not {r['id'] for r in first['data']}.intersection(r['id'] for r in second['data'])
      checked('stable pagination across equal timestamps')
      stats=rpc(page,'statistics',{'days':30})
      assert stats['stats']['total']==60 and stats['stats']['unparsed']==4
      checked('statistics use the complete imported index rather than ten-session sampling')
      for route in ['dashboard','chatlog','analytics','contacts','chatrooms','sessions','media']:
        page.goto('http://127.0.0.1:8780/'+route);page.wait_for_timeout(1200)
        assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1'),route
        assert not page.locator('.state-panel.error').count(),page.locator('body').inner_text()
        if route in ['chatlog','analytics','media']:page.screenshot(path=str(OUT/(route+'.png')),full_page=True)
        checked('local source desktop route: '+route)
      page.goto('http://127.0.0.1:8780/chatlog?keyword=普通文本')
      expect(page.locator('.message-row')).to_have_count(2,timeout=30000)
      assert page.evaluate('window.__unsafe') is None
      checked('HTML-like SQLite message content remains inert visible text')
      page.goto('http://127.0.0.1:8780/chatlog?keyword=春风')
      expect(page.locator('.message-row')).to_have_count(2,timeout=30000)
      checked('chat UI passes reactive query arrays safely to the Worker')
      page.get_by_role('button',name='导出记录',exact=True).click()
      with page.expect_download() as download:page.get_by_role('button',name='下载文件',exact=True).click()
      assert '春风' in Path(download.value.path()).read_text(encoding='utf-8-sig')
      checked('local query exports a real CSV file')
      page.goto('http://127.0.0.1:8780/media')
      expect(page.locator('.local-media-card')).to_have_count(4,timeout=30000)
      page.get_by_label('关联本地附件',exact=True).first.set_input_files(str(directory/'0123456789abcdef0123456789abcdef.png'))
      expect(page.get_by_role('button',name='预览 / 打开',exact=True).first).to_be_visible()
      page.get_by_role('button',name='预览 / 打开',exact=True).first.click()
      expect(page.locator('.local-attachment-preview').first).to_be_visible()
      checked('explicit local attachment association and safe preview')
      requests.clear();page.reload()
      expect(page.locator('.local-media-card')).to_have_count(4,timeout=30000)
      expect(page.get_by_role('button',name='预览 / 打开',exact=True).first).to_be_visible()
      assert not any('/api/v1/' in url or method!='GET' for method,url in requests)
      checked('archive and attachment persistence after reload without backend requests or uploads')
      page.goto('http://127.0.0.1:8780/sources')
      expect(page.locator('.source-metrics strong').first).to_have_text('60')
      result=page.evaluate("""async()=>{try{await window.__localRpc('import',{files:[{file:new File(['invalid bytes'],'invalid.db'),path:'invalid.db'}],name:'invalid',consent:true,snapshotConfirmed:true});return false}catch(e){return true}}""")
      assert result and rpc(page,'status')['archiveId']==archive
      checked('invalid replacement leaves the previous archive intact')
      unknown=directory/'unrelated.db'
      db=sqlite3.connect(unknown);db.execute('CREATE TABLE unrelated(value TEXT)');db.close()
      page.get_by_label('选择多个数据库',exact=True).set_input_files(str(unknown))
      result=page.evaluate("""async()=>{try{await window.__localRpc('import',{files:window.__fixtureFiles.map(file=>({file,path:file.name})),consent:true,snapshotConfirmed:true});return false}catch(e){return e.message.includes('表结构')}}""")
      assert result and rpc(page,'status')['archiveId']==archive
      checked('valid SQLite with an unsupported schema is not treated as empty history')
      page.get_by_label('选择多个数据库',exact=True).set_input_files(fixture['files'])
      result=page.evaluate("""async()=>{const worker=window.__localWorker,id=window.__rpcSequence+1;const cancel=e=>{if(e.data.id===id && e.data.event==='progress'){worker.postMessage({method:'cancel',args:{id}})}};worker.addEventListener('message',cancel);try{await window.__localRpc('import',{files:window.__fixtureFiles.map(file=>({file,path:file.name})),consent:true,snapshotConfirmed:true});return false}catch(e){return e.message.includes('取消')}finally{worker.removeEventListener('message',cancel)}}""")
      assert result and rpc(page,'status')['archiveId']==archive
      checked('cancellation after import progress preserves the published archive')
      result=page.evaluate("""async()=>{try{await window.__localRpc('import',{files:[{file:new File(['db'],'a.db'),path:'a.db'},{file:new File(['wal'],'a.db-wal'),path:'a.db-wal'}],consent:true,snapshotConfirmed:true});return false}catch(e){return e.message.includes('WAL')}}""")
      assert result and rpc(page,'status')['archiveId']==archive
      checked('nonempty WAL blocks import without replacing existing data')
      page.get_by_role('button',name='保存并使用 HTTP',exact=True).click()
      expect(page.locator('.source-option.selected h2')).to_have_text('chatlog HTTP 服务')
      page.goto('http://127.0.0.1:8780/contacts');page.wait_for_timeout(1000)
      assert '小溪' not in page.locator('main').inner_text()
      page.goto('http://127.0.0.1:8780/sources')
      page.get_by_role('button',name='使用本地档案',exact=True).click()
      expect(page.locator('.source-option.selected h2')).to_have_text('本地微信 4.x 数据库')
      assert rpc(page,'status')['archiveId']==archive and rpc(page,'chatlog',{'keyword':'春风'})['total']==2
      checked('HTTP/local switching clears view caches without deleting the local archive')
      page.set_viewport_size({'width':390,'height':844})
      page.wait_for_function("document.querySelector('.sidebar').getBoundingClientRect().right<=1")
      page.screenshot(path=str(OUT/'mobile-sources.png'),full_page=True)
      assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1')
      checked('390px mobile source manager has no horizontal overflow')
      for route in ['dashboard','chatlog','analytics','contacts','chatrooms','sessions','media']:
        page.goto('http://127.0.0.1:8780/'+route);page.wait_for_timeout(1000)
        assert page.locator('body').evaluate('(el)=>el.scrollWidth<=window.innerWidth+1'),route
        assert not page.locator('.state-panel.error').count(),page.locator('body').inner_text()
        checked('local source mobile route: '+route)
      page.goto('http://127.0.0.1:8780/sources')
      expect(page.locator('.source-metrics strong').first).to_have_text('60')
      page.set_viewport_size({'width':1440,'height':1050})
      page.locator('.topbar').get_by_role('button',name='切换深色模式',exact=True).click()
      expect(page.locator('html')).to_have_attribute('data-theme','dark')
      page.screenshot(path=str(OUT/'sources-dark.png'),full_page=True)
      checked('local source manager dark theme')
      page.locator('.source-danger input').check()
      page.get_by_role('button',name='清除本地档案',exact=True).click()
      expect(page.locator('.source-report')).to_have_count(0,timeout=30000)
      assert rpc(page,'status')['ready'] is False
      checked('explicit clear removes the local index and associated attachments')
      assert not errors,errors
      checked('no uncaught browser exceptions')
      (OUT/'manifest.json').write_text(json.dumps({'fictional':True,'renderer':'production dist + actual SQLite WASM + OPFS','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'checks':checks,'browserErrors':errors},ensure_ascii=False,indent=2))
    except Exception:
      page.screenshot(path=str(OUT/'failure.png'),full_page=True)
      print('LOCAL FAILURE PAGE:',page.locator('body').inner_text(),flush=True)
      raise
    finally:browser.close()
finally:server.shutdown()
