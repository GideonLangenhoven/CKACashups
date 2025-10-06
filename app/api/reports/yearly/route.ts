import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { logEvent } from "@/lib/log";

function parseYear(year: string) {
  const y = parseInt(year);
  if (!y) throw new Error('Invalid year');
  const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const format = (searchParams.get('format') || 'pdf').toLowerCase();
  if (!year) return new Response('year required YYYY', { status: 400 });
  const { start, end } = parseYear(year);
  logEvent('report_yearly', { year, format });

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

  if (format === 'xlsx') {
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
      { header: 'Discounts', key: 'discounts', width: 12 },
      { header: 'Pax Guide Notes', key: 'paxNote', width: 30 },
      { header: 'Created By', key: 'creator', width: 24 },
    ];
    for (const t of trips) {
      const names = t.guides.map((g: any)=>g.guide.name).join(', ');
      const counts = {
        SENIOR: t.guides.filter((g: any)=>g.guide.rank==='SENIOR').length,
        INTERMEDIATE: t.guides.filter((g: any)=>g.guide.rank==='INTERMEDIATE').length,
        JUNIOR: t.guides.filter((g: any)=>g.guide.rank==='JUNIOR').length,
      };
      ws.addRow({
        tripDate: new Date(t.tripDate).toISOString().slice(0,10),
        status: t.status,
        leadName: t.leadName,
        totalPax: t.totalPax,
        guideCounts: `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`,
        guideNames: names,
        cash: t.payments?.cashReceived?.toString() || '0',
        cards: t.payments?.creditCards?.toString() || '0',
        efts: t.payments?.onlineEFTs?.toString() || '0',
        vouchers: t.payments?.vouchers?.toString() || '0',
        members: t.payments?.members?.toString() || '0',
        agents: t.payments?.agentsToInvoice?.toString() || '0',
        discounts: t.payments?.discountsTotal?.toString() || '0',
        paxNote: (t as any).paxGuideNote || '',
        creator: t.createdBy?.email || ''
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    return new Response(Buffer.from(buf), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="cashups-${year}.xlsx"` }});
  }

  const { default: PdfPrinter } = await import('pdfmake');
  const fonts = { Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold' } } as any;
  const printer = new (PdfPrinter as any)(fonts);
  const body: any[] = [[
    { text: 'Date', bold: true }, { text: 'Lead', bold: true }, { text: 'Pax', bold: true }, { text: 'S/I/J', bold: true }, { text: 'Cash', bold: true }, { text: 'Cards', bold: true }, { text: 'EFTs', bold: true }, { text: 'Vouchers', bold: true }, { text: 'Members', bold: true }, { text: 'Agents', bold: true }, { text: 'Discounts', bold: true }
  ]];
  for (const t of trips) {
    const counts = {
      SENIOR: t.guides.filter((g: any)=>g.guide.rank==='SENIOR').length,
      INTERMEDIATE: t.guides.filter((g: any)=>g.guide.rank==='INTERMEDIATE').length,
      JUNIOR: t.guides.filter((g: any)=>g.guide.rank==='JUNIOR').length,
    };
    body.push([
      new Date(t.tripDate).toISOString().slice(0,10),
      t.leadName,
      t.totalPax,
      `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`,
      t.payments?.cashReceived?.toString() || '0',
      t.payments?.creditCards?.toString() || '0',
      t.payments?.onlineEFTs?.toString() || '0',
      t.payments?.vouchers?.toString() || '0',
      t.payments?.members?.toString() || '0',
      t.payments?.agentsToInvoice?.toString() || '0',
      t.payments?.discountsTotal?.toString() || '0',
    ]);
  }
  const docDefinition = {
    content: [
      { text: `Cash Ups — ${year}`, style: 'header' },
      { table: { headerRows: 1, widths: ['*','*','*','*','*','*','*','*','*','*','*'], body } }
    ],
    styles: { header: { fontSize: 16, bold: true, margin: [0,0,0,8] } }
  };
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => { pdfDoc.on('data', (c: Buffer) => chunks.push(c)); pdfDoc.on('end', () => resolve()); pdfDoc.end(); });
  const pdf = Buffer.concat(chunks);
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="cashups-${year}.pdf"` }});
}
