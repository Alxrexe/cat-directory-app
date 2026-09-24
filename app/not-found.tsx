import Link from "next/link";
import { Button } from "@presentation/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start justify-center gap-6 px-4 py-24 md:px-8">
      <p className="label-mono text-primary">404 · Ficha no encontrada</p>
      <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.92]">
        Esta raza no está
        <br />
        <em>en el archivo.</em>
      </h1>
      <p className="max-w-prose text-muted-foreground">
        Puede que el enlace esté mal escrito o que la raza ya no figure en la API.
      </p>
      <Button asChild>
        <Link href="/">Volver al directorio</Link>
      </Button>
    </div>
  );
}
