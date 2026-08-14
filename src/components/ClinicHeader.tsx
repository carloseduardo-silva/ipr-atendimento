interface ClinicHeaderProps {
  subtitle?: string;
  right?: React.ReactNode;
}

export function ClinicHeader({ subtitle, right }: ClinicHeaderProps) {
  return (
    <header className="border-b border-border/70 bg-card/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo-ipr.png"
            alt="Instituto Pedro Ruiz"
            className="h-9 w-auto sm:h-10"
          />
          {subtitle ? (
            <span className="hidden border-l border-border pl-3 text-sm text-muted-foreground sm:inline">
              {subtitle}
            </span>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}
