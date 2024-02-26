import type { BuildingSite } from "@prisma/client";
import { prisma } from "~/db.server";

export async function getBuildingSites({
  search,
  top,
  skip,
}: {
  search?: string;
  skip?: number;
  top?: number;
}) {
  const [count, data] = await prisma.$transaction([
    prisma.buildingSite.count({
      where: {
        name: {
          contains: search,
        },
      },
    }),
    prisma.buildingSite.findMany({
      skip,
      take: top,
      where: {
        name: {
          contains: search,
        },
      },
    }),
  ]);

  return { count, data };
}

export async function getBuildingSitesByClientId(clientId: string) {
  return prisma.buildingSite.findMany({
    where: { clientId: Number(clientId) },
  });
}

export async function getBuildingSite(id: string) {
  return prisma.buildingSite.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      deliveries: {
        orderBy: { date: "desc" },
        include: {
          units: {
            include: {
              rentable: true,
            },
          },
        },
      },
      inventories: true,
    },
  });
}

export async function createBuildingSite(
  buildingSite: Pick<BuildingSite, "address" | "name" | "clientId">,
) {
  return prisma.buildingSite.create({ data: buildingSite });
}

export async function editBuildingSite(
  buildingSite: Pick<BuildingSite, "address" | "name" | "id">,
) {
  return prisma.buildingSite.update({
    data: buildingSite,
    where: { id: buildingSite.id },
  });
}

export async function deleteBuildingSite(id: string) {
  return prisma.buildingSite.delete({ where: { id: Number(id) } });
}
