import type { AttendanceViewRecord } from "@/hooks/useAttendanceRecords";
import { formatTimestampWIB } from "@/lib/firebase/attendance";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

interface ExportAttendancePdfOptions {
  includeIdentity: boolean;
  dateStart?: string;
  dateEnd?: string;
  exportedBy?: string;
}

interface UserGroup {
  userId: string;
  userName: string;
  userEmail: string;
  records: AttendanceViewRecord[];
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
  return `${hours} jam ${minutes} menit`;
}

function convertToWIB(value?: string) {
  if (!value) {
    return "-";
  }

  const formatted = formatTimestampWIB(value);
  return formatted === "-" ? "-" : formatted;
}

function formatKeterangan(item: AttendanceViewRecord) {
  const masukNote = String(item.keteranganMasuk || "").trim();
  const keluarNote = String(item.keteranganKeluar || "").trim();

  const notes: string[] = [];
  if (masukNote) {
    notes.push(`Masuk: ${masukNote}`);
  }
  if (keluarNote) {
    notes.push(`Keluar: ${keluarNote}`);
  }

  return notes.length ? notes.join("\n") : "-";
}

function getWeekNumber(dateString: string) {
  const date = new Date(dateString);
  return Math.ceil(date.getDate() / 7);
}

function groupByMonthAndWeek(records: AttendanceViewRecord[]) {
  const grouped: Record<string, { sortKey: string; weeks: Record<string, AttendanceViewRecord[]> }> = {};

  for (const record of records) {
    const date = new Date(record.date);
    const monthYear = date.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    const weekNum = String(getWeekNumber(record.date));
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!grouped[monthYear]) {
      grouped[monthYear] = {
        sortKey,
        weeks: {},
      };
    }

    if (!grouped[monthYear].weeks[weekNum]) {
      grouped[monthYear].weeks[weekNum] = [];
    }

    grouped[monthYear].weeks[weekNum].push(record);
  }

  return grouped;
}

function buildUserGroups(records: AttendanceViewRecord[]): UserGroup[] {
  const grouped = new Map<string, UserGroup>();

  for (const record of records) {
    const userKey = record.userId || `${record.name}-${record.email}`;
    if (!grouped.has(userKey)) {
      grouped.set(userKey, {
        userId: record.userId,
        userName: record.name || "-",
        userEmail: record.email || "-",
        records: [],
      });
    }

    const userGroup = grouped.get(userKey);
    if (userGroup) {
      userGroup.records.push(record);
    }
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.userName.localeCompare(right.userName),
  );
}

export async function exportAttendancePdf(
  records: AttendanceViewRecord[],
  options: ExportAttendancePdfOptions,
) {
  if (!records.length) {
    throw new Error("Tidak ada data untuk diekspor.");
  }

  const resolvedPdfMake = pdfMake as unknown as {
    vfs?: Record<string, string>;
    createPdf: (docDefinition: Record<string, unknown>) => {
      download: (fileName: string) => void;
    };
  };

  const resolvedFonts = pdfFonts as unknown as {
    pdfMake?: {
      vfs?: Record<string, string>;
    };
    vfs?: Record<string, string>;
  };

  resolvedPdfMake.vfs = resolvedFonts.pdfMake?.vfs || resolvedFonts.vfs || {};

  const sortedRecords = [...records].sort((left, right) => left.date.localeCompare(right.date));
  const userGroups = buildUserGroups(sortedRecords);
  const content: Record<string, unknown>[] = [];

  userGroups.forEach((userGroup, userIndex) => {
    if (userIndex > 0) {
      content.push({ text: "", pageBreak: "before" });
    }

    const dates = userGroup.records.map((record) => record.date).sort((left, right) =>
      left.localeCompare(right),
    );
    const startDate = dates[0] || "-";
    const endDate = dates[dates.length - 1] || "-";
    const dateRangeText =
      startDate === endDate
        ? `Tanggal: ${startDate}`
        : `Tanggal: ${startDate} s.d. ${endDate}`;

    let totalMinutes = 0;
    for (const item of userGroup.records) {
      if (!item.masuk || !item.keluar) {
        continue;
      }

      const dateIn = new Date(item.masuk);
      const dateOut = new Date(item.keluar);
      const diffMs = dateOut.getTime() - dateIn.getTime();
      if (diffMs > 0) {
        totalMinutes += Math.floor(diffMs / (1000 * 60));
      }
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalDurationText = `Total Jam Kerja: ${totalHours} jam ${remainingMinutes} menit`;

    content.push(
      { text: "Laporan Kehadiran", style: "title", marginBottom: 10 },
      { text: `Nama: ${userGroup.userName}`, style: "sub" },
      { text: `Email: ${userGroup.userEmail}`, style: "sub" },
      { text: dateRangeText, style: "sub" },
      { text: totalDurationText, style: "totalDuration", marginBottom: 15 },
    );

    const groupedData = groupByMonthAndWeek(userGroup.records);
    const sortedMonths = Object.keys(groupedData).sort((left, right) =>
      groupedData[left].sortKey.localeCompare(groupedData[right].sortKey),
    );

    sortedMonths.forEach((monthYear, monthIndex) => {
      if (monthIndex > 0) {
        content.push({ text: "", margin: [0, 10, 0, 0] });
      }

      const monthRecords = Object.values(groupedData[monthYear].weeks).flat();
      let monthTotalMinutes = 0;
      for (const item of monthRecords) {
        if (!item.masuk || !item.keluar) {
          continue;
        }

        const dateIn = new Date(item.masuk);
        const dateOut = new Date(item.keluar);
        const diffMs = dateOut.getTime() - dateIn.getTime();
        if (diffMs > 0) {
          monthTotalMinutes += Math.floor(diffMs / (1000 * 60));
        }
      }

      const monthTotalHours = Math.floor(monthTotalMinutes / 60);
      const monthRemainingMinutes = monthTotalMinutes % 60;

      const uniqueDates = [...new Set(monthRecords.map((record) => record.date))];
      const workingDays = uniqueDates.filter((dateValue) => {
        const date = new Date(dateValue);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      });

      let fridays = 0;
      let monToThu = 0;
      for (const dateValue of workingDays) {
        const date = new Date(dateValue);
        if (date.getDay() === 5) {
          fridays += 1;
        } else {
          monToThu += 1;
        }
      }

      const monthTargetMinutes = monToThu * 8.5 * 60 + fridays * 9 * 60;
      const monthTargetHours = Math.floor(monthTargetMinutes / 60);
      const monthTargetRemaining = Math.floor(monthTargetMinutes % 60);

      content.push(
        {
          text: monthYear,
          style: "monthHeader",
          marginBottom: 3,
        },
        {
          text: [
            { text: `Total: ${monthTotalHours} jam ${monthRemainingMinutes} menit` },
            {
              text: ` / Target: ${monthTargetHours} jam ${monthTargetRemaining} menit`,
              style: "targetText",
            },
          ],
          marginBottom: 8,
        },
      );

      const weeks = groupedData[monthYear].weeks;
      Object.keys(weeks)
        .sort((left, right) => parseInt(left, 10) - parseInt(right, 10))
        .forEach((weekNum) => {
          const weekRecords = [...weeks[weekNum]].sort((left, right) =>
            left.date.localeCompare(right.date),
          );

          let weekTotalMinutes = 0;
          for (const item of weekRecords) {
            if (!item.masuk || !item.keluar) {
              continue;
            }

            const dateIn = new Date(item.masuk);
            const dateOut = new Date(item.keluar);
            const diffMs = dateOut.getTime() - dateIn.getTime();
            if (diffMs > 0) {
              weekTotalMinutes += Math.floor(diffMs / (1000 * 60));
            }
          }

          const weekTotalHours = Math.floor(weekTotalMinutes / 60);
          const weekRemainingMinutes = weekTotalMinutes % 60;

          const weekUniqueDates = [...new Set(weekRecords.map((record) => record.date))];
          const weekWorkingDays = weekUniqueDates.filter((dateValue) => {
            const date = new Date(dateValue);
            const dayOfWeek = date.getDay();
            return dayOfWeek >= 1 && dayOfWeek <= 5;
          });

          let weekFridays = 0;
          let weekMonToThu = 0;
          for (const dateValue of weekWorkingDays) {
            const date = new Date(dateValue);
            if (date.getDay() === 5) {
              weekFridays += 1;
            } else {
              weekMonToThu += 1;
            }
          }

          const weekTargetMinutes = weekMonToThu * 8.5 * 60 + weekFridays * 9 * 60;
          const weekTargetHours = Math.floor(weekTargetMinutes / 60);
          const weekTargetRemaining = Math.floor(weekTargetMinutes % 60);

          content.push(
            {
              text: `Minggu ${weekNum}`,
              style: "weekHeader",
              marginBottom: 3,
            },
            {
              text: [
                { text: `Total: ${weekTotalHours} jam ${weekRemainingMinutes} menit` },
                {
                  text: ` / Target: ${weekTargetHours} jam ${weekTargetRemaining} menit`,
                  style: "targetText",
                },
              ],
              marginBottom: 5,
            },
          );

          const tableBody: Array<Array<string | Record<string, unknown>>> = [
            [
              { text: "Tanggal", style: "tableHeader" },
              { text: "Masuk", style: "tableHeader" },
              { text: "Keluar", style: "tableHeader" },
              { text: "Durasi", style: "tableHeader" },
              { text: "Keterangan", style: "tableHeader" },
            ],
          ];

          weekRecords.forEach((item) => {
            const itemDuration = calculateDuration(item.masuk, item.keluar);

            let itemDurationMinutes = 0;
            if (item.masuk && item.keluar) {
              const dateIn = new Date(item.masuk);
              const dateOut = new Date(item.keluar);
              const diffMs = dateOut.getTime() - dateIn.getTime();
              if (diffMs > 0) {
                itemDurationMinutes = Math.floor(diffMs / (1000 * 60));
              }
            }

            const dayOfWeek = new Date(item.date).getDay();
            const isFriday = dayOfWeek === 5;
            const targetMinutes = isFriday ? 9 * 60 : 8.5 * 60;
            const isDayBelowTarget = itemDurationMinutes < targetMinutes && itemDurationMinutes > 0;

            tableBody.push([
              item.date,
              item.masuk ? `${convertToWIB(item.masuk)} WIB` : "-",
              item.keluar ? `${convertToWIB(item.keluar)} WIB` : "-",
              {
                text: itemDuration,
                color: isDayBelowTarget ? "#dc2626" : "#000000",
              },
              formatKeterangan(item),
            ]);
          });

          tableBody.push([
            {
              text: "Total Minggu",
              bold: true,
              fillColor: "#f9fafb",
            },
            {
              text: "",
              fillColor: "#f9fafb",
            },
            {
              text: "",
              fillColor: "#f9fafb",
            },
            {
              text: `${weekTotalHours} jam ${weekRemainingMinutes} menit`,
              bold: true,
              fillColor: "#f9fafb",
            },
            {
              text: "",
              fillColor: "#f9fafb",
            },
          ]);

          content.push({
            table: {
              headerRows: 1,
              widths: [90, 85, 85, 95, "*"],
              body: tableBody,
            },
            layout: "lightHorizontalLines",
            marginBottom: 10,
          });
        });
    });
  });

  const allDates = userGroups
    .flatMap((group) => group.records.map((record) => record.date))
    .sort((left, right) => left.localeCompare(right));

  const overallStartDate = options.dateStart || allDates[0] || "Unknown";
  const overallEndDate = options.dateEnd || allDates[allDates.length - 1] || "Unknown";

  const documentDefinition = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 50],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      margin: [0, 10],
      fontSize: 9,
    }),
    content,
    styles: {
      title: { fontSize: 16, bold: true },
      sub: { fontSize: 10, marginBottom: 3 },
      totalDuration: { fontSize: 10, marginBottom: 3, bold: true, color: "#2563eb" },
      monthHeader: { fontSize: 14, bold: true, color: "#1f2937" },
      weekHeader: { fontSize: 11, bold: true, color: "#4b5563" },
      targetText: { fontSize: 10, color: "#6b7280" },
      tableHeader: { bold: true, fillColor: "#f3f4f6", fontSize: 10 },
    },
  };

  resolvedPdfMake.createPdf(documentDefinition).download(
    `Laporan-Kehadiran-${userGroups.length}-Users-${overallStartDate}-${overallEndDate}.pdf`,
  );
}
