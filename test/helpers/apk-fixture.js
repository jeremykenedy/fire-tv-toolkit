export function manifest({utf8=true,pkg='example.app',version=42,major=0}={}) {
  const strings=['manifest','package','versionCode','versionCodeMajor',pkg];
  const values=strings.map(value=>{
    const text=Buffer.from(value,utf8?'utf8':'utf16le');
    const prefix=utf8?Buffer.from([value.length,text.length]):Buffer.from([value.length,0]);
    return Buffer.concat([prefix,text,Buffer.alloc(utf8?1:2)]);
  });
  const pool=Buffer.alloc(28+strings.length*4+values.reduce((n,v)=>n+v.length,0));
  pool.writeUInt16LE(1,0);pool.writeUInt16LE(28,2);pool.writeUInt32LE(pool.length,4);
  pool.writeUInt32LE(strings.length,8);pool.writeUInt32LE(utf8?256:0,16);pool.writeUInt32LE(48,20);
  let position=0;
  values.forEach((value,i)=>{pool.writeUInt32LE(position,28+i*4);value.copy(pool,48+position);position+=value.length;});
  const node=Buffer.alloc(36+3*20);
  node.writeUInt16LE(0x0102,0);node.writeUInt16LE(16,2);node.writeUInt32LE(node.length,4);
  node.writeUInt32LE(0,20);node.writeUInt16LE(20,24);node.writeUInt16LE(20,26);node.writeUInt16LE(3,28);
  for(const [index,name,type,value] of [[0,1,3,4],[1,2,16,version],[2,3,16,major]]) {
    const at=36+index*20;node.writeUInt32LE(name,at+4);node.writeUInt32LE(2 ** 32 - 1,at+8);
    node.writeUInt16LE(8,at+12);node.writeUInt8(type,at+15);node.writeUInt32LE(value,at+16);
  }
  const header=Buffer.alloc(8);header.writeUInt16LE(3);header.writeUInt16LE(8,2);header.writeUInt32LE(8+pool.length+node.length,4);
  return Buffer.concat([header,pool,node]);
}

