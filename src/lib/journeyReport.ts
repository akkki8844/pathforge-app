import { jsPDF } from "jspdf";

interface ReportInput {
  scores: {
    overall_score: number;
    academics_score: number;
    activities_score: number;
    leadership_score: number;
    competitions_score: number;
    test_prep_score: number;
  };
  milestones: Array<{ id: string; title: string; phase: string; category: string; priority: string; completed: boolean }>;
  completedMilestones: string[];
  onboardingData: any;
  monthlyFocusTitle?: string | null;
  insights?: Array<{ type: string; title: string; body: string }>;
}

const NAVY = "#0f172a";
const ACCENT = "#2563eb";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG_SOFT = "#f8fafc";

export function generateJourneyPDF(input: ReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin - 30) {
      doc.addPage();
      y = margin;
    }
  };

  const setText = (size: number, color = NAVY, bold = false) => {
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setFont("helvetica", bold ? "bold" : "normal");
  };

  // ── Header bar ─────────────────────────────────────────────────────
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageW, 70, "F");
  setText(20, "#ffffff", true);
  doc.text("Pathforge", margin, 32);
  setText(11, "#cbd5e1");
  doc.text("Journey Progress Report", margin, 50);
  setText(9, "#94a3b8");
  doc.text(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    pageW - margin,
    50,
    { align: "right" }
  );
  y = 100;

  // ── Profile Summary ────────────────────────────────────────────────
  setText(14, NAVY, true);
  doc.text("Student Profile", margin, y);
  y += 6;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  const profile: Array<[string, string]> = [
    ["Intended Major", input.onboardingData?.intended_major || "—"],
    ["Grade", input.onboardingData?.grade || "—"],
    ["Country", input.onboardingData?.country || "—"],
    ["Curriculum", input.onboardingData?.curriculum || "—"],
    ["GPA Range", input.onboardingData?.gpa_range || input.onboardingData?.gpa || "—"],
    ["Test", `${input.onboardingData?.standardized_test_type || "—"} ${input.onboardingData?.standardized_test_score || ""}`.trim()],
  ];

  const colW = (pageW - margin * 2) / 2;
  profile.forEach((row, i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const x = margin + col * colW;
    const ly = y + rowIdx * 18;
    setText(9, MUTED);
    doc.text(row[0].toUpperCase(), x, ly);
    setText(11, NAVY, true);
    doc.text(String(row[1]).slice(0, 40), x, ly + 12);
  });
  y += Math.ceil(profile.length / 2) * 18 + 10;

  const targets = input.onboardingData?.target_universities || [];
  if (targets.length) {
    setText(9, MUTED);
    doc.text("TARGET UNIVERSITIES", margin, y);
    y += 12;
    setText(10, NAVY);
    const txt = targets.slice(0, 6).join(" · ");
    const lines = doc.splitTextToSize(txt, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 12;
  }

  // ── Scores ─────────────────────────────────────────────────────────
  ensureSpace(220);
  setText(14, NAVY, true);
  doc.text("Journey Scores", margin, y);
  y += 6;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Overall score chip
  doc.setFillColor(BG_SOFT);
  doc.roundedRect(margin, y, pageW - margin * 2, 56, 6, 6, "F");
  setText(10, MUTED);
  doc.text("OVERALL SCORE", margin + 16, y + 20);
  setText(28, ACCENT, true);
  doc.text(`${input.scores.overall_score}`, margin + 16, y + 46);
  setText(12, MUTED);
  doc.text("/ 100", margin + 16 + doc.getTextWidth(`${input.scores.overall_score}`) + 6, y + 46);

  const completed = input.milestones.filter((m) => m.completed).length;
  const totalPct = input.milestones.length ? Math.round((completed / input.milestones.length) * 100) : 0;
  setText(10, MUTED);
  doc.text("MILESTONES", pageW - margin - 120, y + 20);
  setText(20, NAVY, true);
  doc.text(`${completed}/${input.milestones.length}`, pageW - margin - 120, y + 44);
  setText(10, ACCENT);
  doc.text(`${totalPct}% complete`, pageW - margin - 16, y + 44, { align: "right" });

  y += 70;

  // Category bars
  const cats: Array<[string, number]> = [
    ["Academics", input.scores.academics_score],
    ["Activities", input.scores.activities_score],
    ["Leadership", input.scores.leadership_score],
    ["Competitions", input.scores.competitions_score],
    ["Test Prep", input.scores.test_prep_score],
  ];
  cats.forEach(([label, val]) => {
    ensureSpace(28);
    setText(10, NAVY, true);
    doc.text(label, margin, y);
    setText(10, MUTED);
    doc.text(`${val}/100`, pageW - margin, y, { align: "right" });
    y += 6;
    doc.setFillColor(BORDER);
    doc.roundedRect(margin, y, pageW - margin * 2, 6, 3, 3, "F");
    doc.setFillColor(ACCENT);
    const w = ((pageW - margin * 2) * val) / 100;
    if (w > 0) doc.roundedRect(margin, y, w, 6, 3, 3, "F");
    y += 18;
  });
  y += 6;

  // ── Monthly Focus ──────────────────────────────────────────────────
  if (input.monthlyFocusTitle) {
    ensureSpace(60);
    setText(14, NAVY, true);
    doc.text("Current Monthly Focus", margin, y);
    y += 6;
    doc.setDrawColor(BORDER);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    doc.setFillColor(ACCENT);
    doc.roundedRect(margin, y, pageW - margin * 2, 36, 6, 6, "F");
    setText(12, "#ffffff", true);
    doc.text(input.monthlyFocusTitle, margin + 14, y + 22);
    y += 50;
  }

  // ── Completed Milestones ───────────────────────────────────────────
  const done = input.milestones.filter((m) => m.completed);
  ensureSpace(40);
  setText(14, NAVY, true);
  doc.text(`Completed Milestones (${done.length})`, margin, y);
  y += 6;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  if (done.length === 0) {
    setText(10, MUTED);
    doc.text("No milestones completed yet — keep going!", margin, y);
    y += 16;
  } else {
    done.forEach((m) => {
      ensureSpace(20);
      // Vector check mark. Drawn rather than typed: the PDF core fonts have no
      // glyph for a check character, so a literal one prints as a blank box.
      doc.setDrawColor(ACCENT);
      doc.setLineWidth(1.4);
      doc.lines([[2.6, 2.8], [5.4, -6.6]], margin + 0.5, y - 3.4);
      doc.setLineWidth(0.2);
      setText(10, NAVY);
      const lines = doc.splitTextToSize(m.title, pageW - margin * 2 - 18);
      doc.text(lines, margin + 14, y);
      y += lines.length * 12 + 4;
    });
  }
  y += 8;

  // ── Top Pending Priorities ─────────────────────────────────────────
  const pending = input.milestones.filter((m) => !m.completed && (m.priority === "critical" || m.priority === "high")).slice(0, 8);
  if (pending.length) {
    ensureSpace(40);
    setText(14, NAVY, true);
    doc.text("Top Pending Priorities", margin, y);
    y += 6;
    doc.setDrawColor(BORDER);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    pending.forEach((m) => {
      ensureSpace(22);
      const dotColor = m.priority === "critical" ? "#dc2626" : "#f59e0b";
      doc.setFillColor(dotColor);
      doc.circle(margin + 4, y - 3, 3, "F");
      setText(10, NAVY);
      const lines = doc.splitTextToSize(`${m.title}  ·  ${m.category}`, pageW - margin * 2 - 18);
      doc.text(lines, margin + 14, y);
      y += lines.length * 12 + 4;
    });
  }

  // ── Footer on every page ───────────────────────────────────────────
  const pageCount = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setText(8, MUTED);
    doc.text(
      `Pathforge Journey Report · Page ${i} of ${pageCount}`,
      margin,
      pageH - 20
    );
    doc.text("pathforge.co.in", pageW - margin, pageH - 20, { align: "right" });
  }

  const filename = `pathforge-journey-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
