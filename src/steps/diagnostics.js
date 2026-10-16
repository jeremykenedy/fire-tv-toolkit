import { collectDiagnostics, formatDiagnostics } from '../diagnostics.js';
import { print } from '../output.js';

export async function diagnosticsReport(ip) {
  print(formatDiagnostics(await collectDiagnostics(ip)));
}
