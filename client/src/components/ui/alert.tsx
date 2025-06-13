import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// A importação do AlertTriangle foi adicionada aqui
import { Terminal, AlertTriangle } from "lucide-react" 

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
        {/* Agora que foi importado, este ícone funcionará corretamente */}
        <AlertTriangle className="h-4 w-4" /> 
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Your session has expired. Please log in again.
        </AlertDescription>
      </Alert>
    </div>
  )
}
