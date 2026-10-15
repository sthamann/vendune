/** The same human and coding-agent language across native workspaces. */
import { useLocale } from "../i18n/i18n";
const words = {
  engine: ["Work with", "Arbeiten mit", "Travailler avec", "Trabajar con"],
  platform: ["Veyndo AI", "Veyndo KI", "IA Veyndo", "IA Veyndo"],
  prompt: [
    "What would you like to change?",
    "Was möchtest du ändern?",
    "Que souhaitez-vous modifier ?",
    "¿Qué quieres cambiar?",
  ],
  generate: [
    "Prepare a proposal",
    "Vorschlag vorbereiten",
    "Préparer une proposition",
    "Preparar propuesta",
  ],
  export: [
    "Prepare agent task",
    "Agenten-Auftrag vorbereiten",
    "Préparer la tâche",
    "Preparar tarea del agente",
  ],
  working: ["Preparing…", "Wird vorbereitet…", "Préparation…", "Preparando…"],
  copy: ["Copy task", "Auftrag kopieren", "Copier la tâche", "Copiar tarea"],
  copied: ["Copied", "Kopiert", "Copié", "Copiado"],
  download: [
    "Download task",
    "Auftrag herunterladen",
    "Télécharger la tâche",
    "Descargar tarea",
  ],
  task: [
    "Task for your coding agent",
    "Auftrag für deinen Coding-Agenten",
    "Tâche pour votre agent",
    "Tarea para tu agente",
  ],
  handoff: [
    "Use this task in Codex or Claude Code with your existing MCP connection. No credentials are exported. Returned changes go through the same review.",
    "Nutze den Auftrag in Codex oder Claude Code mit deiner bestehenden MCP-Verbindung. Zugangsdaten werden nicht exportiert. Änderungen durchlaufen dieselbe Prüfung.",
    "Utilisez cette tâche dans Codex ou Claude Code avec votre connexion MCP existante. Aucun identifiant n’est exporté. Les modifications passent par la même vérification.",
    "Usa la tarea en Codex o Claude Code con tu conexión MCP existente. No se exportan credenciales. Los cambios pasan por la misma revisión.",
  ],
  result: [
    "Paste the result",
    "Ergebnis einfügen",
    "Coller le résultat",
    "Pegar resultado",
  ],
  review: [
    "Review returned changes",
    "Änderungen prüfen",
    "Vérifier les modifications",
    "Revisar cambios",
  ],
  internal: [
    "Uses the configured AI provider",
    "Nutzt den konfigurierten KI-Anbieter",
    "Utilise le fournisseur IA configuré",
    "Usa el proveedor de IA configurado",
  ],
  codex: ["Codex", "Codex", "Codex", "Codex"],
  claude_code: ["Claude Code", "Claude Code", "Claude Code", "Claude Code"],
} as const;
export function useAgentText() {
  const { locale } = useLocale();
  const i = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: keyof typeof words) => words[key][i];
}
