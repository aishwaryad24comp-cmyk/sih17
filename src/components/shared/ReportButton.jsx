import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { downloadProjectReport } from "../../utils/generateProjectReport";

export default function ReportButton({ project, label = "Download report (PDF)" }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      // Runs synchronously in practice, but wrapped so the button can
      // show a brief "Preparing…" state on larger reports without
      // blocking the rest of the page.
      await Promise.resolve(downloadProjectReport(project));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !project}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border shrink-0"
      style={{ borderColor: colors.accent, color: colors.accent }}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
      {busy ? "Preparing…" : label}
    </button>
  );
}
