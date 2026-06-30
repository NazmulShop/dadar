import { Download, Filter, Plus, Search } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

type Col = string;

const DEFAULT_COLS: Col[] = ["ID", "Name", "Status", "Date", "Actions"];

export function PlaceholderPage({
  title,
  description,
  columns = DEFAULT_COLS,
  primaryAction = "Add new",
  statuses = ["Active", "Pending", "Disabled"],
  empty = false,
}: {
  title: string;
  description?: string;
  columns?: Col[];
  primaryAction?: string;
  statuses?: string[];
  empty?: boolean;
}) {
  const rows = empty ? [] : Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description ?? `Manage ${title.toLowerCase()} for your store.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Button size="sm" variant="brand">
              <Plus className="mr-1.5 h-4 w-4" /> {primaryAction}
            </Button>
          </>
        }
      />

      <Card className="p-3 sm:p-4 shadow-soft">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={`Search ${title.toLowerCase()}…`} className="pl-9" />
          </div>
          <Select>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Date range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="justify-self-start sm:justify-self-auto">
            <Filter className="mr-1.5 h-4 w-4" /> More filters
          </Button>
        </div>
      </Card>

      <Card className="shadow-soft">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">Nothing here yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              When you add {title.toLowerCase()}, they will show up in this list.
            </p>
            <Button size="sm" className="mt-4" variant="brand">
              <Plus className="mr-1.5 h-4 w-4" /> {primaryAction}
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => <TableHead key={c}>{c}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i}>
                      {columns.map((c, idx) => (
                        <TableCell key={c}>
                          {c === "Status" ? (
                            <Badge variant={i % 3 === 0 ? "secondary" : "default"}>
                              {statuses[i % statuses.length]}
                            </Badge>
                          ) : c === "Actions" ? (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">View</Button>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                          ) : c === "ID" ? (
                            <span className="font-mono text-xs text-muted-foreground">#{1000 + i}</span>
                          ) : c === "Date" ? (
                            <span className="text-sm text-muted-foreground">Jun {10 + i}, 2026</span>
                          ) : (
                            <span className="text-sm">{title.replace(/s$/, "")} {i}{idx === 1 ? "" : ""}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-3 sm:px-4">
              <p className="text-xs text-muted-foreground">Showing 1–8 of 124</p>
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                  <PaginationItem><PaginationLink href="#" isActive>1</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationLink href="#">2</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                  <PaginationItem><PaginationEllipsis /></PaginationItem>
                  <PaginationItem><PaginationNext href="#" /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
