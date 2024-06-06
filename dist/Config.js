"use strict";
/* Copyright © 2022 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
// FEATURE: subsets of keys by dot separators.
function Config(options) {
    const seneca = this;
    const { Default } = seneca.valid;
    // TODO: entity needs exported util for this
    const canon = ('string' === typeof options.canon.zone ? options.canon.zone : '-') + '/' +
        ('string' === typeof options.canon.base ? options.canon.base : '-') + '/' +
        ('string' === typeof options.canon.name ? options.canon.name : '-');
    seneca
        .fix('sys:config')
        .message('get:val', { key: String }, msgGetVal)
        .message('set:val', { key: String }, msgSetVal)
        .message('init:val', { key: String, existing: Default(false) }, msgInitVal)
        .message('list:val', { q: {}, }, msgListVal)
        .message('map:val', { prefix: String }, msgMapVal);
    async function msgGetVal(msg) {
        const seneca = this;
        const key = msg.key;
        const entry = await seneca.entity(canon).load$(key);
        return {
            ok: null != entry,
            key,
            val: entry === null || entry === void 0 ? void 0 : entry.val,
            entry: entry === null || entry === void 0 ? void 0 : entry.data$(false),
        };
    }
    async function msgSetVal(msg) {
        const seneca = this;
        const key = msg.key;
        const val = msg.val;
        let entry = await seneca.entity(canon).load$(key);
        // Entry must exist
        if (null == entry) {
            return {
                ok: false,
                why: 'key-not-found'
            };
        }
        entry.val = val;
        entry = await entry.save$();
        return {
            ok: true,
            key,
            val: entry.val,
            entry: entry.data$(false),
        };
    }
    // Use this to create vals
    async function msgInitVal(msg) {
        const seneca = this;
        const key = msg.key;
        const val = msg.val;
        const existing = true === msg.existing;
        let entry = await seneca.entity(canon).load$(key);
        // Entry must not exist
        if (null != entry) {
            // DO NOT OVERRIDE EXISTING
            if (existing) {
                return {
                    ok: true,
                    why: 'existing',
                    key,
                    val: entry.val,
                    entry: entry.data$(false),
                };
            }
            return {
                ok: false,
                why: 'key-exists'
            };
        }
        // Up to options.numpart parts
        let parts = key.split('.').filter((p) => '' != p);
        parts = [...Array(options.numparts).keys()].map(i => null == parts[i] ? '' : parts[i]);
        let data = {
            id$: key,
            key,
            val: val,
        };
        for (let pI = 0; pI < options.numparts - 1; pI++) {
            let subparts = [];
            for (let sI = 0; sI < pI + 1; sI++) {
                subparts.push(parts[sI]);
            }
            data['p' + pI] = subparts.join('.');
        }
        // console.log('DATA', data)
        entry = await seneca.entity(canon).data$(data).save$();
        return {
            ok: true,
            key,
            val: entry.val,
            entry: entry.data$(false),
        };
    }
    async function msgListVal(msg) {
        const seneca = this;
        let q = msg.q || {};
        let list = await seneca.entity(canon).list$(q);
        list = list.map((entry) => entry.data$(false));
        return {
            ok: true,
            list,
        };
    }
    async function msgMapVal(msg) {
        const seneca = this;
        const prefix = msg.prefix;
        const parts = prefix.split('.').filter((p) => '' != p).slice(0, options.numparts);
        const q = {};
        if (options.numparts === parts.length) {
            q.id = prefix;
        }
        else {
            q['p' + (parts.length - 1)] = parts.join('.');
        }
        // console.log('Q', q)
        let list = await seneca.entity(canon).list$(q);
        list = list.map((entry) => entry.data$(false));
        const map = list.reduce((a, entry) => (a[entry.id] = entry.val, a), {});
        return {
            ok: true,
            list,
            map,
        };
    }
}
// Default options.
const defaults = {
    // TODO: Enable debug logging
    debug: false,
    numparts: 8,
    canon: {
        zone: undefined,
        base: 'sys',
        name: 'config',
    }
};
Object.assign(Config, { defaults });
exports.default = Config;
if ('undefined' !== typeof module) {
    module.exports = Config;
}
//# sourceMappingURL=Config.js.map