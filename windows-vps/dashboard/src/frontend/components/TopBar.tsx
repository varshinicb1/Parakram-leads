import { Moon, Sun, Wifi, WifiOff } from 'lucide-react';
import { useTheme } from './theme-provider';
import { cn } from '../lib/utils';

interface TopBarProps {
  connected: boolean;
  hostname: string;
}

export function TopBar({ connected, hostname }: TopBarProps) {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-xs font-medium transition-all',
            connected
              ? 'text-success bg-success/10'
              : 'text-danger bg-danger/10 animate-pulse'
          )}
        >
          {connected
            ? <Wifi className="h-3.5 w-3.5" strokeWidth={2} />
            : <WifiOff className="h-3.5 w-3.5" strokeWidth={2} />
          }
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted font-mono tracking-tight">{hostname}</span>
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted hover:text-text-primary hover:bg-hover transition-all active:scale-95"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
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
