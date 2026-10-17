/** Native workflow captions reuse their domain vocabulary; package IDs and merchant labels stay unchanged. */
import { useOperationsText } from "./operations-i18n";
import { useB2BQuoteText } from "./b2b-quotes-i18n";

export function useWorkflowStateText() {
  const { o } = useOperationsText(),
    quote = useB2BQuoteText();
  return (object: "order" | "quote", id: string) =>
    object === "quote" && (id === "requested" || id === "rejected")
      ? quote(id)
      : o(id);
}
