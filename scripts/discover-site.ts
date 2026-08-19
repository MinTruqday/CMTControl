import { discoverSite } from '../engine/discovery/site.js';

discoverSite().then((result) => {
  process.stdout.write(`${JSON.stringify({ routes: result.routes.length, images: result.images.length, brokenImages: result.brokenImages.length, consoleErrors: result.consoleErrors.length })}\n`);
  if (result.routes.some((route) => route.status < 200 || route.status >= 400) || result.brokenImages.length > 0) process.exitCode = 1;
});
