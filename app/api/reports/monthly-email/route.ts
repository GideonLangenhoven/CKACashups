import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendMail";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseMonth(month: string) {
  const [y, m] = month.split('-').map(n=>parseInt(n));
  if (!y || !m) throw new Error('Invalid month');
  const start = new Date(Date.UTC(y, m-1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
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
    { text: `${month} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)})`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 15] }
  );

  const body: any[] = [[{ text: 'Date', bold: true }, { text: 'Lead', bold: true }, { text: 'Pax', bold: true }, { text: 'S/I/J', bold: true }, { text: 'Cash', bold: true }, { text: 'Cards', bold: true }, { text: 'EFTs', bold: true }, { text: 'Vouchers', bold: true }, { text: 'Members', bold: true }, { text: 'Agents', bold: true }, { text: 'Discounts', bold: true }]];
  for (const t of trips) {
    const counts = {
      SENIOR: t.guides.filter((g: any)=>g.guide.rank==='SENIOR').length,
      INTERMEDIATE: t.guides.filter((g: any)=>g.guide.rank==='INTERMEDIATE').length,
      JUNIOR: t.guides.filter((g: any)=>g.guide.rank==='JUNIOR').length,
    };
    body.push([
      new Date(t.tripDate).toISOString().slice(0,10), t.leadName, t.totalPax,
      `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`,
      t.payments?.cashReceived?.toString() || '0', t.payments?.creditCards?.toString() || '0', t.payments?.onlineEFTs?.toString() || '0', t.payments?.vouchers?.toString() || '0', t.payments?.members?.toString() || '0', t.payments?.agentsToInvoice?.toString() || '0', t.payments?.discountsTotal?.toString() || '0',
    ]);
  }

  content.push({
    table: { headerRows: 1, widths: ['*','*','*','*','*','*','*','*','*','*','*'], body },
    layout: 'lightHorizontalLines'
  });

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
      subheader: { fontSize: 12, margin: [0, 0, 0, 5] }
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
