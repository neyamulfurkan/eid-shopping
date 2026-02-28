// src/lib/siteConfig.ts
import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { SiteConfigMap } from '@/lib/types';

/**
 * Fetches all SiteConfig rows and reduces them to a flat key-value map.
 * Wrapped in unstable_cache with a 30-second TTL and the 'site-config' tag
 * for on-demand invalidation after any write.
 *
 * @returns Flat Record<string, string> of all SiteConfig key-value pairs.
 */
export const getCachedSiteConfig: () => Promise<SiteConfigMap> = unstable_cache(
  async (): Promise<SiteConfigMap> => {
    const rows = await prisma.siteConfig.findMany();
    return rows.reduce<SiteConfigMap>((map, row) => {
      map[row.key] = row.value;
      return map;
    }, {});
  },
  ['site-config'],
  { tags: ['site-config'], revalidate: 30 },
);

/**
 * Upserts a single SiteConfig key-value pair and invalidates the cache.
 *
 * @param key   - Dot-namespaced SiteConfig key (e.g. 'theme.primaryColor').
 * @param value - String value to store; serialise complex values as JSON before passing.
 * @returns     Resolves when the upsert and cache invalidation are complete.
 */
export async function setSiteConfigValue(key: string, value: string): Promise<void> {
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidateTag('site-config');
}

/**
 * Atomically upserts multiple SiteConfig key-value pairs in a single transaction,
 * then invalidates the cache once for all changes.
 *
 * @param entries - Record of dot-namespaced keys to their new string values.
 * @returns       Resolves when the transaction and cache invalidation are complete.
 */
export async function setSiteConfigBatch(entries: Record<string, string>): Promise<void> {
  const pairs = Object.entries(entries);
  if (pairs.length === 0) return;

  const now = new Date();

  const valuePlaceholders = pairs
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3}::timestamptz)`)
    .join(', ');

  const params: (string | Date)[] = [];
  for (const [key, value] of pairs) {
    params.push(key, value, now);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO site_configs (id, key, value, "updatedAt")
     SELECT gen_random_uuid(), t.key, t.value, t.ts
     FROM (VALUES ${valuePlaceholders}) AS t(key, value, ts)
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"`,
    ...params,
  );

  revalidateTag('site-config');
}