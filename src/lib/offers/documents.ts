export type CatalogDocumentFile = {
  title?: string;
  fileName?: string;
  name?: string;
  description?: string;
  fileUrl?: string;
  url?: string;
};

/**
 * Normalize product/service documents JSON: either `{ files: [...] }` or a plain array.
 */
export function getDocumentFiles(documentsJson: unknown): CatalogDocumentFile[] {
  if (documentsJson == null) return [];
  if (Array.isArray(documentsJson)) {
    return documentsJson.filter(Boolean) as CatalogDocumentFile[];
  }
  if (typeof documentsJson === 'object' && documentsJson !== null && 'files' in documentsJson) {
    const files = (documentsJson as { files?: unknown }).files;
    if (Array.isArray(files)) {
      return files.filter(Boolean) as CatalogDocumentFile[];
    }
  }
  return [];
}

export function countDocumentFiles(documentsJson: unknown): number {
  return getDocumentFiles(documentsJson).length;
}
