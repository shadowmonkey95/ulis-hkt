/**
 * Keys of the bundled content images, without loading the files. Content validation imports this
 * (not ./assets), so plain Node — the assistant server, jest — can load content without Metro.
 */
export const CONTENT_IMAGE_KEYS = ['bhxh-tro-cap-om-dau'] as const;

export type ContentImageKey = (typeof CONTENT_IMAGE_KEYS)[number];

export function isContentImageKey(key: string): key is ContentImageKey {
  return (CONTENT_IMAGE_KEYS as readonly string[]).includes(key);
}

/** Intrinsic aspect ratios (width / height) so viewers can size images without measuring. */
export const CONTENT_IMAGE_ASPECT: Record<ContentImageKey, number> = {
  'bhxh-tro-cap-om-dau': 2048 / 1448,
};
