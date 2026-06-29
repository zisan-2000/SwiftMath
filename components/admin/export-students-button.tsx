import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Link to the institute student progress CSV export. */
export function ExportStudentsButton() {
  return (
    <Button asChild variant="outline">
      <a href="/admin/students/export">
        <Download className="h-4 w-4" />
        Export CSV
      </a>
    </Button>
  );
}
