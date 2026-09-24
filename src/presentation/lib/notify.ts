import { loadOnce } from "./idle";

/**
 * Avisos (toasts) de la app, sobre sileo.
 *
 * El resto de la UI solo conoce esta API: `notify.error(título, opciones)`.
 * La librería queda detrás, así que cambiarla es cambiar este archivo y
 * `components/ui/toaster.tsx`.
 *
 * sileo muestra un solo aviso a la vez: el nuevo transforma al que está en
 * pantalla ("Sin conexión" → "Conexión restablecida") en vez de apilarse.
 *
 * Un aviso siempre llega después de algo (un fallo, una recarga), nunca en
 * el primer frame, así que sileo y su <Toaster> se cargan en ocioso o con
 * el primer aviso, lo que ocurra antes. `notify` espera a que el Toaster
 * esté montado: un aviso nunca se pierde por llegar antes que él.
 */
export interface NotifyOptions {
  description?: string;
  /** En ms. `null` o `Infinity`: no caduca solo. */
  duration?: number | null;
  action?: { label: string; onClick: () => void };
}

type Kind = "success" | "error" | "warning" | "info";

/**
 * Un solo módulo para el <Toaster> y para `sileo`: si cada uno se pidiera
 * por separado, el segundo podría necesitar otra descarga justo cuando no
 * hay red, que es cuando más falta hace el aviso.
 */
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
    // Sin red y sin sileo descargado todavía: el aviso no puede pintarse.
    // El estado sigue visible en la UI (píldora de red, pie de la lista).
  }
}

export const notify = {
  success: (title: string, options?: NotifyOptions) => void show("success", title, options),
  // Un error con acción ("Reintentar") necesita tiempo para leerse y usarse.
  error: (title: string, options?: NotifyOptions) => void show("error", title, { duration: 10_000, ...options }),
  warning: (title: string, options?: NotifyOptions) => void show("warning", title, options),
  info: (title: string, options?: NotifyOptions) => void show("info", title, options),
};
