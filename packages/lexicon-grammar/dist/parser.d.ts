export type Node = {
    type: "text";
    value: string;
} | {
    type: "ref";
    symbol: string;
    mods: ModifierCall[];
    actions: Action[];
} | {
    type: "raw";
    value: string;
};
export interface ModifierCall {
    name: string;
    args: string[];
}
export interface Action {
    name: string;
    rule: Node[];
}
export declare function parse(template: string): Node[];
//# sourceMappingURL=parser.d.ts.map