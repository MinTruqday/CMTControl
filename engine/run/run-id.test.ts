import { describe, expect, it } from 'vitest';
import { createRunId } from './run-id.js';

describe('createRunId', () => {
  it('creates a stable timestamp prefix and unique suffix', () => {
    const now = new Date('2026-08-19T03:40:00.000Z');
    const first = createRunId(now);
    const second = createRunId(now);
    expect(first).toMatch(/^RUN-20260819034000-[a-f0-9]{8}$/);
    expect(first).not.toBe(second);
  });
});
