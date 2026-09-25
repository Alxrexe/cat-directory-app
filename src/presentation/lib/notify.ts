import { loadOnce } from "./idle";

/**
 * Avisos sobre sileo; el resto de la UI solo conoce `notify`. sileo se carga
 * con la primera interacción o el primer aviso, y `notify` espera a que el
 * <Toaster> esté montado para no perder avisos tempranos.
 */
export interface NotifyOptions {
  description?: string;
  /** En ms. `null` o `Infinity`: no caduca solo. */
  duration?: number | null;
  action?: { label: string; onClick: () => void };
}

type Kind = "success" | "error" | "warning" | "info";

// Toaster y sileo en un solo chunk: sin red no puede faltar la segunda mitad.
export const loadToasterModule = () => import("../components/ui/toaster");

let requestToaster: (() => void) | null = null;
let markMounted: () => void = () => {};
const mounted = new Promise<void>((resolve) => {
  markMounted = resolve;
});

/** Lo registra <ToasterHost> para que un aviso temprano monte el Toaster. */
export function registerToasterHost(request: () => void, onMounted: Promise<void>) {
  requestToaster = request;
  void onMounted.then(() => markMounted());
}

async function show(kind: Kind, title: string, options: NotifyOptions = {}) {
  requestToaster?.();
  try {
    const [{ sileo }] = await Promise.all([loadOnce(loadToasterModule), mounted]);

    const { action } = options;
    const toastId: string = sileo[kind]({
      title,
      description: options.description,
      duration: options.duration === Number.POSITIVE_INFINITY ? null : options.duration,
      button: action
        ? {
            title: action.label,
            onClick: () => {
              sileo.dismiss(toastId);
              action.onClick();
            },
          }
        : undefined,
    });
  } catch {
    // Sin red y sin sileo: el estado sigue visible en la barra y en la lista.
  }
}

export const notify = {
  success: (title: string, options?: NotifyOptions) => void show("success", title, options),
  // Un error con acción ("Reintentar") necesita tiempo para leerse y usarse.
  error: (title: string, options?: NotifyOptions) => void show("error", title, { duration: 10_000, ...options }),
  warning: (title: string, options?: NotifyOptions) => void show("warning", title, options),
  info: (title: string, options?: NotifyOptions) => void show("info", title, options),
};
