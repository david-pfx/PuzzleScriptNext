# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
You can try it out [here](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html).

PuzzleScript Next is based on the latest version of the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript), the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus) by many authors, plus a few contributions from [my own PuzzleFAB](https://github.com/david-pfx/PuzzleFAB).

## New Features

The latest version is Release v-23f09. It includes the following.

### Object animation

The SOUNDS section is enhanced by the ability for an object to have an animation instead of or as well as a sound.
Use it like this. The test program is `test_min_animate.txt` and the demo is `next_yasban.txt`.
```
player move 85101706 afx:ease=13:xlate
player cantmove horizontal 64217903 afx:xlate=-.5
player cantmove vertical 64217903 afx:xlate=-1
g create 47877305 afx:scale
b create 47877305 afx:angle=180
b destroy 85101706 afx:alpha
```

All animations start with `afx` and have one or more parameters separated by `:`. 
Each parameter may have an argument separated by `=`.
The parameters are:
 * `xlate[=factor]` animates a translate movement of an object
 * `scale[=factor]` animates a scaling (resizing or zooming) of an object
 * `alpha[=factor]` animates the alpha (transparency) of an object
 * `angle[=angle]` animates the rotation (`angle`) of an object, default 360 degrees
 * `ease[=function]` applies an easing `function` (non-linear tweening), as per `tween_easing` in the prelude

 An argument of `factor` is multiplied by the magitude of the animation, and defaults to 1.0.
 Multiple animations may be applied to an object.
 Feel free to experiment.

 All animations take place in a single period of time, set by in the prelude by `animate_interval`. 
 The default is 0.25 sec.

 ```
 animate_interval 0.4 //  set animations to run in 0.4 secs
 ```

 ### Show single layer
 The editor has a new button to show a single layer of a running game.
 The PgUp and PgDn keys move through the layers.
 This is a work in progress.

### Comment styles
Like this:
```
title PuzzleScriptNext Starter
author davidus
homepage www.polyomino.com

// Welcome to PuzzleScript Next, the home of the most advanced PuzzleScript features!
```

The // comment style is activated if you use it in the prelude, as shown in the starter. 
Note that you cannot mix comment styles.

The `;` symbol can be used as an object definition line break, as show here.
It only works if you activated // comments.

```
Target; #0f0
Player; #00f8
Crate; orange
```
See the starter for how it looks.

### Mouse click movements

Use it like this. The test program is `test_min_click.txt`.
```
[ lclick crate ] -> [ ] // destroys a crate
```

If you left or right click on an object, it will receive the movements `lclick` or `rclick` (`mclick` is reserved for future use). 
These movements are also displayed in the editor to show where the click happened, using a new style of glyph.

### TEXT sprites

Use it like this. The test program is `test_min_test.txt`.
```
s;purple;text S
t;orange;text t
u;pink;text Ab3
```
The text is centred to fit in the cell. 
Unfortunately it is only a 7x12 font, which is not visually attractive.
A future release may offer a better font.

### Sprites can be of any size or width

Sprites can be defined as a grid of anything from 2x2 to 50x50 or even more! 
They do not need to be square, but they must be rectangular (that is, all rows in the grid the same length).
Non-square sprites are centred horizontally and vertically.

Use it like this. The test program is `test_min_spritesize.txt`.
```
stripe;black red blue green yellow white orange purple
01234567
70123456
```

### Move corresponding using property objects

Property objects work as maps, to move objects in corresponding positions within the definition.
There must be at least one on each side and all must be the same size.

Use it like this. The test program is `test_min_corr.txt`.
```
rgb = r or g or b
gbr = g or b or r

[ > p | rgb ] -> [ p | gbr ]
```

### Load a program from anywhere on the Web

Start the editor with a URL like this: 
```
.../editor.html?url=<path>
```


