/** Native B2B wire types shared by the company editor and customer purchasing portal. */
import type { LocalizedText } from "../i18n/content-language";
export type Company = {
  id: string;
  revision: number;
  data: {
    name: LocalizedText;
    active: boolean;
    vatId: string;
    externalId?: string;
  };
};
export type Unit = {
  id: string;
  parentId?: string;
  revision: number;
  data: {
    name: LocalizedText;
    active: boolean;
    currency: string;
    costCenter: string;
    approvalAboveMinor: number | null;
    budgetMinor: number | null;
    budgetPeriod: string;
    restrictedCatalog: boolean;
    requirePurchaseOrder: boolean;
    allowedShipping: string[];
    allowedPayments: string[];
  };
};
export const memberPermissions = [
  "buy",
  "approve",
  "lists",
  "quotes",
  "companyOrders",
] as const;
export type Member = {
  unitId: string;
  customerId: string;
  revision: number;
  email: string;
  data: {
    active: boolean;
    permissions: string[];
    approvalAboveMinor: number | null;
  };
};
export type CompanyDetail = Company & {
  units: Unit[];
  members: Member[];
  extensions?: import("../apps/CoreExtensions").CoreExtension[];
  omittedExtensions?: number;
};
export type CompanyContext = {
  id: string;
  companyId: string;
  data: Unit["data"];
  company: Company["data"];
  member: Member["data"];
};
