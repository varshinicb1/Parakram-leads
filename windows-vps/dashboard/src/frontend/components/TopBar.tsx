import { Moon, Sun, Monitor, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '../lib/utils';

interface TopBarProps {
  connected: boolean;
  hostname: string;
}

export function TopBar({ connected, hostname }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/80 backdrop-blur-lg px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className={cn(
            'flex items-center gap-1.5 rounded-[8px] px-2 py-1 font-medium',
            connected
              ? 'text-success bg-success/10'
              : 'text-danger bg-danger/10'
          )}>
            {connected
              ? <Wifi className="h-3 w-3" strokeWidth={2} />
              : <WifiOff className="h-3 w-3" strokeWidth={2} />
            }
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted font-mono">{hostname}</span>
        <button
          onClick={cycleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Moon className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </header>
  );
}
