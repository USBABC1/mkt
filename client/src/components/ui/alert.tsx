import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// Alterado para importar o BadgeAlert
import { Terminal, BadgeAlert } from "lucide-react"

export function AlertsPage() {
  return (
    <div className="grid gap-4">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components to your app using the cli.
        </AlertDescription>
      </Alert>
      <Alert variant="destructive">
        {/* Ícone trocado para o BadgeAlert */}
        <BadgeAlert className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </Alert>
    </div>
  )
}
