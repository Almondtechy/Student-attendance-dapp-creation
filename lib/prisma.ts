// The schema uses the new `prisma-client` generator which outputs to
// lib/generated/prisma (see prisma/schema.prisma). The classic
// `@prisma/client` entry point is only a throwing stub unless the
// `prisma-client-js` generator is configured, so import from the generated
// client directly.
import { PrismaClient } from "./generated/prisma/client";
export const prisma = new PrismaClient();