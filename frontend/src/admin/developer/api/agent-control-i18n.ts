/** Agent delegation and live stop controls share explicit four-language operational vocabulary. */
import { useLocale } from "../../../shared/i18n/i18n";
const words = {
  openai: ["OpenAI", "OpenAI", "OpenAI", "OpenAI"],
  anthropic: ["Anthropic", "Anthropic", "Anthropic", "Anthropic"],
  ollama: ["Ollama", "Ollama", "Ollama", "Ollama"],
  provider: [
    "Approved provider",
    "Freigegebener Anbieter",
    "Fournisseur approuvé",
    "Proveedor aprobado",
  ],
  model: [
    "Exact model name",
    "Exakter Modellname",
    "Nom exact du modèle",
    "Nombre exacto del modelo",
  ],
  choose: [
    "Choose a provider",
    "Anbieter auswählen",
    "Choisir un fournisseur",
    "Elegir proveedor",
  ],
  title: [
    "Agent control",
    "Agentensteuerung",
    "Contrôle des agents",
    "Control de agentes",
  ],
  running: [
    "Agents may work",
    "Agenten dürfen arbeiten",
    "Agents autorisés",
    "Agentes habilitados",
  ],
  stopped: [
    "Agents are stopped",
    "Agenten sind gestoppt",
    "Agents arrêtés",
    "Agentes detenidos",
  ],
  stop: [
    "Stop shop agents",
    "Shop-Agenten stoppen",
    "Arrêter les agents",
    "Detener agentes",
  ],
  resume: [
    "Allow new agent work",
    "Neue Agentenarbeit erlauben",
    "Autoriser de nouveaux travaux",
    "Permitir trabajo nuevo",
  ],
  stopHint: [
    "Stops agent access and cancels queued and running merchant tasks across this shop and its sandboxes. Already admitted provider requests may finish. Normal shopping remains available.",
    "Sperrt Agentenzugänge und beendet wartende und laufende Händleraufgaben in diesem Shop und seinen Sandboxes. Bereits zugelassene Anbieteranfragen können noch enden. Der normale Einkauf bleibt verfügbar.",
    "Bloque les accès agents et annule les tâches en attente et en cours dans la boutique et ses sandboxes. Les requêtes déjà admises peuvent encore se terminer. Les achats restent disponibles.",
    "Bloquea accesos de agentes y cancela tareas pendientes y activas en la tienda y sus sandboxes. Las solicitudes ya admitidas pueden terminar. Las compras siguen disponibles.",
  ],
  resumeHint: [
    "Allows new work. Cancelled runs do not restart automatically.",
    "Erlaubt neue Arbeit. Beendete Läufe werden nicht automatisch neu gestartet.",
    "Autorise de nouveaux travaux sans redémarrer les tâches annulées.",
    "Permite trabajo nuevo sin reiniciar tareas canceladas.",
  ],
  cancel: ["Cancel", "Abbrechen", "Annuler", "Cancelar"],
  kind: [
    "Access purpose",
    "Zweck des Zugangs",
    "Usage de l’accès",
    "Uso del acceso",
  ],
  api: [
    "API integration",
    "API-Anbindung",
    "Intégration API",
    "Integración API",
  ],
  agent: ["Dedicated agent", "Eigener Agent", "Agent dédié", "Agente dedicado"],
  tokens: [
    "Lifetime token allowance",
    "Gesamtes Tokenkontingent",
    "Contingent total de tokens",
    "Cupo total de tokens",
  ],
  cost: [
    "Allocation budget (USD)",
    "Zuteilungsbudget (USD)",
    "Budget d’allocation (USD)",
    "Presupuesto de asignación (USD)",
  ],
  tariff: [
    "Ceiling price per million tokens (USD)",
    "Kalkulationsobergrenze je Million Tokens (USD)",
    "Tarif plafond par million de tokens (USD)",
    "Tarifa máxima por millón de tokens (USD)",
  ],
  budgetHint: [
    "Create this access in the Live shop. Read and prepare proposals only; business changes require personal approval. Enter explicit limits. Full request envelopes are reserved before each model call, including uncertain failures. These conservative allocations are not provider invoices. Text-only model calls are supported; an API key without a budget cannot start agent runs.",
    "Lege diesen Zugang im Live-Shop an. Nur lesen und Vorschläge vorbereiten; geschäftliche Änderungen benötigen die persönliche Freigabe. Lege die Grenzen ausdrücklich fest. Vor jedem Modellaufruf wird dessen gesamter Anfrage-Rahmen reserviert, auch bei unklarem Abbruch. Diese vorsichtigen Zuteilungen sind keine Anbieterrechnungen. Unterstützt werden Textaufrufe; API-Schlüssel ohne Budget können keine Agentenläufe starten.",
    "Créez cet accès dans la boutique active. Lecture et préparation de propositions uniquement ; les modifications nécessitent une validation personnelle. Définissez des limites explicites. L’enveloppe entière est réservée avant chaque appel, y compris en cas d’échec incertain. Ces allocations prudentes ne sont pas des factures. Appels texte uniquement ; une clé API sans budget ne lance pas d’agent.",
    "Crea este acceso en la tienda activa. Solo lectura y propuestas; los cambios requieren aprobación personal. Fija límites explícitos. Se reserva toda la solicitud antes de cada llamada, incluso con fallos inciertos. Las asignaciones conservadoras no son facturas. Solo texto; una clave sin presupuesto no inicia agentes.",
  ],
  allocated: [
    "Allocated model allowance",
    "Zugeteiltes Modellkontingent",
    "Contingent modèle alloué",
    "Cupo de modelo asignado",
  ],
} as const;
export function useAgentControlText() {
  const { locale } = useLocale();
  return (key: keyof typeof words) =>
    words[key][{ "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale]];
}
