import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
    // Dynamic imports to avoid build-time bundling issues
    const { prisma } = await import("@/lib/prisma");
    const { sendEmail } = await import("@/lib/sendMail");
    const { logEvent } = await import("@/lib/log");
    const fs = await import('fs');
    const path = await import('path');

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

  // Calculate totals for summary
  const totalTrips = trips.length;
  const totalCashCollected = trips.reduce((sum, t) => sum + parseFloat(t.payments?.cashReceived?.toString() || '0'), 0);
  const totalAllPayments = trips.reduce((sum, t) => {
    return sum +
      parseFloat(t.payments?.cashReceived?.toString() || '0') +
      parseFloat(t.payments?.creditCards?.toString() || '0') +
      parseFloat(t.payments?.onlineEFTs?.toString() || '0') +
      parseFloat(t.payments?.vouchers?.toString() || '0') +
      parseFloat(t.payments?.members?.toString() || '0') +
      parseFloat(t.payments?.agentsToInvoice?.toString() || '0') -
      parseFloat(t.payments?.discountsTotal?.toString() || '0');
  }, 0);

  // Calculate daily totals
  const dailyTotals = new Map<string, number>();
  for (const trip of trips) {
    const dateStr = new Date(trip.tripDate).toISOString().slice(0, 10);
    const total = parseFloat(trip.payments?.cashReceived?.toString() || '0') +
      parseFloat(trip.payments?.creditCards?.toString() || '0') +
      parseFloat(trip.payments?.onlineEFTs?.toString() || '0') +
      parseFloat(trip.payments?.vouchers?.toString() || '0') +
      parseFloat(trip.payments?.members?.toString() || '0') +
      parseFloat(trip.payments?.agentsToInvoice?.toString() || '0') -
      parseFloat(trip.payments?.discountsTotal?.toString() || '0');
    dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + total);
  }

  // Add summary statistics in top left
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'Period Summary', style: 'summaryHeader', margin: [0, 0, 0, 8] },
          { text: `Report Date: ${new Date().toISOString().slice(0, 10)}`, style: 'summaryText' },
          { text: `Total Trips: ${totalTrips}`, style: 'summaryText' },
          { text: `Total Cash Collected: R ${totalCashCollected.toFixed(2)}`, style: 'summaryText' },
          { text: `Total All Payments: R ${totalAllPayments.toFixed(2)}`, style: 'summaryText', margin: [0, 0, 0, 8] },
          { text: 'Daily Breakdown:', style: 'summarySubheader', margin: [0, 4, 0, 4] },
          ...Array.from(dailyTotals.entries()).sort().map(([date, total]) => ({
            text: `${date}: R ${total.toFixed(2)}`,
            style: 'summaryText',
            fontSize: 9
          }))
        ]
      },
      { width: '*', text: '' }
    ],
    margin: [0, 0, 0, 15]
  });

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
      [{ text: 'Date', bold: true }, { text: 'Time', bold: true }, { text: 'Cash', bold: true }, { text: 'Running Total', bold: true }]
    ];
    let runningTotal = 0;
    for (const trip of stats.trips) {
      runningTotal += parseFloat(trip.cash);
      detailBody.push([trip.date, trip.time, `R ${trip.cash}`, `R ${runningTotal.toFixed(2)}`]);
    }
    content.push(
      { text: `${stats.name} (${stats.rank}) - ${stats.tripCount} trips`, style: 'guideName', margin: [0, 10, 0, 5] },
      { table: { headerRows: 1, widths: ['auto', 'auto', 'auto', '*'], body: detailBody }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 10] }
    );
  }

  const docDefinition = {
    content,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    styles: {
      header: { fontSize: 20, bold: true, margin: [0, 0, 0, 5], color: '#0A66C2' },
      subheader: { fontSize: 11, margin: [0, 0, 0, 5], color: '#64748b' },
      sectionHeader: { fontSize: 14, bold: true, color: '#334155', margin: [0, 10, 0, 8] },
      guideName: { fontSize: 11, bold: true, color: '#475569' },
      summaryHeader: { fontSize: 13, bold: true, color: '#334155' },
      summarySubheader: { fontSize: 10, bold: true, color: '#475569' },
      summaryText: { fontSize: 10, color: '#1e293b', margin: [0, 2, 0, 0] }
    },
    defaultStyle: {
      fontSize: 10,
      color: '#1e293b'
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
    { header: 'Cash', key: 'cash', width: 12 },
    { header: 'Running Total', key: 'runningTotal', width: 15 }
  ];
  for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    let runningTotal = 0;
    for (const trip of stats.trips) {
      runningTotal += parseFloat(trip.cash);
      detailWs.addRow({ guideName: stats.name, date: trip.date, time: trip.time, cash: trip.cash, runningTotal: runningTotal.toFixed(2) });
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
