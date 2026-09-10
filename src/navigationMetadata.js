let metadataPromise;

export function readDocumentMetadata() {
  return {
    title: document.title,
    description: document.head.querySelector('meta[name="description"]')?.content || "",
    url: document.head.querySelector('meta[property="og:url"]')?.content || window.location.href,
  };
}

export async function loadRouteMetadata(pathname) {
  metadataPromise ??= fetch(`${import.meta.env.BASE_URL}data/page-metadata.json`).then(async (response) => {
    if (!response.ok) throw new Error(`Failed to load page metadata: ${response.status}`);
    return response.json();
  });
  const pages = await metadataPromise;
  const metadata = pages[pathname.replace(/\/$/, "")];
  if (!metadata?.title || !metadata?.description || !metadata?.url) {
    throw new Error(`Page metadata unavailable for ${pathname}`);
  }
  return metadata;
}

export function applyRouteMetadata(metadata) {
  document.title = metadata.title;
  for (const [selector, value] of [
    ['meta[name="description"]', metadata.description],
    ['meta[property="og:title"]', metadata.title],
    ['meta[property="og:description"]', metadata.description],
    ['meta[property="og:url"]', metadata.url],
    ['meta[name="twitter:title"]', metadata.title],
    ['meta[name="twitter:description"]', metadata.description],
  ]) {
    const element = document.head.querySelector(selector);
    if (element) element.content = value;
  }
}
