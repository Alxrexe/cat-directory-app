/**
 * Script que corre en <head> antes del primer pintado: si el visitante
 * eligió el tema oscuro, pone la clase `.dark` en <html> para que la página
 * nunca parpadee en claro.
 *
 * Vive en un módulo sin "use client" porque lo pinta el layout raíz, que es
 * un componente de servidor: así React solo lo hidrata y nunca lo crea en
 * el cliente (un <script> creado en el cliente no se ejecuta y React avisa
 * con "Encountered a script tag while rendering React component").
 */
export const THEME_STORAGE_KEY = "theme";

export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
