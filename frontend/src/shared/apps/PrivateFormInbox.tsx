/** Host composition of the app-owned private response panel, with a neutral SDK contract. */
import FormInbox from "../../../../extensions/apps/site-forms/studio/FormInbox";
import type { FormInboxProps } from "./form-contract";
export default function PrivateFormInbox(props: FormInboxProps) {
  return <FormInbox {...props} />;
}
