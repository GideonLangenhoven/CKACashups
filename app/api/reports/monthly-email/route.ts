import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function parseMonth(month: string) {
  const [y, m] = month.split('-').map(n=>parseInt(n));
  if (!y || !m) throw new Error('Invalid month');
  const start = new Date(Date.UTC(y, m-1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
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
    const month = searchParams.get('month') || new Date().toISOString().slice(0,7);
    const { start, end } = parseMonth(month);
  const trips = await prisma.trip.findMany({
    where: { tripDate: { gte: start, lte: end } },
    orderBy: { tripDate: 'asc' },
    include: { payments: true, discounts: true, guides: { include: { guide: true } }, createdBy: true }
  });
  // Build PDF with logo
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
    { text: `Monthly Cash Ups Report`, style: 'header', alignment: 'center' },
    { text: `${month} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)})`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
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

  // Calculate weekly totals
  const weeklyTotals = new Map<string, number>();
  for (const trip of trips) {
    const tripDate = new Date(trip.tripDate);
    const jan1 = new Date(Date.UTC(tripDate.getUTCFullYear(), 0, 1));
    const dayOfWeek = jan1.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const week1Start = new Date(Date.UTC(tripDate.getUTCFullYear(), 0, 1 + daysToMonday));
    const diffMs = tripDate.getTime() - week1Start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;
    const weekKey = `${tripDate.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;

    const total = parseFloat(trip.payments?.cashReceived?.toString() || '0') +
      parseFloat(trip.payments?.creditCards?.toString() || '0') +
      parseFloat(trip.payments?.onlineEFTs?.toString() || '0') +
      parseFloat(trip.payments?.vouchers?.toString() || '0') +
      parseFloat(trip.payments?.members?.toString() || '0') +
      parseFloat(trip.payments?.agentsToInvoice?.toString() || '0') -
      parseFloat(trip.payments?.discountsTotal?.toString() || '0');
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) || 0) + total);
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
          { text: 'Weekly Breakdown:', style: 'summarySubheader', margin: [0, 4, 0, 4] },
          ...Array.from(weeklyTotals.entries()).sort().map(([week, total]) => ({
            text: `${week}: R ${total.toFixed(2)}`,
            style: 'summaryText',
            fontSize: 9
          }))
        ]
      },
      { width: '*', text: '' }
    ],
    margin: [0, 0, 0, 15]
  });

  // Calculate guide statistics
  const guideStats = new Map<string, { name: string; rank: string; tripCount: number }>();
  for (const t of trips) {
    for (const tg of t.guides) {
      if (!guideStats.has(tg.guide.id)) {
        guideStats.set(tg.guide.id, {
          name: tg.guide.name,
          rank: tg.guide.rank,
          tripCount: 0
        });
      }
      const stats = guideStats.get(tg.guide.id)!;
      stats.tripCount++;
    }
  }

  // Guide Summary Table
  if (guideStats.size > 0) {
    const guideSummaryBody: any[] = [
      [{ text: 'Guide Name', bold: true, fillColor: '#f1f5f9' }, { text: 'Rank', bold: true, fillColor: '#f1f5f9' }, { text: 'Total Trips', bold: true, fillColor: '#f1f5f9' }]
    ];
    for (const stats of Array.from(guideStats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
      guideSummaryBody.push([stats.name, stats.rank, stats.tripCount.toString()]);
    }
    content.push(
      { text: 'Guide Summary', style: 'sectionHeader', margin: [0, 0, 0, 8] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: guideSummaryBody
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e2e8f0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6
        },
        margin: [0, 0, 0, 20]
      }
    );
  }

  // Company Trip Details Table
  content.push({ text: 'Company Trip Details', style: 'sectionHeader', margin: [0, 0, 0, 8] });

  const body: any[] = [[
    { text: 'Date', bold: true, fillColor: '#f1f5f9' },
    { text: 'Lead', bold: true, fillColor: '#f1f5f9' },
    { text: 'Pax', bold: true, fillColor: '#f1f5f9' },
    { text: 'Guides', bold: true, fillColor: '#f1f5f9' },
    { text: 'Total', bold: true, fillColor: '#f1f5f9' },
    { text: 'Running Total', bold: true, fillColor: '#f1f5f9' }
  ]];
  let runningTotal = 0;
  for (const t of trips) {
    const counts = {
      SENIOR: t.guides.filter((g: any)=>g.guide.rank==='SENIOR').length,
      INTERMEDIATE: t.guides.filter((g: any)=>g.guide.rank==='INTERMEDIATE').length,
      JUNIOR: t.guides.filter((g: any)=>g.guide.rank==='JUNIOR').length,
    };
    const totalPayments = (
      parseFloat(t.payments?.cashReceived?.toString() || '0') +
      parseFloat(t.payments?.creditCards?.toString() || '0') +
      parseFloat(t.payments?.onlineEFTs?.toString() || '0') +
      parseFloat(t.payments?.vouchers?.toString() || '0') +
      parseFloat(t.payments?.members?.toString() || '0') +
      parseFloat(t.payments?.agentsToInvoice?.toString() || '0') -
      parseFloat(t.payments?.discountsTotal?.toString() || '0')
    );
    runningTotal += totalPayments;
    body.push([
      new Date(t.tripDate).toISOString().slice(0,10),
      t.leadName,
      t.totalPax.toString(),
      `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`,
      `R ${totalPayments.toFixed(2)}`,
      `R ${runningTotal.toFixed(2)}`
    ]);
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
      body
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e2e8f0',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6
    }
  });

  const docDefinition = {
    content,
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    styles: {
      header: { fontSize: 20, bold: true, margin: [0, 0, 0, 5], color: '#0A66C2' },
      subheader: { fontSize: 11, margin: [0, 0, 0, 5], color: '#64748b' },
      sectionHeader: { fontSize: 14, bold: true, color: '#334155' },
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
  await new Promise<void>((resolve) => { pdfDoc.on('data', (c: Buffer) => pdfChunks.push(c)); pdfDoc.on('end', () => resolve()); pdfDoc.end(); });
  const pdf = Buffer.concat(pdfChunks);
  // Build Excel
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('CashUps');
  ws.columns = [
    { header: 'Trip Date', key: 'tripDate', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Lead', key: 'leadName', width: 20 },
    { header: 'Total Pax', key: 'totalPax', width: 10 },
    { header: 'Guides (S/I/J counts)', key: 'guideCounts', width: 22 },
    { header: 'Guides (names)', key: 'guideNames', width: 36 },
    { header: 'Cash', key: 'cash', width: 10 },
    { header: 'Cards', key: 'cards', width: 10 },
    { header: 'EFTs', key: 'efts', width: 10 },
    { header: 'Vouchers', key: 'vouchers', width: 10 },
    { header: 'Members', key: 'members', width: 10 },
    { header: 'Agents', key: 'agents', width: 10 },
    { header: 'Discounts', key: 'discounts', width: 12 }
  ];
  for (const t of trips) {
    const names = t.guides.map((g: any)=>g.guide.name).join(', ');
    const counts = { SENIOR: t.guides.filter((g: any)=>g.guide.rank==='SENIOR').length, INTERMEDIATE: t.guides.filter((g: any)=>g.guide.rank==='INTERMEDIATE').length, JUNIOR: t.guides.filter((g: any)=>g.guide.rank==='JUNIOR').length };
    ws.addRow({ tripDate: new Date(t.tripDate).toISOString().slice(0,10), status: t.status, leadName: t.leadName, totalPax: t.totalPax, guideCounts: `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`, guideNames: names, cash: t.payments?.cashReceived?.toString() || '0', cards: t.payments?.creditCards?.toString() || '0', efts: t.payments?.onlineEFTs?.toString() || '0', vouchers: t.payments?.vouchers?.toString() || '0', members: t.payments?.members?.toString() || '0', agents: t.payments?.agentsToInvoice?.toString() || '0', discounts: t.payments?.discountsTotal?.toString() || '0' });
  }
  const xlsBuf = await wb.xlsx.writeBuffer();

  const recipients = (process.env.ADMIN_EMAILS || '').split(',').map(e=>e.trim()).filter(Boolean);
  if (!recipients.length) return new Response('No ADMIN_EMAILS configured', { status: 500 });

  await sendEmail({
    to: recipients,
    subject: `Monthly Cash Ups Report — ${month}`,
    html: `<p>Attached are the PDF and Excel monthly reports for ${month} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}).</p>`,
    attachments: [
      { filename: `cashups-${month}.pdf`, content: pdf, contentType: 'application/pdf' },
      { filename: `cashups-${month}.xlsx`, content: Buffer.from(xlsBuf), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ]
  });

    logEvent('report_monthly_email_sent', { month, recipientsCount: recipients.length });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('Monthly email error:', error);
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
