#!/usr/bin/env python3
"""Builds ../levels.js for Super Poop Odyssey and checks every kingdom can be finished.

Run:  python3 tools/pipes.py

Each kingdom is a pipe network: boxy rooms joined by straight round pipes. A pipe runs along x, z
(sideways) or y (straight up and down) between two rooms that line up. You climb tall pipes by
farting again and again, and slide down them.

Pipe `req` says what you need to get through it:
  smash    a cracked plug blocks it (ride the toilet paper roll, or wear the hard hat)
  duck     its floor is goo (ride the rubber ducky)
  bubble   its mouth is high up a tall room (ride the soap bubble there)
  goggles  its mouth is high up a tall room with ghost steps (wear goggles)
"""
import json, math, os, sys
from collections import deque

R = 1.6           # normal pipe radius
LIFT = 0.08       # pipe floors sit a hair above the room floor so the holes stay inside the walls


class Net:
    def __init__(s, key, name, needed=3, final=False):
        s.key, s.name, s.needed, s.final = key, name, needed, final
        s.rooms, s.tubes, s.solids, s.objs = {}, [], [], []

    # ---------------------------------------------------------------- building
    def room(s, rid, x, y, z, w, h, d, water=None, goo=False, open_top=False):
        s.rooms[rid] = dict(id=rid, min=[x - w / 2, y, z - d / 2], max=[x + w / 2, y + h, z + d / 2],
                            water=water, goo=goo, open=open_top, c=[x, y, z])
        return rid

    def tube(s, a, b, r=R, req=None, water=None, cur=None, wind=False, off=0.0, dy=0.0, at=None):
        A, B = s.rooms[a], s.rooms[b]
        ax, ay, az = A['c']; bx, by, bz = B['c']
        if (ax == bx and az == bz) or at:
            lo, hi = (A, B) if ay < by else (B, A)
            x, z = at or (ax, az)
            p0 = [x, lo['max'][1], z]; p1 = [x, hi['min'][1], z]; axis = 'y'
        elif az == bz:
            lo, hi = (A, B) if ax < bx else (B, A)
            y = max(ay, by) + r + LIFT + dy
            p0 = [lo['max'][0], y, az + off]; p1 = [hi['min'][0], y, az + off]; axis = 'x'
            for rm in (A, B): assert y + r < rm['max'][1] - 0.1, f'{s.key}: pipe {a}-{b} too tall for {rm["id"]}'
        elif ax == bx:
            lo, hi = (A, B) if az < bz else (B, A)
            y = max(ay, by) + r + LIFT + dy
            p0 = [ax + off, y, lo['max'][2]]; p1 = [ax + off, y, hi['min'][2]]; axis = 'z'
            for rm in (A, B): assert y + r < rm['max'][1] - 0.1, f'{s.key}: pipe {a}-{b} too tall for {rm["id"]}'
        else:
            raise ValueError(f'{s.key}: rooms {a} and {b} do not line up')
        assert all(p1[i] >= p0[i] for i in range(3)), f'{s.key}: rooms {a} and {b} overlap'
        t = dict(id=len(s.tubes), a=lo['id'], b=hi['id'], p0=p0, p1=p1, r=r, axis=axis, req=req, water=water, cur=cur, wind=wind)
        s.tubes.append(t)
        if req == 'smash':   # a cracked plug in the middle of the pipe
            m = s.tp(t['id'], 0.5)
            k = 'xyz'.index(axis)
            lo_ = [m[0] - r, t['p0'][1] - r if axis != 'y' else m[1] - r, m[2] - r]; hi_ = [m[0] + r, (t['p0'][1] + r) if axis != 'y' else m[1] + r, m[2] + r]
            lo_[k] = m[k] - 0.4; hi_[k] = m[k] + 0.4
            if axis != 'y': lo_[1] = t['p0'][1] - r; hi_[1] = t['p0'][1] + r
            s.solids.append(dict(min=lo_, max=hi_, crack=True))
        return t['id']

    def solid(s, rid, dx, dz, top, w, d, ghost=False, crack=False, bottom=None, color=None):
        """A box in a room: dx/dz from the room centre, top is height above the room floor."""
        rm = s.rooms[rid]; x, y, z = rm['c']
        b = y + (bottom if bottom is not None else (top - 0.6 if ghost or (top > 1.5 and bottom is None and not crack) else 0))
        if bottom is None and not ghost and not crack: b = y
        s.solids.append(dict(min=[x + dx - w / 2, b, z + dz - d / 2], max=[x + dx + w / 2, y + top, z + dz + d / 2], ghost=ghost, crack=crack, color=color))

    def plat(s, rid, dx, dz, top, w, d, ghost=False):
        s.solid(rid, dx, dz, top, w, d, ghost=ghost, bottom=top - 0.6)

    def vault(s, rid, dx, dz):
        """A golden corn inside a little hut of cracked blocks."""
        for (ox, oz, w, d) in [(0, -1.5, 4, 1), (0, 1.5, 4, 1), (-1.5, 0, 1, 2), (1.5, 0, 1, 2)]:
            s.solid(rid, dx + ox, dz + oz, 2.6, w, d, crack=True, bottom=0)
        s.solid(rid, dx, dz, 3.2, 4, 4, bottom=2.6)
        s.o('gold', s.rp(rid, dx, dz, 0.8), req='smash')

    def rp(s, rid, dx=0.0, dz=0.0, dy=0.0):
        x, y, z = s.rooms[rid]['c']
        return [round(x + dx, 2), round(y + dy, 2), round(z + dz, 2)]

    def tp(s, tid, f, h=0.0):
        t = s.tubes[tid]
        p = [t['p0'][i] + (t['p1'][i] - t['p0'][i]) * f for i in range(3)]
        if t['axis'] != 'y': p[1] = p[1] - t['r'] + 0.7 + h
        return [round(v, 2) for v in p]

    def o(s, kind, pos, **kw):
        d = dict(kind=kind, p=pos); d.update(kw)
        s.objs.append(d)
        return d

    def corn_tube(s, tid, n, f0=0.15, f1=0.85, h=0.0):
        for i in range(n):
            s.o('corn', s.tp(tid, f0 + (f1 - f0) * i / max(1, n - 1), h))

    def corn_ring(s, rid, r, n, dy=0.6):
        for i in range(n):
            a = i / n * math.tau
            s.o('corn', s.rp(rid, math.cos(a) * r, math.sin(a) * r, dy))

    def out(s):
        return dict(key=s.key, name=s.name, needed=s.needed, final=s.final,
                    rooms=list(s.rooms.values()), tubes=s.tubes, solids=s.solids, objs=s.objs)


LEVELS = []

# ======================================================== 1. Toilet Bowl Kingdom
k = Net('toilet', 'Toilet Bowl Kingdom')
k.room('start', 0, 0, 0, 12, 6, 12)
k.room('j1', 0, 0, -18, 5, 5, 5)
k.room('pool', -18, -3, -18, 12, 9, 12, water=0)
k.room('dead', 16, 0, -18, 5, 5, 5)
k.room('j2', 0, 0, -36, 5, 5, 5)
k.room('j3', 0, 10, -36, 6, 5, 6)
k.room('ledge', 16, 10, -36, 8, 5, 8)
k.room('bubble', -20, 0, -36, 12, 15, 12)
k.room('party', -38, 10, -36, 8, 5, 8)
k.room('hub', 0, 0, -56, 18, 7, 18)
k.room('vault', 22, 0, -56, 6, 5, 6)
t1 = k.tube('start', 'j1'); t2 = k.tube('j1', 'pool'); t3 = k.tube('j1', 'dead'); t4 = k.tube('j1', 'j2')
t5 = k.tube('j2', 'j3'); t6 = k.tube('j3', 'ledge'); t7 = k.tube('j2', 'bubble'); t8 = k.tube('bubble', 'party', req='bubble')
t9 = k.tube('j2', 'hub'); t10 = k.tube('hub', 'vault', req='smash')
k.o('start', k.rp('start', 0, 3, 0.6))
k.o('sign', k.rp('start', -3, -2), text='Arrows to walk and turn. SPACE to jump. SPACE again in the air for a FART JUMP!')
k.o('sign', k.rp('start', 3, -2), text='Walk into the pipe to explore. Pipes go everywhere!')
k.corn_tube(t1, 4)
k.o('gold', k.rp('pool', 0, 0, 0.8)); k.corn_ring('pool', 3.5, 8, dy=3.6)
k.o('sign', k.rp('j1', 1.6, 1.6), text='Water! Swim with the arrows. Hold SPACE to swim up.')
k.o('gold', k.rp('dead', 0, 0, 0.9)); k.corn_tube(t3, 3)
k.o('sign', k.rp('j2', 1.6, 1.6), text='A tall pipe goes UP! Press SPACE again and again to fart your way up!')
k.corn_tube(t5, 3)
k.o('gold', k.rp('ledge', 2, 0, 0.9)); k.corn_ring('ledge', 2.5, 6)
k.o('bubble', k.rp('bubble', 0, 0, 0))
k.o('sign', k.rp('bubble', 3, 4), text='Touch the soap bubble to float up to the high pipe! SPACE hops out.')
k.o('treasure', k.rp('party', -1, 0), outfit='party'); k.corn_tube(t8, 3)
k.corn_tube(t4, 4); k.corn_tube(t7, 3)
k.o('walker', k.rp('hub', -4, 4)); k.o('walker', k.rp('hub', 5, 3)); k.o('walker', k.rp('hub', 3, -5))
k.o('dropper', k.rp('hub', -3, 0)); k.o('dropper', k.rp('hub', 3, 0))
k.o('shop', k.rp('hub', -6, -6), face='s')
k.o('door', k.rp('hub', 0, -8.6), outfit='party', face='s')
k.o('exit', k.rp('hub', 6, -5))
k.o('sign', k.rp('hub', 2, 6), text='Find 3 Golden Corn, then jump into the big green exit pipe!')
k.o('sign', k.rp('hub', 7, 2), text='A pipe blocked by cracked blocks... maybe a hard hat could smash it?')
k.o('gold', k.rp('vault', 0, 0, 0.9), req='smash')
LEVELS.append(k)

# ======================================================== 2. House Pipes Kingdom
k = Net('pipes', 'House Pipes Kingdom')
k.room('start', 0, 0, 0, 12, 6, 12)
k.room('j1', 0, 0, -18, 6, 5, 6)
k.room('lego', -18, 0, -18, 10, 5, 10)
k.room('attic', 0, 10, -18, 7, 5, 7)
k.room('j2', 0, 0, -38, 6, 5, 6)
k.room('low', 0, -13, -38, 10, 9, 10, water=-7)
k.room('rollroom', 18, 0, -38, 10, 5, 10)
k.room('alcove', 34, 0, -38, 8, 5, 8)
k.room('hub', 0, 0, -58, 16, 13, 16)
k.room('ghost', 0, 8, -76, 7, 5, 7)
t1 = k.tube('start', 'j1'); t2 = k.tube('j1', 'lego'); t3 = k.tube('j1', 'attic'); t4 = k.tube('j1', 'j2', water=1.7, cur=[0, 0, -2.5])
t5 = k.tube('j2', 'low'); t6 = k.tube('j2', 'rollroom'); t7 = k.tube('rollroom', 'alcove', req='smash'); t8 = k.tube('j2', 'hub'); t9 = k.tube('hub', 'ghost', req='goggles')
k.o('start', k.rp('start', 0, 3, 0.6))
k.o('sign', k.rp('start', -3, -2), text='The house pipes! Watch out for drips and lego bricks.')
k.corn_tube(t1, 4)
k.o('spikes', k.tp(t2, 0.45), len=2.4, axis='x')
k.o('spikes', k.rp('lego', -2, 2), w=3, d=3); k.o('spikes', k.rp('lego', 2, -2), w=3, d=3)
k.o('gold', k.rp('lego', 3, 3, 0.9)); k.corn_tube(t2, 2, 0.1, 0.3)
k.o('gold', k.rp('attic', 0, 0, 0.9)); k.o('drip', k.rp('attic', -1.5, 1.5, 4.5)); k.corn_tube(t3, 3)
k.o('duck', k.rp('j1', 0, -1.5))
k.o('sign', k.rp('j1', 2, 2), text='The next pipe is full of rushing water. Hop on the rubber ducky to zoom!')
k.corn_tube(t4, 5, h=1.2)
k.o('gold', k.rp('low', 0, 0, 0.8)); k.corn_ring('low', 3, 6, dy=2)
k.o('roll', k.rp('rollroom', 0, 0))
k.o('sign', k.rp('rollroom', -3, 3), text='Roll inside the toilet paper to smash the cracked blocks!')
k.o('treasure', k.rp('alcove', 1, 0), outfit='plumber'); k.corn_tube(t7, 2, 0.75, 0.9)
k.corn_tube(t8, 4)
k.o('walker', k.rp('hub', -4, 4)); k.o('walker', k.rp('hub', 4, 3))
k.o('drip', k.rp('hub', 0, 2, 11)); k.o('drip', k.rp('hub', -5, -3, 11))
k.o('shop', k.rp('hub', -5, -5), face='s')
k.o('door', k.rp('hub', 5.5, 7.6), outfit='plumber', face='n')
k.o('exit', k.rp('hub', 5, -4))
for i, (dz, top) in enumerate([(3, 2.2), (0.5, 4.4), (-2, 6.6)]):
    k.plat('hub', 0, dz, top, 3, 2.2, ghost=True)
k.plat('hub', 0, -6.6, 8.08, 3.6, 2.8)
k.o('sign', k.rp('hub', -2.5, 5.5), text='Spooky see-through steps... special goggles might help.')
k.o('gold', k.rp('ghost', 0, -1, 0.9), req='goggles')
LEVELS.append(k)

# ======================================================== 3. Stinky Sewer Kingdom
k = Net('sewer', 'Stinky Sewer Kingdom')
k.room('start', 0, 0, 0, 12, 6, 12)
k.room('j1', 0, 0, -18, 6, 5, 6)
k.room('j2', 0, 0, -36, 6, 5, 6)
k.room('j1b', 0, 10, -18, 6, 5, 6)
k.room('j2b', 0, 10, -36, 6, 5, 6)
k.room('canal', -20, -3, -36, 14, 9, 14, water=0)
k.room('crown', 0, 20, -36, 8, 5, 8)
k.room('hub', 0, 0, -56, 18, 7, 18)
k.room('vault', 22, 0, -56, 6, 5, 6)
t1 = k.tube('start', 'j1'); t2 = k.tube('j1', 'j2', req='duck', water=0.5)
t3 = k.tube('j1', 'j1b'); t4 = k.tube('j1b', 'j2b'); t5 = k.tube('j2b', 'j2'); t6 = k.tube('j2', 'canal')
t7 = k.tube('j2b', 'crown'); t8 = k.tube('j2', 'hub'); t9 = k.tube('hub', 'vault', req='smash')
k.o('start', k.rp('start', 0, 3, 0.6))
k.o('sign', k.rp('start', -3, -2), text='Other poops are grumpy today. Jump on them, or fart on them to knock them out!')
k.o('walker', k.rp('start', 3, -3))
k.corn_tube(t1, 4)
k.o('duck', k.rp('j1', 0, -1.5))
k.o('sign', k.rp('j1', 2, 2), text='YUCK, green goo! Ride the ducky through, or take the pipe going up.')
k.o('gold', k.tp(t2, 0.5, 1.0)); k.corn_tube(t2, 4, h=1.0)
k.o('flyer', k.tp(t4, 0.5, 1.2))
k.corn_tube(t4, 4)
k.o('gold', k.rp('canal', 0, 0, 0.8)); k.o('swimmer', k.rp('canal', -3, 0, 1.2)); k.o('swimmer', k.rp('canal', 3, 2, 1.8))
k.corn_ring('canal', 4, 8, dy=3.6)
k.o('treasure', k.rp('crown', -1.5, 0), outfit='crown'); k.o('gold', k.rp('crown', 2, 0, 0.9))
k.o('walker', k.rp('hub', -4, 4)); k.o('walker', k.rp('hub', 5, 3)); k.o('walker', k.rp('hub', -5, -4))
k.o('flyer', k.rp('hub', 0, 0, 3))
k.o('shop', k.rp('hub', -6, -6), face='s')
k.o('door', k.rp('hub', 0, -8.6), outfit='shades', face='s')
k.o('sign', k.rp('hub', -2, -5), text='This door wants cool sunglasses. The rat in the shop sells them!')
k.o('exit', k.rp('hub', 6, -5))
k.o('gold', k.rp('vault', 0, 0, 0.9), req='smash')
LEVELS.append(k)

# ======================================================== 4. Fan & Grate Kingdom
k = Net('fans', 'Fan & Grate Kingdom')
k.room('start', 0, 0, 0, 12, 6, 12)
k.room('j1', 0, 0, -18, 6, 5, 6)
k.room('vent', 0, 12, -18, 8, 5, 8)
k.room('grate', 18, 0, -18, 6, 5, 6)
k.room('j2', 0, 0, -40, 6, 5, 6)
k.room('hub', 0, 0, -60, 16, 13, 16)
k.room('ghost', 0, 8, -78, 7, 5, 7)
t1 = k.tube('start', 'j1'); t2 = k.tube('j1', 'vent', wind=True); t3 = k.tube('j1', 'grate'); t4 = k.tube('j1', 'j2')
t5 = k.tube('j2', 'hub'); t6 = k.tube('hub', 'ghost', req='goggles')
k.o('start', k.rp('start', 0, 3, 0.6))
k.o('sign', k.rp('start', -3, -2), text='Spinning fans in the pipes! Wait until the blades are out of the way.')
k.o('spinner', k.tp(t1, 0.5), axis='z')
k.corn_tube(t1, 4)
k.o('sign', k.rp('j1', 2, 2), text='Big wind blowing up! Walk under it to float up.')
k.o('treasure', k.rp('vent', 0, -1.5), outfit='goggles'); k.o('gold', k.rp('vent', 2, 1.5, 0.9))
k.corn_tube(t2, 3)
k.o('spikes', k.tp(t3, 0.35), len=2.2, axis='x'); k.o('spikes', k.tp(t3, 0.7), len=2.2, axis='x')
k.o('gold', k.rp('grate', 0, 0, 0.9))
k.o('spinner', k.tp(t4, 0.3), axis='z'); k.o('spinner', k.tp(t4, 0.72), axis='z')
k.o('gold', k.tp(t4, 0.51)); k.corn_tube(t4, 6)
k.o('walker', k.rp('j2', 0, 0))
k.o('walker', k.rp('hub', -4, 4)); k.o('walker', k.rp('hub', 4, 4)); k.o('flyer', k.rp('hub', 0, 2, 3))
k.o('shop', k.rp('hub', -5, -5), face='s')
k.o('door', k.rp('hub', 5.5, 7.6), outfit='goggles', face='n')
k.o('exit', k.rp('hub', 5, -4))
for dz, top in [(3, 2.2), (0.5, 4.4), (-2, 6.6)]:
    k.plat('hub', 0, dz, top, 3, 2.2, ghost=True)
k.plat('hub', 0, -6.6, 8.08, 3.6, 2.8)
k.o('sign', k.rp('hub', -2.5, 5.5), text='With goggles on you can stand on ghost steps!')
k.o('gold', k.rp('ghost', 0, -1, 0.9), req='goggles')
LEVELS.append(k)

# ======================================================== 5. Water Plant Kingdom
k = Net('plant', 'Water Plant Kingdom')
k.room('start', 0, 0, 0, 12, 6, 12)
k.room('j1', 0, 0, -18, 6, 5, 6)
k.room('tank1', -20, -4, -18, 14, 10, 14, water=0)
k.room('tank2', 20, -4, -18, 14, 10, 14, water=0)
k.room('j2', 0, 0, -38, 6, 5, 6)
k.room('tall', -20, 0, -38, 12, 15, 12)
k.room('hat', -38, 10, -38, 8, 5, 8)
k.room('hub', 0, 0, -58, 18, 7, 18)
t1 = k.tube('start', 'j1'); t2 = k.tube('j1', 'tank1'); t3 = k.tube('j1', 'tank2'); t4 = k.tube('j1', 'j2')
t5 = k.tube('j2', 'tall'); t6 = k.tube('tall', 'hat', req='bubble'); t7 = k.tube('j2', 'hub')
k.o('start', k.rp('start', 0, 3, 0.6))
k.o('sign', k.rp('start', -3, -2), text='The water plant cleans the water. Watch out for the stirring paddles!')
k.corn_tube(t1, 4)
k.o('spinner', k.rp('tank1', 0, 0, 1.5), axis='y', r=4.5, skin='paddle'); k.o('gold', k.rp('tank1', 4, 4, 0.8))
k.corn_ring('tank1', 5, 8, dy=2.5)
k.o('swimmer', k.rp('tank2', -3, 0, 1.5)); k.o('swimmer', k.rp('tank2', 3, 3, 2.5)); k.o('gold', k.rp('tank2', 0, 0, 0.8))
k.corn_ring('tank2', 4, 8, dy=3)
k.corn_tube(t4, 4)
k.o('bubble', k.rp('tall', 0, 0))
k.o('sign', k.rp('tall', 3, 4), text='Ride the bubble up to the high pipe!')
k.o('treasure', k.rp('hat', -1, -1.5), outfit='hardhat'); k.o('gold', k.rp('hat', -1, 1.8, 0.9))
k.o('walker', k.rp('hub', -4, 4)); k.o('walker', k.rp('hub', 5, 3)); k.o('walker', k.rp('j2', 0, 0))
k.o('dropper', k.rp('hub', -2, 2)); k.o('dropper', k.rp('hub', 2, -2)); k.o('dropper', k.rp('hub', 3, 4))
k.o('shop', k.rp('hub', -6, -6), face='s')
k.o('door', k.rp('hub', 0, -8.6), outfit='hardhat', face='s')
k.o('exit', k.rp('hub', 6, -5))
k.vault('hub', -6, 4)
k.o('sign', k.rp('hub', -3, 6), text='Wear the hard hat and bonk the cracked blocks!')
LEVELS.append(k)

# ======================================================== 6. Giant Ocean Pipe
k = Net('bigpipe', 'Giant Ocean Pipe')
k.room('start', 0, 0, 0, 20, 17, 20)
k.room('end', 0, 0, -120, 20, 17, 20)
big = k.tube('start', 'end', r=7, water=2.5, cur=[0, 0, -1.4])
k.o('start', k.rp('start', 0, 4, 0.6))
k.o('sign', k.rp('start', -4, -2), text='The Giant Ocean Pipe! The rushing water pushes you toward the light at the end.')
k.o('duck', k.rp('start', 3, -4))
z0 = -10
islands = [(-30, 0, 8, 6), (-48, -3, 7, 6), (-66, 2, 10, 8), (-86, -2, 7, 6), (-102, 1, 8, 6)]
for (z, x, w, d) in islands:
    k.solids.append(dict(min=[x - w / 2, 0, z - d / 2], max=[x + w / 2, 3.4, z + d / 2], island=True))
k.o('walker', [0, 3.4, -30]); k.o('walker', [2, 3.4, -66]); k.o('walker', [-2, 3.4, -102])
k.o('swimmer', [3, 1.5, -40]); k.o('swimmer', [-3, 1.5, -58]); k.o('swimmer', [3, 1.5, -78]); k.o('swimmer', [-3, 1.5, -94])
k.o('gold', [0, 0.8, -40])
k.o('shop', [-1, 3.4, -68], face='e'); k.o('door', [6.4, 3.4, -66], outfit='sailor', face='w')
k.solids.append(dict(min=[-5.5, 3.4, -50], max=[-2.5, 5.6, -46])); k.solids.append(dict(min=[-5.5, 5.6, -50], max=[-2.5, 7.8, -48]))
k.o('treasure', [-4, 7.8, -49], outfit='sailor')
k.solids.append(dict(min=[2, 6.0, -88], max=[5, 6.6, -84])); k.o('gold', [3.5, 7.4, -86])
k.solids.append(dict(min=[-4.5, 3.4, -89], max=[-2.5, 4.8, -87]))
for i in range(4): k.o('corn', [0, 3.2, -14 - i * 4])
for i in range(6): k.o('corn', [0, 3.2, -72 - i * 2.5])
k.solids.append(dict(min=[-2, 3.4, -104], max=[2, 6, -100], crack=True)); k.o('gold', [0, 4.2, -102], req='smash')
k.o('gold', [0, 0.8, -112])
k.o('exit', k.rp('end', 0, -4))
LEVELS.append(k)

# ======================================================== 7. The Big Blue Ocean
k = Net('ocean', 'The Big Blue Ocean', needed=2, final=True)
k.room('sea', 0, -10, 0, 90, 30, 90, water=0, open_top=True)
k.room('trench', -20, -32, -10, 10, 9, 10)
tt = k.tube('trench', 'sea', at=(-20, -10))
k.o('start', k.rp('sea', 0, 38, 9))
k.o('sign', k.rp('sea', 4, 38, 9), text='You made it to the OCEAN! Swim to the beach in the corner. Grab the fish to swim super fast!')
k.o('fish', k.rp('sea', -4, 34, 8.5))
k.o('jelly', k.rp('sea', -10, 20, 6)); k.o('jelly', k.rp('sea', 10, 10, 5)); k.o('jelly', k.rp('sea', 0, -5, 6)); k.o('jelly', k.rp('sea', 15, -20, 5))
k.o('shark', k.rp('sea', 8, 22, 4), rad=8); k.o('shark', k.rp('sea', -15, -15, 4), rad=9)
k.o('flyer', k.rp('sea', 10, 25, 13)); k.o('flyer', k.rp('sea', -10, -10, 13))
k.solids.append(dict(min=[-30, -10, 22], max=[-26, 13, 26], coral=True)); k.o('gold', [-28, 13.9, 24])
k.solids.append(dict(min=[-34, -10, 20], max=[-30, 4, 28], coral=True)); k.solids.append(dict(min=[-38, -10, 18], max=[-34, -3, 30], coral=True))
for (x0, z0, x1, z1) in [(5, -2, 17, -1), (5, 7, 17, 8), (5, -2, 6, 8), (16, -2, 17, 8)]:
    k.solids.append(dict(min=[x0, -10, z0], max=[x1, -5, z1], ship=True))
k.solids.append(dict(min=[10.5, -10, -2], max=[11.5, 3, -1], ship=True))
k.o('treasure', [14, -10, 5], outfit='pirate'); k.o('gold', [8, -9.2, 3])
k.o('gold', k.rp('trench', 0, 2, 0.9))
k.o('sign', k.rp('sea', -18, -7, 0), text='A deep, dark hole... swim down if you dare!')
k.solids.append(dict(min=[24, -10, -44], max=[44, 1, -24], beach=True))
k.solids.append(dict(min=[20, -10, -44], max=[24, -3, -24], beach=True)); k.solids.append(dict(min=[24, -10, -24], max=[44, -3, -20], beach=True))
k.o('shop', [30, 1, -38], face='s'); k.o('door', [40, 1, -30], outfit='pirate', face='s')
k.o('exit', [36, 1, -36])
for i in range(8): k.o('corn', [round(-20 + i * 6, 2), -2, round(30 - i * 7, 2)])
LEVELS.append(k)


# ======================================================== can every kingdom be finished?
FOUND_BEFORE = {}
SHOP_ITEMS = {'shades', 'nose', 'stache', 'bow', 'cowboy', 'chef', 'viking'}


def reach(k, have):
    """Rooms and pipes you can get to with the abilities in `have`."""
    start = next(o for o in k.objs if o['kind'] == 'start')
    def room_of(p):
        best = None
        for r in k.rooms.values():
            if all(r['min'][i] - 0.01 <= p[i] <= r['max'][i] + 0.01 for i in range(3)): best = r['id']
        return best
    adj = {}
    for t in k.tubes:
        ok = t['req'] is None or t['req'] in have or (t['req'] == 'bubble' and any(o['kind'] == 'bubble' and room_of(o['p']) in (t['a'], t['b']) for o in k.objs))
        if ok:
            adj.setdefault(t['a'], []).append(t); adj.setdefault(t['b'], []).append(t)
    s0 = room_of(start['p'])
    seen, tubes, q = {s0}, set(), deque([s0])
    while q:
        r = q.popleft()
        for t in adj.get(r, []):
            tubes.add(t['id'])
            o = t['b'] if t['a'] == r else t['a']
            if o not in seen: seen.add(o); q.append(o)
    def can(o):
        if o.get('req') and o['req'] not in have: return False
        rid = room_of(o['p'])
        if rid: return rid in seen
        for t in k.tubes:
            if t['id'] in tubes: return True
        return False
    return seen, can


def report():
    ok = True
    owned = set()
    for k in LEVELS:
        print(f'\n== {k.name}: {len(k.rooms)} rooms, {len(k.tubes)} pipes')
        kinds = {o['kind'] for o in k.objs}
        have = set()
        for _ in range(3):
            seen, can = reach(k, have)
            for o in k.objs:
                if o['kind'] == 'roll' and can(o): have.add('smash')
                if o['kind'] == 'duck' and can(o): have.add('duck')
                if o['kind'] == 'treasure' and o['outfit'] == 'goggles' and can(o): have.add('goggles')
                if o['kind'] == 'treasure' and o['outfit'] == 'hardhat' and can(o): have.add('smash')
        later = ({'goggles'} if 'goggles' in owned else set()) | ({'smash'} if 'hardhat' in owned else set())
        seen, can = reach(k, have | later)
        golds = 0
        for o in k.objs:
            if o['kind'] == 'gold':
                if can(o): golds += 1
                else: print('  gold needs a later item:', o['p'], o.get('req'))
            if o['kind'] == 'door':
                avail = o['outfit'] in owned or o['outfit'] in SHOP_ITEMS or any(t['kind'] == 'treasure' and t['outfit'] == o['outfit'] and can(t) for t in k.objs)
                if avail and can(o): golds += 1
                else: print('  door outfit not available yet:', o['outfit'])
            if o['kind'] in ('exit', 'shop', 'treasure', 'start') and not can(o):
                ok = False; print('  UNREACHABLE', o['kind'], o['p'])
        for o in k.objs:
            if o['kind'] == 'treasure' and can(o): owned.add(o['outfit'])
        unseen = set(k.rooms) - reach(k, {'smash', 'duck', 'goggles', 'bubble'})[0]
        if unseen: ok = False; print('  rooms you can never reach:', unseen)
        print(f'  abilities here: {sorted(have)}   golden corn: {golds} of {sum(o["kind"] in ("gold", "door") for o in k.objs)} (need {k.needed})')
        if golds < k.needed: ok = False
    return ok


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, '..', 'levels.js'), 'w') as f:
        f.write('// Made by tools/pipes.py. Edit that file, then run: python3 tools/pipes.py\n')
        f.write('window.LEVELS = ' + json.dumps([k.out() for k in LEVELS], separators=(',', ':')) + ';\n')
    good = report()
    print('\nALL GOOD' if good else '\nPROBLEMS FOUND')
    sys.exit(0 if good else 1)
