"use strict";
/* Copyright © 2024 Seneca Project Contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inks_1 = __importDefault(require("inks"));
const gubu_1 = require("gubu");
const ALL = '*';
// FEATURE: subsets of keys by dot separators.
class State {
    constructor(patrun, all = false) {
        this.patrun = patrun;
        this.all = all;
    }
    set_all(all) {
        this.all = all;
    }
}
function humanify(when, flags = {}) {
    const d = when ? new Date(when) : new Date();
    const iso = d.toISOString();
    if (flags.parts) {
        let parts = iso.split(/[-:T.Z]/).map(s => +s);
        let i = 0;
        let out = {
            year: parts[i++],
            month: parts[i++],
            day: parts[i++],
            hour: parts[i++],
            minute: parts[i++],
            second: parts[i++],
            milli: parts[i++],
        };
        if (flags.terse) {
            out = {
                ty: out.year,
                tm: out.month,
                td: out.day,
                th: out.hour,
                tn: out.minute,
                ts: out.second,
                ti: out.milli,
            };
        }
        return out;
    }
    return +(iso.replace(/[^\d]/g, '').replace(/\d$/, ''));
}
function BatchProcessor(options) {
    const seneca = this;
    const Patrun = seneca.util.Patrun;
    const Jsonic = seneca.util.Jsonic;
    const Deep = seneca.util.deepextend;
    const generate_id = seneca.util.Nid;
    const BatchId = generate_id();
    let states = {};
    let default_whence = '';
    for (const message_whence in options.where) {
        if ('' == default_whence) {
            default_whence = message_whence;
        }
        let state = options.where[message_whence];
        for (const message_pattern in state.match) {
            let workflow = state.match[message_pattern];
            if (ALL == message_pattern) {
                states[message_whence] = states[message_whence] || new State(new Patrun({ gex: true }));
                states[message_whence].set_all(true);
            }
            else {
                states[message_whence] = states[message_whence] || new State(new Patrun({ gex: true }));
                states[message_whence].patrun.add(Jsonic(message_pattern), workflow);
            }
        }
    }
    /*
    if(states[default_whence]) {
      // console.log( states[default_whence].find ({ok: true}).send )
    }
    */
    async function process(seneca, ctx, out = {}) {
        const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function (...args) { };
        let state = states[default_whence];
        let workflow = null;
        let results = ctx.result$ = ctx.result$ || [];
        // console.log(seneca.private$)
        out = Deep({}, out);
        out.run = out.run || ('R' + generate_id());
        out.batch = out.batch || ('B' + humanify());
        if (workflow = state.patrun.find(out)) {
            let i = 0;
            for (let config of workflow.send) {
                let { msg } = config;
                msg = typeof msg == 'string' ? { ...Jsonic(msg) } : msg;
                // console.log(i++, msg)
                let new_msg = {};
                for (let key in msg) {
                    let type = msg[key].split('~').pop();
                    let value = inks_1.default.evaluate(msg[key], { out, ctx }, { sep: '~' });
                    if (null != value && 'function' == typeof this[type]) {
                        // console.log(this[type])
                        let validate = (0, gubu_1.Gubu)(this[type]);
                        validate(value);
                    }
                    if (null != value) {
                        new_msg[key] = value;
                    }
                    else {
                        new_msg[key] = msg[key];
                    }
                }
                // console.log(config, new_msg)
                if (config.mode == null && 'async' == options.send.mode) {
                    try {
                        let result = await seneca.post(new_msg);
                        results.push(result);
                    }
                    catch (error) {
                        // handle error
                    }
                }
                else if (config.mode == null && 'sync' == options.send.mode) {
                    seneca.act(new_msg, function (err, result) {
                        if (null == err) {
                            results.push(result);
                        }
                    });
                }
                else if (config.mode == 'async') {
                    try {
                        let result = await seneca.post(new_msg);
                        results.push(result);
                    }
                    catch (error) {
                        // handle error
                    }
                }
                else if (config.mode == 'sync') {
                    seneca.act(new_msg, function (err, result) {
                        if (null == err) {
                            results.push(result);
                        }
                        else {
                            // handle error
                        }
                    });
                }
            }
            if (null != workflow.entry) {
                let entry = workflow.entry;
                entry = 'string' == typeof entry ? { state: entry } : entry;
                BatchMonitorEntry(entry.state, entry.info || {});
            }
            // console.log(workflow, out)
        }
        else if (true === state.all) {
            if (null != workflow.entry) {
                let entry = workflow.entry;
                (0, gubu_1.Gubu)(String)(entry);
                BatchMonitorEntry(entry, { why: 'batch-process-no-match' });
            }
        }
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
    send: {
        mode: 'async'
    },
    where: {},
};
Object.assign(BatchProcessor, { defaults });
exports.default = BatchProcessor;
if ('undefined' !== typeof module) {
    module.exports = BatchProcessor;
}
//# sourceMappingURL=BatchProcessor.js.map