/** Generated native operation input contracts; do not edit. */
/** The registry determines operation names and request types; output schemas remain owned by domain DTOs. */
import type { Inputs0 } from "./inputs-0";
import type { Inputs1 } from "./inputs-1";
import type { Inputs2 } from "./inputs-2";
import type { Inputs3 } from "./inputs-3";
import type { Inputs4 } from "./inputs-4";
import type { Inputs5 } from "./inputs-5";
import type { Inputs6 } from "./inputs-6";
import type { Inputs7 } from "./inputs-7";
import type { Inputs8 } from "./inputs-8";
import type { Inputs9 } from "./inputs-9";
import type { Inputs10 } from "./inputs-10";
import type { Inputs11 } from "./inputs-11";
import type { Inputs12 } from "./inputs-12";
import type { Inputs13 } from "./inputs-13";
import type { Inputs14 } from "./inputs-14";
import type { Inputs15 } from "./inputs-15";
export type OperationInputs = Inputs0 &
  Inputs1 &
  Inputs2 &
  Inputs3 &
  Inputs4 &
  Inputs5 &
  Inputs6 &
  Inputs7 &
  Inputs8 &
  Inputs9 &
  Inputs10 &
  Inputs11 &
  Inputs12 &
  Inputs13 &
  Inputs14 &
  Inputs15;
export type OperationName = keyof OperationInputs;
export type OperationCall<N extends OperationName> = {
  name: N;
  arguments: OperationInputs[N];
};
