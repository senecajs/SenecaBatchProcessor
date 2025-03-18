"use strict";
/* Copyright © 2025 Seneca Project Contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const inks_1 = __importDefault(require("inks"));
const gubu_1 = require("gubu");
const { expr } = gubu_1.Gubu;
const ALL = '*';
const Types = {
    'Number': 1,
    'Boolean': 1,
    'String': 1,
    // 'Array': 1,
    // 'Object': 1
};
const Modes = {
    SYNC: 0,
    ASYNC: 1
};
// FEATURE: subsets of keys by dot separators.
class Matcher {
    constructor(patrun) {
        this.patrun = patrun;
    }
    find(pattern) {
        return this.patrun.find(pattern);
    }
    add_pattern(pattern, item) {
        return this.patrun.add(pattern, item);
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
function determineMode(config, options) {
    if (config.mode == null && 'async' == options.send.mode || 'async' == config.mode) {
        config.mode = Modes.ASYNC;
    }
    else if (config.mode == null && 'sync' == options.send.mode || 'sync' == config.mode) {
        config.mode = Modes.SYNC;
    }
}
function parseWorkflow(workflow, options) {
    let parsed_workflow = {};
    parsed_workflow.send = [];
    for (let key in workflow) {
        // let workflow_config: any = parsed_workflow[key] = {}
        if ('send' == key) {
            let send = parsed_workflow[key] = parsed_workflow[key] || [];
            let config = workflow[key];
            if (!Array.isArray(config)
                && 'object' == typeof config) {
                let pconfig = { ...config };
                determineMode(pconfig, options);
                send.push(pconfig);
            }
            else if (Array.isArray(config)) {
                for (let obj of config) {
                    let child_config = { ...obj };
                    determineMode(child_config, options);
                    // console.log(child_config)
                    send.push(child_config);
                }
            }
        }
        else if ('entry' == key) {
            // process entry
            parsed_workflow[key] = !('object' == typeof workflow[key])
                ? workflow[key] : { ...workflow[key] };
        }
    }
    return parsed_workflow;
}
async function workflowRun(seneca, config, results) {
    if ('post' == config.type) {
        try {
            let result = await seneca.post(config.msg);
            results.push(result);
        }
        catch (error) {
            // handle error
            throw error;
        }
    }
    else if ('act' == config.type) {
        seneca.act(config.msg, function (err, result) {
            if (null == err) {
                results.push(result);
            }
            else {
                // handle error
                throw err;
            }
        });
    }
}
class BatchProcessClass {
    constructor(name, id, process_workflow, preprocess, process) {
        this.name = name;
        this.id = id;
        this.process_workflow = process_workflow;
        this.preprocess = preprocess;
        this.process = process;
    }
}
function BatchProcessor(options) {
    const seneca = this;
    let exports = {};
    const instances = options; // alias
    for (let instance in instances) {
        const options = instances[instance];
        const Patrun = seneca.util.Patrun;
        const Jsonic = seneca.util.Jsonic;
        const Deep = seneca.util.deepextend;
        const generate_id = options.generate_id || seneca.util.Nid;
        const BatchId = generate_id();
        // console.log('instance name: ', instance)
        // console.dir(options, { depth: null })
        function evaluateMessage(ctx, out, msg, body = null) {
            msg = Object.assign(typeof msg == 'string' ? Jsonic(msg) : { ...msg }, body);
            // console.log(i++, msg)
            let new_msg = {};
            for (let key in msg) {
                let type = msg[key].split('~').pop();
                let value = inks_1.default.evaluate(msg[key], { out, ctx }, { sep: '~' });
                // console.log('type, value: ', [msg[key], type, value])
                if (null != value && Types[type]) {
                    // console.log(value.constructor, [ expr({ src: type, val: value }).t ] )
                    if (typeof value !== expr({ src: type, val: value }).t) {
                        throw new TypeError("Invalid Type");
                    }
                }
                new_msg[key] = null == value ? msg[key] : value;
            }
            return new_msg;
        }
        let wheres = new Patrun({ gex: true });
        // Prepare/Preprocess config
        for (const message_whence in options.where) {
            let match = (options.where[message_whence].match);
            let pattern = Jsonic(message_whence);
            for (const message_pattern in match) {
                // console.log(message_pattern, pattern)
                // console.log('match: ', match)
                let workflow = match[message_pattern];
                let pat_out = ALL == message_pattern ? '' : Jsonic(message_pattern);
                let matcherInst = wheres.find(pattern) || new Matcher(new Patrun({ gex: true }));
                // console.log('workflow: ', workflow)
                let parsed = parseWorkflow(workflow, options);
                // console.log('parsed workflow: ')
                // console.dir(parsed, { depth: null })
                matcherInst.add_pattern(pat_out, parsed);
                wheres.add(pattern, matcherInst);
            }
        }
        // console.log('whereas: ', wheres, BatchId)
        function preprocess(seneca, ctx, out = {}, meta = { custom: {} }, run = false) {
            var _a, _b;
            const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function (...args) { };
            const whence = (_b = (_a = seneca.private$) === null || _a === void 0 ? void 0 : _a.act) === null || _b === void 0 ? void 0 : _b.msg;
            let results = ctx.result$ = ctx.result$ || [];
            // console.log(whence, wheres.list())
            let where = wheres.find(whence);
            let workflow = null;
            let output_workflow = {
                whence,
                entry: { state: 'done', info: {} },
                send: []
            };
            out = { ...out };
            if (null == where) {
                throw new Error("whence not found!");
            }
            // console.log(where.find(out), out)
            if (workflow = where.find(out)) {
                // entry report
                if (null != workflow.entry) {
                    let entry = workflow.entry;
                    entry = 'string' == typeof entry ? { state: entry } : entry;
                    let info = null != entry.info ?
                        evaluateMessage(ctx, out, entry.info) : null;
                    output_workflow.entry = {
                        state: entry.state,
                        info: info || ('fail' === entry.state ? { why: 'batch-process-no-match' } : {})
                    };
                }
                const send = workflow.send;
                for (let config of send) {
                    let { msg, body } = config;
                    let msg_evld = evaluateMessage(ctx, out, msg, body);
                    // console.log('preprocess: ', config, msg_evld)
                    // seneca.private$.actrouter.find(msg_evld)
                    /*
                       if(run) {
          
                       if(Modes.ASYNC == config.mode) {
                       try {
                       let result = await seneca.post(msg_evld)
                       results.push(result)
                       } catch(error) {
                    // handle error
                    throw error
                    }
                    }
          
          
                    } else {
                     */
                    output_workflow.send.push({
                        msg: msg_evld,
                        type: Modes.ASYNC == config.mode ? 'post' : 'act',
                        run: Modes.ASYNC == config.mode ?
                            (async function () {
                                try {
                                    let result = await seneca.post(msg_evld, { meta$: meta });
                                    results.push(result);
                                }
                                catch (error) {
                                    // handle error
                                    throw error;
                                }
                            }) :
                            (function () {
                                seneca.act(msg_evld, function (err, result) {
                                    if (null == err) {
                                        results.push(result);
                                    }
                                    else {
                                        // handle error
                                        throw err;
                                    }
                                });
                            })
                    });
                    // }
                    // workflowRun(seneca, msg_evld, config)
                }
                // console.log(workflow, out)
            }
            // TODO: Refactor into one loop for multiple outgoing messages
            output_workflow.run = async function () {
                let entry = output_workflow.entry;
                for (let { run } of output_workflow.send) {
                    await run();
                }
                BatchMonitorEntry(entry.state, entry.info);
                out.run = out.run || ('R' + generate_id());
                out.batch = out.batch || ('B' + humanify());
                return out;
            };
            // console.log('preprocess: ')
            // console.dir(output_workflow, { depth: null })
            return output_workflow;
        }
        async function process_workflow(workflowExec, ctx, out = {}) {
            const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function (...args) { };
            const { whence, entry, send } = workflowExec;
            // console.log(whence, wheres.list())
            let where = wheres.find(whence);
            let results = ctx.result$ = ctx.result$ || [];
            out = { ...out };
            if (null == where) {
                throw new Error("whence not found!");
            }
            // console.log(where.find(out), out)
            for (let config of send) {
                await workflowRun(seneca, config, results);
            }
            BatchMonitorEntry(entry.state, entry.info);
            out.run = out.run || ('R' + generate_id());
            out.batch = out.batch || ('B' + humanify());
            return out;
        }
        async function process(seneca, ctx, out = {}, meta = { custom: {} }) {
            let workflow = preprocess(seneca, ctx, out, meta);
            out = await workflow.run();
            return out;
        }
        exports[instance] = new BatchProcessClass(instance, BatchId, process_workflow, preprocess, process);
    }
    return {
        exports,
    };
}
// Default options.
const defaults = {
/*
b01: {
debug: false,
send: {
mode: 'async'
},
where: {},
}
 */
};
Object.assign(BatchProcessor, { defaults });
exports.default = BatchProcessor;
if ('undefined' !== typeof module) {
    module.exports = BatchProcessor;
}
//# sourceMappingURL=BatchProcessor.js.map