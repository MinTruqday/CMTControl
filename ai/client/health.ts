import { config } from '../../config/qa.config.js';

async function main(): Promise<void> {
  if (!config.AI_ANALYSIS_ENABLED) {
    process.stdout.write(`${JSON.stringify({ available: false, reason: 'AI_ANALYSIS_ENABLED is false' })}\n`);
    return;
  }
  if (!config.OLLAMA_BASE_URL || !config.OLLAMA_MODEL) throw new Error('OLLAMA_BASE_URL and OLLAMA_MODEL are required when AI analysis is enabled');
  const response = await fetch(new URL('/api/tags', config.OLLAMA_BASE_URL));
  if (!response.ok) throw new Error(`Ollama health check failed with status ${response.status}`);
  const payload = await response.json() as { models?: Array<{ name?: string }> };
  const available = payload.models?.some((model) => model.name === config.OLLAMA_MODEL || model.name?.startsWith(`${config.OLLAMA_MODEL}:`)) ?? false;
  process.stdout.write(`${JSON.stringify({ available, model: config.OLLAMA_MODEL })}\n`);
  if (!available) process.exitCode = 1;
}

main();
