Puzzlescript+ is a fork of [Puzzlescript by Increpare](https://github.com/increpare/PuzzleScript) that attempts to gather a number of forks I often use for my own games, while also extending the editor a bit and adding a couple of new game features. **DO NOTE that combining functionality from multiple forks is still experimental, and you could run into issues.** [Access the editor](https://auroriax.github.io/PuzzleScript/editor.html), or see the [updated documentation on the new features](https://auroriax.github.io/PuzzleScript/Documentation/documentation.html).

This repo merges forks by ThatScar, Marcosdon, and Dario Zubovic, and more! Thanks to them, you can use mouse controls, sprites larger than 5x5, a level select menu, and an experimental solver. This is the full list:

## [PuzzleClick by ThatScar](https://github.com/ThatScar/PuzzleScript)
Allows you to create objects on tiles the mouse interacts with. [More info here](https://github.com/ThatScar/PuzzleScript/blob/master/README.md).

## [Marcosdon's Solver for Puzzlescript](https://github.com/marcosdon/PuzzleScriptWithSolver)
Adds a solver that will automatically attempt to beat levels and report the solution. [More info here](https://github.com/marcosdon/PuzzleScriptWithSolver/blob/master/README.md).

## [Dario Zubovic's branch](https://github.com/dario-zubovic/PuzzleScript)
Adds in variable sprite size, level selection, ability to use a base64-encoded font, and a few more things (including the [smoothscreen patch by sftrabbit](https://github.com/sftrabbit/PuzzleScript-smoothscreen)). [More info here](https://dario-zubovic.github.io/PuzzleScript/Documentation/differences.html).

## [Jack Lance's branch](https://github.com/JackLance/PuzzleScript)
This adds a single feature that is especially useful for worlds that take place on gigantic maps. You can specify the radius around the player in which rules need to be checked. You generally don't need to use this unless you have a really big level, a ton of rules, and your game would otherwise run slowly.

All of the used forks & original repo are licenced under MIT, and so is this repo. See below.

-------

The MIT License (MIT)

Copyright (c) 2013 increpare

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
