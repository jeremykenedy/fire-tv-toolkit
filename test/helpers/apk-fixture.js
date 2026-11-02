export function manifest({utf8=true,pkg='example.app',version=42,major=0,versionName,minSdk,targetSdk,sdkNamespace='http://schemas.android.com/apk/res/android'}={}) {
  const strings=['manifest','package','versionCode','versionCodeMajor',pkg];
  if (versionName !== undefined) strings.push('versionName', versionName);
  const attributes = [[0,1,3,4],[1,2,16,version],[2,3,16,major]];
  if (versionName !== undefined) attributes.push([3,5,3,6]);
  const sdkAttributes = [];
  let sdkName, namespace;
  if (minSdk !== undefined || targetSdk !== undefined) {
    sdkName = strings.push('uses-sdk') - 1;
    namespace = strings.push(sdkNamespace) - 1;
    for (const [name, value] of [['minSdkVersion', minSdk], ['targetSdkVersion', targetSdk]]) {
      if (value === undefined) continue;
      const index = strings.push(name) - 1;
      sdkAttributes.push([index, typeof value === 'number' ? 16 : 3,
        typeof value === 'number' ? value : strings.push(value) - 1]);
    }
  }
  const stringStart = 28 + strings.length * 4;
  const values=strings.map(value=>{
    const text=Buffer.from(value,utf8?'utf8':'utf16le');
    const prefix=utf8?Buffer.from([value.length,text.length]):Buffer.from([value.length,0]);
    return Buffer.concat([prefix,text,Buffer.alloc(utf8?1:2)]);
  });
  const pool=Buffer.alloc(28+strings.length*4+values.reduce((n,v)=>n+v.length,0));
  pool.writeUInt16LE(1,0);pool.writeUInt16LE(28,2);pool.writeUInt32LE(pool.length,4);
  pool.writeUInt32LE(strings.length,8);pool.writeUInt32LE(utf8?256:0,16);pool.writeUInt32LE(stringStart,20);
  let position=0;
  values.forEach((value,i)=>{pool.writeUInt32LE(position,28+i*4);value.copy(pool,stringStart+position);position+=value.length;});
  const node=Buffer.alloc(36+attributes.length*20);
  node.writeUInt16LE(0x0102,0);node.writeUInt16LE(16,2);node.writeUInt32LE(node.length,4);
  node.writeUInt32LE(0,20);node.writeUInt16LE(20,24);node.writeUInt16LE(20,26);node.writeUInt16LE(attributes.length,28);
  for(const [index,name,type,value] of attributes) {
    const at=36+index*20;node.writeUInt32LE(name,at+4);node.writeUInt32LE(2 ** 32 - 1,at+8);
    node.writeUInt16LE(8,at+12);node.writeUInt8(type,at+15);node.writeUInt32LE(value,at+16);
  }
  const children = [];
  if (sdkName !== undefined) {
    const sdk = Buffer.alloc(36 + sdkAttributes.length * 20);
    sdk.writeUInt16LE(0x0102, 0); sdk.writeUInt16LE(16, 2); sdk.writeUInt32LE(sdk.length, 4);
    sdk.writeUInt32LE(2 ** 32 - 1, 16); sdk.writeUInt32LE(sdkName, 20);
    sdk.writeUInt16LE(20, 24); sdk.writeUInt16LE(20, 26); sdk.writeUInt16LE(sdkAttributes.length, 28);
    for (const [i, [name, type, value]] of sdkAttributes.entries()) {
      const at = 36 + i * 20;
      sdk.writeUInt32LE(namespace, at); sdk.writeUInt32LE(name, at + 4);
      sdk.writeUInt32LE(2 ** 32 - 1, at + 8); sdk.writeUInt16LE(8, at + 12);
      sdk.writeUInt8(type, at + 15); sdk.writeUInt32LE(value, at + 16);
    }
    const end = Buffer.alloc(24);
    end.writeUInt16LE(0x0103, 0); end.writeUInt16LE(16, 2); end.writeUInt32LE(24, 4);
    end.writeUInt32LE(2 ** 32 - 1, 16); end.writeUInt32LE(sdkName, 20);
    children.push(sdk, end);
  }
  const header=Buffer.alloc(8);header.writeUInt16LE(3);header.writeUInt16LE(8,2);
  header.writeUInt32LE(8+pool.length+node.length+children.reduce((sum, child) => sum + child.length, 0),4);
  return Buffer.concat([header,pool,node,...children]);
}

