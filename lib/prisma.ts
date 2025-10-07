// Use require to avoid issues when generated types are not yet available during lint
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client")

declare global {
  // eslint-disable-next-line no-var
  var prisma: any | undefined
}

const prismaClient: any = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaClient
}

export const prisma = prismaClient
export default prisma


