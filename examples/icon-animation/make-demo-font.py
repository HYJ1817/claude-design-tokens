#!/usr/bin/env python3
"""
Build a small variable icon font that reproduces the animation mechanism
described in docs/ICON-ANIMATION.md.

This is entirely synthetic: every glyph is a circle, square or bar drawn by this
script. Nothing is extracted from any shipped product. The point is to show the
*mechanism* on shapes you can reason about.

Requires: fonttools, brotli
Usage:    python examples/icon-animation/make-demo-font.py
"""

import math
import os

from fontTools.designspaceLib import (
    AxisDescriptor,
    DesignSpaceDocument,
    InstanceDescriptor,
    SourceDescriptor,
)
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.varLib import build as varlib_build

UPM = 1000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "demo-anim.ttf")


# --------------------------------------------------------------------------
# drawing helpers
# --------------------------------------------------------------------------

def circle(pen, cx, cy, r, squash=0.0, steps=24):
    """A circle, optionally squashed vertically to fake a breathing pulse."""
    pts = []
    for i in range(steps):
        a = 2 * math.pi * i / steps
        pts.append((cx + r * math.cos(a), cy + r * (1 - squash) * math.sin(a)))
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def square(pen, x, y, s):
    pen.moveTo((x, y))
    pen.lineTo((x + s, y))
    pen.lineTo((x + s, y + s))
    pen.lineTo((x, y + s))
    pen.closePath()


def bar(pen, x, y, w, h):
    pen.moveTo((x, y))
    pen.lineTo((x + w, y))
    pen.lineTo((x + w, y + h))
    pen.lineTo((x, y + h))
    pen.closePath()


def rotated_square(pen, cx, cy, half, deg):
    a = math.radians(deg)
    pts = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, y = sx * half, sy * half
        pts.append(
            (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))
        )
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


# --------------------------------------------------------------------------
# glyph definitions
#
# Each entry maps a codepoint to (rest_shape, end_shape). A `None` end shape
# means "identical to rest" — that glyph can only be a pulse.
# --------------------------------------------------------------------------

def g_dot(pen):
    circle(pen, 300, 500, 90)


def g_dot_mid(pen):
    circle(pen, 500, 500, 90)


def g_dot_end(pen):
    circle(pen, 700, 500, 90)


def g_bars(pen):
    bar(pen, 280, 250, 120, 200)
    bar(pen, 440, 250, 120, 400)
    bar(pen, 600, 250, 120, 600)


def g_bars_mid(pen):
    bar(pen, 280, 250, 120, 400)
    bar(pen, 440, 250, 120, 400)
    bar(pen, 600, 250, 120, 400)


def g_bars_end(pen):
    bar(pen, 280, 250, 120, 600)
    bar(pen, 440, 250, 120, 400)
    bar(pen, 600, 250, 120, 200)


def g_rot0(pen):
    rotated_square(pen, 500, 500, 260, 0)


def g_rot22(pen):
    rotated_square(pen, 500, 500, 260, 22.5)


def g_rot45(pen):
    rotated_square(pen, 500, 500, 260, 45)


def g_pulse(pen):
    circle(pen, 500, 500, 200)


def g_pulse_peak(pen):
    circle(pen, 500, 500, 200, squash=0.18)


def g_grow(pen):
    square(pen, 300, 300, 400)


def g_grow_mid(pen):
    square(pen, 280, 280, 440)


def g_grow_end(pen):
    square(pen, 260, 260, 480)


def g_notdef(pen):
    square(pen, 100, 100, 800)


# (name, codepoint, rest, mid, end)
#
# `mid` is the ANIM=50 master. It must be supplied explicitly: fontTools derives
# variation regions from the masters it is given, and a master that equals the
# end shape would make the second half of the axis flat.
#
# For a morph, mid is the geometric midpoint. For a pulse, mid is the bulge and
# rest == end, which is what produces the mid-range region.
GLYPHS = [
    ("uniE000", 0xE000, g_dot, g_dot_mid, g_dot_end),
    ("uniE001", 0xE001, g_bars, g_bars_mid, g_bars_end),
    ("uniE002", 0xE002, g_rot0, g_rot22, g_rot45),
    ("uniE003", 0xE003, g_pulse, g_pulse_peak, g_pulse),
    ("uniE004", 0xE004, g_grow, g_grow_mid, g_grow_end),
]


def build_master(which):
    """
    which: "rest" | "peak" | "end"

    The middle master is what makes a mid-range variation region possible. For
    morph glyphs it is simply the linear midpoint (so it changes nothing); for
    the pulse glyph it is the actual bulge.
    """
    glyphs = {}
    for name, _cp, rest, mid, end in GLYPHS:
        pen = TTGlyphPen(None)
        {"rest": rest, "peak": mid, "end": end}[which](pen)
        glyphs[name] = pen.glyph()

    pen = TTGlyphPen(None)
    g_notdef(pen)
    glyphs[".notdef"] = pen.glyph()

    order = [".notdef"] + [g[0] for g in GLYPHS]

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({cp: name for name, cp, *_ in GLYPHS})
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics({n: (UPM, 0) for n in order})
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable(
        {"familyName": "DemoAnim", "styleName": "Regular", "psName": "DemoAnim-Regular"}
    )
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    fb.setupPost()
    return fb.font


def main():
    rest = build_master("rest")
    peak = build_master("peak")
    end = build_master("end")

    ds = DesignSpaceDocument()

    ax = AxisDescriptor()
    ax.minimum, ax.default, ax.maximum = 0, 0, 100
    ax.name = ax.tag = "ANIM"
    ax.labelNames = {"en": "Animation"}
    ds.addAxis(ax)

    for loc, font, fname in ((0, rest, "rest.ttf"), (50, peak, "peak.ttf"), (100, end, "end.ttf")):
        font.save(fname)
        src = SourceDescriptor()
        src.path = fname
        src.font = font
        src.location = {"ANIM": loc}
        ds.addSource(src)

    inst = InstanceDescriptor()
    inst.familyName = "DemoAnim"
    inst.styleName = "Regular"
    inst.location = {"ANIM": 0}
    ds.addInstance(inst)

    var, _, _ = varlib_build(ds)
    var.save(OUT)

    for f in ("rest.ttf", "peak.ttf", "end.ttf"):
        if os.path.exists(f):
            os.remove(f)

    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
