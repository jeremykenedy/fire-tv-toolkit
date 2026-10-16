import { streamUrl } from './iptv.js';

export function isPlayerRequest(details, windowId, source) {
  return (
    !!source &&
    details.webContentsId === windowId &&
    details.initiatorOrigin === 'app://toolkit' &&
    ['xhr', 'media'].includes(details.resourceType)
  );
}

export function playerRequestHeaders(headers, source) {
  const output = Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) =>
        ![
          'cookie',
          'authorization',
          'proxy-authorization',
          'origin',
          'referer',
        ].includes(name.toLowerCase()),
    ),
  );
  if (source.userAgent) output['User-Agent'] = source.userAgent;
  if (source.referrer) {
    output.Referer = source.referrer;
    output.Origin = new URL(source.referrer).origin;
  }
  return output;
}

export function playerResponseHeaders(headers) {
  const output = Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => !name.toLowerCase().startsWith('access-control-'),
    ),
  );
  output['Access-Control-Allow-Origin'] = ['*'];
  output['Access-Control-Allow-Headers'] = ['*'];
  output['Access-Control-Allow-Methods'] = ['GET, HEAD, OPTIONS'];
  return output;
}

export function configurePlayerNetwork(webRequest, getWindowId, getSource) {
  const filter = { urls: ['http://*/*', 'https://*/*'] };
  webRequest.onBeforeRequest(filter, (details, callback) => {
    if (details.webContentsId !== getWindowId()) {
      callback({});
      return;
    }
    callback({
      cancel:
        !isPlayerRequest(details, getWindowId(), getSource()) ||
        !streamUrl(details.url),
    });
  });
  webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    callback(
      isPlayerRequest(details, getWindowId(), getSource())
        ? {
            requestHeaders: playerRequestHeaders(
              details.requestHeaders,
              getSource(),
            ),
          }
        : {},
    );
  });
  webRequest.onHeadersReceived(filter, (details, callback) => {
    callback(
      isPlayerRequest(details, getWindowId(), getSource())
        ? {
            responseHeaders: playerResponseHeaders(
              details.responseHeaders || {},
            ),
          }
        : {},
    );
  });
}
