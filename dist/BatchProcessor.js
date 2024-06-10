"use strict";
/* Copyright © 2024 Seneca Project Contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inks_1 = __importDefault(require("inks"));
const gubu_1 = require("gubu");
const ALL = '*';
const Types = {
    'Number': 1,
    'Boolean': 1,
    'String': 1,
    'Array': 1,
    'Object': 1
};
// FEATURE: subsets of keys by dot separators.
class Match {
    constructor(patrun, all = null) {
        this.patrun = patrun;
        this.all = all;
    }
    set_all(all) {
        this.all = all;
    }
    find(pattern) {
        return this.patrun.find(pattern);
    }
}
class Utility {
    static evaluateMessage(seneca, ctx, out, msg, body = null) {
        const Jsonic = seneca.util.Jsonic;
        const globalThis = global;
        msg = Object.assign(typeof msg == 'string' ? Jsonic(msg) : { ...msg }, body);
        // console.log(i++, msg)
        let new_msg = {};
        for (let key in msg) {
            let type = msg[key].split('~').pop();
            let value = inks_1.default.evaluate(msg[key], { out, ctx }, { sep: '~' });
            if (null != value && Types[type]) {
                // console.log(globalThis[type])
                let validate = (0, gubu_1.Gubu)(eval(type));
                validate(value);
            }
            if (null != value) {
                new_msg[key] = value;
            }
            else {
                new_msg[key] = msg[key];
            }
        }
        return new_msg;
    }
    static async workflowRun(seneca, msg, config, options, results) {
        if (config.mode == null && 'async' == options.send.mode) {
            try {
                let result = await seneca.post(msg);
                results.push(result);
            }
            catch (error) {
                // handle error
            }
        }
        else if (config.mode == null && 'sync' == options.send.mode) {
            seneca.act(msg, function (err, result) {
                if (null == err) {
                    results.push(result);
                }
            });
        }
        else if (config.mode == 'async') {
            try {
                let result = await seneca.post(msg);
                results.push(result);
            }
            catch (error) {
                // handle error
            }
        }
        else if (config.mode == 'sync') {
            seneca.act(msg, function (err, result) {
                if (null == err) {
                    results.push(result);
                }
                else {
                    // handle error
                }
            });
        }
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
    var _a;
    const seneca = this;
    const Patrun = seneca.util.Patrun;
    const Jsonic = seneca.util.Jsonic;
    const Deep = seneca.util.deepextend;
    const generate_id = seneca.util.Nid;
    const BatchId = generate_id();
    let wheres = {};
    let default_whence = '';
    for (const message_whence in options.where) {
        if ('' == default_whence) {
            default_whence = message_whence;
        }
        let match = (_a = options.where[message_whence]) === null || _a === void 0 ? void 0 : _a.match;
        for (const message_pattern in match) {
            let workflow = match[message_pattern];
            if (ALL == message_pattern) {
                wheres[message_whence] =
                    wheres[message_whence] || new Match(new Patrun({ gex: true }));
                wheres[message_whence].set_all(workflow);
            }
            else {
                wheres[message_whence] =
                    wheres[message_whence] || new Match(new Patrun({ gex: true }));
                wheres[message_whence].patrun.add(Jsonic(message_pattern), workflow);
            }
        }
    }
    async function process(seneca, ctx, out = {}) {
        const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function (...args) { };
        let where = wheres[default_whence];
        let workflow = null;
        let results = ctx.result$ = ctx.result$ || [];
        // console.log(seneca.private$)
        out = { ...out };
        out.run = out.run || ('R' + generate_id());
        out.batch = out.batch || ('B' + humanify());
        if (workflow = where.find(out)) {
            // let i = 0;
            const send = Array.isArray(workflow.send) ? workflow.send : [workflow.send];
            for (let config of send) {
                let { msg, body } = config;
                let msg_evld = Utility.evaluateMessage(seneca, ctx, out, msg, body);
                // console.log(config, msg_evld)
                Utility.workflowRun(seneca, msg_evld, config, options, results);
            }
            // entry report
            if (null != workflow.entry) {
                let entry = workflow.entry;
                entry = 'string' == typeof entry ? { state: entry } : entry;
                BatchMonitorEntry(entry.state, entry.info || {});
            }
            // console.log(workflow, out)
        }
        else if (null != where.all) {
            workflow = where.all;
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