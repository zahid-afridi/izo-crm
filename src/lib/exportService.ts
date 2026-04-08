import ExcelJS from 'exceljs';

interface AssignmentForExport {
  assignedDate: Date;
  site: { name: string };
  car?: { name: string; number: string } | null;
  worker: { fullName: string };
}

export async function buildAssignmentWorkbook(assignments: AssignmentForExport[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assignments');

  // Define columns
  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Site Name', key: 'siteName', width: 30 },
    { header: 'Car', key: 'car', width: 20 },
    { header: 'Workers', key: 'workers', width: 40 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  headerRow.height = 20;

  if (assignments.length === 0) {
    sheet.addRow({
      date: '',
      siteName: 'No data found for the selected period',
      car: '',
      workers: '',
    });
    const buf = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buf as unknown as ArrayBuffer);
  }

  // Group by date string + site name
  const groups = new Map<string, {
    date: string;
    siteName: string;
    car: string;
    workerNames: string[];
  }>();

  for (const a of assignments) {
    const d = a.assignedDate;
    const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const key = `${dateStr}__${a.site.name}`;

    if (!groups.has(key)) {
      const carLabel = a.car ? `${a.car.name} (${a.car.number})` : '';
      groups.set(key, { date: dateStr, siteName: a.site.name, car: carLabel, workerNames: [] });
    }
    groups.get(key)!.workerNames.push(a.worker.fullName);
  }

  // Sort by date then site name
  const sorted = Array.from(groups.values()).sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    return dateCmp !== 0 ? dateCmp : a.siteName.localeCompare(b.siteName);
  });

  for (const group of sorted) {
    sheet.addRow({
      date: group.date,
      siteName: group.siteName,
      car: group.car,
      workers: group.workerNames.join(', '),
    });
  }

  const buf = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buf as unknown as ArrayBuffer);
}
