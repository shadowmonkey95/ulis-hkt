import { isContentImageKey, type ContentImageKey } from './imageKeys';

export { CONTENT_IMAGE_ASPECT, isContentImageKey, type ContentImageKey } from './imageKeys';

/**
 * Bundled content images. JSON content references images by key (e.g. Guide.images[].asset);
 * Metro needs static require() calls, so the key → file mapping lives here (app code only — the
 * server and validation use ./imageKeys). Metro turns each require() into an opaque asset id (number).
 */
const IMAGES: Record<ContentImageKey, number> = {
  'bhxh-tro-cap-om-dau': require('../../assets/guides/bhxh-tro-cap-om-dau.jpg') as number,
};

/** Resolve an image key from content JSON; undefined if the key is unknown. */
export function getContentImage(key: string): number | undefined {
  return isContentImageKey(key) ? IMAGES[key] : undefined;
}
