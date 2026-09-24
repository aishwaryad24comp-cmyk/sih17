// Client-side integrity fingerprinting for project documents.
//
// Why: the whole point of "documents can't be manipulated" is that a
// reviewer can tell, later, whether the bytes behind a document link are
// still the bytes that were originally uploaded. A filename and a
// timestamp alone don't prove that — a fingerprint of the file's actual
// content does. SHA-256 is computed once, at upload time, via the
// browser's built-in Web Crypto API (no library, no server round trip),
// and stored on the document record permanently. Nothing in this app
// ever recomputes or edits a fingerprint after that point.
export async function fingerprintFile(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function shortFingerprint(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
