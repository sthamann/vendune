/** Grants reference actual customer identities, never email guesses; pauses retain historical purchases. */
import CustomerPicker from "./CustomerPicker";
import { useEffect, useState } from "react";
import type { RequestFn } from "../../shared/api/types";
import { useB2BText, type B2BWord } from "../../shared/i18n/b2b-i18n";
import { memberPermissions, type Member } from "../../shared/b2b/types";
export default function Members({
  request,
  unit,
  members,
  busy,
  run,
  refresh,
}: {
  request: RequestFn;
  unit: string;
  members: Member[];
  busy: boolean;
  run: (fn: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const t = useB2BText();
  const [threshold, setThreshold] = useState<number | null>(null),
    [selected, setSelected] = useState(""),
    [permissions, setPermissions] = useState<string[]>(["buy", "lists"]);
  useEffect(() => {
    setSelected("");
  }, [unit]);
  useEffect(() => {
    const m = members.find((m) => m.customerId === selected);
    setPermissions(m?.data.permissions ?? ["buy", "lists"]);
    setThreshold(m?.data.approvalAboveMinor ?? null);
  }, [selected, members]);
  return (
    <section className="b2b-members">
      <h3>{t("members")}</h3>
      <div className="b2b-fields">
        <CustomerPicker
          request={request}
          value={selected}
          onChange={setSelected}
          disabled={busy}
        />
        <label>
          {t("threshold")}
          <input
            type="number"
            min={0}
            step={1}
            value={threshold ?? ""}
            onChange={(e) =>
              setThreshold(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </label>
        <div className="b2b-permissions">
          {memberPermissions.map((p) => (
            <label key={p}>
              <input
                type="checkbox"
                checked={permissions.includes(p)}
                onChange={(e) =>
                  setPermissions((old) =>
                    e.target.checked ? [...old, p] : old.filter((v) => v !== p),
                  )
                }
              />
              {t(p as B2BWord)}
            </label>
          ))}
        </div>
      </div>
      <button
        disabled={busy || !selected}
        onClick={() =>
          void run(async () => {
            const m = members.find((m) => m.customerId === selected);
            await request("/api/b2b/member.save", {
              unitId: unit,
              customerId: selected,
              revision: m?.revision ?? 0,
              data: {
                active: true,
                permissions,
                approvalAboveMinor: threshold,
              },
            });
            await refresh();
          })
        }
      >
        {t("grant")}
      </button>
      <div className="b2b-member-list">
        {members.map((m) => (
          <article key={m.customerId}>
            <div>
              <strong>{m.email}</strong>
              <small>
                {m.data.permissions.map((p) => t(p as B2BWord)).join(" · ")}
              </small>
            </div>
            <button disabled={busy} onClick={() => setSelected(m.customerId)}>
              {t("grant")}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await request("/api/b2b/member.save", {
                    unitId: unit,
                    customerId: m.customerId,
                    revision: m.revision,
                    data: { ...m.data, active: !m.data.active },
                  });
                  await refresh();
                })
              }
            >
              {t(m.data.active ? "pause" : "resume")}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
