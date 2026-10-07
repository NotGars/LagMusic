/**
 * Registro de comandos slash, con diagnóstico claro y sin colgarse.
 *
 * - Comprueba que el token y CLIENT_ID sean del mismo bot (si no, usa el id real del token).
 * - Un solo PUT (no borra y recrea: eso gasta el límite diario de Discord, ~200 creaciones/día).
 * - Si el bot no está en GUILD_ID o no tiene permiso allí, registra de forma global automáticamente.
 * - Si Discord limita el registro, devuelve cuánto hay que esperar (para reintentar solo, sin reiniciar).
 */
import { REST, Routes } from 'discord.js';

export type RegisterResult =
  | { ok: true; scope: 'guild' | 'global'; count: number }
  | { ok: false; reason: string; retryAfterMs?: number };

const log = (m: string) => console.log('[Comandos]', m);
const logErr = (m: string) => console.error('[Comandos]', m);

function isRateLimit(e: any): boolean {
  return String(e?.name).startsWith('RateLimitError') || typeof e?.timeToReset === 'number' || e?.status === 429;
}

function describe(e: any): string {
  const code = e?.code !== undefined ? ` código ${e.code}` : '';
  const status = e?.status ? ` HTTP ${e.status}` : '';
  return `${e?.message || e}${status}${code}`;
}

export async function registerSlashCommands(rest: REST, body: unknown[], clientId: string, guildId?: string): Promise<RegisterResult> {
  try {
    // 1) ¿El token es válido y es del mismo bot que CLIENT_ID?
    try {
      const me = (await rest.get(Routes.user('@me'))) as { id: string; username: string };
      log(`Token válido: bot "${me.username}" (${me.id})`);
      if (typeof me?.id === 'string' && me.id !== clientId) {
        logErr(`⚠️ CLIENT_ID (${clientId}) NO coincide con el bot del token (${me.id}). Uso ${me.id}. Corrige la variable CLIENT_ID.`);
        clientId = me.id;
      }
    } catch (e: any) {
      if (isRateLimit(e)) throw e;
      if (e?.status === 401) return { ok: false, reason: 'DISCORD_TOKEN inválido (401). Revisa el token en las variables de entorno.' };
      logErr(`No pude verificar el token: ${describe(e)} (sigo igual)`);
    }

    const alcance = async (route: `/${string}`, nombre: string) => {
      try {
        const actuales = (await rest.get(route)) as unknown[];
        log(`Comandos que ya hay en ${nombre}: ${Array.isArray(actuales) ? actuales.length : '?'}`);
      } catch {
        /* solo informativo */
      }
    };

    // 2) Registro
    let scope: 'guild' | 'global' = 'global';
    let done = false;
    if (guildId) {
      const route = Routes.applicationGuildCommands(clientId, guildId);
      try {
        await alcance(route, `el servidor ${guildId}`);
        await rest.put(route, { body });
        scope = 'guild';
        done = true;
        log(`✅ ${body.length} comandos registrados en el servidor ${guildId}`);
      } catch (e: any) {
        if (isRateLimit(e)) throw e;
        if (e?.code === 50001 || e?.code === 10004 || e?.status === 403 || e?.status === 404) {
          logErr(`No pude registrar en el servidor ${guildId} (${describe(e)}). El bot no está en ese servidor, el GUILD_ID está mal, o lo invitaron sin el permiso "applications.commands". Registro de forma GLOBAL.`);
        } else {
          throw e;
        }
      }
    }
    if (!done) {
      const route = Routes.applicationCommands(clientId);
      await alcance(route, 'global');
      await rest.put(route, { body });
      log(`✅ ${body.length} comandos registrados de forma global (pueden tardar un poco en aparecer; reinicia Discord con Ctrl+R)`);
    }

    // 3) Duplicados: si se registró en un servidor, borra los globales viejos (solo si existen).
    if (scope === 'guild') {
      try {
        const globales = (await rest.get(Routes.applicationCommands(clientId))) as unknown[];
        if (Array.isArray(globales) && globales.length > 0) {
          await rest.put(Routes.applicationCommands(clientId), { body: [] });
          log('🧹 Comandos globales viejos eliminados (saldrían duplicados)');
        }
      } catch (e: any) {
        logErr(`No pude limpiar los comandos globales: ${describe(e)}`);
      }
    }
    return { ok: true, scope, count: body.length };
  } catch (e: any) {
    if (isRateLimit(e)) {
      const ms = Number(e?.timeToReset ?? (e?.retryAfter ?? 0)) || 60 * 60_000;
      const min = Math.ceil(ms / 60_000);
      logErr(`⏳ Discord limitó el registro de comandos: hay que esperar ~${min} min (límite diario de creaciones). El bot sigue funcionando y lo reintento solo cuando pase ese tiempo.`);
      return { ok: false, reason: 'rate limit', retryAfterMs: ms };
    }
    logErr(`❌ Error registrando comandos: ${describe(e)}`);
    return { ok: false, reason: describe(e) };
  }
}
