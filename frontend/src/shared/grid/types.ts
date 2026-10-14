/** Shared read-only grid contracts; domains own rows, permissions and server query semantics. */
import type { ReactNode } from "react";
import type { RequestFn } from "../api/types";
export type GridCriteria = Record<string, string | boolean>;
export type GridQueryState = {
  criteria: GridCriteria;
  onCriteria: (value: GridCriteria) => void;
  cursor?: string;
  onCursor?: (cursor: string) => void;
};
export type GridColumn<Row> = {
  id: string;
  label: string;
  render: (row: Row) => ReactNode;
  sort?: string;
  hidden?: boolean;
  align?: "end";
};
export type GridFilter = {
  key: string;
  label: string;
  type?: "date";
  options?: { value: string; label: string }[];
};
export type GridEntity = "orders" | "products" | "customers";
export type GridProps<Row> = {
  id: string;
  title: string;
  columns: GridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRow?: (row: Row) => void;
  criteria: GridCriteria;
  onCriteria: (criteria: GridCriteria) => void;
  searchKey?: string;
  searchable?: boolean;
  expandedRow?: (row: Row) => ReactNode;
  filters?: GridFilter[];
  loading?: boolean;
  error?: string;
  next?: string;
  previous?: boolean;
  onNext?: () => void;
  onFirst?: () => void;
  onRefresh?: () => void;
  emptyAction?: ReactNode;
  agent?: { entity: GridEntity; request: RequestFn; enabled: boolean };
};
