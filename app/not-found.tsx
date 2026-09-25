import Link from "next/link";
import { Button } from "@presentation/components/ui/button";
import { ScreenMessage } from "@presentation/components/screen-message";

export default function NotFound() {
  return (
    <ScreenMessage
      label="404 · Michi no encontrado"
      title="Esta raza no está en el Michiverso"
      actions={
        <Button asChild>
          <Link href="/">Volver al Michiverso</Link>
        </Button>
      }
    >
      Puede que el enlace esté mal escrito o que la raza ya no figure en la API.
    </ScreenMessage>
  );
}
