/**
 * Android puede borrar los datos de un sitio cuando el teléfono se queda sin espacio. `persist()`
 * le pide al navegador que no lo haga. Chrome lo concede solo a apps instaladas o muy usadas, por
 * eso además existe el backup (T16).
 */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function espacioUsado(): Promise<{ usadoMB: number; cuotaMB: number } | null> {
  const estimado = await navigator.storage?.estimate?.().catch(() => undefined);
  if (!estimado?.usage || !estimado.quota) return null;
  return { usadoMB: estimado.usage / 1_048_576, cuotaMB: estimado.quota / 1_048_576 };
}
