import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";

export async function GET() {
  const user = await getServerSession();
  if (!user || user.role !== 'ADMIN') return new Response('Forbidden', { status: 403 });

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = ['id','entityType','entityId','action','actorUserId','createdAt'];
  const rows = [header.join(',')];
  for (const l of logs) {
    rows.push([
      l.id,
      JSON.stringify(l.entityType),
      JSON.stringify(l.entityId),
      JSON.stringify(l.action),
      JSON.stringify(l.actorUserId),
      new Date(l.createdAt).toISOString(),
    ].join(','));
  }
  const csv = rows.join('\n');
  return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit-logs.csv"' }});
}

