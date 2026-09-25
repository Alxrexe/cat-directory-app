/** Cookie de sesión: tras entrar una vez, un F5 no repite la intro. */
export const SIMULATION_COOKIE = "michiverso_sim";

export function rememberSimulation() {
  document.cookie = `${SIMULATION_COOKIE}=1; path=/; SameSite=Lax`;
}
