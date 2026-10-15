"""Fail-closed typed Rust-to-Lean extraction. Trusted boundary: this translator,
Rust/Lean compilers. Nat matches u64 for literals/min/saturating_sub/comparisons;
no overflowing arithmetic, calls, casts, branches, macros or effects accepted.
"""
from dataclasses import dataclass
import re
KERNEL_FILES=('src/verified_kernel.rs','src/verified_kernel/fulfillment.rs','src/verified_kernel/app_intake.rs')
def kernel_source(root):
    # Closed module registration; no arbitrary source/import resolution is trusted.
    source=(root/'src/verified_kernel.rs').read_text()
    registrations=(
        'mod app_intake;\n',
        'mod fulfillment;\n',
        'pub use app_intake::{app_submission_admissible, persistent_key_admissible};\n',
        'pub use fulfillment::{carrier_booking_admissible, delivery_split_admissible};\n',
    )
    for registration in registrations:
        if source.count(registration)!=1:raise ValueError('Unreviewed pure-kernel module registration')
        source=source.replace(registration,'',1)
    return source+'\n'+(root/'src/verified_kernel/fulfillment.rs').read_text()+'\n'+(root/'src/verified_kernel/app_intake.rs').read_text()

MAX_U64 = 2**64 - 1
TOKEN = re.compile(r'\s*(->|&&|\|\||==|!=|<=|>=|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[():{},.!<>])')
@dataclass
class Expr:
    kind: str
    typ: str
    value: str
    children: tuple = ()
    def lean(self):
        if self.kind == 'leaf': return self.value
        if self.kind == 'not': return f'(!{self.children[0].lean()})'
        a, b = (c.lean() for c in self.children)
        if self.kind == 'method': return f'(min {a} {b})' if self.value == 'min' else f'({a} - {b})'
        if self.value in ('&&', '||'): return f'({a} {self.value} {b})'
        op = {'==': '=', '!=': '≠', '<=': '≤', '>=': '≥'}.get(self.value, self.value)
        return f'(decide ({a} {op} {b}))'
@dataclass
class Function:
    name: str
    args: list
    result: str
    body: Expr
class Parser:
    def __init__(self, source):
        source = re.sub(r'//[^\n]*', '', source)
        self.tokens = []; at = 0
        while at < len(source):
            if not source[at:].strip(): break
            m = TOKEN.match(source, at)
            if not m: raise ValueError(f'Unsupported Rust syntax at offset {at}')
            self.tokens.append(m.group(1)); at = m.end()
        self.pos = 0; self.args = {}
    def peek(self): return self.tokens[self.pos] if self.pos < len(self.tokens) else ''
    def take(self, expected=None):
        t = self.peek()
        if not t or (expected is not None and t != expected): raise ValueError(f'Expected {expected}, got {t!r}')
        self.pos += 1; return t
    def identifier(self):
        s = self.take()
        if not re.fullmatch('[a-z][a-z_0-9]*', s): raise ValueError('Unsupported identifier')
        return s
    def parse(self):
        functions = []; names = set()
        while self.peek():
            self.take('pub'); self.take('fn'); name = self.identifier()
            if name in names: raise ValueError('Duplicate function')
            names.add(name); self.take('('); args = []
            while self.peek() != ')':
                arg = self.identifier(); self.take(':'); typ = self.take()
                if typ not in ('u64', 'bool') or arg in dict(args): raise ValueError('Invalid argument')
                args.append((arg, typ))
                if self.peek() != ',': break
                self.take(',')
            self.take(')'); self.take('->'); result = self.take()
            if result not in ('u64', 'bool'): raise ValueError('Unsupported result type')
            self.take('{'); self.args = dict(args); body = self.expression(0); self.take('}')
            if body.typ != result: raise ValueError('Result type mismatch')
            functions.append(Function(name, args, result, body))
        if not functions: raise ValueError('Empty kernel')
        return functions
    def expression(self, level):
        precedence = [('||',), ('&&',), ('==','!='), ('<','>','<=','>=')]
        if level == len(precedence): return self.atom()
        left = self.expression(level + 1)
        while self.peek() in precedence[level]:
            op = self.take(); right = self.expression(level + 1)
            if left.typ != right.typ: raise ValueError('Binary type mismatch')
            if op in ('&&','||') and left.typ != 'bool': raise ValueError('Expected boolean')
            if op in ('<','>','<=','>=') and left.typ != 'u64': raise ValueError('Expected u64')
            left = Expr('binary', 'bool', op, (left, right))
        return left
    def atom(self):
        if self.peek() == '!':
            self.take(); arg = self.atom()
            if arg.typ != 'bool': raise ValueError('Not requires bool')
            return Expr('not', 'bool', '!', (arg,))
        if self.peek() == '(':
            self.take(); value = self.expression(0); self.take(')')
        else:
            t = self.take()
            if t in ('true','false'): value = Expr('leaf','bool',t)
            elif t.isdecimal():
                if int(t) > MAX_U64: raise ValueError('Literal outside u64')
                value = Expr('leaf','u64',str(int(t)))
            elif t in self.args: value = Expr('leaf',self.args[t],t)
            else: raise ValueError(f'Unknown variable or unsupported call {t}')
        while self.peek() == '.':
            self.take(); method = self.take(); self.take('('); arg = self.expression(0); self.take(')')
            if method not in ('min','saturating_sub') or value.typ != 'u64' or arg.typ != 'u64': raise ValueError('Unsupported method or type')
            value = Expr('method','u64',method,(value,arg))
        return value

def generated(functions):
    lines = ['-- Generated from src/verified_kernel.rs; do not edit.', 'import Std', '', 'namespace CommerceKernel', '']
    for f in functions:
        args = ' '.join(f'({n} : {"Nat" if t == "u64" else "Bool"})' for n,t in f.args)
        lines.append(f'def {f.name} {args} : {"Nat" if f.result == "u64" else "Bool"} :=\n  {f.body.lean()}\n')
    return '\n'.join(lines) + '\nend CommerceKernel\n'
