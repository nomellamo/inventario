const { env } = require("./config/env");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const connectionString = env.DIRECT_DATABASE_URL || env.DATABASE_URL;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

module.exports = { prisma };
