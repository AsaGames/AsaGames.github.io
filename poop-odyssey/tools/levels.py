#!/usr/bin/env python3
"""Builds ../levels.js for Super Poop Odyssey (3D) and checks every kingdom can be finished.

Run:  python3 tools/levels.py

Each kingdom is a grid of square cells, CS world units wide. Every cell has a ground height
(in world units) and a type:
  .  ground         w  water (h = pool floor, wl = water level)   g  goo (hurts unless you ride the ducky)
  ^  spikes         A  fan updraft (lifts you to `lift`)          C  cracked block (smash with the roll or hard hat)
  R  rock wall up to the ceiling, splitting a kingdom into chambers
Chambers are joined by warp pipes (`link`): run into one and you slide through a tube to the other.
Platforms are floating boxes. Ghost platforms are only solid while wearing goggles.
Objects sit on the ground of their cell unless they give a y.
"""
import json, math, os, sys
from collections import deque

CS = 2.0                     # cell size in world units
JUMP_V, FART_V, G, RUN = 12.0, 10.0, 32.0, 6.5
ROCK = 40.0


class K:
    def __init__(s, key, name, W, D, needed=3, final=False, ceil=14.0, roof=True):
        s.key, s.name, s.W, s.D, s.needed, s.final, s.ceil, s.roof = key, name, W, D, needed, final, ceil, roof
        s.tubes = []
        s.h = [[0.0] * W for _ in range(D)]
        s.t = [['.'] * W for _ in range(D)]
        s.wl = [[None] * W for _ in range(D)]
        s.lift = {}
        s.cur = {}
        s.below = {}          # cracked block cells: height after smashing
        s.plats, s.objs, s.winds = [], [], []
        s.sealed = set()      # cells you can only get into by smashing

    def cells(s, x1, z1, x2, z2):
        for z in range(min(z1, z2), max(z1, z2) + 1):
            for x in range(min(x1, x2), max(x1, x2) + 1):
                yield x, z

    def box(s, x1, z1, x2, z2, h):
        for x, z in s.cells(x1, z1, x2, z2):
            s.h[z][x] = h; s.t[z][x] = '.'; s.wl[z][x] = None

    def rock(s, x1, z1, x2, z2):
        for x, z in s.cells(x1, z1, x2, z2):
            s.h[z][x] = ROCK; s.t[z][x] = 'R'; s.wl[z][x] = None

    def link(s, a, b):
        """Warp pipe between two cells next to a rock wall. dir says which side the wall is on (n/s/e/w)."""
        ia, ib = len(s.tubes), len(s.tubes) + 1
        s.tubes.append(dict(id=ia, x=a[0], z=a[1], dir=a[2], to=ib))
        s.tubes.append(dict(id=ib, x=b[0], z=b[1], dir=b[2], to=ia))

    def pool(s, x1, z1, x2, z2, floor, level=0.0, kind='w', cur=None):
        for x, z in s.cells(x1, z1, x2, z2):
            s.h[z][x] = floor; s.t[z][x] = kind; s.wl[z][x] = level
            if cur: s.cur[(x, z)] = cur

    def spikes(s, x1, z1, x2, z2):
        for x, z in s.cells(x1, z1, x2, z2):
            s.t[z][x] = '^'

    def updraft(s, x1, z1, x2, z2, top):
        for x, z in s.cells(x1, z1, x2, z2):
            s.t[z][x] = 'A'; s.lift[(x, z)] = top

    def crack(s, x1, z1, x2, z2, h):
        for x, z in s.cells(x1, z1, x2, z2):
            s.below[(x, z)] = s.h[z][x]; s.h[z][x] = h; s.t[z][x] = 'C'

    def vault(s, x, z, h=4):
        """Golden corn locked in a ring of cracked blocks with a roof."""
        for cx, cz in s.cells(x - 1, z - 1, x + 1, z + 1):
            if (cx, cz) != (x, z):
                s.crack(cx, cz, cx, cz, h)
        s.plat(x, z, h, 1, 1)
        s.sealed.add((x, z))
        s.o('gold', x, z)

    def plat(s, x, z, y, w=1, d=1, ghost=False, color=None):
        s.plats.append(dict(x=x, z=z, y=y, w=w, d=d, ghost=ghost, color=color))

    def o(s, kind, x, z, y=None, **kw):
        d = dict(kind=kind, x=x, z=z)
        if y is not None: d['y'] = y
        d.update(kw); s.objs.append(d)
        return d

    def corn(s, x1, z1, x2, z2, n, y=None):
        for i in range(n):
            k = i / max(1, n - 1)
            s.o('corn', round(x1 + (x2 - x1) * k, 2), round(z1 + (z2 - z1) * k, 2), y)

    def ring(s, cx, cz, r, n, y=None):
        for i in range(n):
            a = i / n * math.tau
            s.o('corn', round(cx + math.cos(a) * r, 2), round(cz + math.sin(a) * r, 2), y)

    def wind(s, x1, z1, x2, z2, y1, y2, fx, fz):
        s.winds.append(dict(x1=x1, z1=z1, x2=x2 + 1, z2=z2 + 1, y1=y1, y2=y2, fx=fx, fz=fz))

    def out(s):
        return dict(key=s.key, name=s.name, W=s.W, D=s.D, needed=s.needed, final=s.final, ceil=s.ceil, roof=s.roof, tubes=s.tubes,
                    h=s.h, t=[''.join(r) for r in s.t], wl=s.wl,
                    lift=[[x, z, v] for (x, z), v in s.lift.items()],
                    cur=[[x, z, v[0], v[1]] for (x, z), v in s.cur.items()],
                    below=[[x, z, v] for (x, z), v in s.below.items()],
                    plats=s.plats, objs=s.objs, winds=s.winds)


LEVELS = []

# ======================================================== 1. Toilet Bowl Kingdom
k = K('toilet', 'Toilet Bowl Kingdom', 30, 30, ceil=13)
k.o('start', 15, 27)
k.o('sign', 13, 26, text='Arrows to run. SPACE to jump. Press SPACE again in the air for a FART JUMP!')
k.corn(15, 25, 15, 20, 4)
k.pool(11, 11, 19, 17, -3, 0)                       # the big pool in the middle
k.o('gold', 15, 14)
k.o('sign', 16, 19, text='Swim with the arrows. Press SPACE to swim up.')
k.ring(15, 14, 3, 10, y=0.6)
k.o('dropper', 12, 19); k.o('dropper', 18, 18)
k.o('walker', 8, 21); k.o('walker', 22, 20); k.o('walker', 21, 6)
k.o('sign', 18, 23, text='Jump on a toilet paper monster to squash it!')
# west: stairs up to a tower
k.box(3, 22, 4, 23, 1); k.box(3, 20, 4, 21, 2); k.box(3, 18, 4, 19, 3); k.box(3, 16, 4, 17, 4)
k.box(2, 12, 5, 15, 6); k.o('gold', 3.5, 13.5)
k.corn(3.5, 22.5, 3.5, 16.5, 4)
# east: soap bubble up to the floating ledge with the party hat
k.o('bubble', 25, 24)
k.o('sign', 23, 25, text='Touch the soap bubble to ride it up! Press SPACE to hop out.')
k.plat(23, 16, 9, 5, 4)
k.o('treasure', 25, 17, outfit='party'); k.corn(23.5, 19.5, 27.5, 19.5, 4, y=9.6)
k.box(26, 26, 27, 27, 3); k.o('gold', 26.5, 26.5)
k.o('sign', 24, 27, text='Too high? Jump, then press SPACE again for a FART JUMP!')
# north: shop, costume door, exit pipe, locked vault
k.o('shop', 8, 3)
k.o('door', 14, 2, outfit='party')
k.o('exit', 20, 3)
k.o('sign', 17, 5, text='Find 3 Golden Corn to open the exit pipe!')
k.vault(26, 4)
k.o('sign', 24, 7, text='Cracked blocks! Something could smash them... maybe a hard hat?')
k.corn(11, 7, 20, 7, 5)
k.rock(0, 9, 29, 10)
k.link((8, 11, 'n'), (8, 8, 's'))
k.o('sign', 10, 12, text='Run into the green pipe to slide to the next room!')
LEVELS.append(k)

# ======================================================== 2. House Pipes Kingdom
k = K('pipes', 'House Pipes Kingdom', 34, 34, ceil=12)
k.o('start', 17, 31)
k.o('sign', 15, 30, text='Welcome to the house pipes! Watch out for drips and lego bricks.')
k.spikes(14, 26, 20, 26)
k.corn(17, 29, 17, 24, 4)
k.o('walker', 8, 27); k.o('walker', 26, 27); k.o('walker', 12, 8); k.o('walker', 23, 9)
k.o('flyer', 10, 23); k.o('flyer', 24, 23); k.o('flyer', 17, 8)
# west tower of pipes
k.box(2, 26, 3, 27, 2); k.box(2, 24, 3, 25, 4); k.box(4, 22, 5, 23, 6); k.o('gold', 4.5, 22.5)
k.corn(2.5, 26.5, 4.5, 22.5, 4, None)
# the water channel with a current, and the ducky
k.box(0, 14, 33, 19, 0)
k.pool(1, 15, 32, 18, -3, 0, cur=(1.2, 0))
k.o('duck', 6, 19)
k.o('sign', 8, 20, text='Hop on the rubber ducky to zoom across the water!')
k.o('gold', 20, 17)
k.corn(10, 16.5, 28, 16.5, 7, y=0.6)
# east alcove sealed with cracked blocks, open it with the toilet paper roll
k.box(26, 20, 32, 20, 6); k.box(26, 20, 26, 24, 6); k.box(32, 20, 32, 24, 6)
k.crack(27, 24, 31, 24, 6)
k.plat(27, 21, 6, 5, 3)
k.o('treasure', 29, 22, outfit='plumber'); k.corn(27.5, 22.5, 30.5, 22.5, 3)
k.o('roll', 29, 28)
k.o('sign', 27, 29, text='Roll inside the toilet paper to smash cracked walls!')
# north
k.box(24, 4, 28, 6, 3); k.o('gold', 26, 5)
k.o('sign', 22, 7, text='Need to go higher? Fart jump!')
k.plat(13, 9, 2, 2, 2, ghost=True); k.plat(10, 7, 4, 2, 2, ghost=True); k.plat(7, 4, 6, 2, 2)
k.o('gold', 8, 5, y=6.8)
k.o('sign', 16, 10, text='Spooky see-through blocks... special goggles might help.')
k.rock(0, 11, 33, 12)
k.link((17, 13, 'n'), (20, 10, 's'))
k.o('shop', 4, 10)
k.o('door', 12, 2, outfit='plumber')
k.o('exit', 19, 2)
k.corn(14, 5, 22, 5, 5)
LEVELS.append(k)

# ======================================================== 3. Stinky Sewer Kingdom
k = K('sewer', 'Stinky Sewer Kingdom', 34, 34, ceil=12)
k.o('start', 17, 31)
k.o('sign', 15, 30, text='Other poops are grumpy today. Jump on them or run away!')
k.o('walker', 10, 27); k.o('walker', 24, 26); k.o('walker', 8, 6); k.o('walker', 26, 7)
k.o('flyer', 12, 23); k.o('flyer', 22, 9)
# the goo river with stepping stones
k.pool(0, 14, 33, 21, -0.6, 0, kind='g')
for (x, z) in [(6, 20), (8, 17), (10, 15), (13, 18), (15, 15), (20, 19), (23, 16), (26, 18), (28, 15)]:
    k.box(x, z, x, z, 1)
k.box(17, 17, 18, 18, 3); k.o('gold', 17.5, 17.5)
k.o('duck', 20, 22)
k.o('sign', 22, 23, text='Green goo is YUCKY! Hop across the stones or ride the ducky.')
k.corn(6, 20, 15, 15, 5, y=1.8)
# north canal with gators
k.box(3, 2, 15, 10, 1)
k.pool(4, 3, 14, 9, -3, 0)
k.o('gold', 9, 6)
k.o('swimmer', 6, 5); k.o('swimmer', 12, 8)
k.corn(5, 6, 13, 6, 5, y=0.6)
# crown tower
k.box(22, 9, 23, 10, 2); k.box(24, 9, 25, 10, 4); k.box(26, 9, 27, 10, 6); k.box(26, 7, 27, 8, 8)
k.o('treasure', 26.5, 7.5, outfit='crown')
# west roof
k.box(1, 25, 2, 26, 2); k.box(1, 22, 4, 24, 4); k.o('gold', 2.5, 23)
k.vault(30, 29)
k.o('shop', 19, 3)
k.o('door', 23, 2, outfit='shades')
k.o('sign', 21, 5, text='This door wants cool sunglasses. The rat in the shop sells them!')
k.o('exit', 30, 3)
k.rock(0, 11, 33, 12)
k.link((17, 13, 'n'), (18, 10, 's'))
LEVELS.append(k)

# ======================================================== 4. Fan & Grate Kingdom
k = K('fans', 'Fan & Grate Kingdom', 34, 34, ceil=14)
k.o('start', 17, 31)
k.o('sign', 15, 30, text='Sharp grates and spinning fans! The big wind can lift you up.')
k.spikes(12, 27, 22, 27)
k.spikes(4, 17, 9, 17); k.spikes(25, 17, 30, 17)
k.o('spinner', 10, 22, r=3); k.o('spinner', 24, 22, r=3)
k.o('gold', 17, 22)
k.corn(12, 22, 22, 22, 6)
k.o('walker', 6, 25); k.o('walker', 28, 25); k.o('walker', 20, 4); k.o('walker', 8, 6)
k.o('flyer', 17, 18)
# the upper deck, reached by fan updrafts
k.box(0, 0, 33, 12, 8)
k.updraft(15, 13, 18, 14, 10)
k.o('sign', 13, 15, text='Stand in the big wind to float up!')
k.corn(16.5, 14, 16.5, 14, 1, y=3); k.corn(16.5, 14, 16.5, 14, 1, y=6)
k.box(1, 1, 3, 3, 9); k.o('gold', 2, 2)
k.box(20, 6, 21, 7, 10); k.o('gold', 20.5, 6.5)
k.wind(22, 1, 31, 4, 8, 11, -4, 0)
k.corn(23, 2.5, 30, 2.5, 5, y=8.6)
# goggles on the east pillar, ghost stairs in the west
k.box(27, 25, 28, 26, 2); k.box(29, 25, 30, 26, 4); k.o('treasure', 29.5, 25.5, outfit='goggles')
k.plat(4, 24, 2, 2, 2, ghost=True); k.plat(4, 21, 4, 2, 2, ghost=True); k.plat(4, 18, 6, 2, 2)
k.o('gold', 5, 19, y=6.8)
k.o('sign', 7, 26, text='With goggles on you can stand on ghost blocks!')
k.o('shop', 6, 4)
k.o('door', 12, 3, outfit='goggles')
k.o('exit', 27, 7)
LEVELS.append(k)

# ======================================================== 5. Water Plant Kingdom
k = K('plant', 'Water Plant Kingdom', 34, 34, ceil=13)
k.o('start', 17, 31)
k.o('sign', 15, 30, text='The water plant cleans the water. Watch out for the stirring paddles!')
k.box(3, 13, 14, 24, 1); k.pool(4, 14, 13, 23, -4, 0.6)
k.o('spinner', 8.5, 18.5, y=-1.5, r=3); k.o('gold', 8.5, 21.5)
k.box(19, 13, 30, 24, 1); k.pool(20, 14, 29, 23, -4, 0.6)
k.o('swimmer', 22, 16); k.o('swimmer', 27, 21); k.o('gold', 24.5, 18.5)
k.corn(5, 15, 12, 22, 5, y=-1); k.corn(21, 22, 28, 15, 5, y=-1)
k.o('dropper', 16.5, 17); k.o('dropper', 16.5, 21)
k.o('walker', 8, 28); k.o('walker', 26, 28); k.o('walker', 10, 6); k.o('walker', 24, 8)
k.o('bubble', 21, 8)
k.o('sign', 23, 9, text='Ride the bubble way up high!')
k.rock(0, 11, 33, 12)
k.link((17, 13, 'n'), (12, 10, 's'))
k.plat(13, 3, 10, 8, 2)
k.o('treasure', 18, 4, outfit='hardhat'); k.o('gold', 14, 4, y=10.8)
k.vault(3, 29)
k.o('sign', 5, 27, text='Wear the hard hat and bonk the cracked blocks!')
k.o('shop', 4, 4)
k.o('door', 9, 2, outfit='hardhat')
k.o('exit', 29, 4)
LEVELS.append(k)

# ======================================================== 6. Giant Ocean Pipe
k = K('bigpipe', 'Giant Ocean Pipe', 24, 46, ceil=12, roof=False)
k.pool(0, 0, 23, 45, -3, 0, cur=(0, -1.6))
islands = [(7, 41, 16, 45), (3, 34, 8, 37), (15, 31, 20, 34), (6, 23, 17, 27), (2, 16, 7, 19), (16, 13, 21, 17), (5, 6, 10, 9), (8, 0, 16, 3)]
for x1, z1, x2, z2 in islands:
    k.box(x1, z1, x2, z2, 1)
k.o('start', 11, 43)
k.o('sign', 13, 43, text='The rushing water pushes you toward the ocean. Wheee!')
k.o('duck', 8, 40)
k.o('swimmer', 12, 37); k.o('swimmer', 10, 29); k.o('swimmer', 12, 20); k.o('swimmer', 12, 11)
k.o('walker', 5, 35); k.o('walker', 18, 32); k.o('walker', 4, 17); k.o('walker', 19, 15)
k.o('gold', 4, 30)
k.corn(11, 39, 11, 30, 6, y=0.6)
k.o('shop', 8, 24); k.o('door', 14, 24, outfit='sailor')
k.box(16, 13, 17, 14, 3); k.box(18, 13, 19, 14, 5); k.box(20, 13, 21, 14, 7)
k.o('treasure', 20.5, 13.5, outfit='sailor')
k.plat(3, 12, 3, 2, 2); k.o('gold', 4, 13, y=3.8)
k.vault(7, 7, h=4)
k.o('gold', 19, 6)
k.o('exit', 12, 1)
LEVELS.append(k)

# ======================================================== 7. The Big Blue Ocean
k = K('ocean', 'The Big Blue Ocean', 40, 40, needed=2, final=True, ceil=10, roof=False)
k.pool(0, 0, 39, 39, -9, 0)
for (x, z, h) in [(10, 30, -7), (25, 28, -6), (30, 15, -7), (12, 12, -6), (20, 20, -8)]:
    k.pool(x - 2, z - 2, x + 2, z + 2, h, 0)
k.o('start', 4, 35, y=-1)
k.o('sign', 6, 36, y=-1, text='You made it to the OCEAN! Swim to the beach. Grab the fish to swim super fast!')
k.o('fish', 7, 33, y=-2)
k.o('jelly', 12, 28, y=-3); k.o('jelly', 22, 24, y=-4); k.o('jelly', 30, 20, y=-3); k.o('jelly', 15, 14, y=-4)
k.o('shark', 18, 30, y=-5); k.o('shark', 28, 10, y=-4)
k.o('flyer', 20, 30, y=4); k.o('flyer', 15, 12, y=4)
# coral tower poking out of the water
k.box(30, 31, 31, 32, 2); k.o('gold', 30.5, 31.5)
k.corn(26, 33, 29, 32, 4, y=-1)
# sunken ship
k.pool(14, 18, 24, 18, -4, 0); k.pool(14, 23, 24, 23, -4, 0); k.pool(14, 18, 14, 23, -4, 0); k.pool(24, 18, 24, 23, -4, 0)
k.plat(15, 19, -4, 9, 1); k.plat(15, 22, -4, 9, 1)
k.o('treasure', 22, 21, y=-7.4, outfit='pirate'); k.o('gold', 16, 21, y=-7.4)
k.corn(17, 20.5, 21, 20.5, 4, y=-7.5)
# deep trench gold
k.pool(4, 6, 7, 9, -13, 0); k.o('gold', 5.5, 7.5)
# beach island
k.box(30, 0, 39, 7, 1); k.box(28, 0, 29, 9, -1); k.box(30, 8, 39, 9, -1)
k.o('shop', 33, 3); k.o('door', 37, 6, outfit='pirate')
k.o('exit', 35, 2)
k.o('sign', 31, 6, text='The beach! Walk to the beach umbrella to finish your adventure.')
k.corn(10, 30, 28, 10, 8, y=-2)
LEVELS.append(k)


# ======================================================== reachability check
def rng(dy, v0=JUMP_V, fart=True):
    """How far (world units, horizontally) you can jump while climbing dy."""
    best = -10.0
    for use_fart in ([False, True] if fart else [False]):
        if not use_fart:
            disc = v0 * v0 - 2 * G * dy
            if disc < 0: continue
            t = (v0 + math.sqrt(disc)) / G
        else:
            t1 = v0 / G; h1 = v0 * v0 / (2 * G)
            disc = FART_V * FART_V - 2 * G * (dy - h1)
            if disc < 0: continue
            t = t1 + (FART_V + math.sqrt(disc)) / G
        best = max(best, RUN * t)
    return best * 0.8


def check(k, goggles=False, smash=False, duck=False, bubble=True):
    W, D = k.W, k.D
    nodes = {}

    def add(x, z, y, kind):
        nodes[(x, z, round(y, 2), kind)] = True

    for z in range(D):
        for x in range(W):
            t = k.t[z][x]
            if t == 'w':
                add(x, z, k.wl[z][x] - 0.3, 'swim')
            elif t == 'g':
                if duck: add(x, z, k.wl[z][x], 'swim')
            elif t == 'R':
                continue
            elif t == 'C':
                add(x, z, k.below[(x, z)] if smash else k.h[z][x], 'g')
            elif (x, z) not in k.sealed or smash:
                add(x, z, k.h[z][x], 'g')
                if t == 'A': add(x, z, k.lift[(x, z)], 'lift')
    for p in k.plats:
        if p['ghost'] and not goggles: continue
        for x in range(p['x'], p['x'] + p['w']):
            for z in range(p['z'], p['d'] + p['z']):
                add(x, z, p['y'], 'g')
    def walled(x1, z1, x2, z2):
        n = int(max(abs(x2 - x1), abs(z2 - z1)) * 3) + 1
        for i in range(n + 1):
            f = i / n
            if k.t[int(round(z1 + (z2 - z1) * f))][int(round(x1 + (x2 - x1) * f))] == 'R': return True
        return False

    nl = list(nodes)
    bycell = {}
    for n in nl:
        bycell.setdefault((n[0], n[1]), []).append(n)

    def edges(n):
        x, z, y, kind = n
        out = []
        if kind == 'swim':
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                for m in bycell.get((x + dx, z + dz), []):
                    if m[3] == 'swim': out.append(m)
        if k.t[z][x] == 'A':
            for m in bycell.get((x, z), []):
                out.append(m)
        if kind == 'g':   # underwater ledges: you can always swim back up
            for dx, dz in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                for m in bycell.get((x + dx, z + dz), []):
                    if m[3] == 'swim' and y < m[2]: out.append(m)
        R = 5
        for cz in range(max(0, z - R), min(D, z + R + 1)):
            for cx in range(max(0, x - R), min(W, x + R + 1)):
                gap = max(0.0, math.hypot((cx - x) * CS, (cz - z) * CS) - CS)
                if (cx, cz) in bycell and walled(x, z, cx, cz): continue
                for m in bycell.get((cx, cz), []):
                    if m == n: continue
                    dy = m[2] - y
                    if m[3] == 'swim' and m[2] <= y + 0.5 and gap <= rng(dy):
                        out.append(m); continue
                    if m[3] in ('g', 'lift') and gap <= rng(dy):
                        out.append(m)
        for tb in k.tubes:
            if (tb['x'], tb['z']) == (x, z) and kind == 'g':
                o = k.tubes[tb['to']]
                out.extend(m for m in bycell.get((o['x'], o['z']), []) if m[3] == 'g')
        # bubble ride: float up and land on anything below the ceiling nearby
        if bubble and kind == 'g':
            for b in k.objs:
                if b['kind'] == 'bubble' and int(b['x']) == x and int(b['z']) == z:
                    for m in nl:
                        if m[3] == 'g' and m[2] <= k.ceil - 1.5 and math.hypot(m[0] - x, m[1] - z) <= 14 and not walled(x, z, m[0], m[1]):
                            out.append(m)
        return out

    def ground(x, z):
        return k.h[z][x]

    s = next(o for o in k.objs if o['kind'] == 'start')
    sx, sz = int(s['x']), int(s['z'])
    start = min(bycell[(sx, sz)], key=lambda n: abs(n[2] - s.get('y', ground(sx, sz))))
    seen, q, adj = {start}, deque([start]), {}
    while q:
        n = q.popleft()
        adj[n] = edges(n)
        for m in adj[n]:
            if m not in seen:
                seen.add(m); q.append(m)

    def can_touch(o):
        x, z = int(o['x']), int(o['z'])
        y = o.get('y', ground(x, z) if k.t[z][x] != 'C' else k.below[(x, z)])
        for cx in range(x - 1, x + 2):
            for cz in range(z - 1, z + 2):
                for m in bycell.get((cx, cz), []):
                    if m not in seen: continue
                    if m[3] == 'swim':
                        if (cx, cz) == (x, z) and y <= m[2] + 2.5: return True
                    elif m[2] - 0.6 <= y <= m[2] + 3.6 and ((cx, cz) == (x, z) or abs(y - m[2]) < 2.2):
                        return True
        return False

    # can you always get back to the exit? (no getting stuck)
    ex = next(o for o in k.objs if o['kind'] == 'exit')
    exn = [m for m in bycell.get((int(ex['x']), int(ex['z'])), []) if m in seen]
    rev = {}
    for a, bs in adj.items():
        for b in bs: rev.setdefault(b, []).append(a)
    good, q = set(exn), deque(exn)
    while q:
        n = q.popleft()
        for a in rev.get(n, []):
            if a not in good: good.add(a); q.append(a)
    stuck = [n for n in seen if n not in good]
    return can_touch, stuck, bool(exn)


def report():
    ok = True
    for k in LEVELS:
        has = lambda kind: any(o['kind'] == kind for o in k.objs)
        base = check(k)
        duck = has('duck') and base[0](next(o for o in k.objs if o['kind'] == 'duck'))
        smash = has('roll') and base[0](next(o for o in k.objs if o['kind'] == 'roll'))
        here = check(k, duck=duck, smash=smash)
        gog = check(k, goggles=True, duck=duck, smash=smash)
        sm = check(k, smash=True, duck=duck)
        both = check(k, goggles=True, smash=True, duck=True)
        print(f'\n== {k.name} ({k.W}x{k.D})  ducky={duck} roll={smash}')
        golds = 0
        for o in k.objs:
            if o['kind'] not in ('gold', 'treasure', 'door', 'shop', 'exit'): continue
            how = 'here' if here[0](o) else 'GOGGLES' if gog[0](o) else 'SMASH' if sm[0](o) else 'LATER' if both[0](o) else None
            if o['kind'] in ('gold', 'door') and how == 'here': golds += 1
            if how is None or (o['kind'] in ('exit', 'shop', 'treasure') and how != 'here'):
                ok = False
            if how != 'here':
                print(f"  {o['kind']} at {o['x']},{o['z']}: {how or 'UNREACHABLE'}")
        print(f'  golden corn you can get without later items: {golds} (need {k.needed})')
        if golds < k.needed: ok = False
        if not here[2]: ok = False; print('  EXIT UNREACHABLE')
        if here[1]:
            ok = False; print('  STUCK SPOTS:', sorted(here[1])[:10])
    return ok


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', 'levels.js'), 'w') as f:
        f.write('// Made by tools/levels.py. Edit that file, then run: python3 tools/levels.py\n')
        f.write('window.CS = %s;\nwindow.LEVELS = ' % CS + json.dumps([k.out() for k in LEVELS], separators=(',', ':')) + ';\n')
    good = report()
    print('\nALL GOOD' if good else '\nPROBLEMS FOUND')
    sys.exit(0 if good else 1)
