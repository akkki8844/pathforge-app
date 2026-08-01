import jsPDF from "jspdf";

export interface ReportInput {
  studentName: string;
  studentEmail?: string | null;
  grade?: string | null;
  major?: string | null;
  curriculum?: string | null;
  highSchool?: string | null;
  country?: string | null;
  counsellorName: string;
  generatedAt?: Date;

  profileScore: number;
  scores: {
    academics: number;
    activities: number;
    leadership: number;
    competitions: number;
    testPrep: number;
  };

  strengths: string[];
  weaknesses: string[];
  missing: string[];
  recommendations: string[];

  monthlyFocus?: string | null;
  longTermPlan?: string | null;
  focusAreas?: string[];
  targetUniversities?: string[];

  outcomes: {
    courses: number;
    projects: number;
    leadershipRoles: number;
    competitions: number;
  };
}

const PRIMARY: [number, number, number] = [37, 99, 235];   // accent blue
const TEXT: [number, number, number] = [15, 23, 42];       // deep navy
const MUTED: [number, number, number] = [100, 116, 139];

/**
 * Generates a parent-ready student progress report as a styled PDF.
 * Returns the jsPDF instance so the caller can save() or output().
 */
export function buildStudentReportPdf(r: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ---------- Header band ----------
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 88, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Student Progress Report", margin, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const generatedAt = r.generatedAt ?? new Date();
  doc.text(
    `Prepared by ${r.counsellorName} · ${generatedAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`,
    margin,
    66,
  );
  y = 112;

  // ---------- Student card ----------
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(r.studentName, margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const meta = [
    r.major ? `Intended major: ${r.major}` : null,
    r.grade ? `Grade ${r.grade}` : null,
    r.curriculum ?? null,
    r.highSchool ?? null,
    r.country ?? null,
    r.studentEmail ?? null,
  ].filter(Boolean) as string[];
  doc.text(meta.join("  ·  "), margin, y, { maxWidth: contentWidth });
  y += 24;

  // ---------- Profile score ----------
  doc.setDrawColor(...PRIMARY);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 64, 8, 8, "F");
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PROFILE SCORE", margin + 16, y + 22);
  doc.setFontSize(28);
  doc.setTextColor(...PRIMARY);
  doc.text(`${r.profileScore}`, margin + 16, y + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("/ 100", margin + 16 + doc.getTextWidth(`${r.profileScore}`) + 6, y + 50);

  // Mini bars on the right
  const barsX = margin + 200;
  const barsW = contentWidth - 220;
  const dims = [
    { label: "Academics", value: r.scores.academics },
    { label: "Activities", value: r.scores.activities },
    { label: "Leadership", value: r.scores.leadership },
    { label: "Competitions", value: r.scores.competitions },
    { label: "Test prep", value: r.scores.testPrep },
  ];
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  let by = y + 14;
  dims.forEach((d) => {
    doc.text(d.label, barsX, by);
    doc.text(`${d.value}/100`, barsX + barsW, by, { align: "right" });
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(barsX, by + 2, barsW, 4, 2, 2, "F");
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(barsX, by + 2, (barsW * Math.max(0, Math.min(100, d.value))) / 100, 4, 2, 2, "F");
    by += 10;
  });
  y += 80;

  // ---------- Snapshot strip ----------
  ensureSpace(70);
  const cells = [
    { label: "Courses", value: r.outcomes.courses },
    { label: "Projects", value: r.outcomes.projects },
    { label: "Leadership roles", value: r.outcomes.leadershipRoles },
    { label: "Competitions", value: r.outcomes.competitions },
  ];
  const cellW = (contentWidth - 12 * 3) / 4;
  cells.forEach((c, i) => {
    const x = margin + i * (cellW + 12);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cellW, 56, 6, 6, "F");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(c.label.toUpperCase(), x + 12, y + 18);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(c.value), x + 12, y + 42);
  });
  y += 76;

  // ---------- Section helper ----------
  const section = (title: string, items: string[], emptyText: string) => {
    ensureSpace(40);
    doc.setTextColor(...PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    if (items.length === 0) {
      doc.setTextColor(...MUTED);
      doc.text(emptyText, margin, y, { maxWidth: contentWidth });
      y += 16;
    } else {
      items.forEach((it) => {
        const lines = doc.splitTextToSize(`•  ${it}`, contentWidth);
        ensureSpace(lines.length * 12 + 4);
        doc.text(lines, margin, y);
        y += lines.length * 12 + 4;
      });
    }
    y += 8;
  };

  section("Strengths", r.strengths, "No standout strengths captured yet.");
  section("Weaknesses & gaps", [...r.weaknesses, ...r.missing], "No major gaps detected.");
  section("Recommendations", r.recommendations, "No active recommendations — keep momentum.");

  // ---------- Plan ----------
  if (r.monthlyFocus || r.longTermPlan || (r.focusAreas?.length ?? 0) > 0) {
    ensureSpace(40);
    doc.setTextColor(...PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("NEXT STEPS", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);

    if (r.monthlyFocus) {
      doc.setFont("helvetica", "bold");
      doc.text("This month's focus", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(r.monthlyFocus, contentWidth);
      ensureSpace(lines.length * 12 + 8);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 12;
    }
    if (r.longTermPlan) {
      doc.setFont("helvetica", "bold");
      doc.text("Long-term plan", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(r.longTermPlan, contentWidth);
      ensureSpace(lines.length * 12 + 8);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 12;
    }
    if ((r.focusAreas?.length ?? 0) > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("Focus areas", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(r.focusAreas!.join(" · "), contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 12;
    }
  }

  // ---------- Targets ----------
  if ((r.targetUniversities?.length ?? 0) > 0) {
    ensureSpace(40);
    doc.setTextColor(...PRIMARY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TARGET UNIVERSITIES", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    r.targetUniversities!.forEach((u) => {
      ensureSpace(14);
      doc.text(`•  ${u}`, margin, y);
      y += 14;
    });
  }

  // ---------- Footer on every page ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 36, pageWidth - margin, pageHeight - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Pathforge · Counsellor report", margin, pageHeight - 22);
    doc.text(`Page ${i} of ${total}`, pageWidth - margin, pageHeight - 22, { align: "right" });
  }

  return doc;
}

export function downloadStudentReport(input: ReportInput, filename?: string) {
  const doc = buildStudentReportPdf(input);
  const safeName = (input.studentName || "student").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(filename ?? `pathforge-report-${safeName}.pdf`);
}
