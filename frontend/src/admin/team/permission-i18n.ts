/** Role interface vocabulary uses the shared permission label catalogue. */
import { useLocale } from "../../shared/i18n/i18n";
import { permissionWords } from "./permission-labels";
const words = {
  roles: ["Roles", "Rollen", "Rôles", "Roles"],
  roleHint: [
    "Define reusable permissions for your team. Changes apply to existing sessions, API keys and background jobs.",
    "Definiere wiederverwendbare Team-Rechte. Änderungen gelten für bestehende Sitzungen, API-Schlüssel und Hintergrundprozesse.",
    "Définis des droits réutilisables. Les modifications affectent sessions, clés API et tâches existantes.",
    "Define permisos reutilizables. Los cambios afectan sesiones, claves API y tareas existentes.",
  ],
  newRole: ["Create role", "Rolle anlegen", "Créer un rôle", "Crear rol"],
  name: ["Role name", "Rollenname", "Nom du rôle", "Nombre del rol"],
  search: [
    "Search permissions",
    "Rechte suchen",
    "Rechercher des droits",
    "Buscar permisos",
  ],
  standard: ["Standard role", "Standardrolle", "Rôle standard", "Rol estándar"],
  custom: [
    "Custom role",
    "Eigene Rolle",
    "Rôle personnalisé",
    "Rol personalizado",
  ],
  paused: ["Paused", "Pausiert", "Suspendu", "Pausado"],
  active: ["Active", "Aktiv", "Actif", "Activo"],
  save: ["Save role", "Rolle speichern", "Enregistrer le rôle", "Guardar rol"],
  saved: ["Role saved", "Rolle gespeichert", "Rôle enregistré", "Rol guardado"],
  back: [
    "Back to overview",
    "Zur Übersicht",
    "Retour à la liste",
    "Volver a la lista",
  ],
  delete: ["Delete role", "Rolle löschen", "Supprimer le rôle", "Eliminar rol"],
  deleteHint: [
    "Only unused custom roles can be deleted. Assign another role first; standard roles can be paused.",
    "Nur unbenutzte eigene Rollen lassen sich löschen. Weise zuerst eine andere Rolle zu; Standardrollen können pausiert werden.",
    "Seuls les rôles personnalisés inutilisés peuvent être supprimés. Réaffecte les membres ; les rôles standard peuvent être suspendus.",
    "Solo se eliminan roles personalizados sin uso. Reasigna los miembros; los roles estándar pueden pausarse.",
  ],
  noAccess: [
    "You do not have permission for this area.",
    "Du hast keine Berechtigung für diesen Bereich.",
    "Tu n’as pas accès à cet espace.",
    "No tienes permiso para esta sección.",
  ],
  inherited: [
    "Use current role permissions",
    "Aktuelle Rollenrechte erben",
    "Hériter des droits actuels du rôle",
    "Heredar permisos actuales del rol",
  ],
  members: [
    "Assigned members",
    "Zugewiesene Mitglieder",
    "Membres assignés",
    "Miembros asignados",
  ],
  invitations: [
    "Invitation references",
    "Einladungsreferenzen",
    "Références d’invitations",
    "Referencias de invitaciones",
  ],
  locked: [
    "Owner authority is protected. Other roles can grant only permissions you currently hold.",
    "Inhaberrechte sind geschützt. Andere Rollen dürfen nur Rechte vergeben, die du selbst aktuell hast.",
    "Les droits du propriétaire sont protégés. Les autres rôles ne peuvent déléguer que tes droits actuels.",
    "Los derechos del propietario están protegidos. Los demás roles solo pueden delegar tus permisos actuales.",
  ],
  cancel: ["Cancel", "Abbrechen", "Annuler", "Cancelar"],
} as const;
export const permissionScopes = Object.keys(permissionWords);
export function usePermissionText() {
  const { locale } = useLocale();
  const index = { "en-GB": 0, "de-DE": 1, "fr-FR": 2, "es-ES": 3 }[locale];
  return (key: string) =>
    (permissionWords[key as keyof typeof permissionWords] ??
      words[key as keyof typeof words])?.[index] ?? key;
}
