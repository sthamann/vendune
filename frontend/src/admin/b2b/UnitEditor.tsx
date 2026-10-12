/** Purchasing unit policies, hierarchy, catalogs and customer grants share current revision checks. */
import { useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import LocalizedField from "../../shared/i18n/LocalizedField";
import { contentText } from "../../shared/i18n/content-language";
import { useLocale } from "../../shared/i18n/i18n";
import { useB2BText } from "../../shared/i18n/b2b-i18n";
import Icon from "../../shared/ui/Icon";
import type { CompanyDetail, Unit } from "../../shared/b2b/types";
import { AppSurfaceSlot } from "../../shared/apps/AppSurfaces";
import EntityHistory from "../../shared/history/EntityHistory";
import Members from "./Members";
import UnitCatalog from "./UnitCatalog";
import UnitMethods from "./UnitMethods";
import { organizationReference } from "./reference";
export default function UnitEditor({
  request,
  company,
  config,
  busy,
  run,
  refresh,
}: {
  request: RequestFn;
  company: CompanyDetail;
  config: any;
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const t = useB2BText(),
    { locale } = useLocale();
  const [selected, setSelected] = useState<Unit>(),
    [catalog, setCatalog] = useState<string[]>([]);
  const fresh = () => {
    setCatalog([]);
    setSelected({
      id: organizationReference(),
      revision: 0,
      data: {
        name: {},
        active: true,
        currency: config.currencies.defaultCurrency,
        costCenter: "",
        approvalAboveMinor: null,
        budgetMinor: null,
        budgetPeriod: "month",
        restrictedCatalog: false,
        requirePurchaseOrder: false,
        allowedShipping: [],
        allowedPayments: [],
      },
    });
  };
  const update = (patch: Partial<Unit["data"]>) => {
    if (selected)
      setSelected({ ...selected, data: { ...selected.data, ...patch } });
  };
  const save = async () => {
    if (!selected) return;
    const v = await request("/api/b2b/unit.save", {
      id: selected.id,
      companyId: company.id,
      parentId: selected.parentId ?? null,
      revision: selected.revision,
      data: selected.data,
    });
    setSelected({ ...selected, revision: v.revision });
    await refresh();
  };
  return (
    <section className="b2b-panel">
      <header className="b2b-toolbar">
        <h2>{t("unit")}</h2>
        <button disabled={busy} onClick={fresh}>
          <Icon name="plus" />
          {t("newUnit")}
        </button>
      </header>
      <div className="b2b-unit-tabs">
        {company.units.map((u) => (
          <button
            key={u.id}
            aria-pressed={selected?.id === u.id}
            onClick={() => {
              setSelected(u);
              setCatalog(
                (u as Unit & { catalogIds?: string[] }).catalogIds ?? [],
              );
            }}
          >
            <Icon name="layers" />
            {contentText(u.data.name, locale, config.mainLocale)}
          </button>
        ))}
      </div>
      {!selected ? (
        <p className="b2b-muted">
          {t(company.units.length ? "chooseUnit" : "noUnit")}
        </p>
      ) : (
        <>
          <div className="b2b-fields">
            <label>
              {t("identifier")}
              <input
                disabled={selected.revision > 0 || busy}
                value={selected.id}
                onChange={(e) =>
                  setSelected({ ...selected, id: e.target.value })
                }
              />
            </label>
            <LocalizedField
              label={t("name")}
              value={selected.data.name}
              onChange={(name) => update({ name })}
            />
            <label>
              {t("company")}
              <select
                value={selected.parentId ?? ""}
                onChange={(e) =>
                  setSelected({
                    ...selected,
                    parentId: e.target.value || undefined,
                  })
                }
              >
                <option value="">
                  {contentText(company.data.name, locale, config.mainLocale)}
                </option>
                {company.units
                  .filter((u) => u.id !== selected.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {contentText(u.data.name, locale, config.mainLocale)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("currency")}
              <select
                value={selected.data.currency}
                onChange={(e) => update({ currency: e.target.value })}
              >
                {config.currencies.enabled.map((c: string) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              {t("costCenter")}
              <input
                value={selected.data.costCenter}
                onChange={(e) => update({ costCenter: e.target.value })}
              />
            </label>
            <label>
              {t("period")}
              <select
                value={selected.data.budgetPeriod}
                onChange={(e) => update({ budgetPeriod: e.target.value })}
              >
                {(["week", "month", "quarter", "year"] as const).map((p) => (
                  <option key={p} value={p}>
                    {t(p)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("budget")}
              <input
                type="number"
                min={0}
                step={1}
                value={selected.data.budgetMinor ?? ""}
                onChange={(e) =>
                  update({
                    budgetMinor:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              {t("threshold")}
              <input
                type="number"
                min={0}
                step={1}
                value={selected.data.approvalAboveMinor ?? ""}
                onChange={(e) =>
                  update({
                    approvalAboveMinor:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="b2b-muted">{t("moneyHint")}</p>
          <div className="b2b-toggles">
            {(
              ["active", "requirePurchaseOrder", "restrictedCatalog"] as const
            ).map((k) => (
              <label className="b2b-toggle" key={k}>
                <input
                  type="checkbox"
                  checked={selected.data[k]}
                  onChange={(e) => update({ [k]: e.target.checked })}
                />
                {t(
                  k === "requirePurchaseOrder"
                    ? "requirePO"
                    : k === "restrictedCatalog"
                      ? "restricted"
                      : "active",
                )}
              </label>
            ))}
          </div>
          <UnitMethods
            data={selected.data}
            config={config}
            onChange={update}
            disabled={busy}
          />
          <button
            className="studio-primary"
            disabled={busy}
            onClick={() => void run(save)}
          >
            {t("save")}
          </button>
          {selected.revision > 0 && (
            <>
              {selected.data.restrictedCatalog && (
                <div className="b2b-catalog">
                  <UnitCatalog
                    request={request}
                    ids={catalog}
                    onChange={setCatalog}
                    disabled={busy}
                  />
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const v = await request("/api/b2b/catalog.save", {
                          unitId: selected.id,
                          revision: selected.revision,
                          productIds: catalog,
                        });
                        setSelected({ ...selected, revision: v.revision });
                        await refresh();
                      })
                    }
                  >
                    {t("catalogSave")}
                  </button>
                </div>
              )}
              <AppSurfaceSlot
                location="admin.b2b.unit"
                context={{ unitId: selected.id }}
              />
              <EntityHistory
                request={request}
                entity="b2bUnit"
                id={selected.id}
                revision={selected.revision}
              />
              <Members
                request={request}
                unit={selected.id}
                members={company.members.filter(
                  (m) => m.unitId === selected.id,
                )}
                busy={busy}
                run={run}
                refresh={refresh}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
