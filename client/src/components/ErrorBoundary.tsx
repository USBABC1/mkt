import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button"; // Opcional, para estilizar o fallback

interface Props {
  children: ReactNode;
  fallbackRender?: (error: Error, errorInfo: ErrorInfo, resetErrorBoundary: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Pick<State, 'hasError' | 'error'> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    // Aqui você poderia logar o erro para um serviço externo, ex: Sentry
    // logErrorToMyService(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallbackRender && this.state.errorInfo) {
        return this.props.fallbackRender(this.state.error, this.state.errorInfo, this.resetErrorBoundary);
      }

      // Fallback UI padrão caso fallbackRender não seja fornecido
      return (
        <div style={{ padding: '20px', border: '1px solid red', margin: '10px', borderRadius: '8px', backgroundColor: '#fff0f0' }}>
          <h2>Algo deu errado.</h2>
          <details style={{ whiteSpace: "pre-wrap", marginTop: '10px', marginBottom: '10px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <Button onClick={this.resetErrorBoundary} variant="outline">
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
