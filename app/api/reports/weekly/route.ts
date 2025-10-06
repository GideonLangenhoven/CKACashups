import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";
import fs from 'fs';
import path from 'path';

function parseWeek(week: string) {
  // Format: YYYY-Wnn (e.g., 2025-W01)
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error('Invalid week format. Use YYYY-Wnn');
  const year = parseInt(match[1]);
  const weekNum = parseInt(match[2]);

  // Get the first day of the year
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = jan1.getUTCDay();

  // Calculate the start of week 1 (first Monday)
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const week1Start = new Date(Date.UTC(year, 0, 1 + daysToMonday));

  // Calculate the start of the requested week
  const start = new Date(week1Start);
  start.setUTCDate(week1Start.getUTCDate() + (weekNum - 1) * 7);

  // End is 6 days later (Sunday at 23:59:59.999)
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  const format = (searchParams.get('format') || 'pdf').toLowerCase();
  if (!week) return new Response('week required YYYY-Wnn', { status: 400 });

  const { start, end } = parseWeek(week);
  logEvent('report_weekly', { week, format });

  const trips = await prisma.trip.findMany({
    where: { tripDate: { gte: start, lte: end } },
    orderBy: { tripDate: 'asc' },
    include: {
      payments: true,
      discounts: true,
      guides: { include: { guide: true } },
      createdBy: true,
    }
  });

  // Calculate per-guide statistics
  const guideStats = new Map<string, {
    name: string;
    rank: string;
    tripCount: number;
    trips: Array<{ date: string; time: string; cash: string }>;
    totalCash: number;
  }>();

  for (const trip of trips) {
    const tripDate = new Date(trip.tripDate);
    const dateStr = tripDate.toISOString().slice(0, 10);
    const timeStr = tripDate.toISOString().slice(11, 16);
    const cash = parseFloat(trip.payments?.cashReceived?.toString() || '0');

    for (const tg of trip.guides) {
      if (!guideStats.has(tg.guide.id)) {
        guideStats.set(tg.guide.id, {
          name: tg.guide.name,
          rank: tg.guide.rank,
          tripCount: 0,
          trips: [],
          totalCash: 0
        });
      }
      const stats = guideStats.get(tg.guide.id)!;
      stats.tripCount++;
      stats.trips.push({ date: dateStr, time: timeStr, cash: cash.toFixed(2) });
      stats.totalCash += cash;
    }
  }

  if (format === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();

    // Summary sheet
    const summaryWs = wb.addWorksheet('Summary');
    summaryWs.columns = [
      { header: 'Guide Name', key: 'name', width: 20 },
      { header: 'Rank', key: 'rank', width: 15 },
      { header: 'Trip Count', key: 'tripCount', width: 12 },
      { header: 'Total Cash', key: 'totalCash', width: 12 }
    ];

    for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
      summaryWs.addRow({
        name: stats.name,
        rank: stats.rank,
        tripCount: stats.tripCount,
        totalCash: stats.totalCash.toFixed(2)
      });
    }

    // Detail sheet
    const detailWs = wb.addWorksheet('Trip Details');
    detailWs.columns = [
      { header: 'Guide Name', key: 'guideName', width: 20 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Time', key: 'time', width: 8 },
      { header: 'Cash', key: 'cash', width: 12 }
    ];

    for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
      for (const trip of stats.trips) {
        detailWs.addRow({
          guideName: stats.name,
          date: trip.date,
          time: trip.time,
          cash: trip.cash
        });
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    return new Response(Buffer.from(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cashups-${week}.xlsx"`
      }
    });
  }

  // PDF Format
  const { default: PdfPrinter } = await import('pdfmake');
  const fonts = { Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold' } } as any;
  const printer = new (PdfPrinter as any)(fonts);

  // Read logo and convert to base64
  const logoPath = path.join(process.cwd(), 'CKAlogo.png');
  let logoDataUrl = '';
  try {
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Could not read logo:', err);
  }

  const content: any[] = [];

  // Add logo if available
  if (logoDataUrl) {
    content.push({
      image: logoDataUrl,
      width: 100,
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });
  }

  content.push(
    { text: `Weekly Cash Ups Report`, style: 'header', alignment: 'center' },
    { text: `${week} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)})`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 15] }
  );

  // Guide summary table
  const summaryBody: any[] = [
    [
      { text: 'Guide Name', bold: true },
      { text: 'Rank', bold: true },
      { text: 'Trip Count', bold: true },
      { text: 'Total Cash', bold: true }
    ]
  ];

  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    summaryBody.push([
      stats.name,
      stats.rank,
      stats.tripCount.toString(),
      `R ${stats.totalCash.toFixed(2)}`
    ]);
  }

  content.push(
    { text: 'Guide Summary', style: 'sectionHeader', margin: [0, 10, 0, 5] },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: summaryBody
      },
      layout: 'lightHorizontalLines'
    }
  );

  // Detailed trips per guide
  content.push({ text: 'Trip Details by Guide', style: 'sectionHeader', margin: [0, 15, 0, 5], pageBreak: 'before' });

  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    const detailBody: any[] = [
      [
        { text: 'Date', bold: true },
        { text: 'Time', bold: true },
        { text: 'Cash', bold: true }
      ]
    ];

    for (const trip of stats.trips) {
      detailBody.push([trip.date, trip.time, `R ${trip.cash}`]);
    }

    content.push(
      { text: `${stats.name} (${stats.rank}) - ${stats.tripCount} trips`, style: 'guideName', margin: [0, 10, 0, 5] },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*'],
          body: detailBody
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 10]
      }
    );
  }

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
      subheader: { fontSize: 12, margin: [0, 0, 0, 5] },
      sectionHeader: { fontSize: 14, bold: true },
      guideName: { fontSize: 12, bold: true }
    }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    pdfDoc.on('data', (c: Buffer) => chunks.push(c));
    pdfDoc.on('end', () => resolve());
    pdfDoc.end();
  });
  const pdf = Buffer.concat(chunks);

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cashups-${week}.pdf"`
    }
  });
}
