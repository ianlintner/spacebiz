import { type MarkovModel } from "./model.js";
export interface TrainOptions {
    /** Markov order (n-gram length of context). Default 3. */
    order?: number;
    /** Minimum length of generated output. Default 3. */
    minLength?: number;
    /** Maximum length of generated output. Default 14. */
    maxLength?: number;
    /**
     * Refuse to emit any substring of training data of length >= this.
     * Set to a length close to the median training entry to prevent verbatim
     * regurgitation. Default: undefined (no protection).
     */
    rejectSubstringsOfLength?: number;
    /**
     * Optional minimum count for a transition to be retained. Useful to prune
     * noise from large corpora. Default 1.
     */
    pruneBelow?: number;
    /** Lowercase corpus before training. Default true. */
    lowercase?: boolean;
    /** Optional metadata to embed in the model. */
    meta?: Record<string, unknown>;
}
export interface TrainEntry {
    word: string;
    weight?: number;
}
export type Corpus = readonly string[] | readonly TrainEntry[];
export declare function train(corpus: Corpus, options?: TrainOptions): MarkovModel;
//# sourceMappingURL=trainer.d.ts.map