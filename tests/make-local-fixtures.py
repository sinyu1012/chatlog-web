"""Generate fictional plaintext SQLite snapshots. Never reads real user data."""
import hashlib
import json
import sqlite3
import struct
from pathlib import Path


def build(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    for old in root.glob('*.db'):
        old.unlink()
    contact = sqlite3.connect(root / 'contact.db')
    contact.execute('CREATE TABLE contact(username TEXT,nick_name TEXT,remark TEXT,alias TEXT)')
    contact.executemany('INSERT INTO contact VALUES (?,?,?,?)', [('wxid_alice','林小溪','小溪','alice'),('wxid_self','我','','self'),('demo@chatroom','周末设计俱乐部','','')])
    contact.commit(); contact.close()
    session = sqlite3.connect(root / 'session.db')
    session.execute('CREATE TABLE SessionTable(username TEXT,last_timestamp INTEGER,sort_timestamp INTEGER)')
    session.executemany('INSERT INTO SessionTable VALUES (?,?,?)', [('wxid_alice',1780300000,1780300000),('demo@chatroom',1780290000,1780290000)])
    session.commit(); session.close()
    count = 0
    for shard in range(2):
        db = sqlite3.connect(root / f'message_{shard}.db')
        db.execute('CREATE TABLE Name2Id(user_name TEXT)')
        ids = ['wxid_alice','wxid_self','demo@chatroom'] if shard == 0 else ['demo@chatroom','wxid_alice','wxid_self']
        db.executemany('INSERT INTO Name2Id VALUES (?)', [(name,) for name in ids])
        db.execute('CREATE TABLE SendInfo(chat_name_id INTEGER,msg_local_id INTEGER)')
        for talker in ['wxid_alice','demo@chatroom']:
            table = 'Msg_' + hashlib.md5(talker.encode()).hexdigest()
            db.execute(f'CREATE TABLE "{table}"(local_id INTEGER,server_id INTEGER,sort_seq INTEGER,real_sender_id INTEGER,create_time INTEGER,local_type INTEGER,message_content BLOB,compress_content BLOB,WCDB_CT_message_content INTEGER,WCDB_CT_compress_content INTEGER)')
            n = 26 if talker == 'wxid_alice' else 4
            for i in range(n):
                sender = 'wxid_self' if i % 3 == 0 else 'wxid_alice'
                text = f'这是一条虚构聊天，讨论设计与周末计划。分片 {shard}，记录 {i}。'
                local_type, marker = 1, 0
                if i == 1:
                    text = '中文设计 压缩正文验证'.encode()
                    block = (len(text) << 3) | 1
                    text = b'\x28\xb5\x2f\xfd\x20' + bytes([len(text)]) + block.to_bytes(3,'little') + text
                    marker = 4
                if i == 2:
                    text = b'needs_dictionary'; marker = 2
                if i == 3:
                    local_type = 3; text = '<msg><img md5="0123456789abcdef0123456789abcdef"/></msg>'
                if i == 4:
                    local_type = (57 << 32) | 49; text = '<msg><appmsg><type>57</type><title>引用一段虚构设计讨论</title></appmsg></msg>'
                if i == 5:
                    text = '字面量 设计%_ 不执行通配符'
                if i == 6:
                    text = '<script>window.__unsafe = true</script> 普通文本不执行'
                if i == 25:
                    text = f'跨页专用关键词 春风 第 {shard} 个分片'
                db.execute(f'INSERT INTO "{table}" VALUES (?,?,?,?,?,?,?,?,?,?)', (i+1,9007199254740993+i,1000+i,ids.index(sender)+1,1780230000+shard*10000+i,local_type,text,None,marker,None))
                if sender == 'wxid_self':
                    db.execute('INSERT INTO SendInfo VALUES (?,?)',(ids.index(talker)+1,i+1))
                count += 1
        db.commit(); db.close()
    (root / 'all_keys.json').write_text('{"fixture":"DO_NOT_READ_ME"}')
    (root / 'encrypted.invalid').write_bytes(b'not a SQLite database' * 300)
    from PIL import Image, ImageDraw
    image = Image.new('RGB',(480,280),'#e6eee3')
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((60,40,420,240),radius=25,fill='#547763')
    draw.text((150,125),'FICTIONAL FIXTURE',fill='white')
    image.save(root / '0123456789abcdef0123456789abcdef.png')
    (root / 'manifest.json').write_text(json.dumps({'fictional':True,'messages':count,'shards':2,'unparsed':4},indent=2))
    return {'messages':count,'files':[str(path) for path in sorted(root.glob('*.db'))]}

if __name__ == '__main__':
    import sys
    build(Path(sys.argv[1]))
