# PuzzleScript Next

PuzzleScript Next is your next version of PuzzleScript, 100% upwardly compatible and with all the latest features needed by more advanced developers.
You can try it out [here](https://david-pfx.github.io/PuzzleScriptNext/src/editor.html).

PuzzleScript Next is based on the latest version of the original fantastic [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript), the great features added in [Puzzlescript Plus by Auroriax](https://github.com/Auroriax/PuzzleScriptPlus) by many authors, plus a few contributions from [my own PuzzleFAB](https://github.com/david-pfx/PuzzleFAB).

## Release v-23d25

This is the first release. There are no new features yet.

## Release v-23e10

- Add `.../editor.html?url=<path>`, to load a program from anywhere on the Web.
- Add // comment style, as shown in the starter. Optional, use it in the prelude if you want it.
Note that you cannot mix comment styles.
- Add ; object line break. Only works if you also chose // comments.
- Add mouse click movements. If you left or right click on an object, it will receive the movements `lclick` or `rclick` (`mclick` is reserved for future use). Use like this:
```
[ lclick crate ] -> [ ] // destroys a crate
```
- Update starter program.

