// Preloaded into a child process (through NODE_OPTIONS) so the launcher's
// downloads are served by the stub instead of the network.
import { createHash } from 'node:crypto';
import { FIRE_TV_UI } from '../../src/launcher-registry.js';
import { launcherFetch } from './launcher-fakes.js';
import { iconZip } from './ui-icons-fixture.js';

// Let the child exercise a complete UI installation against its isolated bytes.
FIRE_TV_UI.sha256 = createHash('sha256').update(`pkg:${FIRE_TV_UI.pkg}`).digest('hex');
FIRE_TV_UI.icons = {tag:FIRE_TV_UI.tag,bytes:iconZip().length,sha256:createHash('sha256').update(iconZip()).digest('hex')};

globalThis.fetch = launcherFetch();
