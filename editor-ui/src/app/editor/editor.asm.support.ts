/**
 * Monaco Editor: Assembly language highlighting (single-file script)
 *
 * Usage:
 * 1) Ensure Monaco is available as global `monaco` (e.g., via AMD loader or bundler).
 * 2) Call: registerAssemblyLanguage(monaco);
 * 3) Create editor with language: "asm"
 *
 * Notes:
 * - This is a pragmatic ASM tokenizer that covers common Intel/GAS-ish syntax:
 *   labels, directives, registers, numbers (hex/bin/oct/dec), strings, comments.
 * - Customize keyword lists for your assembler dialect as needed.
 */

export const registerAssemblyLanguage = (monaco: any): string => {
    if (!monaco || !monaco.languages) {
        throw new Error("Monaco not found. Ensure `monaco` is loaded before registering the language.");
    }

    // Avoid double-registration if script runs more than once
    const ASM_ID = "asm";
    const already = (monaco.languages.getLanguages?.() || []).some((l: any) => l.id === ASM_ID);
    if (!already) {
        monaco.languages.register({
            id: ASM_ID,
            extensions: [".asm", ".s", ".S", ".inc"],
            aliases: ["Assembly", "ASM", "assembly", "gas", "nasm", "masm"],
            mimetypes: ["text/x-asm"],
        });
    }

    // --- Language configuration: comments, brackets, auto-closing, indentation hints
    monaco.languages.setLanguageConfiguration(ASM_ID, {
        comments: {
            lineComment: ";",
            // Many assemblers also use '#'; keep it supported via tokenizer too.
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
        surroundingPairs: [
            { open: "{", close: "}" },
            { open: "[", close: "]" },
            { open: "(", close: ")" },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
        ],
        // Treat ':' and ',' as word separators typical for asm syntax
        wordPattern:
            /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\]\{\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        indentationRules: {
            // Indent after macro blocks / conditional assembly blocks; adjust for your dialect
            increaseIndentPattern:
                /^\s*(?:\.?(?:if|ifdef|ifndef|macro|irp|irpc)|%macro)\b.*$/i,
            decreaseIndentPattern:
                /^\s*(?:\.?(?:endif|endm|endmacro)|%endmacro)\b.*$/i,
        },
    });

    // --- Tokenization via Monarch
    const mnemonics = [
        // Common x86/x64
        "mov", "lea", "push", "pop", "xchg", "cmp", "test", "add", "sub", "imul", "mul", "idiv", "div",
        "inc", "dec", "neg", "not", "and", "or", "xor", "shl", "shr", "sar", "rol", "ror", "rcl", "rcr",
        "call", "ret", "leave", "enter", "nop", "hlt", "int", "syscall", "sysenter", "sysexit",
        "jmp", "je", "jne", "jg", "jge", "jl", "jle", "ja", "jae", "jb", "jbe", "jo", "jno", "js", "jns",
        "jp", "jnp", "jc", "jnc", "jz", "jnz", "jecxz", "jrcxz", "loop", "loope", "loopne",
        "cmovz", "cmovnz", "cmove", "cmovne", "cmova", "cmovae", "cmovb", "cmovbe", "cmovg", "cmovge", "cmovl", "cmovle",
        "seta", "setae", "setb", "setbe", "sete", "setne", "setg", "setge", "setl", "setle", "setz", "setnz",
        "movzx", "movsx", "movsxd",
        // String ops
        "stos", "lods", "movs", "cmps", "scas", "rep", "repe", "repne",
        // SSE/AVX (a small sample)
        "movdqa", "movdqu", "movaps", "movups", "addps", "addpd", "mulps", "mulpd", "xorps", "xorpd",
        "vaddps", "vaddpd", "vmulps", "vmulpd", "vxorps", "vxorpd",
        // ARM-ish (optional; harmless if not used)
        "ldr", "str", "b", "bl", "bx", "cbz", "cbnz", "adr", "adrl",
    ];

    const directives = [
        // GAS-ish
        ".text", ".data", ".bss", ".rodata", ".section", ".global", ".globl", ".extern", ".type", ".size",
        ".align", ".p2align", ".balign", ".byte", ".short", ".word", ".long", ".quad", ".ascii", ".asciz", ".string",
        ".equ", ".set", ".org", ".include", ".macro", ".endm", ".if", ".ifdef", ".ifndef", ".else", ".endif",
        // NASM/MASM-ish
        "section", "segment", "global", "extern", "bits", "default", "org", "align",
        "db", "dw", "dd", "dq", "dt", "resb", "resw", "resd", "resq",
        "equ", "times", "struc", "endstruc", "proc", "endp",
        "%define", "%undef", "%include", "%macro", "%endmacro", "%if", "%ifdef", "%ifndef", "%else", "%endif",
    ];

    // Registers (x86/x64 + SIMD)
    const registers = [
        "al", "ah", "ax", "eax", "rax",
        "bl", "bh", "bx", "ebx", "rbx",
        "cl", "ch", "cx", "ecx", "rcx",
        "dl", "dh", "dx", "edx", "rdx",
        "sil", "si", "esi", "rsi",
        "dil", "di", "edi", "rdi",
        "bpl", "bp", "ebp", "rbp",
        "spl", "sp", "esp", "rsp",
        "r8", "r8b", "r8w", "r8d",
        "r9", "r9b", "r9w", "r9d",
        "r10", "r10b", "r10w", "r10d",
        "r11", "r11b", "r11w", "r11d",
        "r12", "r12b", "r12w", "r12d",
        "r13", "r13b", "r13w", "r13d",
        "r14", "r14b", "r14w", "r14d",
        "r15", "r15b", "r15w", "r15d",
        "cs", "ds", "es", "fs", "gs", "ss",
        "ip", "eip", "rip",
        "flags", "eflags", "rflags",
        "st0", "st1", "st2", "st3", "st4", "st5", "st6", "st7",
        // SIMD
        "mm0", "mm1", "mm2", "mm3", "mm4", "mm5", "mm6", "mm7",
        "xmm0", "xmm1", "xmm2", "xmm3", "xmm4", "xmm5", "xmm6", "xmm7",
        "xmm8", "xmm9", "xmm10", "xmm11", "xmm12", "xmm13", "xmm14", "xmm15",
        "ymm0", "ymm1", "ymm2", "ymm3", "ymm4", "ymm5", "ymm6", "ymm7",
        "ymm8", "ymm9", "ymm10", "ymm11", "ymm12", "ymm13", "ymm14", "ymm15",
        "zmm0", "zmm1", "zmm2", "zmm3", "zmm4", "zmm5", "zmm6", "zmm7",
        "zmm8", "zmm9", "zmm10", "zmm11", "zmm12", "zmm13", "zmm14", "zmm15",
    ];

    // Condition codes / size keywords sometimes appear as operands in some syntaxes
    const operandKeywords = [
        "byte", "word", "dword", "qword", "tbyte", "oword", "xmmword", "ymmword", "zmmword",
        "short", "near", "far", "ptr",
        "offset", "rel",
    ];

    // Create a fast lookup structure for Monarch (case-insensitive using lowercased lists)
    const toLowerSet = (arr: string[]) => arr.map((s) => s.toLowerCase());
    const mnemonicSet = toLowerSet(mnemonics);
    const directiveSet = toLowerSet(directives);
    const registerSet = toLowerSet(registers);
    const operandSet = toLowerSet(operandKeywords);

    monaco.languages.setMonarchTokensProvider(ASM_ID, {
        defaultToken: "invalid",

        // Case-insensitive matching by normalizing via regex + token maps
        ignoreCase: true,

        // Common regexes
        // - labels: start of line identifier followed by ':'
        // - identifiers: usual symbol names in asm
        tokenizer: {
            root: [
                // Whitespace
                { include: "@whitespace" },

                // Comments: ; ...  and  # ...  and  // ...
                [/;.*$/, "comment"],
                [/#.*$/, "comment"],
                [/\/\/.*$/, "comment"],

                // Labels: "foo:" at start or after whitespace
                [/^(\s*)([A-Za-z_.$?@][\w.$?@]*)(\s*:)$/, ["", "type.identifier", "delimiter"]],
                [/^(\s*)([A-Za-z_.$?@][\w.$?@]*)(\s*:)/, ["", "type.identifier", "delimiter"]],

                // Directives (starting with '.' or '%' or plain words)
                [/\.(?:[A-Za-z_]\w*)\b/, {
                    cases: {
                        "@directiveSet": "keyword.directive",
                        "@default": "keyword.directive",
                    },
                }],
                [/%(?:[A-Za-z_]\w*)\b/, "keyword.directive"],

                // Strings
                [/"/, { token: "string.quote", bracket: "@open", next: "@stringDouble" }],
                [/'/, { token: "string.quote", bracket: "@open", next: "@stringSingle" }],

                // Numbers:
                //  - hex: 0xFF, FFh
                //  - bin: 0b1010, 1010b
                //  - oct: 0o77, 77o / 77q
                //  - dec: 123, -42
                [/[-+]?0x[0-9a-fA-F]+/, "number.hex"],
                [/[-+]?[0-9a-fA-F]+h\b/, "number.hex"],
                [/[-+]?0b[01]+/, "number.binary"],
                [/[-+]?[01]+b\b/, "number.binary"],
                [/[-+]?0o[0-7]+/, "number.octal"],
                [/[-+]?[0-7]+[oq]\b/, "number.octal"],
                [/[-+]?\d+/, "number"],

                // Registers (word boundaries)
                [/\b[A-Za-z][A-Za-z0-9]*\b/, {
                    cases: {
                        "@registerSet": "variable.predefined",
                        "@mnemonicSet": "keyword",
                        "@operandSet": "keyword.storage",
                        "@directiveSet": "keyword.directive",
                        "@default": "identifier",
                    },
                }],

                // Operators / punctuation
                [/[,\[\]\(\)\{\}]/, "delimiter"],
                [/[+\-*/%]/, "operator"],
                [/[:]/, "delimiter"],
                [/[=]/, "operator"],
                [/[<>]/, "operator"],

                // Anything else
                [/[^\s]+/, "invalid"],
            ],

            whitespace: [
                [/[ \t\r\n]+/, ""],
            ],

            stringDouble: [
                [/[^\\"]+/, "string"],
                [/\\./, "string.escape"],
                [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],

            stringSingle: [
                [/[^\\']+/, "string"],
                [/\\./, "string.escape"],
                [/'/, { token: "string.quote", bracket: "@close", next: "@pop" }],
            ],
        },

        // Monarch supports "cases" lookup via named arrays if we inject them:
        directiveSet,
        mnemonicSet,
        registerSet,
        operandSet,
    });

    // --- Theme tweaks (optional): define subtle tokens if the active theme doesn't style them well
    // You can remove this block if you already have a theme.
    // This does NOT change the global theme; it defines "asmTheme" and you can opt into it.
    monaco.editor.defineTheme("asmTheme", {
        base: "vs",
        inherit: true,
        rules: [
            { token: "keyword.directive", fontStyle: "italic" },
            { token: "type.identifier", fontStyle: "bold" },
        ],
        colors: {},
    });

    // --- Completion provider (basic mnemonics/registers/directives)
    // This is optional but often requested alongside highlighting.
    monaco.languages.registerCompletionItemProvider(ASM_ID, {
        triggerCharacters: [".", "%"],
        provideCompletionItems: function (model: any, position: any) {
            const word = model.getWordUntilPosition(position);
            const range = new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
            );

            const mk = (label: string, kind: any, detail: string) => ({
                label,
                kind,
                detail,
                insertText: label,
                range,
            });

            const suggestions = [];

            // Mnemonics
            for (const m of mnemonics) {
                suggestions.push(mk(m, monaco.languages.CompletionItemKind.Keyword, "mnemonic"));
            }

            // Directives
            for (const d of directives) {
                suggestions.push(mk(d, monaco.languages.CompletionItemKind.Keyword, "directive"));
            }

            // Registers
            for (const r of registers) {
                suggestions.push(mk(r, monaco.languages.CompletionItemKind.Variable, "register"));
            }

            // Operand keywords
            for (const o of operandKeywords) {
                suggestions.push(mk(o, monaco.languages.CompletionItemKind.Keyword, "operand"));
            }

            return { suggestions };
        },
    });

    return ASM_ID;
}
