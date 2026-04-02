import type { AttendanceViewRecord } from "@/hooks/useAttendanceRecords";
import { formatTimestampWIB } from "@/lib/firebase/attendance";

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

export async function exportAttendancePdf(
  records: AttendanceViewRecord[],
  options: ExportAttendancePdfOptions,
) {
  if (!records.length) {
    throw new Error("Tidak ada data untuk diekspor.");
  }

  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  const resolvedPdfMake = pdfMake as unknown as {
    vfs?: Record<string, string>;
    createPdf: (docDefinition: Record<string, unknown>) => {
      download: (fileName: string) => void;
    };
  };

  const resolvedFonts = pdfFonts as unknown as {
    pdfMake?: { vfs?: Record<string, string> };
    vfs?: Record<string, string>;
  };

  resolvedPdfMake.vfs = resolvedFonts.pdfMake?.vfs || resolvedFonts.vfs || {};

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
        record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-",
        record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-",
        calculateDuration(record.masuk, record.keluar),
        record.keteranganMasuk || "-",
        record.keteranganKeluar || "-",
      ];
    }

    return [
      record.date,
      record.masuk ? `${formatTimestampWIB(record.masuk)} WIB` : "-",
      record.keluar ? `${formatTimestampWIB(record.keluar)} WIB` : "-",
      calculateDuration(record.masuk, record.keluar),
      record.keteranganMasuk || "-",
      record.keteranganKeluar || "-",
    ];
  });

  const tableBody = [headers, ...bodyRows];
  const dateRangeText = buildDateRangeText(options.dateStart, options.dateEnd);

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    content: [
      { text: "Rekap Presensi Magang BBPJB", style: "title" },
      {
        columns: [
          {
            width: "*",
            text: [
              { text: "Periode: ", bold: true },
              dateRangeText,
            ],
          },
          {
            width: "auto",
            text: [
              { text: "Total Record: ", bold: true },
              String(records.length),
            ],
          },
        ],
        margin: [0, 8, 0, 0],
      },
      {
        text: [
          { text: "Diekspor oleh: ", bold: true },
          options.exportedBy || "Sistem",
        ],
        margin: [0, 2, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: options.includeIdentity
            ? [60, 90, 120, 55, 55, 40, "*", "*"]
            : [70, 70, 70, 45, "*", "*"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    defaultStyle: {
      fontSize: 9,
    },
    styles: {
      title: {
        fontSize: 14,
        bold: true,
      },
    },
  };

  const fileSuffix = new Date().toISOString().slice(0, 10);
  resolvedPdfMake.createPdf(documentDefinition).download(`rekap-presensi-${fileSuffix}.pdf`);
}
