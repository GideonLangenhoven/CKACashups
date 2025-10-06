import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendMail";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";
import fs from 'fs';
import path from 'path';

function parseWeek(week: string) {
  const match = week.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error('Invalid week format. Use YYYY-Wnn');
  const year = parseInt(match[1]);
  const weekNum = parseInt(match[2]);

  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfWeek = jan1.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const week1Start = new Date(Date.UTC(year, 0, 1 + daysToMonday));
  const start = new Date(week1Start);
  start.setUTCDate(week1Start.getUTCDate() + (weekNum - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

function getCurrentWeek(): string {
  const now = new Date();
  const jan1 = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const dayOfWeek = jan1.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const week1Start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1 + daysToMonday));

  const diffMs = now.getTime() - week1Start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;

  return `${now.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const week = searchParams.get('week') || getCurrentWeek();
    const { start, end } = parseWeek(week);

  const trips = await prisma.trip.findMany({
    where: { tripDate: { gte: start, lte: end } },
    orderBy: { tripDate: 'asc' },
    include: { payments: true, discounts: true, guides: { include: { guide: true } }, createdBy: true }
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

  // Build PDF with logo
  const { default: PdfPrinter } = await import('pdfmake');
  const fonts = { Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold' } } as any;
  const printer = new (PdfPrinter as any)(fonts);

  const logoPath = path.join(process.cwd(), 'CKAlogo.png');
  let logoDataUrl = '';
  try {
    const logoBuffer = fs.readFileSync(logoPath);
    logoDataUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Could not read logo:', err);
  }

  const content: any[] = [];

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

  const summaryBody: any[] = [
    [{ text: 'Guide Name', bold: true }, { text: 'Rank', bold: true }, { text: 'Trip Count', bold: true }, { text: 'Total Cash', bold: true }]
  ];

  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    summaryBody.push([stats.name, stats.rank, stats.tripCount.toString(), `R ${stats.totalCash.toFixed(2)}`]);
  }

  content.push(
    { text: 'Guide Summary', style: 'sectionHeader', margin: [0, 10, 0, 5] },
    { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'], body: summaryBody }, layout: 'lightHorizontalLines' }
  );

  content.push({ text: 'Trip Details by Guide', style: 'sectionHeader', margin: [0, 15, 0, 5], pageBreak: 'before' });

  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    const detailBody: any[] = [
      [{ text: 'Date', bold: true }, { text: 'Time', bold: true }, { text: 'Cash', bold: true }]
    ];
    for (const trip of stats.trips) {
      detailBody.push([trip.date, trip.time, `R ${trip.cash}`]);
    }
    content.push(
      { text: `${stats.name} (${stats.rank}) - ${stats.tripCount} trips`, style: 'guideName', margin: [0, 10, 0, 5] },
      { table: { headerRows: 1, widths: ['auto', 'auto', '*'], body: detailBody }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 10] }
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
  const pdfChunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    pdfDoc.on('data', (c: Buffer) => pdfChunks.push(c));
    pdfDoc.on('end', () => resolve());
    pdfDoc.end();
  });
  const pdf = Buffer.concat(pdfChunks);

  // Build Excel
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const summaryWs = wb.addWorksheet('Summary');
  summaryWs.columns = [
    { header: 'Guide Name', key: 'name', width: 20 },
    { header: 'Rank', key: 'rank', width: 15 },
    { header: 'Trip Count', key: 'tripCount', width: 12 },
    { header: 'Total Cash', key: 'totalCash', width: 12 }
  ];
  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    summaryWs.addRow({ name: stats.name, rank: stats.rank, tripCount: stats.tripCount, totalCash: stats.totalCash.toFixed(2) });
  }

  const detailWs = wb.addWorksheet('Trip Details');
  detailWs.columns = [
    { header: 'Guide Name', key: 'guideName', width: 20 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time', key: 'time', width: 8 },
    { header: 'Cash', key: 'cash', width: 12 }
  ];
  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    for (const trip of stats.trips) {
      detailWs.addRow({ guideName: stats.name, date: trip.date, time: trip.time, cash: trip.cash });
    }
  }

  const xlsBuf = await wb.xlsx.writeBuffer();

  const recipients = (process.env.ADMIN_EMAILS || '').split(',').map(e=>e.trim()).filter(Boolean);
  if (!recipients.length) return new Response('No ADMIN_EMAILS configured', { status: 500 });

  await sendEmail({
    to: recipients,
    subject: `Weekly Cash Ups Report — ${week}`,
    html: `<p>Attached are the PDF and Excel weekly reports for ${week} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}).</p>`,
    attachments: [
      { filename: `cashups-${week}.pdf`, content: pdf, contentType: 'application/pdf' },
      { filename: `cashups-${week}.xlsx`, content: Buffer.from(xlsBuf), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ]
  });

    logEvent('report_weekly_email_sent', { week, recipientsCount: recipients.length });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('Weekly email error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
