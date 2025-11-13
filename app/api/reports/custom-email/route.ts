import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/session";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const DATE_PARAM_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseDateParam(value: string | null, type: "start" | "end") {
  if (!value || !DATE_PARAM_REGEX.test(value)) {
    throw new Error(`${type} must be provided in YYYY-MM-DD format`);
  }

  const date =
    type === "start"
      ? new Date(`${value}T00:00:00Z`)
      : new Date(`${value}T23:59:59Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${type} date`);
  }

  return date;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.id) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Dynamic imports to avoid build-time bundling issues
    const { prisma } = await import("@/lib/prisma");
    const { sendEmail } = await import("@/lib/sendMail");
    const { logEvent } = await import("@/lib/log");
    const fs = await import('fs');
    const path = await import('path');

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    let startDate: Date;
    let endDate: Date;
    try {
      startDate = parseDateParam(startParam, "start");
      endDate = parseDateParam(endParam, "end");
    } catch (validationError: any) {
      return new Response(validationError.message, { status: 400 });
    }

    if (startDate > endDate) {
      return new Response('start must be before end', { status: 400 });
    }

    const trips = await prisma.trip.findMany({
      where: { tripDate: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'asc' },
      include: { payments: true, discounts: true, guides: { include: { guide: true } }, createdBy: true, tripLeader: true }
    });

    // Build PDF with logo
    const { default: PdfPrinter } = await import('pdfmake');
    const fonts = { Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' } } as any;
    const printer = new (PdfPrinter as any)(fonts);

    // Read logo and convert to base64
    const logoPath = path.join(process.cwd(), 'public', 'CKAlogo.png');
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
      { text: `Custom Date Range Cash Ups Report`, style: 'header', alignment: 'center' },
      { text: `${startParam!} to ${endParam!}`, style: 'subheader', alignment: 'center', margin: [0, 0, 0, 20] }
    );

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

    // Trip Details Table
    content.push({ text: 'Trip Details', style: 'sectionHeader', margin: [0, 0, 0, 8] });

    const body: any[] = [[
      { text: 'Date', bold: true, fillColor: '#f1f5f9' },
      { text: 'Time', bold: true, fillColor: '#f1f5f9' },
      { text: 'Lead', bold: true, fillColor: '#f1f5f9' },
      { text: 'Pax', bold: true, fillColor: '#f1f5f9' },
      { text: 'Guides', bold: true, fillColor: '#f1f5f9' },
      { text: 'Cash', bold: true, fillColor: '#f1f5f9' },
      { text: 'Total', bold: true, fillColor: '#f1f5f9' }
    ]];
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
        parseFloat(t.payments?.agentsToInvoice?.toString() || '0') +
        parseFloat(t.payments?.waterPhoneSunblock?.toString() || '0') -
        parseFloat(t.payments?.discountsTotal?.toString() || '0')
      );
      const submittedTime = new Date(t.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
      body.push([
        new Date(t.tripDate).toISOString().slice(0,10),
        submittedTime,
        t.leadName,
        t.totalPax.toString(),
        `S:${counts.SENIOR} I:${counts.INTERMEDIATE} J:${counts.JUNIOR}`,
        `R ${t.payments?.cashReceived?.toString() || '0'}`,
        `R ${totalPayments.toFixed(2)}`
      ]);
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
        sectionHeader: { fontSize: 14, bold: true, color: '#334155' }
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
      subject: `Custom Date Range Cash Ups Report — ${startParam} to ${endParam}`,
      html: `<p>Attached are the PDF and Excel reports for custom date range ${startParam} to ${endParam}.</p>`,
      attachments: [
        { filename: `cashups-${startParam}-to-${endParam}.pdf`, content: pdf, contentType: 'application/pdf' },
        { filename: `cashups-${startParam}-to-${endParam}.xlsx`, content: Buffer.from(xlsBuf), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ]
    });

    logEvent('report_custom_email_sent', { start: startParam, end: endParam, recipientsCount: recipients.length });
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('Custom email error:', error);

    // Send alert about report failure
    const { alertReportFailure } = await import("@/lib/alerts");
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    await alertReportFailure('Custom Date Range', error, {
      start: startParam,
      end: endParam,
      endpoint: '/api/reports/custom-email'
    }).catch(console.error);

    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
