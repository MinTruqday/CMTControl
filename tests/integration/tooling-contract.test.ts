import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface PackageManifest {
  devDependencies: Record<string, string>;
}

interface PostmanItem {
  item?: PostmanItem[];
  request?: { method?: string };
}

function requests(items: PostmanItem[]): PostmanItem[] {
  return items.flatMap((item) => item.item ? requests(item.item) : [item]);
}

describe('QA tooling contract', () => {
  it('pins the Playwright package to the Docker browser version', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as PackageManifest;
    const dockerfile = readFileSync('Dockerfile', 'utf8');
    const packageVersion = manifest.devDependencies['@playwright/test'];
    const imageVersion = dockerfile.match(/playwright:v([^\s-]+)-noble/)?.[1];

    expect(packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(imageVersion).toBe(packageVersion);
  });

  it('keeps the public Postman collection read-only', () => {
    const collection = JSON.parse(readFileSync('api/postman/QA_Automation.postman_collection.json', 'utf8')) as { item: PostmanItem[] };
    const methods = requests(collection.item).map((item) => item.request?.method);

    expect(methods.length).toBeGreaterThan(0);
    expect(new Set(methods)).toEqual(new Set(['GET']));
  });
});
