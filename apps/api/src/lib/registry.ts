import {
  type RegistryChallenge,
  RegistryChallengeSchema,
  type RegistryMeta,
  RegistryMetaSchema,
} from "@kubeasy/api-schemas/registry";
import { cached, cacheKey, TTL } from "./cache";
import { env } from "./env";

const REGISTRY_URL = env.REGISTRY_URL;

export class RegistryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RegistryError";
  }
}

async function fetchRegistry<T>(
  path: string,
  parse: (v: unknown) => T,
): Promise<T> {
  const url = `${REGISTRY_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (cause) {
    throw new RegistryError(`Registry request failed: ${url}`, { cause });
  }
  if (!res.ok) {
    throw new RegistryError(`Registry returned ${res.status} for ${path}`);
  }
  const json: unknown = await res.json();
  try {
    return parse(json);
  } catch (cause) {
    throw new RegistryError(`Registry response validation failed for ${path}`, {
      cause,
    });
  }
}

export async function listChallenges(): Promise<RegistryChallenge[]> {
  return cached(cacheKey("registry:list"), TTL.PUBLIC, () =>
    fetchRegistry("/challenges", (v) =>
      RegistryChallengeSchema.array().parse(v),
    ),
  );
}

export async function getChallenge(
  slug: string,
): Promise<RegistryChallenge | null> {
  const list = await listChallenges();
  return list.find((c) => c.slug === slug) ?? null;
}

export async function hydrateChallenges(
  slugs: string[],
): Promise<Map<string, RegistryChallenge>> {
  if (slugs.length === 0) return new Map();
  const list = await listChallenges();
  const map = new Map<string, RegistryChallenge>();
  for (const c of list) {
    if (slugs.includes(c.slug)) map.set(c.slug, c);
  }
  return map;
}

export async function getMeta(): Promise<RegistryMeta> {
  return cached(cacheKey("registry:meta"), TTL.STATIC, () =>
    fetchRegistry("/meta", (v) => RegistryMetaSchema.parse(v)),
  );
}

export async function getChallengeYaml(slug: string): Promise<string> {
  const path = `/challenges/${slug}/yaml`;
  const url = `${REGISTRY_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch (cause) {
    throw new RegistryError(`Registry request failed: ${url}`, { cause });
  }
  if (!res.ok) {
    throw new RegistryError(`Registry returned ${res.status} for ${path}`);
  }
  return res.text();
}

export async function getChallengeManifests(slug: string): Promise<Response> {
  const path = `/challenges/${slug}/manifests`;
  const url = `${REGISTRY_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch (cause) {
    throw new RegistryError(`Registry request failed: ${url}`, { cause });
  }
  if (!res.ok) {
    throw new RegistryError(`Registry returned ${res.status} for ${path}`);
  }
  return res;
}
