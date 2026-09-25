/**
 * Environment lookup with a transition fallback for the pre-rename variable
 * names. This is the only place the legacy `GAAS_*` prefix is allowed to
 * appear; remove `LEGACY_PREFIX` handling once the transition window closes.
 */
const PREFIX = "ALTIRS_";
const LEGACY_PREFIX = "GAAS_";

const warned = new Set<string>();

export function readEnv(
  env: NodeJS.ProcessEnv,
  name: `ALTIRS_${string}`,
): string | undefined {
  const current = env[name];
  if (current !== undefined) return current;

  const legacyName = LEGACY_PREFIX + name.slice(PREFIX.length);
  const legacy = env[legacyName];
  if (legacy === undefined) return undefined;

  if (!warned.has(legacyName)) {
    warned.add(legacyName);
    process.stderr.write(
      `[altirs-mcp] ${legacyName} is deprecated and will stop working in a future release; rename it to ${name}.\n`,
    );
  }
  return legacy;
}

/** Test hook: forget which deprecation warnings have already been emitted. */
export function resetEnvWarnings(): void {
  warned.clear();
}
