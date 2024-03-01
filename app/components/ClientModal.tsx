import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  VStack,
} from "@chakra-ui/react";
import type { Client } from "@prisma/client";
import { useFetcher } from "@remix-run/react";
import { SerializeFrom } from "@remix-run/server-runtime";
import { useEffect, useState } from "react";

interface ClientModalProps {
  onClose: () => void;
  editionMode?: boolean;
  values?: SerializeFrom<Client>;
}

export function ClientModal(props: ClientModalProps) {
  const { onClose, editionMode, values } = props;

  const [label, setLabel] = useState<"CNPJ" | "CPF">("CPF");

  const fetcher = useFetcher<{ fieldErrors: Record<string, string> }>();

  const { data: actionData } = fetcher;

  console.log(actionData);

  const isSubmitting = fetcher.state === "submitting";

  const isEdition = fetcher.formData?.get("_action") === "edit";

  useEffect(() => {
    if (!isSubmitting && isEdition && !actionData?.fieldErrors) {
      onClose();
    }
  }, [isSubmitting, actionData, onClose, isEdition]);

  return (
    <Modal size="xl" isOpen onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{editionMode ? "Editar" : "Criar"} Cliente</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <fetcher.Form method="PUT" id="client-form">
            <FormControl as="fieldset">
              <FormLabel as="legend">Pessoa Jurídica</FormLabel>
              <RadioGroup
                name="isLegalEntity"
                defaultValue="false"
                onChange={(value) => {
                  value === "true" ? setLabel("CNPJ") : setLabel("CPF");
                }}
              >
                <HStack spacing={4}>
                  <Radio value="true">Sim</Radio>
                  <Radio value="false" defaultChecked>
                    Não
                  </Radio>
                </HStack>
              </RadioGroup>
            </FormControl>

            <FormControl
              isInvalid={Boolean(actionData?.fieldErrors?.registrationNumber)}
            >
              <FormLabel htmlFor="registrationNumber">{label}</FormLabel>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                defaultValue={values?.registrationNumber ?? ""}
                minLength={11}
                onBlur={async (e) => {
                  const form = e.target.form;

                  const legalEntityChecked =
                    form?.isLegalEntity.value === "true";

                  const inputValue = e.target.value
                    .replaceAll(".", "")
                    .replaceAll("/", "")
                    .replaceAll("-", "");

                  if (inputValue.length === 14 && legalEntityChecked) {
                    const res = await fetch(
                      `https://api-publica.speedio.com.br/buscarcnpj?cnpj=${e.target.value
                        .replaceAll(".", "")
                        .replaceAll("/", "")
                        .replaceAll("-", "")}`,
                    );

                    const data = await res.json();

                    if (res.ok && form) {
                      const name = form.elements.namedItem(
                        "name",
                      ) as HTMLInputElement | null;
                      if (name) name.value = data["RAZAO SOCIAL"];
                      form.address.value = `${data["TIPO LOGRADOURO"]} ${data.LOGRADOURO}, ${data.NUMERO}`;
                      form.phoneNumber.value = data.TELEFONE;
                      form.neighborhood.value = data.BAIRRO;
                      form.city.value = data.MUNICIPIO;
                      form.state.value = data.UF;
                    }
                  }
                }}
              />
              {actionData?.fieldErrors?.registrationNumber ? <FormErrorMessage>
                  {actionData?.fieldErrors?.registrationNumber}
                </FormErrorMessage> : null}
            </FormControl>
            <VStack spacing={2}>
              <input type="hidden" name="id" defaultValue={values?.id} />
              <FormControl isInvalid={Boolean(actionData?.fieldErrors?.name)}>
                <FormLabel htmlFor="name">Nome</FormLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={values?.name}
                />
                {actionData?.fieldErrors?.name ? <FormErrorMessage>
                    {actionData?.fieldErrors?.name}
                  </FormErrorMessage> : null}
              </FormControl>
              <FormControl
                isInvalid={Boolean(actionData?.fieldErrors?.address)}
              >
                <FormLabel htmlFor="address">Endereço</FormLabel>
                <Input
                  id="address"
                  name="address"
                  required
                  defaultValue={values?.address}
                />
                {actionData?.fieldErrors?.address ? <FormErrorMessage>
                    {actionData?.fieldErrors?.address}
                  </FormErrorMessage> : null}
              </FormControl>
              <HStack>
                <FormControl
                  isInvalid={Boolean(actionData?.fieldErrors?.neighborhood)}
                >
                  <FormLabel htmlFor="neighborhood">Bairro</FormLabel>
                  <Input
                    id="neighborhood"
                    name="neighborhood"
                    required
                    defaultValue={values?.neighborhood}
                  />
                  {actionData?.fieldErrors?.neighborhood ? <FormErrorMessage>
                      {actionData?.fieldErrors?.neighborhood}
                    </FormErrorMessage> : null}
                </FormControl>

                <FormControl isInvalid={Boolean(actionData?.fieldErrors?.city)}>
                  <FormLabel htmlFor="city">Cidade</FormLabel>
                  <Input
                    id="city"
                    name="city"
                    required
                    defaultValue={values?.city ?? ""}
                  />
                  {actionData?.fieldErrors?.city ? <FormErrorMessage>
                      {actionData?.fieldErrors?.city}
                    </FormErrorMessage> : null}
                </FormControl>
              </HStack>
              <HStack>
                <FormControl
                  isInvalid={Boolean(actionData?.fieldErrors?.phoneNumber)}
                >
                  <FormLabel htmlFor="phoneNumber">Telefone</FormLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    defaultValue={values?.phoneNumber ?? ""}
                    minLength={10}
                    required
                    type="tel"
                  />
                  {actionData?.fieldErrors?.phoneNumber ? <FormErrorMessage>
                      {actionData?.fieldErrors?.phoneNumber}
                    </FormErrorMessage> : null}
                </FormControl>

                <FormControl
                  isInvalid={Boolean(actionData?.fieldErrors?.state)}
                >
                  <FormLabel htmlFor="state">UF</FormLabel>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={values?.state ?? ""}
                    required
                  />
                  {actionData?.fieldErrors?.state ? <FormErrorMessage>
                      {actionData?.fieldErrors?.state}
                    </FormErrorMessage> : null}
                </FormControl>
              </HStack>
            </VStack>
          </fetcher.Form>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} variant="ghost" mx="4">
            Cancelar
          </Button>
          <Button
            type="submit"
            form="client-form"
            name="_action"
            value={editionMode ? "edit" : "create"}
          >
            Salvar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
