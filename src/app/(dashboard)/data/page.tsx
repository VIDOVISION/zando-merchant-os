import DataTable from "@/components/dashboard/DataTable";

/* PLACEHOLDER — Replace with your actual data columns */
const COLUMNS = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "role", label: "Role", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "created", label: "Created", sortable: true },
];

/* PLACEHOLDER — Replace with data fetched from your database */
const ROWS = [
  { id: "1", name: "Alice Johnson", email: "alice@example.com", role: "Admin", status: "Active", created: "2024-01-15" },
  { id: "2", name: "Bob Smith", email: "bob@example.com", role: "Member", status: "Active", created: "2024-02-03" },
  { id: "3", name: "Carol Williams", email: "carol@example.com", role: "Member", status: "Invited", created: "2024-02-18" },
  { id: "4", name: "Dave Brown", email: "dave@example.com", role: "Viewer", status: "Active", created: "2024-03-01" },
  { id: "5", name: "Eve Davis", email: "eve@example.com", role: "Member", status: "Inactive", created: "2024-03-12" },
  { id: "6", name: "Frank Miller", email: "frank@example.com", role: "Admin", status: "Active", created: "2024-03-20" },
  { id: "7", name: "Grace Lee", email: "grace@example.com", role: "Member", status: "Active", created: "2024-04-01" },
  { id: "8", name: "Henry Wilson", email: "henry@example.com", role: "Viewer", status: "Invited", created: "2024-04-08" },
  { id: "9", name: "Iris Chen", email: "iris@example.com", role: "Member", status: "Active", created: "2024-04-15" },
  { id: "10", name: "Jack Taylor", email: "jack@example.com", role: "Member", status: "Active", created: "2024-04-22" },
  { id: "11", name: "Kate Anderson", email: "kate@example.com", role: "Viewer", status: "Inactive", created: "2024-05-01" },
  { id: "12", name: "Leo Martinez", email: "leo@example.com", role: "Member", status: "Active", created: "2024-05-10" },
];

export default function DataPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
            Data
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
            {ROWS.length}
          </span>
        </div>
        <button className="accent-gradient btn-shine text-background text-sm font-medium px-4 py-2 rounded-lg">
          + New
        </button>
      </div>

      {/* Table */}
      <DataTable columns={COLUMNS} rows={ROWS} pageSize={10} searchable />
    </div>
  );
}
