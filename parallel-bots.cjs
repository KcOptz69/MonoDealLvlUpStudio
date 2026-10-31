"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelBotTimers = void 0;
exports.parallelBotActors = parallelBotActors;
exports.parallelBotContext = parallelBotContext;
// Each bot keeps its own clock while other players act or submit payments.
class ParallelBotTimers {
    context = '';
    timers = new Map();
    sync(actors, context, delay, run) {
        if (context !== this.context) {
            this.clear();
            this.context = context;
        }
        const active = new Set(actors);
        for (const [actor, timer] of this.timers)
            if (!active.has(actor)) {
                clearTimeout(timer);
                this.timers.delete(actor);
            }
        for (const actor of active)
            if (!this.timers.has(actor)) {
                const timer = setTimeout(() => { this.timers.delete(actor); run(actor); }, delay());
                this.timers.set(actor, timer);
            }
    }
    clear() { for (const timer of this.timers.values())
        clearTimeout(timer); this.timers.clear(); this.context = ''; }
}
exports.ParallelBotTimers = ParallelBotTimers;
function parallelBotActors(game, isBot) {
    if (game.s.winner !== null)
        return [];
    if (game.isSetup())
        return game.s.players.flatMap((p, i) => !p.setupDone && !p.forfeited && isBot(i) ? [i] : []);
    const pending = game.s.pending;
    if (pending?.kind !== 'payment')
        return [];
    return [...new Set((pending.payments?.map((e) => e.target) ?? [pending.responder]))].filter(i => isBot(i) && !game.p(i)?.forfeited);
}
function parallelBotContext(game) {
    if (game.isSetup())
        return 'setup';
    const pending = game.s.pending;
    return pending?.kind === 'payment' ? `payment:${game.s.turnSerial}:${pending.e?.actor}:${pending.e?.key}:${game.s.events?.filter((e) => e.type === 'charge').at(-1)?.seq ?? 0}` : 'none';
}
