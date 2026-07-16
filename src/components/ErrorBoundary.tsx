import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Could not clear storage:", e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans text-slate-100">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 text-2xl shrink-0">
                ⚠️
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Ops! Algo deu errado</h1>
                <p className="text-sm text-slate-400 mt-0.5">O Bingo Live encontrou um erro inesperado.</p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 font-mono text-[11px] leading-relaxed overflow-x-auto text-red-400 max-h-60 mt-4">
              <p className="font-extrabold text-xs text-red-300 mb-2">Detalhes técnicos:</p>
              <p className="font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
              {this.state.error?.stack && (
                <pre className="mt-2 text-slate-500 whitespace-pre-wrap leading-normal font-medium">
                  {this.state.error.stack.split("\n").slice(0, 5).join("\n")}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 bg-red-650 hover:bg-red-600 focus:ring-4 focus:ring-red-500/20 text-white py-3.5 px-5 rounded-2xl font-black text-sm tracking-tight transition-all text-center active:scale-95"
              >
                Limpar Cache e Reiniciar
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3.5 px-5 rounded-2xl font-bold text-sm tracking-tight transition-all text-center active:scale-95 border border-slate-700"
              >
                Tentar Recarregar
              </button>
            </div>
            
            <p className="text-[10px] text-center text-slate-500 font-medium">
              Dica: Se persistir, limpe os cookies ou experimente abrir o app em uma nova guia.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
