import type { AttendanceViewRecord } from "@/hooks/useAttendanceRecords";
import { formatTimestampWIB } from "@/lib/firebase/attendance";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportAttendancePdfOptions {
  includeIdentity: boolean;
  dateStart?: string;
  dateEnd?: string;
  exportedBy?: string;
}

function calculateDuration(masuk?: string, keluar?: string) {
  if (!masuk || !keluar) {
    return "-";
  }

  const masukTime = new Date(masuk).getTime();
  const keluarTime = new Date(keluar).getTime();

  if (Number.isNaN(masukTime) || Number.isNaN(keluarTime) || keluarTime <= masukTime) {
    return "-";
  }

  const diff = keluarTime - masukTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${minutes}m`;
}

function buildDateRangeText(dateStart?: string, dateEnd?: string) {
  if (dateStart && dateEnd) {
    return `${dateStart} s.d. ${dateEnd}`;
  }
  if (dateStart) {
    return `Mulai ${dateStart}`;
  }
  if (dateEnd) {
    return `Sampai ${dateEnd}`;
  }
  return "Semua tanggal";
}

function formatPresenceTime(value?: string) {
  if (!value || new Date(value).getTime() <= 0) {
    return "-";
  }
  return `${formatTimestampWIB(value)} WIB`;
}

export async function exportAttendancePdf(
  records: AttendanceViewRecord[],
  options: ExportAttendancePdfOptions,
) {
  if (!records.length) {
    throw new Error("Tidak ada data untuk diekspor.");
  }

  const sortedRecords = [...records].sort((left, right) => right.date.localeCompare(left.date));

  const headers = options.includeIdentity
    ? [
        "Tanggal",
        "Nama",
        "Email",
        "Masuk",
        "Keluar",
        "Durasi",
        "Ket. Masuk",
        "Ket. Keluar",
      ]
    : ["Tanggal", "Masuk", "Keluar", "Durasi", "Ket. Masuk", "Ket. Keluar"];

  const bodyRows = sortedRecords.map((record) => {
    if (options.includeIdentity) {
      return [
        record.date,
        record.name || "-",
        record.email || "-",
        formatPresenceTime(record.masuk),
        formatPresenceTime(record.keluar),
        calculateDuration(record.masuk, record.keluar),
        record.keteranganMasuk || "-",
        record.keteranganKeluar || "-",
      ];
    }

    return [
      record.date,
      formatPresenceTime(record.masuk),
      formatPresenceTime(record.keluar),
      calculateDuration(record.masuk, record.keluar),
      record.keteranganMasuk || "-",
      record.keteranganKeluar || "-",
    ];
  });

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Rekap Presensi Magang BBPJB", 24, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Periode: ${buildDateRangeText(options.dateStart, options.dateEnd)}`, 24, 46);
  doc.text(`Total Record: ${records.length}`, 24, 60);
  doc.text(`Diekspor oleh: ${options.exportedBy || "Sistem"}`, 24, 74);

  autoTable(doc, {
    startY: 86,
    head: [headers],
    body: bodyRows,
    margin: { top: 86, right: 24, bottom: 24, left: 24 },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 4,
      valign: "middle",
    },
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const fileSuffix = new Date().toISOString().slice(0, 10);
  doc.save(`rekap-presensi-${fileSuffix}.pdf`);
}
