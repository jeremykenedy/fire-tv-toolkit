import { checkAppUpdates, installAppUpdate } from '../update-releases.js';
import { checkToolkitUpdate, installCliUpdate } from '../self-update.js';
import { menu, BACK, EXIT, promptYN } from '../ui.js';
import { print } from '../output.js';

export function updateLabel(row) {
  if (row.status !== 'checked') return `${row.name}: check unavailable (${row.error})`;
  const state = row.comparison === 0 ? 'matches checked release' : row.comparison < 0 ? 'installed version is newer'
    : row.comparison === null ? 'version names cannot be ordered' : 'update available';
  return `${row.name}: installed ${row.installed}; published ${row.published.tag}; ${state}`;
}

export async function manageUpdates(ip, {choose = menu, confirm = promptYN, write = print,
  checkSelf = checkToolkitUpdate, installSelf = installCliUpdate,
  checkApps = checkAppUpdates, installApp = installAppUpdate} = {}) {
  const choice = await choose({message:'Check and install published updates',choices:[
    {name:'Fire TV Toolkit on this computer',value:'self'},
    {name:`Installed TV app updates at ${ip}`,value:'apps'},
  ]});
  if ([BACK,EXIT].includes(choice)) return;
  if (choice === 'self') {
    const release=await checkSelf();
    write(`Toolkit installed ${release.installed}; published ${release.tag}.`);
    if (release.comparison === 1 && await confirm('Update this Toolkit CLI installation, preserving saved TV configuration?'))
      write((await installSelf(release)).message);
    return;
  }
  const rows=await checkApps(ip);
  for (const row of rows) write(updateLabel(row));
  const available=rows.filter(row=>row.status==='checked'&&(row.comparison===null||row.comparison>0));
  if (!available.length) {write('No verified installable update was selected. Unavailable checks are not up-to-date claims.');return;}
  const selected=await choose({message:'Install one checked update',choices:available.map(row=>({name:updateLabel(row),value:row.id}))});
  const row=available.find(item=>item.id===selected);
  if(row&&await confirm(`Update ${row.name} on ${ip}, retaining its app data?`))write((await installApp(ip,row)).message);
}
