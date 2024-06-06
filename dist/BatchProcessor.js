"use strict";
/* Copyright © 2024 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
// FEATURE: subsets of keys by dot separators.
function BatchProcessor(options) {
    const seneca = this;
    function process(seneca, ctx, out) {
        return out;
    }
    return {
        exports: {
            process
        }
    };
}
// Default options.
const defaults = {
    debug: false,
};
Object.assign(BatchProcessor, { defaults });
exports.default = BatchProcessor;
if ('undefined' !== typeof module) {
    module.exports = BatchProcessor;
}
//# sourceMappingURL=BatchProcessor.js.map