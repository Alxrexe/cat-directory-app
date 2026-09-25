/** Lo pinta el layout raíz (servidor): React lo hidrata y nunca lo crea en el cliente. */
export const THEME_STORAGE_KEY = "theme";
export const SYSTEM_DARK = "(prefers-color-scheme: dark)";

export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="dark"||(!t&&matchMedia("${SYSTEM_DARK}").matches))document.documentElement.classList.add("dark")}catch(e){}`;
