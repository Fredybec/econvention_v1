
import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="p-6 bg-rose-500/10 rounded-full">
                <AlertTriangle className="text-rose-500 w-16 h-16" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">Oups !</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Une erreur inattendue est survenue dans l'application. 
                Ne vous inquiétez pas, vos données sont en sécurité.
              </p>
              {this.state.error && (
                <div className="p-4 bg-secondary rounded-xl text-left overflow-auto max-h-40">
                  <code className="text-xs text-rose-600 font-mono">
                    {this.state.error.toString()}
                  </code>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full py-6 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Recharger la page
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'} 
                className="w-full py-6 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Home size={18} /> Retour à l'accueil
              </Button>
            </div>
            
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground pt-8">
              E-Convention FST Marrakech
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
