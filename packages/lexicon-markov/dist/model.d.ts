export declare const START = "";
export declare const END = "\0";
export interface MarkovModel {
    readonly order: number;
    readonly minLength: number;
    readonly maxLength: number;
    readonly forbidden?: readonly string[];
    readonly transitions: Record<string, Record<string, number>>;
    readonly meta?: Record<string, unknown>;
}
export interface MarkovModelJSON {
    v: 1;
    order: number;
    minLength: number;
    maxLength: number;
    forbidden?: string[];
    transitions: Record<string, Record<string, number>>;
    meta?: Record<string, unknown>;
}
export declare function toJSON(model: MarkovModel): MarkovModelJSON;
export declare function fromJSON(json: MarkovModelJSON): MarkovModel;
//# sourceMappingURL=model.d.ts.map