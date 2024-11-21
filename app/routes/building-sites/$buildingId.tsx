import { DeleteIcon } from "@chakra-ui/icons";
import {
  Button,
  Container,
  Divider,
  Grid,
  HStack,
  Heading,
  IconButton,
  Link,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link as RemixLink, useFetcher, useLoaderData } from "@remix-run/react";
import dayjs from "dayjs";
import { useState } from "react";
import { validationError } from "remix-validated-form";
import invariant from "tiny-invariant";

import { MyAlertDialog } from "~/components/AlertDialog";
import BuildingSiteModal from "~/components/BuildingSiteModal";
import BuildingSiteStatusLabel from "~/components/BuildingSiteStatusLabel";
import DeliveryCard from "~/components/DeliveryCard";
import { DeliveyModal } from "~/components/DeliveyModal";
import Header from "~/components/Header";
import ItemBalance from "~/components/ItemBalance";
import {
  deleteBuildingSite,
  editBuildingSite,
  getBuildingSite,
} from "~/models/buildingSite.server";
import {
  createDeliveries,
  deleteDelivery,
  editDelivery,
  getBuildingSiteInventory,
  getDeliveryUnits,
} from "~/models/delivery.server";
import { getRentables } from "~/models/inventory.server";
import { requireUserId } from "~/session.server";
import { useUser } from "~/utils";
import { buildingSiteValidator } from "~/validators/buildingSiteValidator";

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUserId(request);

  invariant(params.buildingId, "buldingId not found");

  const buildingSite = await getBuildingSite(params.buildingId);

  if (!buildingSite) {
    throw new Response("Not Found", { status: 404 });
  }

  const inventory = await getBuildingSiteInventory(params.buildingId);

  const rentables = await getRentables();

  const deliveryUnits = await getDeliveryUnits(params.buildingId);

  const buildingSiteWithFormatedDate = {
    ...buildingSite,
    deliveries: buildingSite.deliveries.map((d) => ({
      ...d,
      date: dayjs(d.date).tz("America/Fortaleza").format("DD/MM/YYYY HH:mm"),
    })),
  };

  return json({
    buildingSite: buildingSiteWithFormatedDate,
    inventory,
    rentables,
    deliveryUnits,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUserId(request);

  const formData = await request.formData();
  const action = formData.get("_action");

  switch (action) {
    case "edit-bs": {
      const result = await buildingSiteValidator.validate(formData);

      if (result.error) {
        return validationError(result.error);
      }

      await editBuildingSite({
        address: result.data.address,
        name: result.data.name,
        id: Number(result.data.id),
        status: Number(result.data.status ?? 1),
      });

      return null;
    }

    case "create-delivery": {
      const rentableIds = formData.getAll("rentableId") as string[];
      const buildingSiteId = formData.get("buildingSiteId") as string;
      const date = formData.get("date") as string;

      const units = rentableIds
        .map((id) => {
          const count = formData.get(`${id}_count`) as string;
          const deliveryType = formData.get(`${id}_delivery_type`) as string;

          return {
            rentableId: Number(id),
            count: Number(deliveryType) === 1 ? Number(count) : -Number(count),
            deliveryType: Number(deliveryType),
            buildingSiteId: Number(buildingSiteId),
            date: dayjs(date).toDate(),
          };
        })
        .filter((u) => u.count !== 0);

      if (!units.length) {
        return validationError({
          fieldErrors: {
            count: "É necessário informar a quantidade de pelo menos um item",
          },
        });
      }

      await createDeliveries(units, buildingSiteId, dayjs(date).toDate());

      return null;
    }

    case "edit-delivery": {
      const rentableIds = formData.getAll("rentableId") as string[];
      const buildingSiteId = formData.get("buildingSiteId") as string;
      const date = formData.get("date") as string;
      const id = formData.get("id") as string;

      const units = rentableIds
        .map((id) => {
          const count = formData.get(`${id}_count`) as string;
          const deliveryType = formData.get(`${id}_delivery_type`) as string;

          return {
            id: Number(id),
            count: Number(deliveryType) === 1 ? Number(count) : -Number(count),
            deliveryType: Number(deliveryType),
            buildingSiteId: Number(buildingSiteId),
          };
        })
        .filter((u) => u.count !== 0);

      if (!units.length) {
        return validationError({
          fieldErrors: {
            count: "É necessário informar a quantidade de pelo menos um item",
          },
        });
      }

      await editDelivery(
        {
          buildingSiteId: Number(buildingSiteId),
          id: Number(id),
          date: new Date(date),
        },
        units,
      );

      return null;
    }

    case "delete-delivery": {
      const id = formData.get("id");

      if (typeof id === "string") {
        await deleteDelivery(id);
      }

      return null;
    }

    case "delete-building-site": {
      const id = formData.get("buildingId");

      if (typeof id === "string") {
        await deleteBuildingSite(id);
      }

      return redirect("/building-sites");
    }

    default:
      throw new Error("Invalid action");
  }
}

export default function BuildingSite() {
  const { buildingSite, inventory, rentables, deliveryUnits } =
    useLoaderData<typeof loader>();

  const user = useUser();

  const fetcher = useFetcher();

  const { onOpen, onClose, isOpen } = useDisclosure();
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const deleteModal = useDisclosure();

  const cardColor = useColorModeValue("gray.100", "gray.700");

  const isAdmin = user?.role === "ADMIN";

  function deleteBuildingSite() {
    fetcher.submit(
      { buildingId: buildingSite.id, _action: "delete-building-site" },
      { method: "DELETE" },
    );
  }

  return (
    <>
      <Header />
      <Container as="main" maxW="container.xl" py="50" display="grid" gap="7">
        <VStack>
          <Text>Detalhes da Obra</Text>
          <Heading as="h1" size="xl">
            {buildingSite.name}
          </Heading>
          <HStack py={6}>
            <Button variant="outline" onClick={onOpen}>
              Adicionar Remessa
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBuildingModal(true)}
            >
              Editar Obra
            </Button>

            {isAdmin ? (
              <IconButton
                aria-label="Delete building site"
                icon={<DeleteIcon />}
                variant="outline"
                colorScheme="red"
                onClick={deleteModal.onOpen}
              />
            ) : null}
          </HStack>
        </VStack>

        <VStack as="dl" align="flex-start">
          <div>
            <Text fontWeight="bold" as="dt">
              Endereço
            </Text>
            <dd>{buildingSite.address}</dd>
          </div>

          <div>
            <Text fontWeight="bold" as="dt">
              Cliente
            </Text>
            <Link to={`/clients/${buildingSite.client.id}`} as={RemixLink}>
              <dd>{buildingSite.client.name}</dd>
            </Link>
          </div>
          <BuildingSiteStatusLabel status={buildingSite.status} />
        </VStack>
        <Divider />
        <VStack align="stretch" as="section">
          <Heading
            as="h2"
            size="lg"
            color={useColorModeValue("green.600", "green.100")}
          >
            Materiais
          </Heading>
          <Grid templateColumns="repeat(auto-fit, minmax(12rem, 1fr))" gap={3}>
            {inventory.map((rentable) => (
              <Stat
                key={rentable.rentableId}
                bgColor={cardColor}
                padding="4"
                borderRadius="16"
              >
                <StatLabel>
                  {rentables.find((i) => i.id === rentable.rentableId)?.name}
                </StatLabel>
                <StatNumber>{rentable.count}</StatNumber>
              </Stat>
            ))}
          </Grid>
        </VStack>
        <Divider />

        <VStack align="stretch" as="section">
          <Heading
            as="h2"
            size="lg"
            color={useColorModeValue("green.600", "green.100")}
          >
            Remessas
          </Heading>
          {buildingSite.deliveries.map((d) => (
            <DeliveryCard key={d.id} delivery={d} rentables={rentables} />
          ))}
        </VStack>
        <Divider />
        <ItemBalance deliveryUnits={deliveryUnits} />
      </Container>
      {/* delivery creation */}
      {isOpen ? (
        <DeliveyModal
          onClose={onClose}
          buildingSiteId={buildingSite.id}
          rentables={rentables}
        />
      ) : null}
      {showBuildingModal ? (
        <BuildingSiteModal
          editionMode
          client={buildingSite.client}
          values={buildingSite}
          onClose={() => setShowBuildingModal(false)}
        />
      ) : null}
      {deleteModal.isOpen ? (
        <MyAlertDialog
          isOpen={deleteModal.isOpen}
          onClose={deleteModal.onClose}
          onDelete={deleteBuildingSite}
          title="Deletar Obra"
        />
      ) : null}
    </>
  );
}

export { ErrorBoundary } from "~/components/ErrorBoundary";
