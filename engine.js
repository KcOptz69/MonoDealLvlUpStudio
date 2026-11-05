(function(root){const exports={};
"use strict";
/* Monopoly Deal Lvl. Up — rules engine for React */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealEngine = exports.Game = exports.BOT_NAMES = exports.COLORS = exports.PROTECTED_ESTATE = void 0;
exports.estatePayment = estatePayment;
// Purchased endgame set: kept outside transferable property zones.
exports.PROTECTED_ESTATE = { key: 'protected_estate', name: 'Protected Estate', copies: 0, value: 0, type: 'property', colors: [], text: 'Counts as one complete set. Cannot be stolen, transferred or used as payment. One per player. Purchase for 20M from round 10.' };
function estatePayment(bank, definition) {
    const dp = new Map([[0, []]]);
    for (const c of bank) {
        const value = definition(c).value;
        if (value <= 0)
            continue;
        for (const [sum, ids] of [...dp]) {
            const next = sum + value;
            if (!dp.has(next) || dp.get(next).length > ids.length + 1)
                dp.set(next, [...ids, c.id]);
        }
    }
    return [...dp].filter(([sum]) => sum >= 20).sort((a, b) => a[0] - b[0] || a[1].length - b[1].length)[0]?.[1] || [];
}
exports.COLORS = {
    Brown: { size: 2, rent: [1, 2], hex: '#8b5438' },
    'Light Blue': { size: 3, rent: [1, 2, 3], hex: '#62c9ef' },
    Pink: { size: 3, rent: [1, 2, 4], hex: '#eb62aa' },
    Orange: { size: 3, rent: [1, 3, 5], hex: '#f58a21' },
    Red: { size: 3, rent: [2, 3, 6], hex: '#e74443' },
    Yellow: { size: 3, rent: [2, 4, 6], hex: '#ebc83d' },
    Green: { size: 3, rent: [2, 4, 7], hex: '#2dad70' },
    'Dark Blue': { size: 2, rent: [3, 8], hex: '#2656a7' },
    Railroad: { size: 4, rent: [1, 2, 3, 4], hex: '#46505a' },
    Utility: { size: 2, rent: [1, 2], hex: '#a66bdf' },
    Silver: { size: 3, rent: [2, 3, 5], hex: '#bfc7d2' },
};
exports.BOT_NAMES = [
    'Dian Bot', 'Karl Bot', 'Anren Bot', 'Steph Bot', 'Trix Bot',
    'Poala Bot', 'Alvin Bot', 'Ken Bot', 'Nica Bot'
];
class Game {
    defs;
    random;
    s;
    constructor(defs, n = 3, random = Math.random, options = {}) {
        this.defs = defs;
        this.random = random;
        const botNames = [...exports.BOT_NAMES];
        this.shuffle(botNames);
        this.s = {
            version: 1,
            roundLimit: options.roundLimit === 10 ? 10 : null,
            fastBots: !!options.fastBots,
            roundCompleted: [],
            players: Array.from({ length: n }, (_, i) => ({
                name: i === 0 ? 'You' : botNames[i - 1],
                tokenIndex: i,
                hand: [],
                bank: [],
                groups: [],
                special: [],
                defending: false,
                setupPlayed: 0,
                setupDone: false,
            })),
            deck: [],
            discard: [],
            turn: 0,
            played: 0,
            pending: null,
            queue: [],
            log: [],
            winner: null,
            nextId: 1,
            round: 1,
            phase: 'setup',
            setupTurnsLeft: n,
            events: [],
            eventSeq: 0,
        };
        for (const d of defs) {
            for (let i = 0; i < d.copies; i++) {
                this.s.deck.push({ id: 'c' + this.s.nextId++, key: d.key });
            }
        }
        this.shuffle(this.s.deck);
        for (let i = 0; i < n; i++)
            this.draw(i, 7);
        this.s.turn = Math.floor(this.random() * n);
        this.s.startPlayer = this.s.turn;
        this.log('First player (random): ' + this.p(this.s.turn).name + '.');
        this.begin();
    }
    isSetup() { return this.s.phase === 'setup'; }
    used(i) { return this.isSetup() ? (this.p(i).setupPlayed || 0) : this.s.played; }
    canAct(i) { return this.s.winner === null && (this.isSetup() ? !this.p(i).setupDone : this.s.turn === i); }
    migrateSetup() {
        if (!this.isSetup() || this.s.players.every((p) => p.setupPlayed !== undefined))
            return;
        const finished = this.s.players.length - this.s.setupTurnsLeft;
        this.s.players.forEach((p, i) => {
            const offset = (i - this.s.startPlayer + this.s.players.length) % this.s.players.length;
            p.setupDone = offset < finished;
            p.setupPlayed = p.setupDone ? 3 : offset === finished ? this.s.played : 0;
        });
    }
    event(type, data = {}) {
        this.s.eventSeq = (this.s.eventSeq || 0) + 1;
        (this.s.events || (this.s.events = [])).push({ seq: this.s.eventSeq, type, setup: this.isSetup(), turnId: this.s.turnSerial || 0, ...data });
        this.s.events = this.s.events.slice(-120);
    }
    d(c) { return c.key === 'protected_estate' ? exports.PROTECTED_ESTATE : this.defs.find(d => d.key === c.key); }
    p(i) { return this.s.players[i]; }
    log(t) { this.s.log.unshift(t); this.s.log = this.s.log.slice(0, 100); }
    shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
    }
    has(i, key) { return this.p(i).special.some((c) => c.key === key); }
    limit(i) { return this.isSetup() ? 3 : this.has(i, 'corporate_headquarters') ? 4 : 3; }
    trigger(i, key, message, amount) { const card = this.p(i).special.find((c) => c.key === key) || { id: 'trigger-' + key, key }; this.event('special_trigger', { actor: i, card: { ...card }, key, message, amount }); }
    handLimit(i) { return this.has(i, 'private_vault') ? 9 : 7; }
    draw(i, n) {
        const cards = [];
        for (let j = 0; j < n; j++) {
            if (!this.s.deck.length && this.s.discard.length) {
                this.s.deck = this.s.discard.splice(0);
                for (let k = 0; k < 10; k++)
                    this.s.deck.push({ id: 'wildmint' + this.s.nextId++, key: 'multicolor_wildcard', generated: true });
                this.s.minted = (this.s.minted || 0) + 10;
                this.s.deckRefreshes = (this.s.deckRefreshes || 0) + 1;
                this.shuffle(this.s.deck);
                this.log('The discard pile was reshuffled. Added 10 all-color Property Wilds.');
            }
            if (this.s.deck.length) {
                const c = this.s.deck.pop();
                this.p(i).hand.push(c);
                cards.push({ ...c });
            }
        }
        if (cards.length)
            this.event('draw', { actor: i, cards });
    }
    full(g) { return g.cards.length === exports.COLORS[g.color].size && g.cards.some((c) => this.d(c).value > 0); }
    sets(i) { return new Set(this.p(i).groups.filter((g) => this.full(g)).map((g) => g.color)).size + (this.p(i).protectedEstate ? 1 : 0); }
    fieldPropertyCount(i) { return this.allProps(i).length + (this.p(i).protectedEstate ? 1 : 0); }
    check() {
        for (let i = 0; i < this.s.players.length; i++) {
            const p = this.p(i), supported = new Set(p.groups.filter((g) => g.cards.some((c) => c.key !== 'expansion_property')).map((g) => g.color));
            const lost = [];
            for (const group of p.groups) {
                if (!supported.has(group.color)) {
                    const unsupported = group.cards.filter((c) => c.key === 'expansion_property');
                    lost.push(...unsupported);
                    group.cards = group.cards.filter((c) => c.key !== 'expansion_property');
                    if (unsupported.length && !this.full(group))
                        for (const key of ['house', 'hotel'])
                            if (group[key]) {
                                p.hand.push(group[key]);
                                delete group[key];
                            }
                }
            }
            if (lost.length) {
                p.groups = p.groups.filter((g) => g.cards.length);
                this.s.discard.push(...lost);
                this.event('discard', { actor: i, cards: lost.map(c => ({ ...c })), message: 'Expansion Property lost its matching-color support' });
                this.log(p.name + ' discarded ' + lost.length + ' unsupported Expansion ' + (lost.length === 1 ? 'Property.' : 'Properties.'));
                this.insurance(i, lost.length, !this.isSetup() && this.has(i, 'insurance_agency'));
            }
        }
        for (let i = 0; i < this.s.players.length; i++) {
            if (this.sets(i) < 3 && this.p(i).defending) {
                this.p(i).defending = false;
                this.p(i).defenseRemaining = null;
                this.log(this.p(i).name + ' lost their defending status.');
            }
        }
    }
    begin() {
        const i = this.s.turn;
        const p = this.p(i);
        if (p.forfeited) {
            this.finishTurn(i);
            return;
        }
        if (this.isSetup()) {
            this.s.played = 0;
            if (!this.s.setupStarted) {
                this.s.setupStarted = true;
                this.log('Simultaneous setup: everyone may bank or place properties using 3 actions.');
                this.event('setup_turn');
            }
            return;
        }
        this.s.turnSerial = (this.s.turnSerial || 0) + 1;
        this.s.played = 0;
        p.freeBankUsed = false;
        this.s.turnRefill = false;
        p.botFreeSeen = [];
        if (p.jailed) {
            this.s.pending = { kind: 'jail', responder: i, e: { actor: i, target: i, key: 'jail_bail', amount: 10 } };
            return;
        }
        this.startTurn(i);
    }
    startTurn(i) {
        const p = this.p(i);
        if (p.defending && this.sets(i) >= 3 && p.defenseRemaining == null) {
            this.s.winner = i;
            this.log(p.name + ' held three sets for a full rotation and wins!');
            return;
        }
        if (this.has(i, 'emergency_treasury') && p.bank.reduce((sum, c) => sum + this.d(c).value, 0) < 20) {
            const c = { id: 'mint' + this.s.nextId++, key: 'money_3m', generated: true };
            p.bank.push(c);
            this.s.minted = (this.s.minted || 0) + 1;
            this.event('bank', { actor: i, card: { ...c }, passive: true });
            this.log(p.name + ' gained 3M with Emergency Treasury.');
            this.trigger(i, 'emergency_treasury', '+3M added to bank', 3);
        }
        this.s.turnRefill = p.hand.length === 0;
        const n = p.hand.length ? (this.has(i, 'investment_office') ? 3 : 2) : (this.has(i, 'private_vault') ? 7 : 5);
        this.draw(i, n);
        this.log(p.name + ' drew ' + n + ' cards.');
        if (n === 7)
            this.trigger(i, 'private_vault', 'Empty hand · drew 7 cards', 7);
        if (this.has(i, 'investment_office'))
            this.trigger(i, 'investment_office', n === 3 ? 'Extra draw · drew 3 cards' : 'Start-of-turn draw bonus active', n);
    }
    jail(i, bail) {
        if (!(this.s.pending?.kind === 'jail' || this.s.pending?.kind === 'payment' && this.s.pending.e.key === 'jail_bail') || this.s.pending.responder !== i)
            throw Error('No jail decision requested.');
        const decision = this.s.pending.e;
        if (bail) {
            if (this.assetValue(i) < 10)
                throw Error('Bail requires at least 10M.');
            this.s.pending = { kind: 'payment', responder: i, e: decision };
        }
        else if (decision.defenseBail) {
            this.s.pending = null;
            this.p(i).defending = false;
            this.p(i).defenseRemaining = null;
            this.log(this.p(i).name + ' did not post bail and lost their defense claim.');
            this.finishTurn(this.s.turn, i + 1);
        }
        else {
            this.p(i).jailed = false;
            this.s.pending = null;
            this.log(this.p(i).name + ' skipped their turn in jail.');
            this.finishTurn(i);
        }
    }
    freeBank(i) { return !this.isSetup() && this.has(i, 'free_parking') && !this.p(i).freeBankUsed; }
    freePlay(c, mode) { return mode !== 'bank' && ['community_chest', 'chance', 'bank_withdrawal'].includes(c.key); }
    doubleIds(a) { return a.doubleIds || (a.doubleId ? [a.doubleId] : []); }
    choose(i, value) {
        const p = this.s.pending;
        if (!p || p.responder !== i)
            throw Error('Choice not requested.');
        if (p.kind === 'chance') {
            const cards = p.cards;
            const c = cards.find((c) => c.id === value);
            if (!c)
                throw Error('Choose one revealed card.');
            this.p(i).hand.push(c);
            this.s.discard.push(...cards.filter((x) => x !== c));
            this.event('discard', { actor: i, cards: cards.filter((x) => x !== c) });
            this.log(this.p(i).name + ' kept ' + this.d(c).name + ' from Chance.');
            this.s.pending = null;
            this.nextEffect();
            return;
        }
        if (p.kind === 'expansion') {
            const groups = this.expansionGroups(i, p.card.id);
            const target = groups.find((g) => g.id === value) || groups.find((g) => g.color === value);
            if (!target || !p.colors.includes(target.color) || (p.card.locked && p.card.locked !== target.color))
                throw Error('Choose an existing matching-color set with space.');
            const c = this.removeProp(i, p.card.id, false);
            c.expansionColor = target.color;
            c.expansionOwner = i;
            this.place(i, c, target.color, target.id);
            this.clean(i);
            this.s.pending = null;
            this.nextEffect();
            return;
        }
        throw Error('Invalid choice.');
    }
    group(i, id) { return this.p(i).groups.find((g) => g.id === id); }
    find(i, id) {
        const p = this.p(i);
        const sp = p.special.find((c) => c.id === id);
        if (sp)
            return { card: sp, special: true };
        for (const g of p.groups) {
            const c = g.cards.find((c) => c.id === id);
            if (c)
                return { card: c, group: g };
        }
        return null;
    }
    allProps(i) { return [...this.p(i).special, ...this.p(i).groups.flatMap((g) => g.cards)]; }
    clean(i) {
        const p = this.p(i);
        for (const g of p.groups) {
            if (g.hotel && !g.house) {
                p.hand.push(g.hotel);
                delete g.hotel;
                this.log(p.name + ' returned a Hotel to their hand after losing its House.');
            }
            if (!this.full(g)) {
                for (const k of ['house', 'hotel']) {
                    if (g[k]) {
                        p.hand.push(g[k]);
                        delete g[k];
                        this.log(p.name + ' returned a building to their hand after a set broke.');
                    }
                }
            }
        }
        p.groups = p.groups.filter((g) => g.cards.length);
        this.check();
    }
    removeProp(i, id, clean = true) {
        const f = this.find(i, id);
        if (!f)
            throw Error('Property not found');
        if (f.special)
            this.p(i).special = this.p(i).special.filter((c) => c.id !== id);
        else
            f.group.cards = f.group.cards.filter((c) => c.id !== id);
        if (clean)
            this.clean(i);
        return f.card;
    }
    expansionGroups(i, excludeId) {
        return this.p(i).groups.filter((g) => { const cards = g.cards.filter((c) => c.id !== excludeId); return cards.length < exports.COLORS[g.color].size && cards.some((c) => c.key !== 'expansion_property'); });
    }
    place(i, c, color, gid) {
        const d = this.d(c);
        if (d.type === 'special') {
            this.p(i).special.push(c);
            return;
        }
        if (c.key === 'expansion_property') {
            const owned = c.expansionOwner === i;
            if (owned) {
                color = c.locked || c.expansionColor;
                c.expansionColor = color;
            }
            else {
                const colors = [...new Set(this.expansionGroups(i).map((g) => g.color))];
                if (!colors.length) {
                    delete c.expansionOwner;
                    delete c.expansionColor;
                    this.p(i).hand.push(c);
                    this.log('Expansion Property needs an existing set with space and returned to hand.');
                    return;
                }
                const incoming = c.expansionOwner !== undefined;
                color = c.locked || (color && colors.includes(color) ? color : colors[0]);
                if (c.locked && !colors.includes(c.locked)) {
                    this.p(i).hand.push(c);
                    return;
                }
                c.expansionColor = color;
                c.expansionOwner = i;
                if (incoming && !c.locked)
                    (this.s.expansionChoices || (this.s.expansionChoices = [])).push({ player: i, card: { ...c }, colors });
            }
        }
        color = c.locked || color || this.p(i).groups.find((g) => d.colors.includes(g.color) && g.cards.length < exports.COLORS[g.color].size)?.color || d.colors[0];
        if (!d.colors.includes(color))
            throw Error('That color is not allowed.');
        if (c.key === 'expansion_property' && !gid) {
            const existing = this.expansionGroups(i).find((g) => g.color === color);
            if (existing)
                gid = existing.id;
        }
        let g = gid ? this.group(i, gid) : null;
        if (!g && gid !== '')
            g = this.p(i).groups.find((g) => g.color === color && g.cards.length < exports.COLORS[color].size);
        if (g && (g.color !== color || g.cards.length >= exports.COLORS[color].size))
            throw Error('Choose a matching set with space.');
        if (!g) {
            g = { id: 'g' + this.s.nextId++, color, cards: [] };
            this.p(i).groups.push(g);
        }
        g.cards.push(c);
    }
    takeHand(i, id) {
        const k = this.p(i).hand.findIndex((c) => c.id === id);
        if (k < 0)
            throw Error('Card not in hand');
        return this.p(i).hand.splice(k, 1)[0];
    }
    ready(i) {
        if (this.s.winner !== null)
            throw Error('The game is over.');
        if (this.s.pending)
            throw Error('Resolve the pending response first.');
        if (!this.canAct(i))
            throw Error(this.isSetup() ? 'Your setup is already finished.' : 'Wait for your turn.');
    }
    play(i, id, mode, args = {}) {
        this.ready(i);
        let c = this.p(i).hand.find((c) => c.id === id);
        if (!c)
            throw Error('Card not in hand');
        const d = this.d(c);
        const free = this.freePlay(c, mode) || (mode === 'bank' && this.freeBank(i));
        if (this.used(i) >= this.limit(i) && !free)
            throw Error('No card plays remaining.');
        this.validate(i, c, mode, args);
        c = this.takeHand(i, id);
        if (this.isSetup())
            this.p(i).setupPlayed = (this.p(i).setupPlayed || 0) + 1;
        else if (!free)
            this.s.played++;
        if (this.freePlay(c, mode))
            (this.p(i).botFreeSeen || (this.p(i).botFreeSeen = [])).push(c.id);
        if (mode === 'bank' && free) {
            this.p(i).freeBankUsed = true;
            this.trigger(i, 'free_parking', 'Free bank used · no action spent');
        }
        if (!this.isSetup() && !free && this.s.played === 4)
            this.trigger(i, 'corporate_headquarters', 'Fourth action granted');
        this.event(mode === 'bank' ? 'bank' : ['property', 'wild', 'special'].includes(d.type) ? 'property' : 'play', {
            actor: i,
            card: { ...c },
            color: args.color || c.locked,
            key: c.key,
            target: mode === 'play' && Number.isInteger(args.target) ? args.target : undefined,
            targetAll: mode === 'play' && ((d.type === 'rent' && !d.any) || ['its_my_birthday', 'luxury_tax'].includes(c.key))
        });
        if (mode === 'bank') {
            this.p(i).bank.push(c);
            this.log(this.p(i).name + ' banked ' + d.value + 'M.');
            return;
        }
        if (d.type === 'property' || d.type === 'wild' || d.type === 'special') {
            this.place(i, c, args.color, args.group);
            this.log(this.p(i).name + ' played ' + d.name + '.');
            this.check();
            return;
        }
        if (['house', 'hotel'].includes(c.key)) {
            this.group(i, args.group)[c.key] = c;
            this.log(this.p(i).name + ' added a ' + d.name + '.');
            return;
        }
        this.s.discard.push(c);
        this.log(this.p(i).name + ' played ' + d.name + '.');
        if (c.key === 'bank_withdrawal') {
            const player = this.p(i);
            const index = player.bank.findIndex((card) => card.id === args.bankCard);
            const [recovered] = player.bank.splice(index, 1);
            player.hand.push(recovered);
            this.log(player.name + ' returned ' + this.d(recovered).name + ' from the bank to their hand.');
            return;
        }
        if (c.key === 'community_chest') {
            this.s.players.forEach((p, j) => { if (!p.forfeited)
                this.draw(j, j === i ? 2 : 1); });
            return;
        }
        if (c.key === 'chance') {
            const before = this.p(i).hand.length;
            this.draw(i, 3);
            const cards = this.p(i).hand.splice(before);
            if (!cards.length)
                return;
            this.event('reveal', { actor: i, cards: cards.map((c) => ({ ...c })) });
            this.s.pending = { kind: 'chance', responder: i, cards, e: { actor: i, target: i, key: 'chance' } };
            return;
        }
        if (c.key === 'pass_go') {
            this.draw(i, 2);
            return;
        }
        if (d.type === 'rent') {
            const g = this.group(i, args.group);
            let r = c.key === 'empire_rent' ? this.fieldPropertyCount(i) : this.rent(i, g);
            for (const id of this.doubleIds(args)) {
                const double = this.takeHand(i, id);
                this.s.discard.push(double);
                this.event('play', { actor: i, card: { ...double }, key: double.key });
                this.s.played++;
                r *= 2;
            }
            if (this.has(i, 'luxury_district')) {
                r++;
                this.trigger(i, 'luxury_district', 'Rent increased by 1M', 1);
            }
            const ts = d.any ? [args.target] : this.s.players.map((_, j) => j).filter((j) => j !== i && !this.p(j).forfeited);
            this.s.queue = ts.map((t) => ({
                actor: i,
                target: t,
                key: 'rent',
                cardKey: c.key,
                propertyOnly: c.key !== 'empire_rent' && g?.color === 'Silver',
                amount: Math.max(0, r - (this.has(t, 'rent_controlled_residence') ? 2 : 0))
            }));
        }
        else if (c.key === 'its_my_birthday') {
            this.s.queue = this.s.players.map((_, j) => j).filter((j) => j !== i && !this.p(j).forfeited).map((t) => ({
                actor: i, target: t, key: c.key, amount: 2
            }));
        }
        else if (c.key === 'luxury_tax') {
            this.s.queue = this.s.players.map((_, j) => j).filter((j) => j !== i && !this.p(j).forfeited).map((t) => ({
                actor: i, target: t, key: c.key, amount: 5 * (this.p(t).groups.filter((g) => this.full(g)).length + (this.p(t).protectedEstate ? 1 : 0))
            }));
        }
        else {
            this.s.queue = [{
                    actor: i,
                    target: args.target,
                    key: c.key,
                    ...args,
                    amount: c.key === 'income_tax' ? this.incomeTax(args.target) :
                        ['debt_collector', 'compulsory_purchase'].includes(c.key) ? 5 : 0
                }];
        }
        if ((d.type === 'rent' && !d.any) || ['its_my_birthday', 'luxury_tax'].includes(c.key)) {
            this.s.batch = {
                effects: this.s.queue.map((e) => ({ ...e })),
                remaining: this.s.queue.map((e) => ({ ...e }))
            };
            this.s.queue = [];
            this.nextBatchResponse();
        }
        else {
            this.nextEffect();
        }
    }
    nextBatchResponse() {
        const b = this.s.batch;
        if (!b)
            return;
        const e = b.remaining[0];
        if (e) {
            e.global = true;
            this.s.pending = { kind: 'counter', responder: e.target, responders: b.remaining.map((x) => x.target), deadline: Date.now() + 10000, e, negated: false };
            return;
        }
        this.s.batch = null;
        this.s.queue = b.effects.map((e) => ({ ...e, approved: true }));
        this.nextEffect();
    }
    validate(i, c, mode, a) {
        if (c.evictedTurn === (this.s.turnSerial || 0)) throw Error('An evicted property cannot be played again this turn.');
        const d = this.d(c);
        if (this.isSetup() && mode !== 'bank' && !['property', 'wild', 'special'].includes(d.type)) {
            throw Error('Setup allows banking and property placement only.');
        }
        if (d.type === 'money' && mode !== 'bank')
            throw Error('Money cards must be banked.');
        if (mode === 'bank') {
            if (['property', 'wild', 'special'].includes(d.type))
                throw Error('Properties cannot be banked.');
            return;
        }
        if (['property', 'wild'].includes(d.type)) {
            const color = c.locked || (c.expansionOwner === i ? c.expansionColor : undefined) || a.color || d.colors[0];
            if (c.key === 'expansion_property' && !this.expansionGroups(i).some((g) => g.color === color && (!a.group || g.id === a.group)))
                throw Error('Expansion Property must join an existing matching-color set with space.');
            if (!d.colors.includes(color))
                throw Error('Invalid property color');
            if (a.group) {
                const g = this.group(i, a.group);
                if (!g || g.color !== color || g.cards.length >= exports.COLORS[color].size)
                    throw Error('Set is full or color does not match.');
            }
            return;
        }
        if (c.key === 'bank_withdrawal') {
            if (!this.p(i).bank.some((card) => card.id === a.bankCard && this.category(card) === 'action')) {
                throw Error('Choose an action card from your bank.');
            }
            return;
        }
        if (d.type === 'special' || ['pass_go', 'community_chest', 'chance'].includes(c.key))
            return;
        if (['house', 'hotel'].includes(c.key)) {
            const g = this.group(i, a.group);
            if (!g || !this.full(g) || ['Railroad', 'Utility'].includes(g.color) || g[c.key] || (c.key === 'hotel' && !g.house)) {
                throw Error('Choose a complete color set; Hotel requires a House.');
            }
            return;
        }
        if (c.key === 'i_owe_you')
            throw Error('Use I Owe You when paying a player, or bank it.');
        if (c.key === 'just_say_no')
            throw Error('Use Just Say No when responding to an action, or bank it.');
        if (c.key === 'double_the_rent')
            throw Error('Select a Rent card and enable Double the Rent.');
        if (d.type === 'rent') {
            const g = this.group(i, a.group);
            if (c.key === 'empire_rent') {
                if (!this.fieldPropertyCount(i))
                    throw Error('You need properties to charge Empire Rent.');
            }
            else if (!g || (d.colors && !d.colors.includes(g.color)))
                throw Error('Choose one of your matching property sets.');
            const ids = this.doubleIds(a);
            if (!Array.isArray(ids) || new Set(ids).size !== ids.length || this.s.played + 1 + ids.length > this.limit(i) || ids.some((id) => !this.p(i).hand.some((c) => c.id === id && c.key === 'double_the_rent')))
                throw Error('Each Double the Rent needs a card and enough available plays.');
            if (!d.any)
                return;
        }
        if (['its_my_birthday', 'luxury_tax'].includes(c.key))
            return;
        if (!Number.isInteger(a.target) || a.target === i || (!this.p(a.target) || this.p(a.target).forfeited))
            throw Error('Choose an opponent.');
        if (['sly_deal', 'eviction_notice', 'forced_deal', 'forced_rezoning'].includes(c.key)) {
            const f = this.find(a.target, a.property);
            if (!f)
                throw Error('Choose an opponent property.');
            if (['sly_deal', 'forced_deal'].includes(c.key) && f.group && this.full(f.group)) {
                throw Error('This card cannot take a property from a complete set.');
            }
            if (c.key === 'forced_rezoning' && (this.d(f.card).type !== 'wild' || f.card.locked || !this.d(f.card).colors.includes(a.color))) {
                throw Error('Choose an unlocked wildcard and an allowed color.');
            }
        }
        if (c.key === 'forced_deal') {
            const f = this.find(i, a.own);
            if (!f || (f.group && this.full(f.group)))
                throw Error('Choose your property outside a complete set.');
        }
        if (c.key === 'deal_breaker') {
            const g = this.group(a.target, a.group);
            if (!g || !this.full(g))
                throw Error('Choose a complete opponent set.');
        }
        if (c.key === 'tough_luck' && this.sets(a.target) < 1)
            throw Error('Tough Luck requires a target with at least one complete set.');
        if (c.key === 'tough_luck' && !['property', 'action', 'money'].includes(a.category))
            throw Error('Choose a card category.');
    }
    incomeTax(target) {
        const bankValue = this.p(target).bank.reduce((sum, card) => sum + this.d(card).value, 0);
        return 3 * Math.floor(bankValue / 10);
    }
    rent(i, g) {
        return exports.COLORS[g.color].rent[Math.min(g.cards.length, exports.COLORS[g.color].size) - 1] + (g.house ? 3 : 0) + (g.hotel ? 4 : 0);
    }
    nextEffect() {
        const choices = this.s.expansionChoices;
        while (choices?.length) {
            const choice = choices.shift();
            if (this.find(choice.player, choice.card.id)) {
                this.s.pending = { kind: 'expansion', responder: choice.player, ...choice, colors: [...new Set(this.expansionGroups(choice.player, choice.card.id).map((g) => g.color))], e: { actor: choice.player, target: choice.player, key: 'expansion_property' } };
                return;
            }
        }
        if (!this.s.queue.length) {
            this.s.pending = null;
            this.check();
            return;
        }
        const e = this.s.queue.shift();
        if (['rent', 'luxury_tax', 'income_tax'].includes(e.key) && e.amount === 0) {
            this.log(this.p(e.target).name + ' owes 0M.');
            return this.nextEffect();
        }
        if (e.approved) {
            this.resolve(e);
            return;
        }
        this.s.pending = { kind: 'counter', responder: e.target, deadline: Date.now() + 10000, e, negated: false };
    }
    respond(i, no) {
        const p = this.s.pending;
        if (!p || p.kind !== 'counter' || (p.responders ? !p.responders.includes(i) : p.responder !== i))
            throw Error('No response requested.');
        if (typeof no !== 'boolean')
            throw Error('Choose allow or Just Say No.');
        if (no && p.deadline && Date.now() >= p.deadline)
            throw Error('The reaction timer has expired.');
        const reaction = no ? this.p(i).hand.find((c) => c.key === 'just_say_no') : null;
        if (no && !reaction)
            throw Error('No Just Say No in hand.');
        if (p.responders) {
            if (!no) {
                this.s.batch.remaining = this.s.batch.remaining.filter((e) => e.target !== i);
                p.responders = p.responders.filter((j) => j !== i);
                if (p.responders.length) {
                    p.responder = p.responders[0];
                    return;
                }
                this.nextBatchResponse();
                return;
            }
            p.e = { ...this.s.batch.effects.find((e) => e.target === i), global: true };
            this.s.batch.remaining = this.s.batch.remaining.filter((e) => e.target !== i);
            delete p.responders;
        }
        if (no) {
            const c = reaction;
            this.s.discard.push(this.takeHand(i, c.id));
            p.negated = !p.negated;
            p.deadline = Date.now() + 10000;
            p.responder = i === p.e.actor ? p.e.target : p.e.actor;
            this.log(this.p(i).name + ' played Just Say No.');
            const action = [...this.s.events].reverse().find(e => e.type === 'play' && e.actor === p.e.actor && e.card?.key === (p.e.cardKey || p.e.key));
            this.event('negate', { actor: i, card: { ...c }, blocked: p.negated, targetPlaySeq: action?.seq });
            return;
        }
        this.s.pending = null;
        if (p.negated) {
            if (p.e.key === 'i_owe_you') {
                const debt = this.s.iou;
                this.s.iou = null;
                this.log('I Owe You was blocked; the original bill remains due.');
                this.event('discard', { actor: debt.payer, cards: [{ ...debt.card }] });
                this.s.pending = { kind: 'payment', responder: debt.payer, e: debt.payment };
                return;
            }
            if (p.e.global) {
                this.s.batch = null;
                this.s.queue = [];
                this.log('Just Say No blocked the entire action for everyone.');
            }
            else {
                this.log('The action was blocked for ' + this.p(p.e.target).name + '.');
            }
            this.nextEffect();
            return;
        }
        if (p.e.global) {
            this.nextBatchResponse();
            return;
        }
        this.resolve(p.e);
    }
    insurance(i, n, active) {
        if (n && active) {
            this.draw(i, n);
            this.log(this.p(i).name + ' drew ' + n + ' with Insurance Agency.');
            this.trigger(i, 'insurance_agency', 'Drew ' + n + ' for lost properties', n);
        }
    }
    resolve(e) {
        const i = e.actor;
        const t = e.target;
        const p = this.p(t);
        const ins = this.has(t, 'insurance_agency');
        if (e.key === 'go_to_jail') {
            p.jailed = true;
            this.log(p.name + ' must pay 10M bail or skip their next turn.');
            this.nextEffect();
            return;
        }
        if (e.key === 'i_owe_you') {
            const debt = this.s.iou;
            this.s.iou = null;
            this.s.discard = this.s.discard.filter((c) => c.id !== debt.card.id);
            p.bank.push(debt.card);
            this.log(this.p(i).name + ' gave I Owe You to ' + p.name + ' instead of paying ' + debt.payment.amount + 'M.');
            this.event('payment', { actor: i, target: t, key: 'i_owe_you', amount: 5, owed: debt.payment.amount, cards: [{ ...debt.card }], replacement: true });
            this.nextEffect();
            return;
        }
        if (['rent', 'debt_collector', 'its_my_birthday', 'compulsory_purchase', 'luxury_tax', 'income_tax'].includes(e.key)) {
            if (e.approved && this.s.queue.length) {
                const effects = [e, ...this.s.queue.splice(0)];
                const payable = effects.filter((x) => this.payable(x.target, x).length && x.amount > 0);
                for (const x of effects)
                    this.event('charge', { actor: x.actor, target: x.target, amount: x.amount, key: x.key });
                if (!payable.length) {
                    this.s.pending = null;
                    this.nextEffect();
                    return;
                }
                this.s.pending = { kind: 'payment', responder: payable[0].target, e: payable[0], payments: payable };
                return;
            }
            this.event('charge', { actor: i, target: t, amount: e.amount, key: e.key });
            this.s.pending = { kind: 'payment', responder: t, e };
            if (!this.payable(t, e).length)
                this.pay(t, []);
            return;
        }
        if (['sly_deal', 'forced_deal', 'eviction_notice', 'forced_rezoning'].includes(e.key)) {
            const f = this.find(t, e.property);
            if (!f) {
                this.nextEffect();
                return;
            }
            if (e.key === 'eviction_notice') {
                const c = this.removeProp(t, e.property);
                c.evictedTurn = this.s.turnSerial || 0;
                p.hand.push(c);
                this.event('transfer', { actor: t, target: t, destination: 'hand', cards: [{ ...c }] });
                this.insurance(t, 1, ins);
            }
            else if (e.key === 'forced_rezoning') {
                const same = f.group.color === e.color;
                const old = f.group.id;
                const c = this.removeProp(t, e.property, false);
                c.locked = e.color;
                this.place(t, c, e.color, same ? old : undefined);
                this.clean(t);
                this.log('Wildcard permanently locked to ' + e.color + '.');
            }
            else if (e.key === 'sly_deal') {
                const color = f.group?.color;
                const c = this.removeProp(t, e.property);
                this.place(i, c, color);
                this.event('transfer', { actor: t, target: i, cards: [{ ...c }] });
                this.insurance(t, 1, ins);
            }
            else {
                const own = this.find(i, e.own);
                const insI = this.has(i, 'insurance_agency');
                if (own) {
                    const ca = f.group?.color;
                    const cb = own.group?.color;
                    const a = this.removeProp(t, e.property, false);
                    const b = this.removeProp(i, e.own, false);
                    this.place(i, a, ca);
                    this.place(t, b, cb);
                    this.clean(i);
                    this.clean(t);
                    this.event('transfer', { actor: t, target: i, cards: [{ ...a }] });
                    this.event('transfer', { actor: i, target: t, cards: [{ ...b }] });
                    this.insurance(t, 1, ins);
                    this.insurance(i, 1, insI);
                }
            }
        }
        if (e.key === 'deal_breaker') {
            const g = this.group(t, e.group);
            if (g) {
                p.groups = p.groups.filter((x) => x !== g);
                g.id = 'g' + this.s.nextId++;
                this.p(i).groups.push(g);
                for (const c of g.cards)
                    if (c.key === 'expansion_property') {
                        c.expansionOwner = i;
                        c.expansionColor = g.color;
                        const colors = [...new Set(this.expansionGroups(i, c.id).map((g) => g.color))];
                        if (!c.locked)
                            (this.s.expansionChoices || (this.s.expansionChoices = [])).push({ player: i, card: { ...c }, colors });
                    }
                this.event('transfer', {
                    actor: t,
                    target: i,
                    destination: 'field',
                    cards: [...g.cards, g.house, g.hotel].filter(Boolean).map((c) => ({ ...c }))
                });
                this.insurance(t, g.cards.length, ins);
            }
        }
        if (e.key === 'tough_luck') {
            const take = p.hand.filter((c) => this.category(c) === e.category);
            p.hand = p.hand.filter((c) => !take.includes(c));
            this.p(i).hand.push(...take);
            this.event('tough_luck_result', { actor: i, target: t, category: e.category, cards: take.map((c) => ({ ...c })), destination: 'hand' });
            this.log(this.p(i).name + ' took ' + take.length + ' ' + e.category + ' cards from ' + p.name + '’s hand.');
        }
        this.check();
        this.nextEffect();
    }
    category(c) {
        const d = this.d(c);
        return ['property', 'wild', 'special'].includes(d.type) ? 'property' : d.type === 'money' ? 'money' : 'action';
    }
    payable(i, e) {
        const p = this.p(i);
        const items = [];
        if (!e.propertyOnly && e.key !== 'compulsory_purchase') {
            items.push(...p.bank.map((c) => ({ id: c.id, card: c, zone: 'bank', value: this.d(c).value })));
        }
        items.push(...this.allProps(i).filter((c) => this.d(c).value > 0).map((c) => ({ id: c.id, card: c, zone: 'property', value: this.d(c).value })));
        if (!e.propertyOnly && e.key !== 'compulsory_purchase') {
            for (const g of p.groups) {
                for (const key of ['house', 'hotel']) {
                    if (g[key])
                        items.push({ id: g[key].id, card: g[key], zone: key, group: g.id, value: this.d(g[key]).value });
                }
            }
        }
        return items;
    }
    pay(i, ids) {
        const pending = this.s.pending;
        if (!pending || pending.kind !== 'payment' || (pending.payments ? !pending.payments.some((e) => e.target === i) : pending.responder !== i))
            throw Error('Payment not requested');
        const e = pending.payments?.find((e) => e.target === i) || pending.e;
        const all = this.payable(i, e);
        const picked = ids.map(id => all.find(x => x.id === id));
        if (new Set(ids).size !== ids.length || picked.some(x => !x))
            throw Error('Invalid payment selection');
        const total = all.reduce((s, x) => s + x.value, 0);
        const sum = picked.reduce((s, x) => s + x.value, 0);
        if (e.key === 'jail_bail' && sum < 10)
            throw Error('Bail requires at least 10M.');
        if (sum < Math.min(total, e.amount))
            throw Error('Select enough value, or all available assets if unable to pay.');
        if (e.key === 'luxury_tax' && picked.some(x => x.zone !== 'bank') && all.some(x => x.zone === 'bank' && !ids.includes(x.id))) {
            throw Error('Luxury Tax uses bank cards before properties.');
        }
        const ins = this.has(i, 'insurance_agency');
        if (e.key === 'rent' && this.has(i, 'rent_controlled_residence'))
            this.trigger(i, 'rent_controlled_residence', 'Rent reduced by 2M', 2);
        let lost = 0;
        const receiver = ['luxury_tax', 'income_tax', 'jail_bail'].includes(e.key) ? null : e.actor;
        for (const x of picked) {
            const c = x.card;
            if (x.zone === 'bank')
                this.p(i).bank = this.p(i).bank.filter((c) => c.id !== x.id);
            else if (x.zone === 'property') {
                lost++;
                const f = this.find(i, x.id);
                x.color = f.group?.color;
                this.removeProp(i, x.id, false);
            }
            else {
                const g = this.group(i, x.group);
                delete g[x.zone];
            }
            if (receiver === null)
                this.s.discard.push(c);
            else if (x.zone === 'property')
                this.place(receiver, c, x.color);
            else
                this.p(receiver).bank.push(c);
        }
        this.clean(i);
        this.insurance(i, lost, ins);
        this.log(this.p(i).name + ' paid ' + sum + 'M' + (receiver === null ? ' to the discard pile.' : ' to ' + this.p(receiver).name + '.'));
        this.event('payment', { actor: i, target: receiver, key: e.key, amount: sum, owed: e.amount, cards: picked.map(x => ({ ...x.card })) });
        if (e.key === 'jail_bail') {
            this.p(i).jailed = false;
            this.s.pending = null;
            if (e.defenseBail) {
                if (!this.p(i).forfeited && this.sets(i) >= 3) this.winDefense(i);
                else this.finishTurn(this.s.turn, i + 1);
            } else this.startTurn(i);
            return;
        }
        const remaining = pending.payments?.filter((e) => e.target !== i);
        if (remaining?.length)
            this.s.pending = { kind: 'payment', responder: remaining[0].target, e: remaining[0], payments: remaining };
        else {
            this.s.pending = null;
            this.nextEffect();
        }
    }
    owe(i, id) {
        const p = this.s.pending;
        const payment = p?.kind === 'payment' ? (p.payments?.find((e) => e.target === i) || (p.responder === i ? p.e : null)) : null;
        if (!payment ||  ['luxury_tax', 'income_tax', 'jail_bail'].includes(payment.key))
            throw Error('I Owe You replaces payments to another player only.');
        if (payment.propertyOnly) throw Error('Silver rent can only be paid with properties.');
        const c = this.p(i).hand.find((c) => c.id === id && c.key === 'i_owe_you');
        if (!c)
            throw Error('I Owe You must be in your hand.');
        // Validate before changing the simultaneous payment queue.
        if (p.payments) {
            this.s.queue.unshift(...p.payments.filter((e) => e.target !== i));
            p.e = payment;
            p.responder = i;
            delete p.payments;
        }
        this.takeHand(i, id);
        this.s.discard.push(c);
        this.s.iou = { payer: i, payment: p.e, card: c };
        this.event('play', { actor: i, card: { ...c }, key: c.key });
        this.s.pending = { kind: 'counter', responder: p.e.actor, deadline: Date.now() + 10000, e: { actor: i, target: p.e.actor, key: 'i_owe_you', owed: p.e.amount }, negated: false };
        this.log(this.p(i).name + ' offered I Owe You instead of paying.');
    }
    donate(i, id, target) {
        if (this.s.winner !== null || this.isSetup() || this.s.players.length < 4 || this.s.players.length > 5 || !this.s.players.some((p) => p.defending && !p.forfeited))
            throw Error('Free donations are available only during defense in a 4–5-player game.');
        if (!Number.isInteger(target) || target < 0 || target >= this.s.players.length || target === i || this.p(target).forfeited || this.p(i).forfeited)
            throw Error('Choose another active player.');
        const card = this.takeHand(i, id);
        this.p(target).hand.push(card);
        this.event('donation', { actor: i, target, cards: [{ ...card }], destination: 'hand' });
        this.log(this.p(i).name + ' donated a card to ' + this.p(target).name + '.');
    }
    assetValue(i) {
        return this.p(i).bank.reduce((n, c) => n + this.d(c).value, 0) +
            this.allProps(i).reduce((n, c) => n + this.d(c).value, 0) +
            this.p(i).groups.reduce((n, g) => n + (g.house ? 3 : 0) + (g.hotel ? 4 : 0), 0);
    }
    finishByScore() {
        const active = this.s.players.map((p, i) => !p.forfeited ? i : -1).filter((i) => i >= 0);
        this.s.scoreResults = active.map((i) => { const bank = this.p(i).bank.reduce((n, c) => n + this.d(c).value, 0); const total = this.assetValue(i); return { player: i, bank, field: total - bank, total }; });
        const best = Math.max(...this.s.scoreResults.map((r) => r.total));
        this.s.winners = this.s.scoreResults.filter((r) => r.total === best).map((r) => r.player);
        this.s.winner = this.s.winners[0] ?? null;
        this.s.endReason = 'round-limit';
        this.s.pending = null;
        this.log('Round 10 complete · ' + this.s.winners.map((i) => this.p(i).name).join(' & ') + ' won with ' + best + 'M in bank and field.');
    }
    propertyUtility(i, c, color) {
        const d = this.d(c);
        if (d.type === 'special') {
            const values = {
                corporate_headquarters: 12,
                investment_office: 11,
                insurance_agency: 6,
                emergency_treasury: 13,
                private_vault: this.p(i).hand.length > 6 ? 8 : 4,
                luxury_district: 5,
                rent_controlled_residence: 6
            };
            return values[c.key] || 5;
        }
        const cols = c.locked ? [c.locked] : color ? [color] : d.colors;
        let score = 2;
        for (const col of cols) {
            const g = this.p(i).groups.filter((g) => g.color === col && !this.full(g)).sort((a, b) => b.cards.length - a.cards.length)[0];
            const n = g?.cards.length || 0;
            const completes = n === exports.COLORS[col].size - 1;
            const already = this.p(i).groups.some((g) => g.color === col && this.full(g));
            score = Math.max(score, 3 + n * 2 + (completes ? 10 : 0) + (completes && this.sets(i) >= 2 && !already ? 25 : 0) + (already ? -3 : 1));
        }
        return score;
    }
    autoPayment(i, e) {
        let all = this.payable(i, e);
        const total = all.reduce((s, x) => s + x.value, 0);
        if (total <= e.amount)
            return all.map((x) => x.id);
        let required = [];
        let base = 0;
        if (e.key === 'luxury_tax') {
            const banks = all.filter((x) => x.zone === 'bank');
            const sum = banks.reduce((s, x) => s + x.value, 0);
            if (sum < e.amount) {
                required = banks.map((x) => x.id);
                base = sum;
                all = all.filter((x) => x.zone !== 'bank');
            }
            else {
                all = banks;
            }
        }
        const need = e.amount - base;
        const dp = new Map([[0, { cost: 0, ids: [] }]]);
        for (const x of all) {
            const f = this.find(i, x.id);
            const cost = x.zone === 'bank' ? 0.18 * x.value : x.zone === 'property' ? this.propertyUtility(i, x.card, f?.group?.color) + (f?.group && this.full(f.group) ? 28 : 0) + (this.p(i).defending ? 55 : 0) : x.zone === 'hotel' ? 8 : 14;
            for (const [sum, v] of [...dp]) {
                const next = sum + x.value;
                const c = v.cost + cost;
                if (!dp.has(next) || dp.get(next).cost > c)
                    dp.set(next, { cost: c, ids: [...v.ids, x.id] });
            }
        }
        const best = [...dp].filter(([sum]) => sum >= need).sort((a, b) => (a[1].cost + (a[0] - need) * 0.4) - (b[1].cost + (b[0] - need) * 0.4))[0];
        return [...required, ...(best?.[1].ids || [])];
    }
    move(i, id, color, gid) {
        this.ready(i);
        const f = this.find(i, id);
        if (!f || f.special)
            throw Error('Choose a normal property or wildcard.');
        if (f.card.key === 'expansion_property' && f.card.expansionOwner === i && color !== (f.card.locked || f.card.expansionColor))
            throw Error('Expansion Property color is fixed until ownership changes.');
        if (f.card.locked && color !== f.card.locked)
            throw Error('This wildcard is permanently locked.');
        if (!this.d(f.card).colors.includes(color))
            throw Error('Color not allowed');
        if (gid === f.group.id)
            throw Error('Already in that set');
        const target = gid ? this.group(i, gid) : null;
        if (gid && (!target || target.color !== color || target.cards.length >= exports.COLORS[color].size))
            throw Error('Target set unavailable');
        if (f.card.key === 'expansion_property' && (!target || !this.expansionGroups(i, id).includes(target)))
            throw Error('Expansion Property must connect to an existing set with space.');
        const c = this.removeProp(i, id, false);
        this.place(i, c, color, gid || '');
        this.clean(i);
        this.log(this.p(i).name + ' rearranged a property.');
    }
    moveBuilding(i, from, to, key) {
        this.ready(i);
        const a = this.group(i, from);
        const b = this.group(i, to);
        if (!a?.[key] || !b || !this.full(b) || ['Railroad', 'Utility'].includes(b.color) || b[key] || (key === 'hotel' && !b.house) || (key === 'house' && a.hotel)) {
            throw Error('Cannot move that building there.');
        }
        b[key] = a[key];
        delete a[key];
    }
    canBuyEstate(i) { return !this.isSetup() && this.s.round >= 10 && !this.p(i).forfeited && !this.p(i).estatePurchased && !this.p(i).protectedEstate && this.p(i).bank.reduce((n, c) => n + this.d(c).value, 0) >= 20; }
    estatePayment(i) { return estatePayment(this.p(i).bank, c => this.d(c)); }
    completeEnd(i) {
        if (this.canBuyEstate(i)) {
            this.s.pending = { kind: 'estate', responder: i, e: { actor: i, target: i, key: 'protected_estate', amount: 20 } };
            return;
        }
        this.finishTurn(i);
    }
    estate(i, buy) {
        if (this.s.pending?.kind !== 'estate' || this.s.pending.responder !== i)
            throw Error('No Protected Estate purchase requested.');
        if (typeof buy !== 'boolean')
            throw Error('Choose Buy or Pass.');
        if (buy) {
            if (!this.canBuyEstate(i))
                throw Error('Protected Estate requires round 10+, 20M in the bank and no previous purchase.');
            const ids = this.estatePayment(i), cards = this.p(i).bank.filter((c) => ids.includes(c.id));
            this.p(i).bank = this.p(i).bank.filter((c) => !ids.includes(c.id));
            this.s.discard.push(...cards);
            this.p(i).estatePurchased = true;
            this.p(i).protectedEstate = { id: 'estate' + this.s.nextId++, key: 'protected_estate' };
            const paid = cards.reduce((n, c) => n + this.d(c).value, 0);
            this.event('discard', { actor: i, cards: cards.map((c) => ({ ...c })), message: 'Protected Estate purchase' });
            this.event('estate_purchase', { actor: i, card: { ...this.p(i).protectedEstate } });
            this.log(this.p(i).name + ' purchased Protected Estate for ' + paid + 'M. It counts as one protected complete set.');
        }
        this.s.pending = null;
        this.finishTurn(i);
    }
    end(i, drawUnused = false) {
        this.ready(i);
        if (this.isSetup() && drawUnused)
            throw Error('Unused setup actions cannot draw cards.');
        const p = this.p(i);
        const remaining = Math.max(0, this.limit(i) - this.used(i));
        if (drawUnused && remaining) {
            this.draw(i, remaining);
            this.s.played = this.limit(i);
            this.log(p.name + ' converted ' + remaining + ' unused action' + (remaining === 1 ? '' : 's') + ' into ' + remaining + ' draw' + (remaining === 1 ? '' : 's') + '.');
        }
        if (this.has(i, 'private_vault') && p.hand.length > 7)
            this.trigger(i, 'private_vault', 'Protected up to 9 cards in hand');
        if (p.hand.length > this.handLimit(i)) {
            this.s.pending = { kind: 'discard', responder: i };
            return;
        }
        this.completeEnd(i);
    }
    discard(i, ids) {
        const p = this.s.pending;
        if (p?.kind !== 'discard' || p.responder !== i)
            throw Error('Discard not requested');
        if (ids.length !== this.p(i).hand.length - this.handLimit(i) || new Set(ids).size !== ids.length || ids.some(id => !this.p(i).hand.some((c) => c.id === id))) {
            throw Error('Select exactly the excess cards.');
        }
        const cards = ids.map(id => ({ ...this.p(i).hand.find((c) => c.id === id) }));
        for (const id of ids)
            this.s.discard.push(this.takeHand(i, id));
        this.event('discard', { actor: i, cards });
        this.s.pending = null;
        this.completeEnd(i);
    }
    winDefense(i) {
        this.s.winner = i;
        this.s.endReason = 'defense';
        this.log(this.p(i).name + ' defended three sets through two opponents’ turns and wins!');
    }
    finishTurn(i = this.s.turn, firstDefender = 0) {
        if (this.isSetup()) {
            this.p(i).setupDone = true;
            this.s.setupTurnsLeft = this.s.players.filter((p) => !p.setupDone).length;
            this.log(this.p(i).name + ' is ready.');
            if (this.s.setupTurnsLeft === 0) {
                this.s.phase = 'play';
                this.s.turn = this.s.startPlayer;
                this.s.round = 1;
                this.log('Everyone is ready. Normal play begins.');
                this.event('setup_complete');
                this.begin();
            }
            return;
        }
        this.check();
        // Existing defenders count this opponent's completed turn. A new defense starts afterward.
        for (let j = firstDefender; j < this.s.players.length; j++) {
            const defender = this.p(j);
            if (j !== i && !this.p(i).forfeited && !defender.forfeited && defender.defending && defender.defenseRemaining != null && this.sets(j) >= 3) {
                defender.defenseRemaining = Math.max(0, defender.defenseRemaining - 1);
                if (defender.defenseRemaining === 0) {
                    if (defender.jailed) {
                        this.s.pending = {kind: 'jail', responder: j, e: {actor: j, target: j, key: 'jail_bail', amount: 10, defenseBail: true}};
                    } else this.winDefense(j);
                    return;
                }
            }
        }
        if (this.sets(i) >= 3 && !this.p(i).defending) {
            this.p(i).defending = true;
            this.p(i).defenseRemaining = this.s.players.length >= 4 ? 2 : null;
            this.log(this.p(i).name + (this.s.players.length >= 4 ? ' is defending three sets for two opponents’ turns!' : ' is defending three sets!'));
        }
        const active = this.s.players.map((p, j) => !p.forfeited ? j : -1).filter((j) => j >= 0);
        if (active.length <= 1) {
            this.s.winner = active[0] ?? null;
            return;
        }
        // The completed-player list remains valid if the original starting player forfeits.
        if (!this.s.roundCompleted) {
            this.s.roundCompleted = [];
            let j = this.s.startPlayer ?? 0;
            for (let guard = 0; j !== i && guard < this.s.players.length; guard++, j = (j + 1) % this.s.players.length)
                this.s.roundCompleted.push(j);
        }
        if (!this.s.roundCompleted.includes(i))
            this.s.roundCompleted.push(i);
        const roundDone = active.every((j) => this.s.roundCompleted.includes(j));
        if (roundDone) {
            if (this.s.roundLimit === 10 && this.s.round >= 10) {
                this.finishByScore();
                return;
            }
            this.s.round++;
            this.s.roundCompleted = [];
        }
        this.s.turn = (i + 1) % this.s.players.length;
        while (this.p(this.s.turn).forfeited)
            this.s.turn = (this.s.turn + 1) % this.s.players.length;
        this.begin();
    }
    options(i) {
        if (this.s.pending || !this.canAct(i))
            return [];
        const out = [];
        const p = this.p(i);
        const others = this.s.players.map((_, j) => j).filter((j) => j !== i && !this.p(j).forfeited);
        const push = (c, a = {}, score = 1, mode = 'play') => { if (this.used(i) < this.limit(i) || this.freePlay(c, mode) || (mode === 'bank' && this.freeBank(i)))
            out.push({ id: c.id, mode, args: a, score }); };
        for (const c of p.hand) {
            if (c.evictedTurn === (this.s.turnSerial || 0)) continue;
            const d = this.d(c);
            if (!['property', 'wild', 'special'].includes(d.type)) {
                push(c, {}, (c.key === 'just_say_no' ? -0.5 : d.value * 0.6), 'bank');
            }
            if (d.type === 'special') {
                push(c, {}, 7);
                continue;
            }
            if (['property', 'wild'].includes(d.type)) {
                for (const color of (c.locked || (c.expansionOwner === i && c.expansionColor)) ? [c.locked || c.expansionColor] : d.colors) {
                    if (c.key === 'expansion_property' && !this.expansionGroups(i).some((g) => g.color === color))
                        continue;
                    const gs = p.groups.filter((g) => g.color === color && g.cards.length < exports.COLORS[color].size && (c.key !== 'expansion_property' || this.expansionGroups(i).includes(g)));
                    for (const g of gs)
                        push(c, { color, group: g.id }, 5 + g.cards.length * 2 + (g.cards.length === exports.COLORS[color].size - 1 ? 9 : 0));
                    push(c, { color }, 4 + (exports.COLORS[color].size === 2 ? 1 : 0));
                }
                continue;
            }
            if (c.key === 'pass_go')
                push(c, {}, 4);
            if (['community_chest', 'chance'].includes(c.key))
                push(c, {}, 10);
            if (c.key === 'bank_withdrawal') {
                for (const banked of p.bank) {
                    if (this.category(banked) === 'action' && banked.key !== 'bank_withdrawal') {
                        push(c, { bankCard: banked.id }, 5);
                    }
                }
            }
            if (['house', 'hotel'].includes(c.key)) {
                for (const g of p.groups) {
                    if (this.full(g) && !['Railroad', 'Utility'].includes(g.color) && !g[c.key] && (c.key !== 'hotel' || g.house)) {
                        push(c, { group: g.id }, 5);
                    }
                }
            }
            if (c.key === 'empire_rent') {
                for (const target of others) {
                    const score = this.fieldPropertyCount(i);
                    if (score) {
                        push(c, { target }, score);
                        const ids = p.hand.filter((c) => c.key === 'double_the_rent').slice(0, Math.max(0, this.limit(i) - this.used(i) - 1)).map((c) => c.id);
                        if (ids.length)
                            push(c, { target, doubleIds: ids }, score * 2 ** ids.length);
                    }
                }
            }
            else if (d.type === 'rent') {
                for (const g of p.groups) {
                    if (d.any || d.colors.includes(g.color)) {
                        const ts = d.any ? others : [undefined];
                        for (const target of ts) {
                            const a = { group: g.id, target };
                            const score = this.rent(i, g) * (d.any ? 1 : others.length) * 0.7;
                            push(c, a, score);
                            const double = p.hand.find((c) => c.key === 'double_the_rent');
                            if (double && this.s.played + 2 <= this.limit(i)) {
                                push(c, { ...a, doubleId: double.id }, score * 1.5);
                            }
                        }
                    }
                }
            }
            if (c.key === 'its_my_birthday')
                push(c, {}, others.length * 1.5);
            if (c.key === 'luxury_tax')
                push(c, {}, others.reduce((s, j) => s + this.sets(j) * 5, 0));
            for (const target of others) {
                const danger = this.p(target).defending ? 12 : 0;
                if (c.key === 'debt_collector')
                    push(c, { target }, 4);
                if (c.key === 'income_tax' && this.incomeTax(target) > 0)
                    push(c, { target }, this.incomeTax(target));
                if (c.key === 'go_to_jail' && !this.p(target).jailed)
                    push(c, { target }, 7 + danger);
                if (c.key === 'compulsory_purchase' && this.allProps(target).some((c) => this.d(c).value > 0)) {
                    push(c, { target }, 8 + danger);
                }
                if (c.key === 'deal_breaker') {
                    for (const g of this.p(target).groups) {
                        if (this.full(g))
                            push(c, { target, group: g.id }, 20 + danger);
                    }
                }
                if (c.key === 'tough_luck' && this.sets(target) >= 1 && this.p(target).hand.length) {
                    push(c, { target, category: this.p(i).hand.filter((c) => this.category(c) === 'property').length < 2 ? 'property' : 'action' }, 7);
                }
                for (const c2 of this.allProps(target)) {
                    const f = this.find(target, c2.id);
                    if (c.key === 'eviction_notice')
                        push(c, { target, property: c2.id }, 4 + danger + (f.group && this.full(f.group) ? 5 : 0));
                    if (['sly_deal', 'forced_deal'].includes(c.key) && (!f.group || !this.full(f.group))) {
                        if (c.key === 'sly_deal')
                            push(c, { target, property: c2.id }, 8 + danger);
                        else {
                            const own = this.allProps(i).filter((c) => !this.find(i, c.id).group || !this.full(this.find(i, c.id).group)).sort((a, b) => this.d(a).value - this.d(b).value)[0];
                            if (own)
                                push(c, { target, property: c2.id, own: own.id }, 6 + danger);
                        }
                    }
                    if (c.key === 'forced_rezoning' && this.d(c2).type === 'wild' && !c2.locked) {
                        for (const color of this.d(c2).colors) {
                            if (color !== f.group.color)
                                push(c, { target, property: c2.id, color }, 3 + danger + (this.full(f.group) ? 5 : 0));
                        }
                    }
                }
            }
        }
        return this.isSetup() ? out.filter(o => o.mode === 'bank' || ['property', 'wild', 'special'].includes(this.d(p.hand.find((c) => c.id === o.id)).type)) : out;
    }
    threat(i) {
        return this.p(i).defending ? 100 : this.sets(i) * 10 + this.p(i).groups.filter((g) => g.cards.length === exports.COLORS[g.color].size - 1).length;
    }
    scoreMove(i, o) {
        const c = this.p(i).hand.find((c) => c.id === o.id);
        const d = this.d(c);
        const p = this.p(i);
        const a = o.args;
        const bank = p.bank.reduce((n, c) => n + this.d(c).value, 0);
        const reserve = this.isSetup() ? 3 : 5;
        if (o.mode === 'bank') {
            const precious = ['just_say_no', 'deal_breaker', 'i_owe_you'].includes(c.key);
            const useful = d.type === 'rent' && p.groups.some((g) => d.any || d.colors.includes(g.color));
            const score = (bank < reserve ? 4 + d.value * 0.6 : d.value * 0.12) - (precious ? 12 : 0) - (useful ? 3 : 0);
            return this.isSetup() ? Math.max(0.1, score) : score;
        }
        if (['property', 'wild'].includes(d.type)) {
            const utility = this.propertyUtility(i, c, a.color);
            const natural = p.hand.filter((x) => x.id !== c.id && this.d(x).type === 'property' && this.d(x).colors.includes(a.color)).length;
            return utility + Math.min(2, natural) * 1.2;
        }
        if (d.type === 'special')
            return this.propertyUtility(i, c) + (c.key === 'corporate_headquarters' && !this.isSetup() ? 3 : 0);
        if (c.key === 'pass_go')
            return p.hand.length < 3 ? 7 : 2;
        if (c.key === 'bank_withdrawal') {
            const recovered = p.bank.find((card) => card.id === a.bankCard);
            return recovered && !p.botFreeSeen?.includes(c.id) ? this.keep(i, recovered) - this.d(recovered).value : -5;
        }
        if (['community_chest', 'chance'].includes(c.key))
            return this.p(i).botFreeSeen?.includes(c.id) ? -5 : 10;
        if (['house', 'hotel'].includes(c.key))
            return this.sets(i) >= 2 ? 6 : 3;
        if (d.type === 'rent') {
            const g = this.group(i, a.group);
            const base = (c.key === 'empire_rent' ? this.fieldPropertyCount(i) : this.rent(i, g)) * 2 ** this.doubleIds(a).length + (this.has(i, 'luxury_district') ? 1 : 0);
            const targets = d.any ? [a.target] : this.s.players.map((_, j) => j).filter((j) => j !== i && !this.p(j).forfeited);
            const gain = targets.reduce((n, j) => n + Math.min(this.assetValue(j), Math.max(0, base - (this.has(j, 'rent_controlled_residence') ? 2 : 0))), 0);
            return gain * (a.doubleId ? 0.65 : 0.85) - 1 + (bank < 3 ? 1 : 0) + (d.any && this.assetValue(a.target) > 0 ? this.threat(a.target) * 0.3 : 0);
        }
        if (c.key === 'its_my_birthday')
            return this.s.players.reduce((n, _, j) => n + (j === i ? 0 : Math.min(2, this.assetValue(j))), 0) * 0.8 - 1;
        if (c.key === 'luxury_tax')
            return this.s.players.reduce((n, _, j) => n + (j === i ? 0 : Math.min(this.assetValue(j), this.sets(j) * 5) * 0.45 + (this.p(j).defending && this.p(j).bank.reduce((n, c) => n + this.d(c).value, 0) < this.sets(j) * 5 ? 30 : 0)), 0) - 1;
        const t = a.target;
        const foe = this.p(t);
        if (!foe)
            return -5;
        const threat = this.threat(t);
        const f = a.property ? this.find(t, a.property) : null;
        if (c.key === 'go_to_jail')
            return this.p(t).jailed ? -5 : 7 + threat * .7;
        if (c.key === 'income_tax')
            return this.incomeTax(t) * 0.65 + (this.incomeTax(t) > 0 ? threat * 0.25 : 0) - 1;
        if (c.key === 'debt_collector')
            return Math.min(5, this.assetValue(t)) * 0.9 - 1 + (bank < 3 ? 1 : 0) + (this.assetValue(t) ? threat * 0.15 : 0);
        if (c.key === 'compulsory_purchase') {
            const props = this.allProps(t).filter((c) => this.d(c).value > 0);
            return props.length ? 6 + Math.min(8, props.length) + threat * 0.6 : -5;
        }
        if (c.key === 'deal_breaker') {
            const g = this.group(t, a.group);
            const unique = !p.groups.some((x) => x.color === g.color && this.full(x));
            return 18 + threat + (unique && this.sets(i) >= 2 ? 40 : 0);
        }
        if (c.key === 'tough_luck')
            return foe.hand.length >= 2 ? 3 + foe.hand.length * 0.65 + threat * 0.6 : -1;
        if (!f)
            return -5;
        const breaks = f.group && this.full(f.group);
        const loss = f.special ? 4 : breaks ? 8 : f.group.cards.length * 1.5;
        if (c.key === 'eviction_notice')
            return loss + (breaks ? threat : threat * 0.1) - 1;
        if (c.key === 'forced_rezoning')
            return f.group.color === a.color ? -5 : loss + (breaks ? threat : 0) - 1;
        if (c.key === 'sly_deal')
            return this.propertyUtility(i, f.card, f.group?.color) + loss + threat * 0.6;
        if (c.key === 'forced_deal') {
            const own = this.find(i, a.own);
            return own ? this.propertyUtility(i, f.card, f.group?.color) - this.propertyUtility(i, own.card, own.group?.color) * 0.7 + loss + threat * 0.6 : -5;
        }
        return o.score;
    }
    shouldBlock(i, pending) {
        const e = pending.e;
        const own = this.p(i);
        if (pending.negated) {
            if (i !== e.actor)
                return false;
            if (e.key === 'i_owe_you')
                return e.owed > 5 || this.allProps(i).length > 0;
            return this.p(e.target).defending || e.key === 'deal_breaker' || (e.key === 'compulsory_purchase' && this.allProps(e.target).length > 1);
        }
        if (i !== e.target)
            return false;
        if (e.key === 'i_owe_you')
            return e.owed > 5 || this.s.iou?.payment.key === 'compulsory_purchase';
        if (e.key === 'deal_breaker' || e.key === 'go_to_jail')
            return true;
        if (e.property) {
            const f = this.find(i, e.property);
            return !!f && (f.special || !!f.group && (this.full(f.group) || f.group.cards.length >= 2) || own.defending);
        }
        if (e.key === 'tough_luck')
            return own.hand.filter((c) => this.category(c) === e.category && c.key !== 'just_say_no').length >= 2;
        if (e.key === 'compulsory_purchase')
            return this.allProps(i).length > 0;
        const cash = own.bank.reduce((n, c) => n + this.d(c).value, 0);
        return (e.amount || 0) > cash && this.allProps(i).length > 0 || own.defending && (e.amount || 0) > cash || (e.amount || 0) >= 5 && own.hand.filter((c) => c.key === 'just_say_no').length > 1;
    }
    arrangementScore(i, groups) {
        const full = groups.filter(g => this.full(g)), colors = new Set(full.map(g => g.color));
        return colors.size * 1000000 + full.length * 10000 + groups.reduce((score, g) => {
            const size = exports.COLORS[g.color].size, n = g.cards.length;
            const backed = g.cards.some((c) => this.d(c).value > 0);
            return score + (backed ? 30 * (n / size) ** 2 : 0) + (this.full(g) ? exports.COLORS[g.color].rent[size - 1] : 0) - 2 - (this.full(g) ? g.cards.filter((c) => this.d(c).type === 'wild' && !c.locked && c.key !== 'expansion_property').length : 0);
        }, 0);
    }
    bestArrangement(i) {
        const initial = this.p(i).groups;
        if (initial.reduce((n, g) => n + g.cards.length, 0) < 2)
            return null;
        const baseline = this.arrangementScore(i, initial), minimum = this.p(i).defending ? this.sets(i) : 0;
        const signature = (groups) => groups.map(g => `${g.color}:${g.cards.map((c) => c.id).sort().join(',')}:${g.house?.id || ''}:${g.hotel?.id || ''}`).sort().join('|');
        const valid = (groups) => groups.every(g => g.cards.length <= exports.COLORS[g.color].size && (!g.cards.some((c) => c.key === 'expansion_property') || g.cards.some((c) => c.key !== 'expansion_property'))) && new Set(groups.filter(g => this.full(g)).map(g => g.color)).size >= minimum;
        const seen = new Set([signature(initial)]);
        let beam = [{ groups: initial, score: baseline }], best = beam[0];
        // Three small search layers can consolidate split colors or free a wild through a swap.
        for (let depth = 0; depth < 3; depth++) {
            const next = [];
            for (const node of beam)
                for (let source = 0; source < node.groups.length; source++) {
                    const from = node.groups[source];
                    if (from.house || from.hotel)
                        continue;
                    for (const card of from.cards) {
                        const def = this.d(card), fixed = card.locked || (card.key === 'expansion_property' ? (card.expansionColor || from.color) : undefined);
                        const colors = fixed ? [fixed] : def.colors;
                        for (const color of colors) {
                            const destinations = node.groups.flatMap((g, index) => index !== source && g.color === color && g.cards.length < exports.COLORS[color].size ? [index] : []);
                            if (card.key !== 'expansion_property' && color !== from.color && !destinations.length)
                                destinations.push(-1);
                            for (const dest of destinations) {
                                const groups = node.groups.map((g) => ({ ...g, cards: [...g.cards] }));
                                groups[source].cards = groups[source].cards.filter((c) => c.id !== card.id);
                                if (dest < 0)
                                    groups.push({ id: `bot-new-${color}-${depth}`, color, cards: [card] });
                                else
                                    groups[dest].cards.push(card);
                                const packed = groups.filter((g) => g.cards.length);
                                if (!valid(packed))
                                    continue;
                                const key = signature(packed);
                                if (seen.has(key))
                                    continue;
                                seen.add(key);
                                const candidate = { groups: packed, score: this.arrangementScore(i, packed) };
                                next.push(candidate);
                                if (candidate.score > best.score + .0001)
                                    best = candidate;
                            }
                        }
                    }
                }
            next.sort((a, b) => b.score - a.score);
            beam = next.slice(0, 6);
            if (!beam.length)
                break;
        }
        return best.score > baseline + .0001 ? best.groups : null;
    }
    bot(i, preview = false) {
        const p = this.s.pending;
        if (p) {
            if (p.responders ? !p.responders.includes(i) : p.payments ? !p.payments.some((e) => e.target === i) : p.responder !== i)
                return;
            if (p.kind === 'counter') {
                const worth = this.shouldBlock(i, p);
                const no = worth && this.p(i).hand.some((c) => c.key === 'just_say_no');
                if (preview)
                    return no ? { response: true, id: this.p(i).hand.find((c) => c.key === 'just_say_no').id } : null;
                this.respond(i, no);
                return;
            }
            if (preview)
                return null;
            if (p.kind === 'chance') {
                this.choose(i, [...p.cards].sort((a, b) => this.keep(i, b) - this.keep(i, a))[0].id);
                return;
            }
            if (p.kind === 'expansion') {
                const groups = this.expansionGroups(i, p.card.id).filter((g) => p.colors.includes(g.color) && (!p.card.locked || g.color === p.card.locked));
                const rank = (g) => { const n = g.cards.filter((c) => c.id !== p.card.id).length; return (n + 1 === exports.COLORS[g.color].size ? (this.p(i).groups.some((x) => x.color === g.color && this.full(x) && !x.cards.some((c) => c.id === p.card.id)) ? 100 : 1000) : 0) + n / exports.COLORS[g.color].size; };
                groups.sort((a, b) => rank(b) - rank(a));
                this.choose(i, groups[0]?.id || p.colors[0]);
                return;
            }
            if (p.kind === 'estate') {
                this.estate(i, this.s.roundLimit !== 10);
                return;
            }
            if (p.kind === 'jail') {
                this.jail(i, this.assetValue(i) >= 10 && this.p(i).bank.reduce((n, c) => n + this.d(c).value, 0) >= 10);
                return;
            }
            if (p.kind === 'payment') {
                const card = this.p(i).hand.find((c) => c.key === 'i_owe_you');
                const ownEffect = p.payments?.find((e) => e.target === i) || p.e;
                const ids = this.autoPayment(i, ownEffect);
                if (card && !ownEffect.propertyOnly && !['luxury_tax', 'income_tax', 'jail_bail'].includes(ownEffect.key) && (ownEffect.amount >= 5 || ids.some((id) => this.find(i, id))))
                    this.owe(i, card.id);
                else
                    this.pay(i, ids);
                return;
            }
            if (p.kind === 'discard') {
                const cards = [...this.p(i).hand].sort((a, b) => this.keep(i, a) - this.keep(i, b));
                this.discard(i, cards.slice(0, cards.length - this.handLimit(i)).map((c) => c.id));
                return;
            }
        }
        if (!this.canAct(i))
            return;
        const arrangement = this.bestArrangement(i);
        if (arrangement) {
            if (preview)
                return null;
            this.p(i).groups = arrangement.map((g) => ({ ...g, id: g.id.startsWith('bot-new-') ? 'g' + this.s.nextId++ : g.id }));
            this.clean(i);
            this.log(this.p(i).name + ' rearranged properties to strengthen their sets.');
            return;
        }
        const options = this.options(i).map(o => ({ ...o, score: this.scoreMove(i, o) })).sort((a, b) => b.score - a.score);
        if (!options.length || options[0].score < 0) {
            if (preview)
                return null;
            this.end(i, !this.isSetup());
        }
        else {
            const tied = options.filter(o => Math.abs(o.score - options[0].score) < 0.00001);
            const o = tied[Math.floor(this.random() * tied.length)];
            if (preview)
                return o;
            this.play(i, o.id, o.mode, o.args);
        }
    }
    keep(i, c) {
        const d = this.d(c);
        return c.key === 'just_say_no' ? 20 : c.key === 'i_owe_you' ? 16 : d.type === 'special' ? 15 : d.type === 'property' || d.type === 'wild' ? 12 : c.key === 'deal_breaker' ? 14 : d.value;
    }
}
exports.Game = Game;
exports.DealEngine = { Game, COLORS: exports.COLORS, BOT_NAMES: exports.BOT_NAMES, estatePayment, PROTECTED_ESTATE: exports.PROTECTED_ESTATE };
exports.default = exports.DealEngine;

if(typeof module!=='undefined'&&module.exports)module.exports=exports.DealEngine;else root.DealEngine=exports.DealEngine;})(typeof globalThis!=='undefined'?globalThis:this);
