"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInput } from "@/components/admin/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/admin/error-state";
import { FileSearch } from "lucide-react";

export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")} onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))} aria-label="Select all rows" />,
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(Boolean(value))} aria-label="Select row" />,
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };
}

export function SortableHeader({ column, children }: { column: { toggleSorting(desc?: boolean): void; getIsSorted(): false | "asc" | "desc" }; children: ReactNode }) {
  const sorted = column.getIsSorted();
  return <Button variant="ghost" size="sm" className="-ml-3 h-8 px-2 font-medium text-muted-foreground" onClick={() => column.toggleSorting(sorted === "asc")}>{children}<ChevronsUpDown className="size-3.5" /></Button>;
}

export function DataTableToolbar<T>({ table, searchValue, onSearchChange, searchPlaceholder, filters, actions }: { table: TanStackTable<T>; searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string; filters?: ReactNode; actions?: ReactNode }) {
  return <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">{onSearchChange ? <SearchInput value={searchValue ?? ""} onChange={onSearchChange} placeholder={searchPlaceholder} /> : null}{filters}</div><div className="flex items-center gap-2"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Columns3 className="size-4" />Columns<ChevronDown className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{table.getAllColumns().filter((column) => column.getCanHide()).map((column) => <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(value) => column.toggleVisibility(Boolean(value))} className="capitalize">{String(column.columnDef.meta && typeof column.columnDef.meta === "object" && "label" in column.columnDef.meta ? column.columnDef.meta.label : column.id).replaceAll("_", " ")}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>{actions}</div></div>;
}

export function DataTablePagination<T>({ table }: { table: TanStackTable<T> }) {
  return <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>{table.getFilteredSelectedRowModel().rows.length ? `${table.getFilteredSelectedRowModel().rows.length} of ` : ""}{table.getFilteredRowModel().rows.length} row{table.getFilteredRowModel().rows.length === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><span className="text-xs">Page {table.getState().pagination.pageIndex + 1} of {Math.max(table.getPageCount(), 1)}</span><Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page"><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page"><ChevronRight className="size-4" /></Button></div></div>;
}

export function DataTable<T>({ data, columns, loading = false, error, onRetry, searchValue, onSearchChange, searchPlaceholder, filters, toolbarActions, emptyTitle = "No records", emptyDescription = "There is nothing to show yet.", emptyAction, onEmptyAction, enableRowSelection = false, bulkActions, pageSize = 10, getRowId }: { data: T[]; columns: ColumnDef<T>[]; loading?: boolean; error?: string | null; onRetry?: () => void; searchValue?: string; onSearchChange?: (value: string) => void; searchPlaceholder?: string; filters?: ReactNode; toolbarActions?: ReactNode; emptyTitle?: string; emptyDescription?: string; emptyAction?: string; onEmptyAction?: () => void; enableRowSelection?: boolean; bulkActions?: (rows: Row<T>[]) => ReactNode; pageSize?: number; getRowId?: (row: T, index: number) => string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // TanStack Table exposes mutable accessor functions by design.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data, columns, state: { sorting, columnVisibility, rowSelection }, onSortingChange: setSorting, onColumnVisibilityChange: setColumnVisibility, onRowSelectionChange: setRowSelection, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize } }, enableRowSelection, getRowId });
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return <div className="overflow-hidden rounded-lg border bg-card"><DataTableToolbar table={table} searchValue={searchValue} onSearchChange={onSearchChange} searchPlaceholder={searchPlaceholder} filters={filters} actions={toolbarActions} />{selectedRows.length && bulkActions ? <div className="flex items-center justify-between border-b bg-blue-50/60 px-4 py-2 text-sm"><span className="font-medium text-blue-800">{selectedRows.length} selected</span><div className="flex items-center gap-2">{bulkActions(selectedRows)}</div></div> : null}<div className="overflow-x-auto"><Table><TableHeader>{table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => { const meta = header.column.columnDef.meta as { className?: string } | undefined; return <TableHead key={header.id} className={meta?.className} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>; })}</TableRow>)}</TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={columns.length} className="h-56 text-center"><LoaderCircle className="mx-auto size-5 animate-spin text-primary" /><span className="sr-only">Loading</span></TableCell></TableRow> : error ? <TableRow><TableCell colSpan={columns.length} className="p-0"><ErrorState description={error} retry={onRetry} /></TableCell></TableRow> : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>{row.getVisibleCells().map((cell) => { const meta = cell.column.columnDef.meta as { className?: string } | undefined; return <TableCell key={cell.id} className={meta?.className}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>; })}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="p-0"><EmptyState icon={FileSearch} title={emptyTitle} description={emptyDescription} action={emptyAction} onAction={onEmptyAction} /></TableCell></TableRow>}</TableBody></Table></div>{!loading && !error && data.length ? <DataTablePagination table={table} /> : null}</div>;
}
