/** Actionable agent admission failures distinguish a deliberate stop from missing rights or transient load. */
const stopped = [
  "Shop agents are stopped. An administrator can allow new work under Developer → API & integrations → Agent control. Shopping remains available.",
  "Die Shop-Agenten sind gestoppt. Ein Administrator kann neue Arbeit unter Entwickler → API & Integrationen → Agentensteuerung erlauben. Einkaufen bleibt möglich.",
  "Les agents de la boutique sont arrêtés. Un administrateur peut autoriser de nouvelles tâches dans Développeur → API et intégrations → Contrôle des agents. Les achats restent disponibles.",
  "Los agentes de la tienda están detenidos. Un administrador puede permitir nuevas tareas en Desarrollador → API e integraciones → Control de agentes. Las compras siguen disponibles.",
] as const;
const dedicated = [
  "Use a dedicated agent key with an approved model and explicit token and USD allowances. Ordinary API keys cannot start AI planning.",
  "Verwende einen eigenen Agentenzugang mit freigegebenem Modell sowie ausdrücklichem Token- und USD-Kontingent. Normale API-Schlüssel können keine KI-Planung starten.",
  "Utilisez une clé d’agent dédiée avec un modèle autorisé et des quotas explicites de tokens et d’USD. Les clés API ordinaires ne peuvent pas démarrer la planification IA.",
  "Usa una clave de agente dedicada con un modelo autorizado y límites explícitos de tokens y USD. Las claves API normales no pueden iniciar la planificación IA.",
] as const;
export const agentAllowanceExhausted = [
  "This agent's token or USD allowance is exhausted. Ask an administrator to review its delegation; waiting and retrying will not replenish it.",
  "Das Token- oder USD-Kontingent dieses Agenten ist ausgeschöpft. Bitte einen Administrator, den Zugang zu prüfen; Warten und Wiederholen füllt das Kontingent nicht auf.",
  "Le quota de tokens ou d’USD de cet agent est épuisé. Demandez à un administrateur de vérifier sa délégation ; attendre et réessayer ne le renouvelle pas.",
  "El límite de tokens o USD de este agente está agotado. Pide a un administrador que revise su acceso; esperar y reintentar no repone el límite.",
] as const;
export const agentAdmissionErrors: Record<string, readonly string[]> = {
  "Shop agents are stopped by an administrator": stopped,
  "Dedicated agent budget required": dedicated,
  "Use a dedicated agent key with explicit budgets": dedicated,
  "Agent access is stopped or revoked": [
    "This agent is stopped or its key has been revoked. Ask an administrator to check Agent control and the access key.",
    "Dieser Agent ist gestoppt oder sein Schlüssel wurde widerrufen. Bitte einen Administrator, Agentensteuerung und Zugangsschlüssel zu prüfen.",
    "Cet agent est arrêté ou sa clé a été révoquée. Demandez à un administrateur de vérifier le contrôle des agents et la clé d’accès.",
    "Este agente está detenido o su clave fue revocada. Pide a un administrador que revise el control de agentes y la clave de acceso.",
  ],
  "Agent controls changed; reload before confirming": [
    "Agent control changed in another session. Reload its status before confirming again.",
    "Die Agentensteuerung wurde in einer anderen Sitzung geändert. Lade ihren Status vor einer erneuten Bestätigung neu.",
    "Le contrôle des agents a changé dans une autre session. Actualisez son état avant de confirmer à nouveau.",
    "El control de agentes cambió en otra sesión. Actualiza su estado antes de volver a confirmar.",
  ],
  "Agent provider or model differs from its approved budget": [
    "Use the exact provider and model approved for this agent. Changing models requires an administrator to review the delegation.",
    "Verwende genau den Anbieter und das Modell, die für diesen Agenten freigegeben sind. Ein Modellwechsel erfordert eine Prüfung des Zugangs durch einen Administrator.",
    "Utilisez exactement le fournisseur et le modèle autorisés pour cet agent. Un changement nécessite une vérification de la délégation par un administrateur.",
    "Usa el proveedor y el modelo exactos autorizados para este agente. Un cambio requiere que un administrador revise su acceso.",
  ],
};
