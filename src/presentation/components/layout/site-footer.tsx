export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p>
          Datos de{" "}
          <a
            href="https://catfact.ninja/"
            className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
            rel="noreferrer"
            target="_blank"
          >
            catfact.ninja
          </a>
          , API pública. Los textos de las razas se muestran tal como llegan.
        </p>
        <p className="label-mono flex gap-4">
          <span>
            <kbd>/</kbd> buscar
          </span>
          <span>
            <kbd>↑↓</kbd> recorrer
          </span>
          <span>
            <kbd>⌘K</kbd> ir a
          </span>
        </p>
      </div>
    </footer>
  );
}
