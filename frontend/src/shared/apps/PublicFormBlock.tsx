/** Host composition of the registered forms app; apps depend on this contract, not each other's code. */
import PublishedForm from "../../../../extensions/apps/site-forms/storefront/PublishedForm";
import type { PublicFormProps } from "./form-contract";
export default function PublicFormBlock(props: PublicFormProps) {
  return <PublishedForm {...props} />;
}
