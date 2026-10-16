;; Furniture-owned dimensional validation and surcharge. Core retains money, tax, stock and purchasing approval.
(module
  (func $valid_fee (export "validate_fee") (param $fee i64) (result i32)
    local.get $fee i64.const 0 i64.ge_s
    local.get $fee i64.const 100000 i64.le_s i32.and)
  (func (export "configuration_fee") (param $fee i64) (param $width i64) (param $depth i64) (result i64)
    local.get $fee call $valid_fee
    local.get $width i64.const 80 i64.ge_s i32.and
    local.get $width i64.const 400 i64.le_s i32.and
    local.get $depth i64.const 40 i64.ge_s i32.and
    local.get $depth i64.const 200 i64.le_s i32.and
    if (result i64)
      local.get $fee
      local.get $width i64.const 240 i64.gt_s
      if (result i64) i64.const 4800 else i64.const 0 end
      i64.add
    else i64.const -1 end))
