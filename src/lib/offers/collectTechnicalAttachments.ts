import { prisma } from '@/lib/prisma';
import { getDocumentFiles, type CatalogDocumentFile } from '@/lib/offers/documents';

function sanitizeBaseName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\s-]+/g, '_').trim().slice(0, 100) || 'document';
}

function extFromUrl(url: string): string {
  const path = url.split('?')[0];
  const m = path.match(/\.([a-zA-Z0-9]{1,8})$/);
  return m ? `.${m[1].toLowerCase()}` : '';
}

function extFromMime(ct: string | null): string {
  if (!ct) return '';
  if (ct.includes('pdf')) return '.pdf';
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('msword')) return '.doc';
  if (ct.includes('wordprocessingml')) return '.docx';
  if (ct.includes('sheet')) return '.xlsx';
  return '';
}

async function fetchDocumentAsAttachment(
  doc: CatalogDocumentFile,
  index: number
): Promise<{ filename: string; content: Buffer; contentType?: string } | null> {
  const url = doc.fileUrl || doc.url;
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const ct = res.headers.get('content-type');
    const base =
      sanitizeBaseName(doc.title || doc.fileName || doc.name || `attachment-${index + 1}`);
    let filename = base.includes('.') ? base : `${base}${extFromUrl(url) || extFromMime(ct) || '.bin'}`;
    return { filename, content: buf, contentType: ct || undefined };
  } catch (e) {
    console.warn('[collectTechnicalAttachments] fetch failed', url, e);
    return null;
  }
}

/**
 * Loads technical document files from catalog rows referenced by offer line items
 * (products, services, and nested services/products inside packages).
 */
export async function collectTechnicalDocumentAttachments(offer: {
  items: unknown;
}): Promise<Array<{ filename: string; content: Buffer; contentType?: string }>> {
  const items = (offer.items as any[]) || [];
  const seenUrls = new Set<string>();
  const out: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
  let index = 0;

  async function pushDocsFromJson(documentsJson: unknown) {
    for (const doc of getDocumentFiles(documentsJson)) {
      const url = doc.fileUrl || doc.url;
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      const att = await fetchDocumentAsAttachment(doc, index++);
      if (att) {
        let filename = att.filename;
        const existing = out.filter((a) => a.filename === filename).length;
        if (existing > 0) {
          const dot = filename.lastIndexOf('.');
          const base = dot > 0 ? filename.slice(0, dot) : filename;
          const ext = dot > 0 ? filename.slice(dot) : '';
          filename = `${base}-${existing}${ext}`;
        }
        out.push({ ...att, filename });
      }
    }
  }

  for (const item of items) {
    const type = item?.type;
    const itemId = item?.itemId;
    if (!itemId) continue;

    if (type === 'product') {
      const p = await prisma.product.findUnique({ where: { id: itemId } });
      if (p) await pushDocsFromJson(p.documents);
    } else if (type === 'service') {
      const s = await prisma.service.findUnique({ where: { id: itemId } });
      if (s) await pushDocsFromJson(s.documents);
    } else if (type === 'package') {
      const pkg = await prisma.servicePackage.findUnique({ where: { id: itemId } });
      if (!pkg) continue;
      const sids = ((pkg.services as any[]) || []).map((x) => x?.id).filter(Boolean);
      const pids = ((pkg.products as any[]) || []).map((x) => x?.id).filter(Boolean);
      if (sids.length) {
        const svcs = await prisma.service.findMany({ where: { id: { in: sids } } });
        for (const s of svcs) await pushDocsFromJson(s.documents);
      }
      if (pids.length) {
        const prods = await prisma.product.findMany({ where: { id: { in: pids } } });
        for (const p of prods) await pushDocsFromJson(p.documents);
      }
    }
  }

  return out;
}
