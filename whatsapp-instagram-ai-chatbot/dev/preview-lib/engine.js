// ============================================================================
// Mini n8n executor for the local preview.
// Walks the REAL workflow JSON (nodes + connections), runs the REAL Code nodes
// and evaluates the REAL n8n expressions of Set / IF / Switch nodes. Only the
// provider nodes (Google Sheets, Google Calendar, Gmail, WhatsApp, HTTP
// Request, Crypto) are replaced by simulators supplied by the caller.
// It supports exactly the node features this workflow uses; it is not a
// general n8n runtime.
// ============================================================================
const { DateTime } = require('luxon');

const KIND = {
  'n8n-nodes-base.code': 'real',
  'n8n-nodes-base.set': 'logic',
  'n8n-nodes-base.if': 'logic',
  'n8n-nodes-base.switch': 'logic',
  'n8n-nodes-base.noOp': 'logic',
  'n8n-nodes-base.respondToWebhook': 'logic',
  'n8n-nodes-base.whatsAppTrigger': 'entry',
  'n8n-nodes-base.webhook': 'entry',
  'n8n-nodes-base.googleSheets': 'simulated',
  'n8n-nodes-base.googleCalendar': 'simulated',
  'n8n-nodes-base.gmail': 'simulated',
  'n8n-nodes-base.whatsApp': 'simulated',
  'n8n-nodes-base.httpRequest': 'simulated',
  'n8n-nodes-base.crypto': 'simulated',
};

const KIND_LABEL = {
  real: 'Real Code node — executed as-is',
  logic: 'Real n8n expressions — evaluated locally',
  entry: 'Trigger — fed with the demo message',
  simulated: 'Provider node — simulated locally',
};

function evalJs(code, scope) {
  // n8n expressions are JavaScript; the same globals the workflow uses are provided.
  return new Function('$', '$json', '$now', 'DateTime', '$execution', `return (${code});`)(scope.$, scope.$json, scope.$now, DateTime, scope.$execution);
}

function evalExpr(value, scope) {
  if (typeof value !== 'string' || !value.startsWith('=')) return value;
  const tpl = value.slice(1);
  const parts = tpl.match(/\{\{[\s\S]*?\}\}/g) || [];
  const single = parts.length === 1 && tpl.trim() === parts[0];
  if (single) return evalJs(parts[0].slice(2, -2), scope);                 // keeps the JS type (boolean, number, object)
  return tpl.replace(/\{\{([\s\S]*?)\}\}/g, (_, e) => {
    const v = evalJs(e, scope);
    return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  });
}

function evalDeep(value, scope) {
  if (Array.isArray(value)) return value.map((v) => evalDeep(v, scope));
  if (value && typeof value === 'object') {
    if (value.__rl) return evalExpr(value.value, scope);                   // resource locator → its value
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, evalDeep(v, scope)]));
  }
  return evalExpr(value, scope);
}

function castType(v, type) {
  if (type === 'number') return v === '' || v === null || v === undefined ? null : Number(v);
  if (type === 'boolean') return v === true || v === 'true';
  if (type === 'string') return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return v;
}

function conditionHolds(c, scope) {
  const left = evalExpr(c.leftValue, scope);
  const right = evalExpr(c.rightValue, scope);
  const { type, operation } = c.operator;
  if (type === 'boolean' && operation === 'true') return left === true;
  if (type === 'boolean' && operation === 'false') return left === false;
  if (type === 'string' && operation === 'equals') return String(left) === String(right);
  if (type === 'string' && operation === 'notEquals') return String(left) !== String(right);
  throw new Error(`preview engine: unsupported condition ${type}/${operation}`);
}

function filterHolds(filter, scope) {
  const results = filter.conditions.map((c) => conditionHolds(c, scope));
  return filter.combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
}

class WorkflowEngine {
  constructor(workflow, simulators) {
    this.workflow = workflow;
    this.simulators = simulators;
    this.nodes = Object.fromEntries(workflow.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').map((n) => [n.name, n]));
    this.connections = workflow.connections;
  }

  // Runs one execution starting at a trigger node. Returns { trace, runs, error }.
  run(startNode, startItems, ctx) {
    const runs = {};
    const trace = [];
    const execution = { id: `preview-${Date.now()}`, mode: 'test' };
    const $ = (name) => {
      const r = runs[name];
      if (!r) throw new Error(`Referenced node "${name}" has not been executed in this run`);
      return { first: () => r.outputs[0][0], all: () => r.outputs[0], last: () => r.outputs[0][r.outputs[0].length - 1], isExecuted: true };
    };
    const scopeFor = (item) => ({ $, $json: item ? item.json : {}, $now: DateTime.now(), $execution: execution });
    const queue = [{ name: startNode, items: startItems }];
    let step = 0;
    let error = null;

    while (queue.length) {
      const { name, items } = queue.shift();
      const node = this.nodes[name];
      if (!node) throw new Error(`preview engine: unknown node ${name}`);
      const kind = KIND[node.type] || 'logic';
      const inputItems = node.executeOnce ? items.slice(0, 1) : items;
      const entry = { step: ++step, node: name, type: node.type.replace('n8n-nodes-base.', ''), kind, kindLabel: KIND_LABEL[kind], input: items.length, outputs: [], summary: '', data: null };
      let outputs;
      try {
        outputs = this.execute(node, inputItems, { ...ctx, $, scopeFor, runs, execution, trace: entry });
      } catch (e) {
        if (node.onError === 'continueRegularOutput') {
          outputs = [[{ json: { error: e.message } }]];
          entry.summary = `Error → continued (onError: continueRegularOutput): ${e.message}`;
        } else {
          entry.summary = `Error: ${e.message}`;
          entry.error = true;
          trace.push(entry);
          error = { node: name, message: e.message };
          break;
        }
      }
      if (node.alwaysOutputData && outputs.every((o) => !o || o.length === 0)) outputs = [[{ json: {} }]];
      outputs = outputs.map((o) => o || []);
      runs[name] = { outputs };
      entry.outputs = outputs.map((o) => o.length);
      if (!entry.data && outputs[0] && outputs[0][0]) entry.data = outputs[0][0].json;
      trace.push(entry);
      const conns = (this.connections[name] && this.connections[name].main) || [];
      conns.forEach((targets, outputIndex) => {
        const out = outputs[outputIndex] || [];
        if (!out.length) return;
        for (const t of targets) queue.push({ name: t.node, items: out });
      });
    }
    return { trace, runs, error };
  }

  execute(node, items, ctx) {
    const p = node.parameters || {};
    const t = node.type;
    const tr = ctx.trace;

    if (t === 'n8n-nodes-base.whatsAppTrigger' || t === 'n8n-nodes-base.webhook') {
      tr.summary = `${items.length} inbound item(s)`;
      return [items];
    }
    if (t === 'n8n-nodes-base.code') {
      const $input = { all: () => items, first: () => items[0], last: () => items[items.length - 1] };
      const out = new Function('$input', '$', 'DateTime', p.jsCode)($input, ctx.$, DateTime) || [];
      tr.summary = `${out.length} item(s) returned`;
      return [out.map((i) => (i && i.json ? i : { json: i }))];
    }
    if (t === 'n8n-nodes-base.set') {
      const out = items.map((item) => {
        const scope = ctx.scopeFor(item);
        const json = {};
        for (const a of p.assignments.assignments) json[a.name] = castType(evalExpr(a.value, scope), a.type);
        return { json: p.includeOtherFields ? { ...item.json, ...json } : json };
      });
      tr.summary = `${p.assignments.assignments.length} field(s) set`;
      return [out];
    }
    if (t === 'n8n-nodes-base.if') {
      const yes = [], no = [];
      for (const item of items) (filterHolds(p.conditions, ctx.scopeFor(item)) ? yes : no).push(item);
      tr.summary = yes.length ? 'true' : 'false';
      return [yes, no];
    }
    if (t === 'n8n-nodes-base.switch') {
      const outs = p.rules.values.map(() => []);
      for (const item of items) {
        const idx = p.rules.values.findIndex((r) => filterHolds(r.conditions, ctx.scopeFor(item)));
        if (idx >= 0) outs[idx].push(item);
      }
      const taken = p.rules.values.map((r, i) => (outs[i].length ? r.outputKey : null)).filter(Boolean);
      tr.summary = taken.length ? `→ ${taken.join(', ')}` : 'no rule matched';
      return outs;
    }
    if (t === 'n8n-nodes-base.noOp' || t === 'n8n-nodes-base.respondToWebhook') {
      tr.summary = t.endsWith('noOp') ? 'stop' : `responds ${p.options && p.options.responseCode}`;
      return [items];
    }
    // ---------------------------------------------------------------- simulated providers
    const sim = this.simulators;
    const params = evalDeep(p, ctx.scopeFor(items[0]));
    const perItem = (fn) => items.map((item) => fn(evalDeep(p, ctx.scopeFor(item)), item));
    if (t === 'n8n-nodes-base.crypto') return [perItem((pp, item) => sim.crypto(pp, item, ctx, tr))];
    if (t === 'n8n-nodes-base.googleSheets') return [sim.googleSheets(params, items, ctx, tr)];
    if (t === 'n8n-nodes-base.googleCalendar') return [sim.googleCalendar(params, items, ctx, tr)];
    if (t === 'n8n-nodes-base.gmail') return [perItem((pp) => sim.gmail(pp, ctx, tr))];
    if (t === 'n8n-nodes-base.whatsApp') return [perItem((pp) => sim.whatsApp(pp, ctx, tr))];
    if (t === 'n8n-nodes-base.httpRequest') return [perItem((pp, item) => sim.httpRequest(pp, item, ctx, tr))];
    throw new Error(`preview engine: no handler for node type ${t}`);
  }
}

module.exports = { WorkflowEngine, KIND, KIND_LABEL, evalExpr };
