"""Fraction board: 36 labelled red pieces, green tray and wood-coloured rim.

Two halves and one quarter lift out of their recesses, then return to form
complete circles. The other fractions stay assembled as visual references.
"""
import math
import bpy
from engine import stage_scene, empty, profile, cyl, box, text, key
from emotion_slider import rounded_slab

RED = '#c9403d'
GREEN = '#3f7658'
WOOD = '#cfa979'
WHITE = '#ffffff'
RADIUS = .76


def labelled_piece(denominator, index, x, y):
    part = empty(f'Fraction 1/{denominator} piece {index+1}', (x, y, .345))
    if denominator == 1:
        cyl((0, 0, 0), RADIUS, .17, RED, part, bevel=.017, n=96,
            name='One whole circle')
        label_x = label_y = 0
    else:
        offset = 0 if denominator == 2 else math.pi/2 if denominator % 2 else math.pi/denominator
        angle = offset + index*math.tau/denominator
        half = math.pi/denominator
        gap = .010
        count = max(18, round(96/denominator))
        points = [(0, 0)] + [
            (RADIUS*math.cos(angle-half+gap+(2*half-2*gap)*j/count),
             RADIUS*math.sin(angle-half+gap+(2*half-2*gap)*j/count))
            for j in range(count+1)
        ]
        # A slight outward offset preserves a visible seam at the circle centre.
        points = [(px+.008*math.cos(angle), py+.008*math.sin(angle)) for px, py in points]
        solid = profile(points, .17, RED, part,
                        name=f'Red 1/{denominator} sector', bevel=.008)
        # Flat faces keep the printed labels and the divisions crisp.
        solid.data.polygons[0].use_smooth = False
        solid.data.polygons[1].use_smooth = False
        label_radius = .38 if denominator == 2 else .49 if denominator <= 4 else .53
        label_x = label_radius*math.cos(angle)
        label_y = label_radius*math.sin(angle)
    size = .235 if denominator <= 4 else .205
    text('1', (label_x, label_y+.125, .093), size, WHITE, part,
         name=f'Numerator 1 for piece {denominator}-{index}')
    box((label_x, label_y, .094), (.205, .018, .008), WHITE, .002, part,
        name='Fraction bar')
    text(str(denominator), (label_x, label_y-.125, .093), size, WHITE, part,
         name=f'Denominator {denominator} for piece {index}')
    return part


def fraction():
    stage_scene((0, 0, .30), 10.0, 0, 73)
    bpy.data.objects['Sage display stage'].scale = (1.48, 1.20, 1)
    rounded_slab(8.20, 5.15, .24, .18, .12, WOOD, 'Wood-coloured plastic rim')
    rounded_slab(7.99, 4.94, .17, .045, .215, GREEN, 'Green inset board')
    columns = (-2.91, -.97, .97, 2.91)
    pieces = {}
    for denominator in range(1, 9):
        x = columns[(denominator-1) % 4]
        y = 1.25 if denominator <= 4 else -1.25
        cyl((x, y, .245), .795, .025, '#294f3a', bevel=.005, n=96,
            name=f'Circular recess for {denominator} pieces')
        for index in range(denominator):
            pieces[denominator, index] = labelled_piece(denominator, index, x, y)
    # Lift only vertically so each sector stays clearly aligned with its recess.
    # Compare the half and quarter at the same height before reassembling.
    for identity, start, lifted, return_start, returned in (
        ((2, 0), .7, 1.8, 7.5, 8.6),
        ((2, 1), 1.2, 2.3, 8.6, 9.7),
        ((4, 0), 3.0, 4.1, 6.8, 7.9),
    ):
        part = pieces[identity]
        rest = tuple(part.location)
        raised = (rest[0], rest[1], rest[2]+.90)
        for t, position in ((0, rest), (start, rest), (lifted, raised),
                            (return_start, raised), (returned, rest), (12, rest)):
            key(part, t, loc=position)
