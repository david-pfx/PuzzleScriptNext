// Functions to create and render text and sprites

// Create and return a graphic sprite
function createSprite(name,spritegrid, colors, size) {
	colors ||= [state.bgcolor, state.fgcolor];

	var canvas = makeSpriteCanvas(name);
	var context = canvas.getContext('2d');

    const pixelsize = Math.min(cellwidth / size, cellheight / size);
    canvas.width = spritegrid.reduce((acc, row) => Math.max(acc, row.length), 0) * pixelsize;
    canvas.height = spritegrid.length * pixelsize;

    renderSprite(context, spritegrid, colors, 0, 0, 0, size);

    return canvas;
}

// Create and return a text sprite
function createTextSprite(name, text, colors, scale) {
	colors ||= [state.bgcolor, state.fgcolor];

	var canvas = makeSpriteCanvas(name);
	var context = canvas.getContext('2d');

    drawTextWithFont(context, text, colors, 
        0.5 * cellwidth, 0.5 * cellheight, 
        scale ? (scale * cellheight) : (cellheight / text.length));
}

// draw the pixels of the sprite grid data into the context at a cell position, 
function renderSprite(context, spritegrid, colors, padding, x, y, size) {
    colors ||= ['#00000000', state.fgcolor];

    const rc = { 
        x: x * cellwidth, // global
        y: y * cellheight, 
        w: size || spritegrid[0].length, 
        h: size || spritegrid.length,
    };

    context.clearRect(rc.x, rc.y, rc.w, rc.h);

    // always assume square pixels at this stage?
    const pixelsize = Math.min(cellwidth / rc.w, cellheight / rc.h);
    const pixh = ("scanline" in state.metadata) ? pixelsize / 2 : pixelsize;

    context.fillStyle = state.fgcolor;
    spritegrid.forEach((row,y) => {
        row.forEach((col,x) => {
            if (col >= 0) {
                context.fillStyle = colors[col];
                context.fillRect(rc.x + x * pixelsize, rc.y + y * pixelsize, pixelsize, pixh);
            }            
        });
    });
}

function drawTextWithFont(ctx, text, color, x, y, height) {
    const fontSize = state.metadata.font_size ? Math.max(0, parseFloat(state.metadata.font_size)) : 1;
    const pixelsize = height * fontSize;
    const fontname = (state.metadata.custom_font && loadedCustomFont) ? "PuzzleCustomFont" : "Monospace";
    ctx.font = `${pixelsize}px ${fontname}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
    //console.log(`ctx=${ctx} color=${color} x=${x} y=${y} height=${height} font=${ctx.font} text=${text} `);

}

var textsheetCanvas = null;

function regenText() {
    textsheetCanvas ||= document.createElement('canvas');

    var textsheetSize = Math.ceil(Math.sqrt(fontKeys.length));

    textsheetCanvas.width = textsheetSize * cellwidth;
    textsheetCanvas.height = textsheetSize * cellheight * 2;

    var textsheetContext = textsheetCanvas.getContext('2d');

    for (var n = 0; n < fontKeys.length; n++) {
        var key = fontKeys[n];
        if (font.hasOwnProperty(key)) {
            fontstr = font[key].split('\n').map(a=>a.trim().split('').map(t=>parseInt(t)));
            fontstr.shift();

            var textX = (n % textsheetSize)|0;
            var textY = (n / textsheetSize)|0;

            renderSprite(textsheetContext, fontstr, undefined, 1, textX, textY);
            renderSprite(textsheetContext, fontstr, ['#00000000', '#000000'], 1, textX, textY + textsheetSize);
        }
    }
}

var editor_s_grille=[[0,1,1,1,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,1,1,1,0]];

var spriteImages;
function regenSpriteImages() {
	if (textMode) {
        spriteImages = [];
		regenText();
		return;
	} 
    
    if (IDE===true) {
        textImages['editor_s'] = createSprite('chars', editor_s_grille, undefined, 5);
    }
    
    if (state.levels.length===0) {
        return;
    }
    spriteImages = [];
    
    objectSprites.forEach((s,i) => {
        if (s) {
            spriteImages[i] = s.text ? createTextSprite(s.text, s.colors, s.scale)
                : createSprite(i.toString(), s.dat, s.colors, state.sprite_size);
        }
    });

    if (canOpenEditor) {
    	generateGlyphImages();
    }
}

var glyphImagesCorrespondance;
var glyphImages;
var glyphHighlight;
var glyphHighlightDiff;
var glyphHighlightResize;
var glyphPrintButton;
var glyphMouseOver;
var glyphSelectedIndex=0;
var editorRowCount=1;
var editorGlyphMovements=[];

// create or reuse a canvas by this name
var canvasdict={};
function makeSpriteCanvas(name) {
    var canvas;
    if (name in canvasdict) {
        canvas = canvasdict[name];
    } else {
        canvas = document.createElement('canvas');
        canvasdict[name]=canvas;
    }
	canvas.width = cellwidth;
	canvas.height = cellheight;
	return canvas;
}


function generateGlyphImages() {
    if (cellwidth===0||cellheight===0) {
        return;
    }
	glyphImagesCorrespondance=[];
	glyphImages=[];
	
    seenobjects = {};
	for (var n of state.glyphOrder) {
		if (n.length==1 && state.glyphDict.hasOwnProperty(n)) {            
			var g=state.glyphDict[n];

            /* hide duplicate entries from editor palette*/
            var trace = g.join(",");
            if (seenobjects.hasOwnProperty(trace)){
                continue;
            }
            
			var sprite = makeSpriteCanvas("C"+n)
			var spritectx = sprite.getContext('2d');
			glyphImagesCorrespondance.push(n);
            seenobjects[trace]=true;

			for (var i=0;i<g.length;i++){
				var id = g[i];
				if (id===-1) {
					continue;
                }
				spritectx.drawImage(spriteImages[id], 0, 0);
			}
			glyphImages.push(sprite);
		}
	}

	if (IDE) {
		//make highlight thingy
		glyphHighlight = makeSpriteCanvas("highlight");
		var spritectx = glyphHighlight.getContext('2d');
		spritectx.fillStyle = '#FFFFFF';

        const hlwid = 3;
        spritectx.fillRect(0, 0, cellwidth, hlwid);
        spritectx.fillRect(0, 0, hlwid, cellheight);

        spritectx.fillRect(0, cellheight - hlwid, cellwidth, hlwid);
        spritectx.fillRect(cellwidth - hlwid, 0, hlwid, cellheight);

		glyphPrintButton = textImages['editor_s'];

		//make diff highlighter thingy
		glyphHighlightDiff = makeSpriteCanvas("glyphHighlightDiff");
		var spritectx = glyphHighlightDiff.getContext('2d');
        
		spritectx.fillStyle =  state.bgcolor;

		spritectx.fillRect(0,0,cellwidth,2);
		spritectx.fillRect(0,0,2,cellheight);
		
		spritectx.fillRect(0,cellheight-2,cellwidth,2);
		spritectx.fillRect(cellwidth-2,0,2,cellheight);

		spritectx.fillStyle = state.fgcolor;

		spritectx.fillRect(0,0,cellwidth,1);
		spritectx.fillRect(0,0,1,cellheight);
		
		spritectx.fillRect(0,cellheight-1,cellwidth,1);
		spritectx.fillRect(cellwidth-1,0,1,cellheight);

		glyphPrintButton = textImages['editor_s'];

		//make highlight thingy
		glyphHighlightResize = makeSpriteCanvas("highlightresize");
		var spritectx = glyphHighlightResize.getContext('2d');
		spritectx.fillStyle = '#FFFFFF';
		
        const rswid = 3;
        const minx = ~~(cellwidth / 2 - 1);
        const miny = ~~(cellheight / 2 - 1);
		spritectx.fillRect(minx, 0, rswid, cellheight);
		spritectx.fillRect(0, miny, cellwidth, rswid);

		//make highlight thingy
		glyphMouseOver = makeSpriteCanvas("glyphMouseOver");
		var spritectx = glyphMouseOver.getContext('2d');
		spritectx.fillStyle = 'yellow';
		const mowid = 3;  // was 2

        spritectx.fillRect(0, 0, cellwidth, mowid);
        spritectx.fillRect(0, 0, mowid, cellheight);

        spritectx.fillRect(0, cellheight - mowid, cellwidth, mowid);
        spritectx.fillRect(cellwidth - mowid, 0, mowid, cellheight);

        //make movement glyphs

        const coords = [
            //0 up
            [ [3,2],[5,0],[7,2]],
            //1 down
            [ [3,8],[5,10],[7,8]],
            //2 left
            [ [2,3],[0,5],[2,7]],
            //3 right
            [ [7,3],[10,5],[7,7]],
            //4 action
            [ [3,5],[5,7],[7,5],[5,3]],
            //5 rigid
            [ [3,3],[5,3],[5,4],[4,4],[4,5],[3,5]],
            //6 lclick
            [ [4,4],[1,4],[1,7]],
            //7 rclick
            [ [6,4],[9,4],[9,7]],
        ];

        for (var i=0;i<coords.length;i++){
            editorGlyphMovements[i]=makeSpriteCanvas("editorGlyphMovements"+i);
            var path = coords[i];

            var spritectx = editorGlyphMovements[i].getContext('2d');
            spritectx.lineWidth=1;
            
            
		    spritectx.fillStyle =  state.bgcolor;
		    spritectx.strokeStyle = state.fgcolor;


            spritectx.beginPath();       // Start a new path
            spritectx.moveTo(path[0][0]*cellwidth/10.0, path[0][1]*cellheight/10.0);    
            for (var j=1;j<path.length;j++){
                spritectx.lineTo(path[j][0]*cellwidth/10.0, path[j][1]*cellheight/10.0);   
            }
            spritectx.closePath();
            spritectx.fill();
            spritectx.stroke();          // Render the path        
        }
	}
}

var canvas;
var ctx;


var x;
var y;
var cellwidth;
var cellheight;
var xoffset;
var yoffset;

window.addEventListener('resize', canvasResize, false);
canvas = document.getElementById('gameCanvas');
ctx = canvas.getContext('2d');
x = 0;
y = 0;

// length of visible row for mouse wheel
function glyphCount() {
    return state.glyphOrder.filter(g => g.length == 1).length;
}

function redraw() {
    if (cellwidth===0||cellheight===0) {
        return;
    }
    if (debugLevel.includes('perf')) console.log(`Redraw: ${JSON.stringify(perfCounters)}`);

    if (textMode)
        redrawTextMode();
    else redrawCellGrid();
}

// option to draw custom font text in cells could be a prelude setting if desired
const textModeLine = true;

function redrawTextMode() {
    ctx.fillStyle = state.bgcolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if(state.metadata.custom_font === undefined || !loadedCustomFont) { 
        const textsheetSize = Math.ceil(Math.sqrt(fontKeys.length));
        for (var i = 0; i < titleWidth; i++) {
            for (var j = 0; j < titleHeight; j++) {
                var ch = titleImage[j].charAt(i);
                if (ch in font) {
                    var index = fontIndex[ch];
                    var textX = (index % textsheetSize)|0;
                    var textY = (index / textsheetSize)|0;
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(
                        textsheetCanvas,
                        textX * textcellwidth,
                        textY * textcellheight,
                        textcellwidth, textcellheight,
                        xoffset + i * cellwidth,
                        yoffset + j * cellheight,
                        cellwidth, cellheight
                    );
                    ctx.imageSmoothingEnabled = true;
                }
            }
        }
    } else if (textModeLine) {
        for(let j = 0; j < titleHeight; j++) {
            drawTextWithFont(ctx, titleImage[j], state.fgcolor, 
                xoffset + (titleWidth/2+0.5) * cellwidth, yoffset + (j+0.5) * cellheight, cellheight);
        }
    } else {
        for (var i = 0; i < titleWidth; i++) {
            for(let j = 0; j < titleHeight; j++) {
                drawTextWithFont(ctx, titleImage[j].slice(i, i+1), state.fgcolor, 
                    xoffset + (i+0.5) * cellwidth, yoffset + (j+0.5) * cellheight, cellheight);
            }
        }
    }
}
   
// redraw the cell grid including all modes and animations
function redrawCellGrid() {
    var curlevel = level;
    if (diffToVisualize!==null){
        curlevel = new Level(-1,diffToVisualize.width,diffToVisualize.height,diffToVisualize.layerCount,diffToVisualize.objects);
        curlevel.movements = diffToVisualize.movements;
        curlevel.rigidMovementAppliedMask = diffToVisualize.rigidMovementAppliedMask;
    }
    ctx.fillStyle = state.bgcolor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let minMaxIJ = [ 0, 0, screenwidth, screenheight ];

    var cameraOffset = {
        x: 0,
        y: 0
    };

    if (flickscreen) {
        var playerPositions = getPlayerPositions();
        if (playerPositions.length>0) {
            var playerPosition=playerPositions[0];
            var px = (playerPosition/(curlevel.height))|0;
            var py = (playerPosition%curlevel.height)|0;

            const screenx = (px / screenwidth) | 0;
            const screeny = (py / screenheight) | 0;
            const mini = screenx * screenwidth;
            const minj = screeny * screenheight;
            minMaxIJ = [mini, minj, Math.min(mini + screenwidth, curlevel.width), Math.min(minj + screenheight, curlevel.height)];

            oldflickscreendat = minMaxIJ;
        } else if (oldflickscreendat.length>0){
            minMaxIJ = oldflickscreendat;
        }
    } else if (zoomscreen) {
        var playerPositions = getPlayerPositions();
        if (playerPositions.length>0) {
            const playerPosition = playerPositions[0];
            const px = (playerPosition / (curlevel.height)) | 0;
            const py = (playerPosition % curlevel.height) | 0;
            const mini = Math.max(Math.min(px - ((screenwidth / 2) | 0), curlevel.width - screenwidth), 0);
            const minj = Math.max(Math.min(py - ((screenheight / 2) | 0), curlevel.height - screenheight), 0);
            minMaxIJ = [mini, minj, Math.min(mini + screenwidth, curlevel.width), Math.min(minj + screenheight, curlevel.height)];
            oldflickscreendat = minMaxIJ;
        }  else if (oldflickscreendat.length>0){
            minMaxIJ = oldflickscreendat;
        }         
    } else if (smoothscreen) {
        if (cameraPositionTarget !== null) {
            ['x', 'y'].forEach(function (coord) {
                var cameraTargetVector = cameraPositionTarget[coord] - cameraPosition[coord];

                if (cameraTargetVector === 0) {
                    return;
                } else if (Math.abs(cameraTargetVector) < (0.5 / cellwidth)) {
                    // Canvas doesn't actually render subpixels, but when the camera is less than half a subpixel away from target, snap to target
                    cameraPosition[coord] = cameraPositionTarget[coord]
                    return
                }

                cameraPosition[coord] += cameraTargetVector * state.metadata.smoothscreen.cameraSpeed;
                //console.log(coord + " "+ cameraPosition[coord])
                cameraOffset[coord] = cameraPosition[coord] % 1;
            })
            const mini = Math.max(Math.min(Math.floor(cameraPosition.x) - Math.floor(screenwidth / 2), level.width - screenwidth), 0);
            const minj = Math.max(Math.min(Math.floor(cameraPosition.y) - Math.floor(screenheight / 2), level.height - screenheight), 0);
            minMaxIJ = [mini, minj, Math.min(mini + screenwidth, level.width), Math.min(minj + screenheight, level.height)];
            oldflickscreendat = minMaxIJ;
        } else if (oldflickscreendat.length>0) {
            minMaxIJ = oldflickscreendat;
        }

        const iLen = (minMaxIJ[2] - minMaxIJ[0]) * cellwidth;
        const jLen = (minMaxIJ[3] - minMaxIJ[1]) * cellheight;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xoffset, yoffset);
        ctx.lineTo(xoffset + iLen, yoffset);
        ctx.lineTo(xoffset + iLen, yoffset + jLen);
        ctx.lineTo(xoffset, yoffset + jLen);
        ctx.clip();
    }
    
    // used in function isInside
    screenOffsetX = minMaxIJ[0];
    screenOffsetY = minMaxIJ[1];

    var renderBorderSize = smoothscreen ? 1 : 0;

    var tweening = state.metadata.tween_length && currentMovedEntities;
    // global flag to force redraw
    isAnimating = state.metadata.smoothscreen || tweening || Object.keys(seedsToAnimate).length > 0;

////////////////////////////////////////////////////////////////////////////////
    class RenderOrder {  // @@PS>
        constructor(minMax) {
            this.minMax = minMax;
            // the iteration limits still used by smooth screen renderer
            this.iter = [
                Math.max(this.minMax[0] - renderBorderSize, 0),
                Math.max(this.minMax[1] - renderBorderSize, 0),
                Math.min(this.minMax[2] + renderBorderSize, curlevel.width),
                Math.min(this.minMax[3] + renderBorderSize, curlevel.height)
            ];
        }
        getIter() {
            return this.iter;
        }
        
        // the position indexes to render, taking into account layer groups, zoomscreen etc
        getPosIndexes(group) {  // todo:
            //const iter = iterXlate[group.dirMajor + group.dirMinor];
            
            const ch = curlevel.height; // global
            const funcs = {      // outer loop            inner loop
                downright: i => [ i[0],   i[2],    1, ch, i[1],   i[3],    1,  1 ],
                downleft:  i => [ i[2]-1, i[0]-1, -1, ch, i[1],   i[3],    1,  1 ],
                upright:   i => [ i[0],   i[2],    1, ch, i[3]-1, i[1]-1, -1,  1 ],
                upleft:    i => [ i[2]-1, i[0]-1, -1, ch, i[3]-1, i[1]-1, -1,  1 ],
                rightdown: i => [ i[1],   i[3],    1,  1, i[0],   i[2],    1, ch ],
                leftdown:  i => [ i[3]-1, i[1]-1, -1,  1, i[0],   i[2],    1, ch ],
                rightup:   i => [ i[1],   i[3],    1,  1, i[2]-1, i[0]-1, -1, ch ],
                leftup:    i => [ i[3]-1, i[1]-1, -1,  1, i[2]-1, i[0]-1, -1, ch ],
            };
            
            function doIter (i0, i1, ix, im, j0, j1, jx, jm) {
                const posindexes = [];
                for (let i = i0; i != i1; i += ix) {
                    for (let j = j0; j != j1; j += jx) {
                        posindexes.push(i * im + j * jm);
                    }
                }
                return posindexes;
            }
            
            return doIter( ...funcs[group.dirFirst + group.dirSecond](this.iter) );
        }
        getDrawPos(posindex, obj) {
            const ij = { 
                x: ~~(posindex / curlevel.height), 
                y: posindex % curlevel.height 
            }; // globals
            const offs = { 
                x: obj.spriteoffset.x, 
                y: obj.spriteoffset.y + state.sprite_size - obj.spritematrix.length 
            };
            return {
                x: xoffset + (ij.x - this.minMax[0]-cameraOffset.x) * cellwidth + offs.x * ~~(cellwidth / state.sprite_size),
                y: yoffset + (ij.y - this.minMax[1]-cameraOffset.y) * cellheight + offs.y * ~~(cellheight / state.sprite_size)
            };

        }
    }

    const render = new RenderOrder(minMaxIJ);
    if (tweening) drawObjectsTweening(render.getIter());
    else drawObjects(render);

    if (state.metadata.status_line)
        drawTextWithFont(ctx, statusText, state.fgcolor, 
            xoffset + screenwidth * cellwidth / 2, yoffset + screenheight * cellheight + textcellheight * 0.6, textcellheight * 0.6);

    if (diffToVisualize)
        drawDiffToVisualize();
    if (smoothscreen) {
        if (state.metadata.smoothscreen.debug)
            drawSmoothScreenDebug(ctx);
        ctx.restore();
    }

    if (levelEditorOpened)
        drawEditorIcons(minMaxIJ[0], minMaxIJ[1]);

    //----- functions -----
    // Default draw loop, including when animating
    function drawObjects(render) {
        showLayerNo = Math.max(0, Math.min(curlevel.layerCount - 1, showLayerNo));
        const tween = 1 - clamp(tweentimer/animateinterval, 0, 1);  // range 1 => 0
        if (tween == 0) 
            seedsToAnimate = {};

        // Decision required whether to follow P:S pivot (top left)
        const spriteScaler = state.metadata.sprite_size ? { 
            scale: state.sprite_size, 
            pivotx: 0.0, // todo
            pivoty: 1.0 
        } : null;

        // draw each group of objects in all the places they occur, in specified order
        for (const group of state.collisionLayerGroups) {
            for (const posindex of render.getPosIndexes(group)) {
                const posmask = curlevel.getCellInto(posindex,_o12);    
                for (let k = group.firstObjectNo; k < group.firstObjectNo + group.numObjects; ++k) {
                    const animate = (isAnimating) ? seedsToAnimate[posindex+','+k] : null;
                    if (posmask.get(k) || animate) {
                        const obj = state.objects[state.idDict[k]];
                        if (showLayers && obj.layer != showLayerNo)
                            continue;
                        const gridSize = {
                            w: obj.spritematrix.reduce((acc, row) => Math.max(acc, row.length), 0),
                            h: obj.spritematrix.length
                        };
                        const pixelFactor = cellheight / state.sprite_size;

                        let spriteScale = 1;
                        if (spriteScaler) spriteScale *= Math.max(obj.spritematrix.length, obj.spritematrix[0].length) / spriteScaler.scale;
                        //if (obj.scale) spriteScale *= obj.scale;
                        const drawpos = render.getDrawPos(posindex, obj);
                        
                        let params = {
                            x: 0, y: 0,
                            scalex: 1.0, scaley: 1.0,
                            alpha: 1.0,                                
                            angle: 0.0,                                
                        };
                        if (animate) 
                            params = calcAnimate(animate.seed.split(':').slice(1), animate.kind, animate.dir, params, tween);

                        const csz = { 
                            x: params.scalex * cellwidth * spriteScale, 
                            y: params.scaley * cellheight * spriteScale 
                        };
                        const rc = { 
                            x: Math.floor(drawpos.x + params.x * cellwidth), 
                            y: Math.floor(drawpos.y + params.y * cellheight),
                            w: csz.x,
                            h: csz.y
                        };
                        ctx.globalAlpha = params.alpha;
                        ctx.translate(rc.x + csz.x/2, rc.y + csz.y/2);
                        ctx.rotate(params.angle * Math.PI / 180);
                        ctx.drawImage(
                            spriteImages[k], 0, 0, gridSize.w * pixelFactor, gridSize.h * pixelFactor, 
                            -csz.x/2, -csz.y/2, rc.w, rc.h);
                        ctx.globalAlpha = 1;
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                    }
                }
            }
        }
    } 

    // update animation parameters based on kind and dir, based on tween curve
    function calcAnimate(afx, kind, dir, params, tween) {
        const tween_table = {
            move:   { slide: [-1,0],    zoom: [0,1],       turn: [0,.25],       fade: [0,1] },
            cant:   { slide: [0,.2,0],  zoom: [1,1.2,1],   turn: [0,.1,0],      fade: [1,.5,1] },
            hit:    { slide: [0,.2,0],  zoom: [1,1.2,1],   turn: [0,-.1,.1,0],  fade: [1,.5,1] },
            create: { slide: [1,0],     zoom: [0,1],       turn: [-.125,0],     fade: [0,1] },
            destroy:{ slide: [0,1],     zoom: [1,0],       turn: [0,.125],      fade: [1,0] },
        }
    
        // tweening funcs
        const tfuncs = {
            slide: (p,t) => { 
                const delta = [1,2,4,8].includes(dir) ? dirMasksDelta[dir] : [ 0, -1 ]; // up
                p.x = t * delta[0]; 
                p.y = t * delta[1]; 
            },
            zoom: (p,t) => { 
                p.scalex = p.scaley = t; 
                p.x = p.y = 0.5 - p.scalex/2;  
            },
            fade: (p,t) => { p.alpha = t; },
            turn: (p,t) => { p.angle = t * 360; },
        }

        // param funcs
        const pfuncs = {
            ease: (p,a,t) => { tween = easingFunction(a)(tween); },
            tween: (p,a,t) => { tween = a; },  // wrong!?
        }
        
        for (x of afx) {
            const xs = x.split('=');
            if (tfuncs[xs[0]]) {
                if (kind == 'move' && ![1,2,4,8].includes(dir))
                    kind = 'hit';
                const tweens = xs[1] ? xs[1].split(',').map(p => parseFloat(p) || 0)
                    : tween_table[kind][xs[0]];
                const twx = (1 - tween) * (tweens.length - 1);
                const tdiv = ~~twx;
                const tmod = twx - tdiv;
                const t = tweens[tdiv] + (tweens[tdiv + 1] - tweens[tdiv]) * tmod;
                tfuncs[xs[0]](params, t);
            } else if (pfuncs[xs[0]]) {
                pfuncs[xs[0]](params, xs[1], t);
            }

        }
        return params;
    }

    // Draw loop used when tweening
    function drawObjectsTweening(iter) {
        // assume already validated
        const easing = state.metadata.tween_easing || 'linear';
        const snap = state.metadata.tween_snap || state.sprite_size;
        let tween = EasingFunctions[easing](1-clamp(tweentimer/tweeninterval, 0, 1));
        tween = Math.floor(tween * snap) / snap;

        for (var k = 0; k < state.idDict.length; k++) {
            var object = state.objects[state.idDict[k]];
            var layerID = object.layer;

            for (var i = iter[0]; i < iter[2]; i++) {
                for (var j = iter[1]; j < iter[3]; j++) {
                    var posIndex = j + i * curlevel.height;
                    var posMask = curlevel.getCellInto(posIndex,_o12);                
                
                    if (posMask.get(k) != 0) {                  

                        var x = xoffset + (i-minMaxIJ[0]-cameraOffset.x) * cellwidth;
                        var y = yoffset + (j-minMaxIJ[1]-cameraOffset.y) * cellheight;

                        if (currentMovedEntities && currentMovedEntities["p"+posIndex+"-l"+layerID]) {
                            var dir = currentMovedEntities["p"+posIndex+"-l"+layerID];

                            if (dir != 16) { //Cardinal directions
                                var delta = dirMasksDelta[dir];
            
                                x -= cellwidth*delta[0]*tween
                                y -= cellheight*delta[1]*tween
                            } else if (dir == 16) { //Action button
                                ctx.globalAlpha = 1-tween;
                            }
                        }
                        
                        ctx.drawImage(
                            spriteImages[k], 0, 0, cellwidth, cellheight,
                            Math.floor(x), Math.floor(y), cellwidth, cellheight);
                        ctx.globalAlpha = 1;
                    }
                }
            }
        }
    }

    function drawDiffToVisualize() {
        //find previous state (this is never called on the very first state, the one before player inputs are applied, so there is always a previous state)
        var prevstate_lineNumberIndex=diffToVisualize.lineNumber-1;
        for (;prevstate_lineNumberIndex>=-1;prevstate_lineNumberIndex--)
        {
            if (debug_visualisation_array[diffToVisualize.turnIndex].hasOwnProperty(prevstate_lineNumberIndex)){
                break;
            }
        }

        var prev_state = debug_visualisation_array[diffToVisualize.turnIndex][prevstate_lineNumberIndex];
        var prevlevel = new Level(-1,prev_state.width,prev_state.height,prev_state.layerCount,prev_state.objects);
        prevlevel.movements = prev_state.movements;
        prevlevel.rigidMovementAppliedMask = prev_state.rigidMovementAppliedMask;
    
        for (var i = minMaxIJ[0]; i < minMaxIJ[2]; i++) {
            for (var j = minMaxIJ[1]; j < minMaxIJ[3]; j++) {
                var posIndex = j + i * curlevel.height;
                var movementbitvec_PREV = prevlevel.getMovements(posIndex);
                var movementbitvec = curlevel.getMovements(posIndex);
                
                var posMask_PREV = prevlevel.getCellInto(posIndex,_o11); 
                var posMask = curlevel.getCellInto(posIndex,_o12); 
                if (!movementbitvec.equals(movementbitvec_PREV) || !posMask.equals(posMask_PREV)){
                    ctx.drawImage(glyphHighlightDiff, xoffset + (i-minMaxIJ[0]) * cellwidth, yoffset + (j-minMaxIJ[1]) * cellheight);

                }
            }
        }
    
        //draw movements!
        for (var i = minMaxIJ[0]; i < minMaxIJ[2]; i++) {
            for (var j = minMaxIJ[1]; j < minMaxIJ[3]; j++) {
                var posIndex = j + i * curlevel.height;
                var movementbitvec = curlevel.getMovements(posIndex);
                for (var layer=0;layer<curlevel.layerCount;layer++) {
                    var layerMovement = movementbitvec.getshiftor(MOV_MASK, MOV_BITS * layer);
                    const k = [ 1, 2, 4, 8, 16, -1, 19, 20 ].indexOf(layerMovement);
                    if (k >= 0) {
                        ctx.drawImage(editorGlyphMovements[k], xoffset + (i - minMaxIJ[0]) * cellwidth, yoffset + (j - minMaxIJ[1]) * cellheight);
                    }
                }                             
            }
        }
    
        //draw rigid applciations!
        for (var i = minMaxIJ[0]; i < minMaxIJ[2]; i++) {
            for (var j = minMaxIJ[1]; j < minMaxIJ[3]; j++) {
                var posIndex = j + i * curlevel.height;
                var rigidbitvec = curlevel.getRigids(posIndex);
                for (var layer=0;layer<curlevel.layerCount;layer++) {
                    var layerRigid = rigidbitvec.getshiftor(MOV_MASK, MOV_BITS * layer);
                    if (layerRigid!==0) {
                        ctx.drawImage(editorGlyphMovements[5], xoffset + (i-minMaxIJ[0]) * cellwidth, yoffset + (j-minMaxIJ[1]) * cellheight);                            
                    }
                }                             
            }
        }
    }
}

function drawSmoothScreenDebug(ctx) {
    ctx.save();

    var smoothscreenConfig = state.metadata.smoothscreen;
    var boundarySize = smoothscreenConfig.boundarySize;

    var playerPositions = getPlayerPositions();
    if (playerPositions.length > 0) {
        var playerPosition = {
            x: (playerPositions[0]/(level.height))|0,
            y: (playerPositions[0]%level.height)|0
        };

        var playerOffsetX = playerPosition.x - cameraPosition.x;
        var playerOffsetY = playerPosition.y - cameraPosition.y;

        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(
            xoffset + (Math.floor(screenwidth / 2) + playerOffsetX + 0.5) * cellwidth,
            yoffset + (Math.floor(screenheight / 2) + playerOffsetY + 0.5) * cellheight,
            cellwidth / 4,
            0, 2* Math.PI
        );
        ctx.fill()
    }

    var targetOffsetX = cameraPositionTarget.x - cameraPosition.x;
    var targetOffsetY = cameraPositionTarget.y - cameraPosition.y;

    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    ctx.arc(
        xoffset + (Math.floor(screenwidth / 2) + targetOffsetX) * cellwidth,
        yoffset + (Math.floor(screenheight / 2) + targetOffsetY) * cellheight,
        cellwidth / 8,
        0, 2* Math.PI
    );
    ctx.fill()

    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = cellwidth / 16;
    ctx.strokeRect(
        xoffset + (Math.floor(screenwidth / 2) + targetOffsetX - Math.floor(boundarySize.width / 2)) * cellwidth,
        yoffset + (Math.floor(screenheight / 2) + targetOffsetY - Math.floor(boundarySize.height / 2)) * cellheight,
        boundarySize.width * cellwidth,
        boundarySize.height * cellheight
    );

    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(
        xoffset + Math.floor(screenwidth / 2) * cellwidth,
        yoffset + Math.floor(screenheight / 2) * cellheight,
        cellwidth / 4,
        0, 2* Math.PI
    );
    ctx.fill()

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = cellwidth / 8;
    ctx.strokeRect(
        xoffset + (Math.floor(screenwidth / 2) - Math.floor(boundarySize.width / 2)) * cellwidth,
        yoffset + (Math.floor(screenheight / 2) - Math.floor(boundarySize.height / 2)) * cellheight,
        boundarySize.width * cellwidth,
        boundarySize.height * cellheight
    );

    ctx.restore()
}

function drawEditorIcons(mini,minj) {
    // major rework using objects
    const inRect = (pt,rc) => pt.x >= rc.x && pt.x < rc.x + rc.w && pt.y >= rc.y && pt.y < rc.y + rc.h;
    const cellSize = { w: cellwidth, h: cellheight };
    // glyph panel rectangle in cells, origin same as main board
    const panelRect = { x: 0, y: -editorRowCount - 1, w: screenwidth + 1, h: editorRowCount };
    // mouse position rebased to within panel
    const mousePos = { x: mouseCoordX, y: mouseCoordY };
    const mousePanelPos = inRect(mousePos, panelRect) ? { x: mousePos.x - panelRect.x, y: mousePos.y - panelRect.y } : { x: NaN, y: NaN };
    // index into glyphs
    const mouseIndex = mousePanelPos.x + mousePanelPos.y * panelRect.w;
    const drawOffset = { x: xoffset, y: yoffset - cellSize.h * (1 + panelRect.h) };
    const cellPos = (n) => ({ x: n % panelRect.w, y: ~~(n / panelRect.w) });
    const drawPos = (n) => ({ x: drawOffset.x + cellPos(n).x * cellSize.w, y: drawOffset.y + cellPos(n).y * cellSize.h });

    let dp0 = drawPos(0)
    dp0.x -= cellSize.w;  // special
	ctx.drawImage(glyphPrintButton, dp0.x, dp0.y);
	if (mousePos.x == panelRect.x - 1 && mousePos.y == panelRect.y) 
		ctx.drawImage(glyphMouseOver, dp0.x, dp0.y);

    glyphImages.forEach((glyph,index) => {
		ctx.drawImage(glyph, drawPos(index).x, drawPos(index).y);
		if (index == mouseIndex)
			ctx.drawImage(glyphMouseOver, drawPos(index).x, drawPos(index).y);
		if (index == glyphSelectedIndex) 
			ctx.drawImage(glyphHighlight, drawPos(index).x, drawPos(index).y);
	});

    let tooltip_string = '';
    let tooltip_objects = null;
    if (mouseIndex >= 0 && mouseIndex < glyphImagesCorrespondance.length) {
        // prepare tooltip: legend for highlighted editor icon
        const identifier_index = glyphImagesCorrespondance[mouseIndex]
        tooltip_string = identifier_index 
        if (identifier_index in state.synonymsDict){
            tooltip_string += " = " + state.synonymsDict[identifier_index];
        } else if (identifier_index in state.aggregatesDict){
            tooltip_string += " = " + state.aggregatesDict[identifier_index].join(" and ");
        }
    } else if (mousePos.x >= 0 && mousePos.x < screenwidth && mousePos.y >= 0 && mousePos.y < screenheight) {
        // prepare tooltip: content of a level's cell
        const posMask = level.getCellInto((mousePos.y + minj) + (mousePos.x + mini) * level.height, _o12); //???
        tooltip_objects = state.idDict.filter( (x,k) => (posMask.get(k) != 0) )
        // prepare tooltip: object names
        tooltip_string = tooltip_objects ? tooltip_objects.join(', ') : '';
    }

    // show tooltip
    if (tooltip_string) {
        ctx.fillStyle = state.fgcolor;
        ctx.font = `${cellheight/2}px Monospace`;
        ctx.fillText(tooltip_string, xoffset - cellwidth, yoffset-0.3*cellheight);
    }



    if (mouseCoordX >= -1 && mouseCoordY >= -1 && mouseCoordX <= screenwidth && mouseCoordY <= screenheight) {
        if (mouseCoordX == -1 || mouseCoordY == -1 || mouseCoordX == screenwidth || mouseCoordY === screenheight) {
			ctx.drawImage(glyphHighlightResize,
				xoffset+mouseCoordX*cellwidth,
				yoffset+mouseCoordY*cellheight
				);								
		} else {
			ctx.drawImage(glyphHighlight,
				xoffset+mouseCoordX*cellwidth,
				yoffset+mouseCoordY*cellheight
				);				
		}
	}

}

var lastDownTarget;

var oldcellwidth=0;
var oldcellheight=0;
var oldtextmode=-1;
var oldfgcolor=-1;
var forceRegenImages=false;

var textcellwidth = 0;
var textcellheight = 0;

// recalculate screen layout and then call redraw
function canvasResize() {
    canvas.width = canvas.parentNode.clientWidth;
    canvas.height = canvas.parentNode.clientHeight;

    screenwidth=level.width;        // board size, used to calculate cell size
    screenheight=level.height;
    if (!state) throw 'oops!';

    flickscreen=state.metadata.flickscreen!==undefined;
    zoomscreen=state.metadata.zoomscreen!==undefined;
    smoothscreen=state.metadata.smoothscreen!==undefined;
    if (textMode) {
        screenwidth = titleWidth;
        screenheight = titleHeight;
    } else if (flickscreen) {
        screenwidth=state.metadata.flickscreen[0];
        screenheight=state.metadata.flickscreen[1];
    } else if (zoomscreen) {
        screenwidth=state.metadata.zoomscreen[0];
        screenheight=state.metadata.zoomscreen[1];
    } else if (smoothscreen) {
        screenwidth=state.metadata.smoothscreen.screenSize.width;
        screenheight=state.metadata.smoothscreen.screenSize.height;
    }

    // If we need a status line, this will reduce the cell height to allow room
    const statusLineHeight = state.metadata.status_line ? canvas.height / titleHeight : 0;
    if (levelEditorOpened) {
        // glyph display is level width + 1
        editorRowCount = Math.ceil(glyphCount()/(screenwidth + 1));
        //editorRowCount = Math.ceil(glyphImages.length/(screenwidth + 1));
        cellwidth = canvas.width / (screenwidth + 2);
        cellheight = (canvas.height - statusLineHeight) / (screenheight + 2 + editorRowCount);
    } else {
        cellwidth = canvas.width / screenwidth;
        cellheight = (canvas.height - statusLineHeight) / screenheight;
    }

    // round the cell size as a multiple of sprite size
    let w = h = state.sprite_size || 5;
    if (textMode) {
        w= 5 + 1;
        const xchar = font['X'].split('\n').map(a=>a.trim());
        h = xchar.length;        
    }
    cellwidth =w * Math.max( ~~(cellwidth / w),1);
    cellheight = h * Math.max(~~(cellheight / h),1);
    if ((cellwidth == 0 || cellheight == 0) && !textMode) {
        cellwidth = w;
        cellheight = h;
        console.log("Resized below 1");
    }

    // calculate an XY offset to position the board on the screen
    xoffset = 0;
    yoffset = 0;

    if (cellwidth / w > cellheight / h  || (textMode && state.metadata.custom_font !== undefined && loadedCustomFont)) {
        cellwidth = cellheight * w / h;
    } else {
        cellheight = cellwidth * h / w;
    }

    if (levelEditorOpened && !textMode) {
        xoffset = (canvas.width - cellwidth * (screenwidth + 2)) / 2;
        yoffset = (canvas.height - statusLineHeight - cellheight * (screenheight + 2 + editorRowCount)) / 2;
    	xoffset+=cellwidth;
    	yoffset+=cellheight*(1+editorRowCount);
    } else {
        xoffset = (canvas.width - cellwidth * screenwidth) / 2;
        yoffset = (canvas.height - statusLineHeight - cellheight * screenheight) / 2;
    }

    // tidy up for export to globals
    cellwidth = cellwidth|0;
    cellheight = cellheight|0;
    xoffset = xoffset|0;
    yoffset = yoffset|0;

    if (textMode) {
        textcellwidth = cellwidth;
        textcellheight = cellheight;
    }

    if (debugLevel.includes('cell')) {
        const ele = document.getElementById('debug');
        ele.innerHTML = `cell WxH=${cellwidth},${cellheight} text=${textcellwidth},${textcellheight} offset=${xoffset},${yoffset}`;
    }
    
    if (oldcellwidth!=cellwidth||oldcellheight!=cellheight||oldtextmode!=textMode||textMode||oldfgcolor!=state.fgcolor||forceRegenImages){
    	forceRegenImages=false;
    	regenSpriteImages();
    }

    oldcellheight=cellheight;
    oldcellwidth=cellwidth;
    oldtextmode=textMode;
    oldfgcolor=state.fgcolor;

    redraw();
}

//Source: https://gist.github.com/gre/1650294
/*
 * Easing Functions - inspired from http://gizma.com/easing/
 * only considering the t value for the range [0, 1] => [0, 1]
 */

// return an easing function by name or no if valid, else default to linear
function easingFunction(ease) {
    const e = ease in EasingFunctions ? ease
        : ease in easingAliases ? easingAliases[ease].toLowerCase()
        : 'linear';
    return EasingFunctions[e];
}

EasingFunctions = {
    // no easing, no acceleration
    linear: t => t,
    // accelerating from zero velocity
    easeinquad: t => t*t,
    // decelerating to zero velocity
    easeoutquad: t => t*(2-t),
    // acceleration until halfway, then deceleration
    easeinoutquad: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
    // accelerating from zero velocity 
    easeincubic: t => t*t*t,
    // decelerating to zero velocity 
    easeoutcubic: t => (--t)*t*t+1,
    // acceleration until halfway, then deceleration 
    easeinoutcubic: t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,
    // accelerating from zero velocity 
    easeinquart: t => t*t*t*t,
    // decelerating to zero velocity 
    easeoutquart: t => 1-(--t)*t*t*t,
    // acceleration until halfway, then deceleration
    easeinoutquart: t => t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t,
    // accelerating from zero velocity
    easeinquint: t => t*t*t*t*t,
    // decelerating to zero velocity
    easeoutquint: t => 1+(--t)*t*t*t*t,
    // acceleration until halfway, then deceleration 
    easeinoutquint: t => t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t
  }

  easingAliases = {
      1: "linear",
      2: "easeInQuad",
      3: "easeOutQuad",
      4: "easeInOutQuad",
      5: "easeInCubic",
      6: "easeOutCubic",
      7: "easeInOutCubic",
      8: "easeInQuart",
      9: "easeOutQuart",
      10: "easeInOutQuart",
      11: "easeInQuint",
      12: "easeOutQuint",
      13: "easeInOutQuint"
  }