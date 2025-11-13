import { PrismaClient } from "@prisma/client";
import { alertDatabaseError } from "./alerts";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const client = new PrismaClient();

  // Add middleware to monitor for database errors
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      // Alert on database errors
      const operation = `${params.model}.${params.action}`;

      // Check if it's a connection error or critical database error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCritical =
        errorMessage.includes("Can't reach database") ||
        errorMessage.includes("Connection") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("timed out");

      if (isCritical) {
        // Send alert for critical errors (don't await to avoid blocking)
        alertDatabaseError(error, operation, {
          args: params.args,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      }

      // Re-throw the error
      throw error;
    }
  });

  return client;
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

