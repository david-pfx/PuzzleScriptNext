
'use strict';

// static data used here and elsewhere
var relativeDirections = ['^', 'v', '<', '>', 'perpendicular', 'parallel'];
var simpleAbsoluteDirections = ['up', 'down', 'left', 'right'];
var simpleRelativeDirections = ['^', 'v', '<', '>'];

var relativeDirs = ['^', 'v', '<', '>', 'parallel', 'perpendicular']; //used to index the following
//I use _par/_perp just to keep track of providence for replacement purposes later.
var relativeDict = {
    'right': ['up', 'down', 'left', 'right', 'horizontal_par', 'vertical_perp'],
    'up': ['left', 'right', 'down', 'up', 'vertical_par', 'horizontal_perp'],
    'down': ['right', 'left', 'up', 'down', 'vertical_par', 'horizontal_perp'],
    'left': ['down', 'up', 'right', 'left', 'horizontal_par', 'vertical_perp']
};

const directionaggregates = {
    'horizontal': ['left', 'right'],
    'horizontal_par': ['left', 'right'],
    'horizontal_perp': ['left', 'right'],
    'vertical': ['up', 'down'],
    'vertical_par': ['up', 'down'],
    'vertical_perp': ['up', 'down'],
    'moving': ['up', 'down', 'left', 'right', 'action'], // todo: reaction
    'orthogonal': ['up', 'down', 'left', 'right'],
    'perpendicular': ['^', 'v'],
    'parallel': ['<', '>']
};

var tagDirections = [
    { keys: [ '^', 'v', '<', '>', 'perpendicular', 'parallel', 'orthgonal' ], values: [ 'up', 'down', 'left', 'right' ] },
    { keys: [ 'horizontal' ], values: [ 'left', 'right' ] },
    { keys: [ 'vertical' ], values: [ 'up', 'down' ] },
];

function getTag(state, t) {
    return Object.hasOwn(state.tags, t) && state.tags[t];
}

function getMapping(state, m) {
    return Object.hasOwn(state.mappings, m) && state.mappings[m];
}

function isMappedTo(state, key, target) {
    return Object.hasOwn(state.mappings, key) && state.mappings[key].fromKey == target;
}

// is there a mapping fomr => key?
function canMapValue(state, key, from) {
    const map = state.mappings[key];
    return map && map.fromKey == from;
}

function getMappedValue(state, key, value) {
    const map = state.mappings[key];
    const index = map.fromValues.indexOf(value);
    return map.values[index];
}

function getMappedValues(state, key) {
    const map = state.mappings[key];
    return map.values.map(v => getTag(state, v) || v).flat();
}

// https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
// const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
// const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);
// function cartesian(...arrays) {
//     return arrays.reduce((a, b) => a.flatMap(x => b.map(y => x.concat([y]))), [ [] ]);
// }

function cartesianProduct(...arrays) {
    return arrays.reduce((a, b) => a.flatMap(x => b.map(y => x.concat([y]))), [ [] ]);
}

// a combinatorial ident expander based on embedded tags and ':' delimiters
class TagExpander {
    constructor(state, ident, usedirs = false, delim = ':') {
        this.ident = ident;
        this.delim = delim;
        [ this.stem, ...this.tail ] = ident.split(delim);
        this.keys = [];
        this.values = [];

        const tags = this.tail.filter(p => getTag(state, p));
        tags.forEach(t => {
            this.keys.push(t);
            this.values.push(state.tags[t]);
        })
        const maps = this.tail.filter(p => getMapping(state, p));
        maps.forEach(m => {
            this.keys.push(m);
            this.values.push(getMappedValues(state, m));
        });
        if (usedirs) {
            const dirs = this.tail.filter(p => tagDirections.find(d => d.keys.includes(p)));
            dirs.forEach(d => {
                this.keys.push(d);
                this.values.push(tagDirections.find(t => t.keys.includes(d)).values);
            });
        }
        this.expansion = cartesianProduct(...this.values);
    }

    get expKeys() {
        return this.keys;
    }
    get expValues() {
        return this.expansion;
    }

    // get array of base idents, one for each expansion
    getExpandedIdents() {
        if (this.keys.length == 0)
            return [ this.ident ];
        return this.expansion.map(e => [ 
            this.stem, 
            ...this.tail.map(p => 
                this.keys.includes(p) ? e[this.keys.indexOf(p)] : p) 
        ].join(this.delim));
    }

    // get an expanded ident based on a single expansion
    getExpandedIdent(exp) {
        return [ this.stem, ...this.tail.map(p => 
            this.keys.includes(p) ? exp[this.keys.indexOf(p)] : p) 
            ].join(this.delim);
    }

    // return alternate join key with substitutions based on a specific expansion
    getExpandedAlt(exp, ident) {
        const [ stem, ...tail ] = ident.split(':');
        return (tail.length == 0) ? stem
            : [ stem, ...tail.map(p => 
                this.keys.includes(p) ? exp[this.keys.indexOf(p)] : p) 
            ].join(this.delim);
    }

    // return ident with substitution if available based on a specific expansion
    getSubstitutedIdent(exp, ident, index) {
        const newident = this.keys.includes(ident) ? exp[this.keys.indexOf(ident)] : ident;
        return simpleRelativeDirections.includes(ident) ? clockwiseDirections[(clockwiseDirections.indexOf(ident) + index) % 4] : newident;
    }

    // return array of (possibly expanded) idents, one for each expansion
    getExpandedAltIdents(ident) {
        const [ stem, ...tail ] = ident.split(':');
        return this.expansion.map(e =>
            (tail.length == 0) ? stem
            : [ stem, ...tail.map(p => 
                this.keys.includes(p) ? e[this.keys.indexOf(p)] : p) 
            ].join(this.delim) );
    }
}

// expand a reference to an object from legend, layers and rules (rel dirs no expanded)
function expandObjectRef(state, objid, usedirs = false) {
    const expander = new TagExpander(state, objid, usedirs);
    //if (expander.rawTags.length == 0) return [ ident ];
    return expander.getExpandedIdents();
}

// expand object defined with tags/directions into new objects
function expandObjectDef(state, objid, objvalue) {
    const expander = new TagExpander(state, objid, true);
    if (expander.keys.length == 0) return;

    const newobjects = expander.expansion.map((exp,index) => {
        const newid = expander.getExpandedIdent(exp);
        const newvalue = { 
            ...deepClone(objvalue),
            canRedef: true 
        };
        if (objvalue.cloneSprite) {
            const altspriteid = expander.getExpandedAlt(exp, objvalue.cloneSprite);
            if (state.objects[altspriteid])
                newvalue.cloneSprite = altspriteid;
            // optional?
            //else logWarning(`Sprite copy: source says ${altspriteid.toUpperCase()} but there is no such object defined.`, objvalue.lineNumber);
        } else 
            newvalue.spritematrix = objvalue.spritematrix.map(row => [ ...row ]);

        
        if (objvalue.transforms) {
            newvalue.transforms = [];
            objvalue.transforms.forEach(xform => {
                const op = xform[0];
                newvalue.transforms.push([ op, 
                    expander.getSubstitutedIdent(exp, xform[1], index),
                    (op == 'rot') ? expander.getSubstitutedIdent(exp, xform[2], index) : xform[2] ]);
            })
        }
        return [newid, newvalue];
    });
    
    return newobjects;
}

// create hierarchy of properties when property contains tags
// do it by index because names may not be unique
function createObjectTagsAsProps(state, ident) {
    const fnValues = p => getTag(state, p) || (getMapping(state, p) && getMapping(state, p).values);
    const parts = ident.split(':');
    const todos = parts.map((p,x) => ({ part: p, index: x, values: fnValues(p) }))
        .filter(t => t.values);

    // if only one part is a tag or map we're done
    if (todos.length <= 1) return;

    todos.forEach(todo => {
        todo.values.forEach(value => {
            const newident = parts.map((p,x) => x == todo.index ? value : p).join(':');
            const expander = new TagExpander(state, newident, true);
            const newlegend = [ newident, ...expander.getExpandedIdents() ];
            newlegend.lineNumber = state.lineNumber;  // bug: ?
            state.legend_properties.push(newlegend);
            createObjectTagsAsProps(state, newident);
        })
    })
}


// generate a new sprite matrix based on transforms
// translate: handled as spriteoffset, because it might go negative
function applySpriteTransforms(obj) {
    const tranfunc = {
        'flip': (obj,dir) => [
            (m => m.reverse()),
		    (m => m.map(row => row.reverse())),
        ][dir % 2](obj.spritematrix),
        'shift': (obj,dir,amt) => obj.spritematrix = [ // up right down left
            (m => [ ...m.slice(amt), ...m.slice(0, amt) ]),
            (m => m.map(r => [ ...r.slice(-amt), ...r.slice(0, -amt) ])),
            (m => [ ...m.slice(-amt), ...m.slice(0, -amt) ]),
            (m => m.map(r => [ ...r.slice(amt), ...r.slice(0, amt) ])),
        ][dir](obj.spritematrix),
        'rot': (obj,dir1,dir2) => obj.spritematrix = [
            m => m, // 0°
            m => Array.from(m[0], (ch,col) => m.map( row => row[col] ).reverse()), // 90°
            m => Array.from(m, l => l.reverse() ).reverse(), // 180°
            m => Array.from(m[0], (ch,col) => m.map( row => row[col] )).reverse() // 270°
        ][(4 + cwdIndexOf(dir2) - dir1) % 4](obj.spritematrix),
        'translate': (obj,dir,amt) => [
            (s => s.y -= amt),
            (s => s.x += amt),
            (s => s.y += amt),
            (s => s.x -= amt),
        ][dir](obj.spriteoffset),
    };

    for (const tf of obj.transforms || []) {
        tranfunc[tf[0]](obj, cwdIndexOf(tf[1]), tf[2]);
    }
}

// generate a new sprite matrix based on transforms
function applyVectorTransforms(obj) {
    const tranfunc = {
        'flip': (obj,dir) => [
            (p => p.flipy = !p.flipy),
            (p => p.flipx = !p.flipx),
        ][dir % 2](obj.vector),
        'rot': (prm,dir1,dir2) => [
            p => p, // 0°
            p => p.angle += 90,
            p => p.angle += 180,
            p => p.angle += 270,
        ][(4 + cwdIndexOf(dir2) - dir1) % 4](obj.vector),
        'translate': (obj,dir,amt) => [
            (s => s.y -= amt),
            (s => s.x += amt),
            (s => s.y += amt),
            (s => s.x -= amt),
        ][dir](obj.spriteoffset),
        'shift': (prm) => prm,
    };

    for (const tf of obj.transforms || []) {
        tranfunc[tf[0]](obj, cwdIndexOf(tf[1]), tf[2]);
    }
}

// PS> check whether a name has been used and is not available
function isAlreadyDeclared(state, ident) {
    return Object.hasOwn(state.objects, ident)
        || state.legend_synonyms.find(s => s[0] == ident)
        || state.legend_aggregates.find(s => s[0] == ident)
        || state.legend_properties.find(s => s[0] == ident)
        || Object.hasOwn(state.tags, ident)
        || Object.hasOwn(state.mappings, ident)
}

// PS> check how a name has been used if at all
function isDeclaredAs(state, ident) {
    return Object.hasOwn(state.objects, ident) ? 'object'
        : state.legend_synonyms.find(s => s[0] == ident) ? 'alias'
        : state.legend_aggregates.find(s => s[0] == ident) ? 'and'
        : state.legend_properties.find(s => s[0] == ident) ? 'or'
        : Object.hasOwn(state.tags, ident) ? 'tag' 
        : Object.hasOwn(state.mappings, ident) ? 'map' 
        : null;
}

// get the object(s) referred to if declared, or null otherwise
function getObjectRefs(state, ident) {
    if (isAlreadyDeclared(state, ident)) return [ ident ];
    const idents = expandObjectRef(state, ident, true);
    return idents.every(i => isAlreadyDeclared(state, i)) ? idents : null;
}

// get the undefined object(s) referred to
function getObjectUndefs(state, ident) {
    if (isAlreadyDeclared(state, ident)) return [ ];
    const idents = expandObjectRef(state, ident, true);
    return idents.filter(i => !isAlreadyDeclared(state, i));
}

// create a property object for an ident with parts, if possible and not already there
// but if property contains a relative direction, create one for each absolute direction
// todo: this fails if an expansion is an aggregate -- see isaac_and_mass
function createObjectRef(state, ident) {
    const ref = getObjectRefs(state, ident);
    if (ref && ref.length > 1) {
        const parts = ident.split(':');
        if (parts.some(e => relativeDirections.includes(e))) {
            if (debugSwitch.includes('exp')) console.log(`Create object ref for relative direction: ${ident}`);
            for (const forward of simpleAbsoluteDirections) { //@@
                const absOf = dir => relativeDirs.includes(dir) ? relativeDict[forward][relativeDirs.indexOf(dir)] : dir;
                const id = ident.split(':').map(p => absOf(p)).join(':');
                createObjectRef(state, id);
            }
        }
        const newlegend = [ ident, ...ref ];
        newlegend.lineNumber = state.lineNumber;  // bug: it's an array, isn't it?
        state.legend_properties.push(newlegend);
        return true;
    } else return false;
}

function isColor(str) {
	str = str.trim();
	if (str in colorPalettes.arnecolors)
		return true;
	if (/^#([0-9A-F]{2}){3,4}$/i.test(str))
		return true;
	if (/^#([0-9A-F]{3,4})$/i.test(str))
		return true;
	if (str === "transparent")
		return true;
	return false;
}

function colorToHex(palette, str) {
    str = str.trim();
    if (str in palette) {
        return palette[str];
    }

    return str;
}

var debugMode;
var colorPalette;

function generateExtraMembers(state) {

    if (state.collisionLayers.length === 0) {
        logError("No collision layers defined.  All objects need to be in collision layers.");
    }

    //annotate objects with layers
    //assign ids at the same time
    state.idDict = [];          // doc: dictionary of object names indexed by ID
    var idcount = 0;
    for (var layerIndex = 0; layerIndex < state.collisionLayers.length; layerIndex++) {
        for (var j = 0; j < state.collisionLayers[layerIndex].length; j++) {
            var n = state.collisionLayers[layerIndex][j];
            if (n in state.objects) {
                var obj = state.objects[n];
                obj.layer = layerIndex;
                obj.id = idcount;
                state.idDict[idcount] = n;
                idcount++;
            }
        }
    }

    // PS> fill in start and length of each group of objects
    let prevObjectNo = idcount;
    for (let i = state.collisionLayerGroups.length - 1; i >= 0; --i) {
        const group = state.collisionLayerGroups[i];
        group.firstObjectNo = state.objects[state.collisionLayers[group.layer][0]].id;
        group.numObjects = prevObjectNo - group.firstObjectNo;
        prevObjectNo = group.firstObjectNo;
    }

    //set object count
    state.objectCount = idcount;

    //calculate blank mask template
    var layerCount = state.collisionLayers.length;
    var blankMask = [];
    for (var i = 0; i < layerCount; i++) {
        blankMask.push(-1);
    }

    // how many words do our bitvecs need to hold?
    MOV_BITS = 8;
    MOV_MASK = 0xff;
    STRIDE_OBJ = Math.ceil(state.objectCount / 32) | 0;         // doc: size of BitVec to hold objects, at 32 bits per
    STRIDE_MOV = Math.ceil(layerCount * MOV_BITS / 32) | 0;     // doc: size of BitVec to hold directions, at 5 bits per
    state.STRIDE_OBJ = STRIDE_OBJ;
    state.STRIDE_MOV = STRIDE_MOV;

    //get colorpalette name
    debugMode = false;
    verbose_logging = false;
    throttle_movement = false;
    colorPalette = colorPalettes.arnecolors;
    for (var i = 0; i < state.metadata.length; i += 2) {
        var key = state.metadata[i];
        var val = state.metadata[i + 1];
        if (key === 'color_palette') {
            if (val in colorPalettesAliases) {
                val = colorPalettesAliases[val];
            }
            if (colorPalettes[val] === undefined) {
                logError('Palette "' + val + '" not found, defaulting to arnecolors.', 0);
            } else {
                colorPalette = colorPalettes[val];
            }
        } else if (key === 'debug' || defaultDebugMode) {
            if (IDE && unitTesting===false){
                debugMode = true;
                cache_console_messages = true;
            }
        } else if (key === 'verbose_logging' || defaultVerboseLogging) {
            if (IDE && unitTesting===false){
                verbose_logging = true;
                cache_console_messages = true;
            }
        } else if (key === 'throttle_movement') {
            throttle_movement = true;
        }
    }

    // fix and convert colors to hex
    const maxColours = 36; // now 0-9 and a-z
    for (const obj of Object.values(state.objects)) {
        if (obj.vector) {
            if (obj.colors.length > 0)
                logWarning(`Please don't define colors for vector sprites. They're just going to get ignored anyway.`, obj.lineNumber + 1);
        } else if (obj.colors.length == 0) {
            logWarning(`A sprite must have at least one color. However did this happen?`, obj.lineNumber + 1);
            obj.colors.push('#ff00ff');
        } else if (obj.colors.length > maxColours) {
            logError(`A sprite cannot have more than ${maxColours} colors.  Why you would want more than ${maxColours} is beyond me.`, obj.lineNumber + 1);
        }
        for (let i = 0; i < obj.colors.length; i++) {
            let c = obj.colors[i];
            if (isColor(c)) {
                c = colorToHex(colorPalette, c);
                obj.colors[i] = c;
            } else {
                logError(`Invalid color specified for object "${n}", namely ${obj.colors[i]}".`, obj.lineNumber + 1);
                obj.colors[i] = '#ff00ff'; // magenta error color
            }
        }
    }

    // fix up what we can of sprite stuff here.
    // spriteoffset is needed to handle translate with negative args
    // transform on canvas has to be left until later
    for (const [key, obj] of Object.entries(state.objects)) {
        obj.spriteoffset = { x: 0, y: 0 };
        if (obj.vector) {
            obj.vector.angle ||= 0;
            if (obj.cloneSprite) {
                const other = state.objects[obj.cloneSprite];
                obj.vector = { ...other.vector };
                obj.spriteoffset = { ...other.spriteoffset };
            } 
            applyVectorTransforms(obj);

        } else {
            if (obj.cloneSprite) {
                const other = state.objects[obj.cloneSprite];
                obj.spritematrix = other.spritematrix.map(row => [...row]);
                obj.spriteoffset = { ...other.spriteoffset };
            } 
            if (obj.spritematrix.length == 0) {
                obj.spritematrix = Array.from(
                    { length: state.sprite_size },
                    () => (new Array(state.sprite_size).fill(0))
                );
            }
            applySpriteTransforms(obj);
        }
    }

    if (debugSwitch.includes('obj')) console.log('Objects', state.objects);
    if (debugSwitch.includes('obj')) console.log('Properties', state.legend_properties);
    if (debugSwitch.includes('obj')) console.log('Aggregates', state.legend_aggregates);
    if (debugSwitch.includes('obj')) console.log('Synonyms', state.legend_synonyms);

    var glyphOrder = [];
    //calculate glyph dictionary
    var glyphDict = {};
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var obj = state.objects[n];
            var mask = blankMask.concat([]);
            mask[obj.layer] = obj.id;
            glyphDict[n] = mask;
            glyphOrder.push([obj.lineNumber,n]);
        }
    }
    
    var added = true;
    while (added) 
    {
        added = false;

        //then, synonyms
        for (var i = 0; i < state.legend_synonyms.length; i++) {
            var dat = state.legend_synonyms[i];
            var key = dat[0];
            var val = dat[1];
            if ((!(key in glyphDict) || (glyphDict[key] === undefined)) && (glyphDict[val] !== undefined)) {
                added = true;
                glyphDict[key] = glyphDict[val];
                glyphOrder.push([dat.lineNumber,key]);
            } 
            }

        //then, aggregates
        for (var i = 0; i < state.legend_aggregates.length; i++) {
            var dat = state.legend_aggregates[i];
            var key = dat[0];
            var vals = dat.slice(1);
            var allVallsFound = true;
            for (var j = 0; j < vals.length; j++) {
                var v = vals[j];
                if (glyphDict[v] === undefined) {
                    allVallsFound = false;
                    break;
                }
            }
            if ((!(key in glyphDict) || (glyphDict[key] === undefined)) && allVallsFound) {
                var mask = blankMask.concat([]);

                for (var j = 1; j < dat.length; j++) {
                    var n = dat[j];
                    var obj = state.objects[n];
                    if (obj == undefined) {
                        logError('Object not found with name ' + n, state.lineNumber);
                    }
                    if (mask[obj.layer] == -1) {
                        mask[obj.layer] = obj.id;
                    } else {
                        if (obj.layer === undefined) {
                            logError('Object "' + n.toUpperCase() + '" has been defined, but not assigned to a layer.', dat.lineNumber);
                        } else {
                            var n1 = n.toUpperCase();
                            var n2 = state.idDict[mask[obj.layer]].toUpperCase();
                            // if (n1 !== n2) {
                                logError(
                                    'Trying to create an aggregate object (something defined in the LEGEND section using AND) with both "' +
                                    n1 + '" and "' + n2 + '", which are on the same layer and therefore can\'t coexist.',
                                    dat.lineNumber
                                );
                            // }
                            }
                        }
                    }
                added = true;
                glyphDict[dat[0]] = mask;
                glyphOrder.push([dat.lineNumber,key]);
            }
        }
    }
    
    //sort glyphs line number
    glyphOrder.sort((a,b)=>a[0] - b[0]);
    glyphOrder = glyphOrder.map(a=>a[1]);

    state.glyphDict = glyphDict;
    state.glyphOrder = glyphOrder;

    var aggregatesDict = {};
    for (var i = 0; i < state.legend_aggregates.length; i++) {
        var entry = state.legend_aggregates[i];
        aggregatesDict[entry[0]] = entry.slice(1);
    }
    state.aggregatesDict = aggregatesDict;

    var propertiesDict = {};
    for (var i = 0; i < state.legend_properties.length; i++) {
        var entry = state.legend_properties[i];
        propertiesDict[entry[0]] = entry.slice(1);
    }
    state.propertiesDict = propertiesDict;

    //calculate lookup dictionaries
    var synonymsDict = {};
    for (var i = 0; i < state.legend_synonyms.length; i++) {
        var entry = state.legend_synonyms[i];
        var key = entry[0];
        var value = entry[1];
        if (value in aggregatesDict) {
            aggregatesDict[key] = aggregatesDict[value];
        } else if (value in propertiesDict) {
            propertiesDict[key] = propertiesDict[value];
        } else if (key !== value) {
            synonymsDict[key] = value;
        }
    }
    state.synonymsDict = synonymsDict;

    var modified = true;
    while (modified) {
        modified = false;
        for (var n in synonymsDict) {
            if (synonymsDict.hasOwnProperty(n)) {
                var value = synonymsDict[n];
                if (value in propertiesDict) {
                    delete synonymsDict[n];
                    propertiesDict[n] = propertiesDict[value];
                    modified = true;
                } else if (value in aggregatesDict) {
                    delete aggregatesDict[n];
                    aggregatesDict[n] = aggregatesDict[value];
                    modified = true;
                } else if (value in synonymsDict) {
                    synonymsDict[n] = synonymsDict[value];
                }
            }
        }

        for (var n in propertiesDict) {
            if (propertiesDict.hasOwnProperty(n)) {
                var values = propertiesDict[n];
                for (var i = 0; i < values.length; i++) {
                    var value = values[i];
                    if (value in synonymsDict) {
                        values[i] = synonymsDict[value];
                        modified = true;
                    } else if (value in propertiesDict) {
                        values.splice(i, 1);
                        var newvalues = propertiesDict[value];
                        for (var j = 0; j < newvalues.length; j++) {
                            var newvalue = newvalues[j];
                            if (values.indexOf(newvalue) === -1) {
                                values.push(newvalue);
                            }
                        }
                        modified = true;
                    }
                    if (value in aggregatesDict) {
                        logError('Trying to define property "' + n.toUpperCase() + '" in terms of aggregate "' + value.toUpperCase() + '".');
                    }
                }
            }
        }


        for (var n in aggregatesDict) {
            if (aggregatesDict.hasOwnProperty(n)) {
                var values = aggregatesDict[n];
                for (var i = 0; i < values.length; i++) {
                    var value = values[i];
                    if (value in synonymsDict) {
                        values[i] = synonymsDict[value];
                        modified = true;
                    } else if (value in aggregatesDict) {
                        values.splice(i, 1);
                        var newvalues = aggregatesDict[value];
                        for (var j = 0; j < newvalues.length; j++) {
                            var newvalue = newvalues[j];
                            if (values.indexOf(newvalue) === -1) {
                                values.push(newvalue);
                            }
                        }
                        modified = true;
                    }
                    if (value in propertiesDict) {
                        logError('Trying to define aggregate "' + n.toUpperCase() + '" in terms of property "' + value.toUpperCase() + '".');
                    }
                }
            }
        }
    }

    /* determine which properties specify objects all on one layer */
    state.propertiesSingleLayer = {};
    for (var key in propertiesDict) {
        if (propertiesDict.hasOwnProperty(key)) {
            var values = propertiesDict[key];
            var sameLayer = true;
            for (var i = 1; i < values.length; i++) {
                // dies here if previous error
                if ((state.objects[values[i - 1]].layer !== state.objects[values[i]].layer)) { 
                    sameLayer = false;
                    break;
                }
            }
            if (sameLayer) {
                state.propertiesSingleLayer[key] = state.objects[values[0]].layer;
            }
        }
    }

    if (state.idDict[0] === undefined && state.collisionLayers.length > 0) {
        logError('You need to have some objects defined');
    }

    //set default background object
    var backgroundid;
    var backgroundlayer;
    if (state.objects.background === undefined) {
        if ('background' in state.synonymsDict) {
            var n = state.synonymsDict['background'];
            var obj = state.objects[n];
            backgroundid = obj.id;
            backgroundlayer = obj.layer;
        } else if ('background' in state.propertiesDict) {
            var backgrounddef = state.propertiesDict['background'];
            var n = backgrounddef[0];
            var obj = state.objects[n];
            backgroundid = obj.id;
            backgroundlayer = obj.layer;
            for (var i=1;i<backgrounddef.length;i++){
                var nnew = backgrounddef[i];
                var onew = state.objects[nnew];
                if (onew.layer !== backgroundlayer) {
                    var lineNumber = state.original_line_numbers['background'];
                    logError('Background objects must be on the same layer',lineNumber);
                }
            }
        } else if ('background' in state.aggregatesDict) {
            var obj = state.objects[state.idDict[0]];
            backgroundid = obj.id;
            backgroundlayer = obj.layer;
            var lineNumber = state.original_line_numbers['background'];
            logError("background cannot be an aggregate (declared with 'and'), it has to be a simple type, or property (declared in terms of others using 'or').",lineNumber);
        } else {
            var obj = state.objects[state.idDict[0]];
            if (obj!=null){
                backgroundid = obj.id;
                backgroundlayer = obj.layer;
            }
            logError("you have to define something to be the background");
        }
    } else {
        backgroundid = state.objects.background.id;
        backgroundlayer = state.objects.background.layer;
    }
    state.backgroundid = backgroundid;
    state.backgroundlayer = backgroundlayer;
}

function generateExtraMembersPart2(state) {
	function assignMouseObject(preludeTerm, defaultName) {
		if (preludeTerm in state.metadata) {
			var name = state.metadata[preludeTerm] || defaultName;
            var id = null;
            var object = null;
			if (state.objects[name]) {
                id = state.objects[name].id;
                object = state.objects[name];
			} else {
				if (name in state.synonymsDict) {
					var n = state.synonymsDict[name];
					var o = state.objects[n];
                    id = o.id;
                    object = o;
				} else {
					var o=state.objects[state.idDict[1]];
					id=o.id;
					logError(name + " object/alias has to be defined");
				}
            }
            
            if (object != null && object.layer !== undefined) {
                var layerID = object.layer;
                if (state.collisionLayers[layerID].length != 1) {
                    logWarningNoLine("Mouse object '"+name+"' (for input '"+ preludeTerm +"') could overlap with other objects on the same layer. Consider moving the object to its own layer.", true, false);
                }
            }

			return id;
		}
	}
	
	state.lmbID = assignMouseObject("mouse_left", "lmb");
	state.rmbID = assignMouseObject("mouse_right", "rmb");
	state.dragID = assignMouseObject("mouse_drag", "drag");
	state.rdragID = assignMouseObject("mouse_rdrag", "rdrag");
	state.lmbupID = assignMouseObject("mouse_up", "lmbup");
	state.rmbupID = assignMouseObject("mouse_rup", "rmbup");
	
	if ("mouse_obstacle" in state.metadata) {
		var name = state.metadata["mouse_obstacle"];
		
		if (name) {
			state.obstacleMask = state.objectMasks[name];
			if (!state.obstacleMask) {
				logError(name + " object/alias has to be defined.");
				state.obstacleMask = state.objectMasks["background"];
			}
		}
	}
}

Level.prototype.calcBackgroundMask = function(state) {
    if (state.backgroundlayer === undefined) {
        logError("you have to have a background layer");
    }

    var backgroundMask = state.layerMasks[state.backgroundlayer];
    for (var i = 0; i < this.n_tiles; i++) {
        var cell = this.getCell(i);
        cell.iand(backgroundMask);
        if (!cell.iszero()) {
            return cell;
        }
    }
    cell = new BitVec(STRIDE_OBJ);
    cell.ibitset(state.backgroundid);
    return cell;
}

function levelFromString(state,level) {
	var backgroundlayer=state.backgroundlayer;
	//var backgroundid=state.backgroundid;
	var backgroundLayerMask = state.layerMasks[backgroundlayer];

    // pad all lines to same length
    //const width = level[2].reduce((a, b) => Math.max(a, b), 0);
    //level[2] = level[2].map(l => l.padEnd(width, '.'));

	var o = new Level(level[0], level[2].length, level.length-2, state.collisionLayers.length, null, level[1]);
	o.objects = new Int32Array(o.width * o.height * STRIDE_OBJ);

	for (var i = 0; i < o.width; i++) {
		for (var j = 0; j < o.height; j++) {
			var ch = level[j+2].charAt(i);
			if (ch.length==0) {
				ch=level[j+2].charAt(level[j+2].length-1);
			}
			var mask = state.glyphDict[ch];

			if (mask == undefined) {
				if (state.propertiesDict[ch]===undefined) {
					logError('Error, symbol "' + ch + '", used in map, not found.', level[0]+j);
				} else {
                    logError('Error, symbol "' + ch + '" is defined using OR, and therefore ambiguous - it cannot be used in a map. Did you mean to define it in terms of AND?', level[0] + j);
				}
                return o;
			}

			var maskint = new BitVec(STRIDE_OBJ);
			mask = mask.concat([]);					
			for (var z = 0; z < o.layerCount; z++) {
				if (mask[z]>=0) {
					maskint.ibitset(mask[z]);
				}
			}
			for (var w = 0; w < STRIDE_OBJ; ++w) {
				o.objects[STRIDE_OBJ * (i * o.height + j) + w] = maskint.data[w];
			}
		}
	}

	var levelBackgroundMask = o.calcBackgroundMask(state);
	for (var i=0;i<o.n_tiles;i++)
	{
		var cell = o.getCell(i);
		if (!backgroundLayerMask.anyBitsInCommon(cell)) {
			cell.ior(levelBackgroundMask);
			o.setCell(i, cell);
		}
	}
	return o;
}
//also assigns glyphDict
function levelsToArray(state) {
	const levels = [];
    const links = [];
    //const links = {};
    //const targets = new Set();
    let section, title, description, gotoFlag;
    
    if (state.levels.at(-1).length == 0)
        state.levels.pop();

    let levelNo = 1;
    // compile each level command
    // parse: state.levels.push([ symbols.start, symbols.text, state.lineNumber, symbols.link ]);
    state.levels.forEach(level => {
        title ||= `Level ${levelNo}`;
		if (level[0] == 'message') {
            if (gotoFlag) logWarning('Message unreachable due to previous GOTO.', level[2]);
            const wrapTest = wordwrap(level[1], 35);  // todo: 35
            if (wrapTest.length > 12)       // todo: 12
                logWarning('Message too long to fit on screen.', level[2]);
            levels.push({
                message: level[1],
				lineNumber: level[2],
				section: section
			});
		} else if (level[0] == 'goto') {
            if (gotoFlag) logWarning('GOTO unreachable due to previous GOTO.', level[2]);
            levels.push( {
                target: level[1],           // text, will be converted to index later
				lineNumber: level[2],
				section: section
			});
            gotoFlag = true;
		} else if (level[0] == 'section') {
            section = level[1];
            gotoFlag = false;
		} else if (level[0] == 'level') {
            title = level[1];           // !!!
		} else if (level[0] == 'title') {
            description = level[1];     // todo: 
            logWarning(`Option TITLE is not implemented, but may be in the future. Let me know if you really need it.`,state.lineNumber);
		} else if (level[0] == 'link') {
            links.push( {             // text, will be converted to index later
                target: level[1],
				lineNumber: level[2],
                object: level[3]
            });
		} else {
            if (gotoFlag && links.length == 0) 
                logWarning('Level unreachable due to previous GOTO.', level[0]);
            level[1] = section; // todo: fix it
			levels.push(levelFromString(state, level));
            levels.at(-1).title = title;
            levels.at(-1).linksTop = links.length;
            ++levelNo;
            title = null;
		}
	});
    links.forEach(link => { //@@
        let index = -9999;
        if ((index = levels.findIndex(level => link.target == level.section)) != -1)
            link.targetNo = index;
        else if ((index = levels.findIndex(level => link.target == level.title)) != -1)
            link.targetNo = -1-index;
        else {
            logError(`Sorry, link target "${link.target.toUpperCase()}" does not seem to be the name of any level.`, link.lineNumber);
            link.targetNo = -9999;
        }
    });
	state.levels = levels;
	state.links = links;
}

function extractSections(state) {
	var sections = [];

	var lastSection = null;

	for(var i = 0; i < state.levels.length; i++) {
		var level = state.levels[i];
		
		if(level.section != lastSection) {
			var o = {
				name: level.section,
				firstLevel: i
			};
			if(o.name == "__WIN__") {
				state.winSection = o;
			} else {
				sections.push(o);
			}
			
			lastSection = level.section;
		}
	}

	state.sections = sections;
}

function convertSectionNamesToIndices(state) {
	var sectionMap = {};
	var duplicateSections = {};
	for (var s = 0; s < state.sections.length; s++) {
		var sectionName = state.sections[s].name.toLowerCase();
		if(sectionMap[sectionName] === undefined){
			sectionMap[sectionName] = s;
		}else{
			duplicateSections[sectionName] = true;
		}
	}
	
	// GOTO commands in the RULES
    // todo: GOTO level or section
	for (var r = 0; r < state.rules.length; r++) {
		var rule = state.rules[r];
		for (var c = 0; c < rule.commands.length; c++) {
			var command = rule.commands[c];
			if (command[0] != 'goto') continue;
            
            if ( typeof command[1] == "number") {continue;} //Variant rule was previously converted into an index PS+#105
			var sectionName = command[1].toLowerCase();
			var sectionIndex = sectionMap[sectionName];
			if (sectionIndex === undefined){
				logError(`Invalid GOTO command - there is no section named "${command[1]}". Either it does not exist, or it has zero levels.`, rule.lineNumber);
				//logError('Invalid GOTO command - There is no section named "'+command[1]+'". Either it does not exist, or it has zero levels.', rule.lineNumber);
				sectionIndex = -9999;
			}else if (duplicateSections[sectionName] !== undefined){
				logError(`Invalid GOTO command - there are multiple sections named "${command[1]}". Section names must be unique for GOTO to work.`, rule.lineNumber);
				sectionIndex = -9999;
			}
			command[1] = sectionIndex;
		}
	}
	
	// GOTO commands in the LEVELS
	for (var i = 0; i < state.levels.length; i++) {
		var level = state.levels[i];
		if (level.target === undefined) continue; // This was a level or a message, but not a goto.
		var targetName = level.target.toLowerCase();
		var targetIndex = sectionMap[targetName];
		if (targetIndex === undefined){
			logError(`Invalid GOTO command - there is no section named "${command[1]}".`, level.lineNumber);
			targetIndex = 0;
		}else if (duplicateSections[targetName] !== undefined){
			logError(`Invalid GOTO command - there are multiple sections named "${command[1]}".`, level.lineNumber);
			targetIndex = 0;
		}
		level.target = targetIndex;
	}
}

// fix gosubs and subroutines to use group number (so must be after created groups)
function fixUpGosubs(state) { // PS>
    const subroutines = state.subroutines;
    const rules = state.rules;
    // first fixup subroutines so we know which group to gosub to
    let rulex = 0;
    for (const subroutine of subroutines) {
        while (rules[rulex][0].lineNumber < subroutine.lineNumber)
            rulex++;
        subroutine.groupNumber = rulex;
    }

    // rules are now groups. Go figure.
    for (const group of state.rules) {
        for (const rule of group) {
            for (const cmd of rule.commands) {
                if (cmd[0] == 'gosub' && typeof cmd[1] == "string") {       // the vagaries of the parse means this fixup may already have been done
                    const subroutine = state.subroutines.find(s => s.label == cmd[1].toLowerCase());
                    if (!subroutine) 
                        logError(`Invalid GOSUB command - there is no subroutine named "${cmd[1]}".`, rule.lineNumber);
                    else cmd[1] = subroutine.groupNumber;   // replace name by linenumber
                }
            }
        }
    }
}

// return true if this is a directional rule
function directionalRule(rule) {
    for (const row of [ ...rule.lhs, ...rule.rhs ]) {
        if (row.length > 1)
            return true;
        for (const cell of row) {
            for (var k = 0; k < cell.length; k += 2) {
                if (relativeDirections.includes(cell[k]))
                    return true;
                if (cell[k + 1].split(':').some(p => relativeDirections.includes(p)))
                    return true;
            }
        }
    }
    return false;
}

function findIndexAfterToken(str, tokens, tokenIndex) {
    str = str.toLowerCase();
    var curIndex = 0;
    for (var i = 0; i <= tokenIndex; i++) {
        var token = tokens[i];
        curIndex = str.indexOf(token, curIndex) + token.length;
    }
    return curIndex;
}
function rightBracketToRightOf(tokens,i){
    for(;i<tokens.length;i++){
        if (tokens[i]==="]"){
            return true;
        }
    }
    return false;
}

function processRuleString(rule, state, curRules) {
    /*

    	intermediate structure
    		dirs: Directions[]
    		pre : CellMask[]
    		post : CellMask[]

    		//pre/post pairs must have same lengths
    	final rule structure
    		dir: Direction
    		pre : CellMask[]
    		post : CellMask[]
    */
    var line = rule[0];
    var lineNumber = rule[1];
    var origLine = rule[2];

    // STEP ONE, TOKENIZE
    line = line.replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').replace(/\|/g, ' | ').replace(/\-\>/g, ' -> ');
    line = line.trim();
    if (line[0] === '+') {
        line = line.substring(0, 1) + " " + line.substring(1, line.length);
    }
    var tokens = line.split(/\s/).filter(function(v) { return v !== '' });

    if (tokens.length == 0) {
        logError('Spooky error!  Empty line passed to rule function.', lineNumber);
    }


// STEP TWO, READ DIRECTIONS
/*
	STATE
	0 - scanning for initial directions
	LHS
	1 - reading cell contents LHS
	2 - reading cell contents RHS
*/
    var parsestate = 0;
    var directions = [];

    var curcell = null; // [up, cat, down mouse]
    var curcellrow = []; // [  [up, cat]  [ down, mouse ] ]

    var incellrow = false;

    var rhs = false;
    var lhs_cells = [];
    var rhs_cells = [];
    var late = false;
    var rigid = false;
    var groupNumber = lineNumber;
    var commands = [];
    var randomRule = false;
    var has_plus = false;
    var globalRule = false;
    let isOnce = false;
    const prefixes = [];

    if (tokens.length===1) {
        if (tokens[0]==="startloop" ) {
            rule_line = {
                bracket: 1
            }
            return rule_line;
        } else if (tokens[0]==="endloop" ) {
            rule_line = {
                bracket: -1
            }
            return rule_line;
        }
    }

    if (tokens[0] == 'subroutine') {   // PS>
        return {
            label: tokens.slice(1).join(' ').toLowerCase(),
            lineNumber: lineNumber
        }
    }

    if (tokens.indexOf('->') == -1) {
        logError("A rule has to have an arrow in it. There's no arrow here! Consider reading up about rules - you're clearly doing something weird", lineNumber);
    }

    var curcell = [];
    var bracketbalance = 0;
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        switch (parsestate) {
            case 0:
                {
                    //read initial directions
                    if (token === '+') {
                        has_plus=true;
                        if (groupNumber === lineNumber) {
                            if (curRules.length == 0) {
                                logError('The "+" symbol, for joining a rule with the group of the previous rule, needs a previous rule to be applied to.', lineNumber);
                            }
                            if (i !== 0) {
                                logError('The "+" symbol, for joining a rule with the group of the previous rule, must be the first symbol on the line ', lineNumber);
                            }
                            groupNumber = curRules[curRules.length - 1].groupNumber;
                        } else {
                            logError('Two "+"s (the "append to previous rule group" symbol) applied to the same rule.', lineNumber);
                        }
                    } else if (token in directionaggregates) {
                        directions = directions.concat(directionaggregates[token]);
                    } else if (token === 'late') {
                        late = true;                        
                    } else if (token === 'rigid') {
                        rigid = true;
                    } else if (token === 'random') {
                        randomRule = true;
                        if (has_plus) {
                            logError(`A rule-group can only be marked random by the opening rule in the group (aka, a '+' and 'random' can't appear as rule modifiers on the same line).  Why? Well, you see "random" isn't a property of individual rules, but of whole rule groups.  It indicates that a single possible application of some rule from the whole group should be applied at random.`, lineNumber) 
                        }
                    } else if (token == 'global') {
                        globalRule = true;
                    } else if (token == 'once') {
                        isOnce = true;
                    } else if (simpleAbsoluteDirections.indexOf(token) >= 0) {
                        directions.push(token);
                    } else if (simpleRelativeDirections.indexOf(token) >= 0) {
                        logError('You cannot use relative directions (\"^v<>\") to indicate in which direction(s) a rule applies.  Use absolute directions indicators (Up, Down, Left, Right, Horizontal, or Vertical, for instance), or, if you want the rule to apply in all four directions, do not specify directions', lineNumber);
                    } else if (getTag(state, token)) {
                        prefixes.push(token);
                    } else if (token == '[') {
                        if (directions.length == 0) {
                            directions = directions.concat(directionaggregates['orthogonal']);
                        }
                        parsestate = 1;
                        i--;
                    } else {
                        logError("The start of a rule must consist of some number of directions (possibly 0), before the first bracket, specifying in what directions to look (with no direction specified, it applies in all four directions).  It seems you've just entered \"" + token.toUpperCase() + '\".', lineNumber);
                    }
                break;
            }
            case 1:
                {                                        
            if (token == '[') {
                bracketbalance++;
                if(bracketbalance>1){
                    logWarning("Multiple opening brackets without closing brackets.  Something fishy here.  Every '[' has to be closed by a ']', and you can't nest them.", lineNumber);
                }
                if (curcell.length > 0) {
                    logError('Error, malformed cell rule - encountered a "["" before previous bracket was closed', lineNumber);
                }
                incellrow = true;
                curcell = [];
            } else if (directions_only.includes(token)) {
                if (curcell.length % 2 == 1) {
                    logError("Error, an item can only have one direction/action at a time, but you're looking for several at once!", lineNumber);
                } else if (!incellrow) {
                    logWarning("Invalid syntax. Directions should be placed at the start of a rule.", lineNumber);
                } else if (late && token!=='no' && token!=='random' && token!=='randomdir') {
                    logError("Movements cannot appear in late rules.", lineNumber);
                  } else {
                    curcell.push(token);
                }
            } else if (token == '|') {
                if (!incellrow) {
                    logWarning('Janky syntax.  "|" should only be used inside cell rows (the square brackety bits).',lineNumber);
                } else if (curcell.length % 2 == 1) {
                    logError('In a rule, if you specify a movement, it has to act on an object.', lineNumber);
                } else {
                    curcellrow.push(curcell);
                    curcell = [];
                }
            } else if (token === ']') {
                bracketbalance--;
                if(bracketbalance<0){
                    logWarning("Multiple closing brackets without corresponding opening brackets.  Something fishy here.  Every '[' has to be closed by a ']', and you can't nest them.", lineNumber);
                }

                if (curcell.length % 2 == 1) {
                    if (curcell[0]==='...') {
                        logError('Cannot end a rule with ellipses.', lineNumber);
                    } else {
                        logError('In a rule, if you specify a movement, it has to act on an object.', lineNumber);
                    }
                } else {
                    curcellrow.push(curcell);
                    curcell = [];
                }

                if (rhs) {
                    rhs_cells.push(curcellrow);
                } else {
                    lhs_cells.push(curcellrow);
                }
                curcellrow = [];
                incellrow = false;
            } else if (token === '->') {
                if (groupNumber !== lineNumber) {
                    var parentrule = curRules[curRules.length - 1];
                    if (parentrule.late!==late){
                        logWarning('Oh gosh you can mix late and non-late rules in a rule-group if you really want to, but gosh why would you want to do that?  What do you expect to accomplish?', lineNumber);
                    }
                }
                if (incellrow) {
                    logError('Encountered an unexpected "->" inside square brackets.  It\'s used to separate states, it has no place inside them >:| .', lineNumber);
                } else if (rhs) {
                    logError('Error, you can only use "->" once in a rule; it\'s used to separate before and after states.', lineNumber);
                }  else {
                    rhs = true;
                }
            } else if (isAlreadyDeclared(state, token) || createObjectRef(state, token)) { // @@
                // it's either a known object name or a name that might need expanding but definitely not a command (need a better way...)
                if (!incellrow) {
                    logWarning("Invalid token "+token.toUpperCase() +". Object names should only be used within cells (square brackets).", lineNumber);
                } else if (curcell.length % 2 == 0) {
                    curcell.push('');
                    curcell.push(token);
                } else if (curcell.length % 2 == 1) {
                    curcell.push(token);
                }
            } else if (token==='...') {
                if (!incellrow) {
                     logWarning("Invalid syntax, ellipses should only be used within cells (square brackets).", lineNumber);
                 } else {
                     curcell.push(token);
                     curcell.push(token);
                 }
            } else if (token.match(reg_commandwords)) {
                if (rhs===false) {
                    logError("Commands should only appear at the end of rules, not in or before the pattern-detection/-replacement sections.", lineNumber);
                } else if (incellrow) {//only a warning for legacy support reasons.
                //} else if (incellrow || rightBracketToRightOf(tokens,i)){//only a warning for legacy support reasons.
                    logWarning("Commands should only appear at the end of rules, not in or before the pattern-detection/-replacement sections.", lineNumber);
                }
                const tok = token.toLowerCase();
                const needarg = commandargs_table.includes(tok);
                const twid = twiddleable_params.includes(tok);
                if (needarg || twid) {
                    if (twid && !state.metadata.includes('runtime_metadata_twiddling')) {
                        logError("You can only change a flag at runtime if you have the 'runtime_metadata_twiddling' prelude flag defined!",lineNumber)
                    } else {
                        const index = findIndexAfterToken(origLine,tokens,i);
                        const str = origLine.substring(index).trim();
                        if (twid && str == "")
                            logError('You included a twiddleable option, but did not specify a value. The twiddle may behave strangely. Please use "set", "default", "wipe", or specify the correct value. See the documentation for more info.', lineNumber);
                        //needs to be nonempty or the system gets confused and thinks it's a whole level message rather than an interstitial.
                        commands.push([tok, str == "" ? " " : str]);
                    }
                    i=tokens.length;
                }  else {
                    commands.push([tok]);
                }
                        } else {
                logError('Error, malformed cell rule - was looking for cell contents, but found "' + token + '".  What am I supposed to do with this, eh, please tell me that.', lineNumber);
            }
        }

    }
}

    if (late && rigid){
        logError("Late rules cannot be marked as rigid (rigid rules are all about dealing with the consequences of unresolvable movements, and late rules can't even have movements).", lineNumber);
    }
    
    if (lhs_cells.length != rhs_cells.length) {
        if (commands.length > 0 && rhs_cells.length == 0) {
        //ok
    } else {
        logError('Error, when specifying a rule, the number of matches (square bracketed bits) on the left hand side of the arrow must equal the number on the right', lineNumber);
    }
} else {
    for (var i = 0; i < lhs_cells.length; i++) {
        if (lhs_cells[i].length != rhs_cells[i].length) {
            logError('In a rule, each pattern to match on the left must have a corresponding pattern on the right of equal length (number of cells).', lineNumber);
            state.invalid=true;
        }
        if (lhs_cells[i].length == 0) {
            logError("You have an totally empty pattern on the left-hand side.  This will match *everything*.  You certainly don't want this.");
        }
    }
}

if (lhs_cells.length == 0) {
    logError('This rule refers to nothing.  What the heck? :O', lineNumber);
}

var rule_line = {
    directions: directions,
    lhs: lhs_cells,
    rhs: rhs_cells,
    lineNumber: lineNumber,
    late: late,
    rigid: rigid,
    groupNumber: groupNumber,
    commands: commands,
    randomRule: randomRule,
    globalRule: globalRule,
    isOnce: isOnce,
    prefixes: prefixes,
};

    if (directionalRule(rule_line) === false && rule_line.directions.length>1) {
        rule_line.directions.splice(1);
    }

//next up - replace relative directions with absolute direction

return rule_line;
}

// function is passed a cell which we may modify
function deepCloneHS(HS, fn) {
    return HS.map(row => row.map(cell => fn ? fn(cell) : [ ...cell ]));
}

function deepCloneRule(rule, fnlhs, fnrhs) {
	return {
		lineNumber: rule.lineNumber,
		direction: rule.direction,
		lhs: deepCloneHS(rule.lhs, fnlhs),
		rhs: deepCloneHS(rule.rhs, fnrhs),
		late: rule.late,
		rigid: rule.rigid,
		groupNumber: rule.groupNumber,
		commands:rule.commands,
		randomRule:rule.randomRule,
		globalRule:rule.globalRule,
        isOnce: rule.isOnce,
	};
}

// make multiple passes to parse and expand rules, with absolute directions and objects
function rulesToArray(state) {
    let rules = parseRulesToArray(state);
    rules = expandRulesWithPrefixes(state, rules);
    rules = expandRulesWithMultipleDirections(state, rules);
    for (const rule of rules)
        convertRelativeDirsToAbsolute(state, rule);
    rules = expandRulesWithTags(state, rules);
    checkRuleObjects(state, rules);
    rules = expandRulesWithMultiDirectionObjects(state, rules);
    for (const rule of rules) {
        if (!debugSwitch.includes('noul')) rewriteUpLeftRules(rule);
        atomizeAggregates(state, rule);
        if (state.invalid) return; // protect next from crash
        rephraseSynonyms(state, rule);
    }
    rules = convertObjectsAndDirections(state, rules);
    state.rules = rules;
}

// find and filter out start and end loop, subroutines PS>
function parseRulesToArray(state) {
    const oldrules = state.rules;
    var newrules = [];
    var loops = [];
    var subroutines = [];
    for (var i = 0; i < oldrules.length; i++) {
        var lineNumber = oldrules[i][1];
        var newrule = processRuleString(oldrules[i], state, newrules);
        if (newrule.bracket) {
            loops.push([lineNumber, newrule.bracket]);
        } else if (newrule.label) {      // PS>
            const other = subroutines.find(s => s.label == newrule.label);
            if (other)
                logError(`Duplicate subroutine, "${newrule.label}" already defined at line ${other.lineNumber}`, newrule.lineNumber);
            else {
                // target for gosub is next groupno, or next lineno if none
                subroutines.push({
                    label: newrule.label,
                    lineNumber: newrule.lineNumber,
                });
            }
        } else newrules.push(newrule);
    }
    state.loops = loops;
    state.subroutines = subroutines;
    if (debugSwitch.includes('exp')) console.log(`parseRulesToArray ${newrules.length}`);
    return newrules;
}

// PS> expand rules with prefixes
// for every prefix.id found in a cell, clone the entire rule once for every prefix.member
// dirs [ again_col ] [ con:dirs:offs ] -> [ again_col ] [ con:dirs ]
function expandRulesWithPrefixes(state, rules) {
    const newrules = rules.map(r => expandRuleWithPrefixes(state, r)).flat();
    if (debugSwitch.includes('exp')) console.log(`expandRulesWithPrefixes ${rules.length} -> ${newrules.length}`);
    return newrules;
}

function expandRuleWithPrefixes(state, rule) {
    if (rule.prefixes.length == 0) return [ rule ];
    var newrules = [];
    const cartesian = cartesianProduct(...rule.prefixes.map(p => state.tags[p]));
    for (const exp of cartesian) {
        const fn = cell => cell.map((atom,atomx) => (atomx % 2 == 0) ? atom
            : replaceObjectPrefix(state, atom, rule.prefixes, exp));
        const newrule = deepCloneRule(rule, fn, fn);
        newrule.directions = rule.directions; // not expanded yet
        newrules.push(newrule);
    }
    return newrules;
}

// function to be used during deep clone rule
// note: will fail badly if map and tag are not a match, so check beforehand!
function replaceObjectPrefix(state, objid, prefixes, exp) {
    // in each could be any prefix and we need to find which one
    const fnGetTag = p => prefixes.includes(p) && exp[prefixes.indexOf(p)];
    const fnGetMap = p => {
        const pref = prefixes.find(x => canMapValue(state, p, x));
        return pref && getMappedValue(state, p, exp[prefixes.indexOf(pref)]);
    };

    return objid.split(':')
        .map(p => fnGetTag(p) || fnGetMap(p) || p)
        .join(':');
}

// expand rules with tags (that are not properties)
// [ con:dirs:offs ] -> [ con:up:up ] etc x16
function expandRulesWithTags(state, rules) {
    const newrules = rules.map(r => expandRuleWithTags(state, r)).flat();
    if (debugSwitch.includes('exp')) console.log(`expandRulesWithTags ${rules.length} -> ${newrules.length}`);
    return newrules;
}

function expandRuleWithTags(state, rule) {
    // iterating this way means we can index directly into the new rule
    // find and store all the changes needed
    const todo = [];
    rule.lhs.forEach((row, rowx) => {     // in brackets [ ]
        row.forEach((cell, cellx) => {     // between bars [ | ]
            cell.forEach((atom, atomx) => {
                if (atomx % 2 == 1 && [atomx - 1] != 'no' && atom != '...' && !isAlreadyDeclared(state, atom)) {
                    todo.push({ rowx: rowx, cellx: cellx, atomx: atomx, ident: atom });
                }
            });
        });
    });
    if (todo.length == 0) return [ rule ];

    // apply the changes for each todo
    let newrules = [ rule ];
    todo.forEach((t,tx) => {
        const temprules = [];
        newrules.forEach(r => {
            const expander = new TagExpander(state, t.ident, true);
            for (const newident of expander.getExpandedIdents()) {
                const newrule = deepCloneRule(r);
                newrule.lhs[t.rowx][t.cellx][t.atomx] = newident;
                if (rule.rhs[t.rowx][t.cellx][t.atomx] == t.ident)
                    newrule.rhs[t.rowx][t.cellx][t.atomx] = newident;
                temprules.push(newrule);
            }
        });
        newrules = temprules;
    });
    return newrules;
}

// PS> expand rules with multi direction parts
// [ wantsToFlyTo:> wantsToFlyTo:perpendicular ] -> [ ]
// now expand out rules with multiple directions
function expandRulesWithMultiDirectionObjects(state, rules) {
    var newrules = [];
    for (const rule of rules) {
        const objs = [ ...rule.lhs, ...rule.rhs ].flat()
            .map(cell => cell.filter((_,x) => x % 2 == 1))
            .flat();
        const dirs = objs.map(obj => obj.split(':'))
            .flat()
            .filter((part,x,a) => part in directionaggregates && a.indexOf(part) == x);
        if (dirs.length == 0)
            newrules.push(rule);
        else {
            const muldir = dirs[0];
            for (const expdir of directionaggregates[muldir]) {
                const fnsub = cell => cell.map((c,x) => (x % 2 == 0) ? c
                    : (c == muldir) ? expdir 
                    : (c.includes(`:${muldir}`)) ? c.replace(`:${muldir}`, `:${expdir}`)
                    : c);
                newrules.push(deepCloneRule(rule, fnsub, fnsub));
            }
        }
    
    }
    if (debugSwitch.includes('exp')) console.log(`expandRulesWithMultiDirectionObjects ${rules.length} -> ${newrules.length}`);
    return newrules;
}

function checkRuleObjects(state, rules) {
    for (const rule of rules) {
        const objs = [ ...rule.lhs, ...rule.rhs ].flat()
            .map(cell => cell.filter((_,x) => x % 2 == 1))
            .filter(o => o != '...')
            .flat();
        for (const obj of objs) {
            if (!isAlreadyDeclared(state, obj))
                console.log(`Not declared`, rule.lineNumber, obj);
        }
    }
}
 
//now expand out rules with multiple directions, and set the rule direction
function expandRulesWithMultipleDirections(state, rules) {
    var newrules = [];
    for (var i = 0; i < rules.length; i++) {
        var rule = rules[i];
        var ruledirs = rule.directions;
        for (var j = 0; j < ruledirs.length; j++) {
            var dir = ruledirs[j];
            if (dir in directionaggregates && directionalRule(rule)) {
                var dirs = directionaggregates[dir];
                for (var k = 0; k < dirs.length; k++) {
                    var modifiedrule = deepCloneRule(rule);
                    modifiedrule.direction = dirs[k];
                    newrules.push(modifiedrule);
                }
            } else {
                var modifiedrule = deepCloneRule(rule);
                modifiedrule.direction = dir;
                newrules.push(modifiedrule);
            }
        }
    }
    if (debugSwitch.includes('exp')) console.log(`expandRulesWithMultipleDirections ${rules.length} -> ${newrules.length}`);
    return newrules;
}

function convertObjectsAndDirections(state, rules2) {
    var rules3 = [];
    //expand property rules
    for (var i = 0; i < rules2.length; i++) {
        var rule = rules2[i];
        rules3 = rules3.concat(concretizeMovingRule(state, rule, rule.lineNumber));
    }

    var rules4 = [];
    for (var i = 0; i < rules3.length; i++) {
        var rule = rules3[i];
        rules4 = rules4.concat(concretizePropertyRule(state, rule, rule.lineNumber));
    }

    for (var i=0;i<rules4.length;i++){
        makeSpawnedObjectsStationary(state,rules4[i],rule.lineNumber);
    }
    return rules4;
}

function containsEllipsis(rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        for (var j = 0; j < rule.lhs[i].length; j++) {
            if (rule.lhs[i][j][1] === '...')
                return true;
        }
    }
    return false;
}

//optional: replace up/left rules with their down/right equivalents
function rewriteUpLeftRules(rule) {
    if (containsEllipsis(rule)) {
        return;
    }

    if (rule.direction == 'up') {
        rule.direction = 'down';
    } else if (rule.direction == 'left') {
        rule.direction = 'right';
    } else {
        return;
    }

    for (var i = 0; i < rule.lhs.length; i++) {
        rule.lhs[i].reverse();
        if (rule.rhs.length > 0) {
            rule.rhs[i].reverse();
        }
    }
}

//expands all properties to list of all things it could be, filterio
function getPossibleObjectsFromCell(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (name in state.objects){
            result.push(name);
        }
        else if (name in state.propertiesDict) {
            var aliases = state.propertiesDict[name];
            for (var k = 0; k < aliases.length; k++) {
                var alias = aliases[k];
                result.push(alias);
            }        
        }
    }
    return result;
}

function getPropertiesFromCell(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (dir == "random") {
            continue;
        }
        if (name in state.propertiesDict) {
            result.push(name);
        }
    }
    return result;
}

//returns you a list of object names in that cell that're moving
function getMovings(state, cell) {
    var result = [];
    for (var j = 0; j < cell.length; j += 2) {
        var dir = cell[j];
        var name = cell[j + 1];
        if (dir in directionaggregates) {
            result.push([name, dir]);
        }
    }
    return result;
}

function concretizePropertyInCell(cell, property, concreteType) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j + 1] === property && cell[j] !== "random") {
            cell[j + 1] = concreteType;
        }
    }
}

function concretizeMovingInCell(cell, ambiguousMovement, nameToMove, concreteDirection) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j] === ambiguousMovement && cell[j + 1] === nameToMove) {
            cell[j] = concreteDirection;
        }
    }
}

function concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteDirection) {
    for (var j = 0; j < cell.length; j += 2) {
        if (cell[j] === ambiguousMovement) {
            cell[j] = concreteDirection;
        }
    }
}

function expandRuleTags(state, cell) {
    var expanded = [];
    for (var i = 0; i < cell.length; i += 2) {
        var dir = cell[i];
        var name = cell[i + 1];

        if (name.includes(':') && (dir == 'no' || !(name in state.propertiesDict))) {
            const expander = new TagExpander(state, name, true);
            for (const newname of expander.getExpandedIdents()) {
                expanded.push(dir);
                expanded.push(newname);
            }
        } else {
            expanded.push(dir);
            expanded.push(name);
        }
    }
    return expanded;

}

// inline expansion of negative properties: expand [ no flying ] to [ no cat no bat ]
function expandNoPrefixedProperties(state, cell) {
    var expanded = [];
    for (var i = 0; i < cell.length; i += 2) {
        var dir = cell[i];
        var name = cell[i + 1];

        if (dir === 'no' && (name in state.propertiesDict)) {
            var aliases = state.propertiesDict[name];
            for (var j = 0; j < aliases.length; j++) {
                var alias = aliases[j];
                expanded.push(dir);
                expanded.push(alias);
            }
        } else {
            expanded.push(dir);
            expanded.push(name);
        }
    }
    return expanded;
}

function concretizePropertyRule(state, rule, lineNumber) {

    //step 1, rephrase rule to change "no flying" to "no cat no bat"
    for (var i = 0; i < rule.lhs.length; i++) {
        var cur_cellrow_l = rule.lhs[i];
        for (var j = 0; j < cur_cellrow_l.length; j++) {
            cur_cellrow_l[j] = expandNoPrefixedProperties(state, 
                expandRuleTags(state, cur_cellrow_l[j]));
            if (rule.rhs.length > 0)
                rule.rhs[i][j] = expandNoPrefixedProperties(state, 
                    expandRuleTags(state, rule.rhs[i][j]));
        }
    }

    //are there any properties we could avoid processing?
    // e.g. [> player | movable] -> [> player | > movable],
    // 		doesn't need to be split up (assuming single-layer player/block aggregates)

    // we can't manage this if they're being used to disambiguate

    const ambiguousProperties = {};
    const mappingProperties_l = [];
    const mappingProperties_r = [];

    for (let j = 0; j < rule.rhs.length; j++) {
        const row_l = rule.lhs[j];
        const row_r = rule.rhs[j];
        for (let k = 0; k < row_r.length; k++) {
            const properties_l = getPropertiesFromCell(state, row_l[k]);
            const properties_r = getPropertiesFromCell(state, row_r[k]);

            for (let prop_n = 0; prop_n < properties_r.length; prop_n++) {
                const property = properties_r[prop_n];
                if (!properties_l.includes(property)) {
                    ambiguousProperties[property] = true;
                }
            }
            properties_l.forEach(value => mappingProperties_l.push(value));
            properties_r.forEach(value => mappingProperties_r.push(value));
        }
    }

    // PS> do we have properties on both sides, all of the same length, left all different from right?
    let result = [rule];
    if (mappingProperties_l.length > 0 && mappingProperties_r.length > 0) {
        const proplen = prop => state.propertiesDict[prop].length;
        const len0 = proplen(mappingProperties_l[0]);
        if (!mappingProperties_l.some(value => proplen(value) != len0)
            && !mappingProperties_r.some(value => proplen(value) != len0)
            && !mappingProperties_l.some(value => mappingProperties_r.includes(value))) {
            result = replaceMappedProperties(rule, len0);
        }
    }

    // PS> blindly replace property by n-th member in the n-th new rule (except if random)
    function replaceMappedProperties(oldRule, numprops) {
        let newRules = [];
        while (numprops-- > 0)
            newRules.push(deepCloneRule(oldRule));
        //const newRules = (new Array(numprops)).map(v => deepCloneRule(oldRule));
        newRules.forEach((newRule,rindex) => {
            [ newRule.lhs, newRule.rhs ].forEach(side => {
                side.forEach(cellrow => {
                    cellrow.forEach(cell => {
                        for (let j = 0; j < cell.length; j += 2) {
                            if (cell[j] != "random" && cell[j + 1] in state.propertiesDict) {
                                cell[j + 1] = state.propertiesDict[cell[j+1]][rindex];
                            }
                        }
                    });
                });
            });
        });
        if (debugSwitch.includes('exp')) console.log(`replaceMappedProperties added ${rules.length} -> ${newrules.length}`);
        return newRules;
    }

    var shouldremove;
    var modified = true;
    while (modified) {
        modified = false;
        for (var i = 0; i < result.length; i++) {
            //only need to iterate through lhs
            var cur_rule = result[i];
            shouldremove = false;
            for (var j = 0; j < cur_rule.lhs.length && !shouldremove; j++) {
                var cur_rulerow = cur_rule.lhs[j];
                for (var k = 0; k < cur_rulerow.length && !shouldremove; k++) {
                    var cur_cell = cur_rulerow[k];
                    var properties = getPropertiesFromCell(state, cur_cell);
                    for (var prop_n = 0; prop_n < properties.length; ++prop_n) {
                        var property = properties[prop_n];

                        if (state.propertiesSingleLayer.hasOwnProperty(property) &&
                            ambiguousProperties[property] !== true) {
                            // we don't need to explode this property
                            continue;
                        }

                        var aliases = state.propertiesDict[property];

                        shouldremove = true;
                        modified = true;

                        //just do the base property, let future iterations take care of the others

                        for (var l = 0; l < aliases.length; l++) {
                            var concreteType = aliases[l];
                            var newrule = deepCloneRule(cur_rule);
                            newrule.propertyReplacement = {};
                            for (var prop in cur_rule.propertyReplacement) {
                                if (cur_rule.propertyReplacement.hasOwnProperty(prop)) {
                                    var propDat = cur_rule.propertyReplacement[prop];
                                    newrule.propertyReplacement[prop] = [propDat[0], propDat[1]];
                                }
                            }

                            concretizePropertyInCell(newrule.lhs[j][k], property, concreteType);
                            if (newrule.rhs.length > 0) {
                                concretizePropertyInCell(newrule.rhs[j][k], property, concreteType); //do for the corresponding rhs cell as well
                            }

                            if (newrule.propertyReplacement[property] === undefined) {
                                newrule.propertyReplacement[property] = [concreteType, 1];
                            } else {
                                newrule.propertyReplacement[property][1] = newrule.propertyReplacement[property][1] + 1;
                            }

                            result.push(newrule);
                        }

                        break;
                    }
                }
            }
            if (shouldremove) {
                result.splice(i, 1);
                i--;
            }
        }
    }


    for (var i = 0; i < result.length; i++) {
        //for each rule
        var cur_rule = result[i];
        if (cur_rule.propertyReplacement === undefined) {
            continue;
        }

        //for each property replacement in that rule
        for (var property in cur_rule.propertyReplacement) {
            if (cur_rule.propertyReplacement.hasOwnProperty(property)) {
                var replacementInfo = cur_rule.propertyReplacement[property];
                var concreteType = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                if (occurrenceCount === 1) {
                    //do the replacement
                    for (var j = 0; j < cur_rule.rhs.length; j++) {
                        var cellRow_rhs = cur_rule.rhs[j];
                        for (var k = 0; k < cellRow_rhs.length; k++) {
                            var cell = cellRow_rhs[k];
                            concretizePropertyInCell(cell, property, concreteType);
                        }
                    }
                }
            }
        }
    }

    //if any properties remain on the RHSes, bleep loudly
    var rhsPropertyRemains = '';
    for (var i = 0; i < result.length; i++) {
        var cur_rule = result[i];
        delete result.propertyReplacement;
        for (var j = 0; j < cur_rule.rhs.length; j++) {
            var cur_rulerow = cur_rule.rhs[j];
            for (var k = 0; k < cur_rulerow.length; k++) {
                var cur_cell = cur_rulerow[k];
                var properties = getPropertiesFromCell(state, cur_cell);
                for (var prop_n = 0; prop_n < properties.length; prop_n++) {
                    if (ambiguousProperties.hasOwnProperty(properties[prop_n])) {
                        rhsPropertyRemains = properties[prop_n];
                    }
                }
            }
        }
    }


    if (rhsPropertyRemains.length > 0) {
        logError('This rule has a property on the right-hand side, \"' + rhsPropertyRemains.toUpperCase() + "\", that can't be inferred from the left-hand side.  (either for every property on the right there has to be a corresponding one on the left in the same cell, OR, if there's a single occurrence of a particular property name on the left, all properties of the same name on the right are assumed to be the same).", lineNumber);
        return [];
    }

    return result;
}

function makeSpawnedObjectsStationary(state,rule,lineNumber){
    //movement not getting correctly cleared from tile #492
    //[ > Player | ] -> [ Crate | Player ] if there was a player already in the second cell, it's not replaced with a stationary player.
    //if there are properties remaining by this stage, just ignore them ( c.f. "[ >  Moveable | Moveable ] -> [ > Moveable | > Moveable ]" in block faker, what's left in this form) - this only happens IIRC when the properties span a single layer so it's)
    //if am object without moving-annotations appears on the RHS, and that object is not present on the lhs (either explicitly as an object, or implicitly in a property), add a 'stationary'
    if (rule.late){
        return;
    }

    for (var j = 0; j < rule.rhs.length; j++) {
        var row_l = rule.lhs[j];
        var row_r = rule.rhs[j];
        for (var k = 0; k < row_r.length; k++) {
            var cell=row_r[k];

            //this is super intricate. uff. 
            var objects_l = getPossibleObjectsFromCell(state, row_l[k]);
            var layers = objects_l.map(n=>state.objects[n].layer);
            for (var l = 0; l < cell.length; l += 2) {
                var dir = cell[l];
                if (dir!==""){
                    continue;
                }
                var name = cell[l + 1];
                if (name in state.propertiesDict || objects_l.indexOf(name)>=0){
                    continue;
                }
                // dies here if invalid object name
                var r_layer = state.objects[name].layer;
                if (layers.indexOf(r_layer)===-1){
                    cell[l]='stationary';
                }
            }
        }
    }

}

function concretizeMovingRule(state, rule, lineNumber) {

    var shouldremove;
    var result = [rule];
    var modified = true;
    while (modified) {
        modified = false;
        for (var i = 0; i < result.length; i++) {
            //only need to iterate through lhs
            var cur_rule = result[i];
            shouldremove = false;
            for (var j = 0; j < cur_rule.lhs.length; j++) {
                var cur_rulerow = cur_rule.lhs[j];
                for (var k = 0; k < cur_rulerow.length; k++) {
                    var cur_cell = cur_rulerow[k];
                    var movings = getMovings(state, cur_cell); //finds aggregate directions
                    if (movings.length > 0) {
                        shouldremove = true;
                        modified = true;

                        //just do the base property, let future iterations take care of the others
                        var cand_name = movings[0][0];
                        var ambiguous_dir = movings[0][1];
                        var concreteDirs = directionaggregates[ambiguous_dir];
                        for (var l = 0; l < concreteDirs.length; l++) {
                            var concreteDirection = concreteDirs[l];
                            var newrule = deepCloneRule(cur_rule);

                            //deep copy replacements
                            newrule.movingReplacement = {};
                            for (var moveTerm in cur_rule.movingReplacement) {
                                if (cur_rule.movingReplacement.hasOwnProperty(moveTerm)) {
                                    var moveDat = cur_rule.movingReplacement[moveTerm];
                                    newrule.movingReplacement[moveTerm] = [moveDat[0], moveDat[1], moveDat[2],moveDat[3],moveDat[4],moveDat[5]];
                                }
                            }
                            newrule.aggregateDirReplacement = {};
                            for (var moveTerm in cur_rule.aggregateDirReplacement) {
                                if (cur_rule.aggregateDirReplacement.hasOwnProperty(moveTerm)) {
                                    var moveDat = cur_rule.aggregateDirReplacement[moveTerm];
                                    newrule.aggregateDirReplacement[moveTerm] = [moveDat[0], moveDat[1], moveDat[2]];
                                }                                
                            }

                            concretizeMovingInCell(newrule.lhs[j][k], ambiguous_dir, cand_name, concreteDirection);
                            if (newrule.rhs.length > 0) {
                                concretizeMovingInCell(newrule.rhs[j][k], ambiguous_dir, cand_name, concreteDirection); //do for the corresponding rhs cell as well
                            }

                            if (newrule.movingReplacement[cand_name+ambiguous_dir] === undefined) {
                                newrule.movingReplacement[cand_name+ambiguous_dir] = [concreteDirection, 1, ambiguous_dir,cand_name,j,k];
                            } else {
                                var mr = newrule.movingReplacement[cand_name+ambiguous_dir];
                                if (j!==mr[4] || k!==mr[5]){
                                    mr[1] = mr[1] + 1;
                                }
                            }
                            if (newrule.aggregateDirReplacement[ambiguous_dir] === undefined) {
                                newrule.aggregateDirReplacement[ambiguous_dir] = [concreteDirection, 1, ambiguous_dir];
                            } else {
                                newrule.aggregateDirReplacement[ambiguous_dir][1] = newrule.aggregateDirReplacement[ambiguous_dir][1] + 1;
                            }

                            result.push(newrule);
                        }
                    }
                }
            }
            if (shouldremove) {
                result.splice(i, 1);
                i--;
            }
        }
    }


    for (var i = 0; i < result.length; i++) {
        //for each rule
        var cur_rule = result[i];
        if (cur_rule.movingReplacement === undefined) {
            continue;
        }
        var ambiguous_movement_dict = {};
        //strict first - matches movement direction to objects
        //for each property replacement in that rule
        for (var cand_name in cur_rule.movingReplacement) {
            if (cur_rule.movingReplacement.hasOwnProperty(cand_name)) {
                var replacementInfo = cur_rule.movingReplacement[cand_name];
                var concreteMovement = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                var ambiguousMovement = replacementInfo[2];
                var ambiguousMovement_attachedObject = replacementInfo[3];

                if (occurrenceCount === 1) {
                    //do the replacement
                    for (var j = 0; j < cur_rule.rhs.length; j++) {
                        var cellRow_rhs = cur_rule.rhs[j];
                        for (var k = 0; k < cellRow_rhs.length; k++) {
                            var cell = cellRow_rhs[k];
                            concretizeMovingInCell(cell, ambiguousMovement, ambiguousMovement_attachedObject, concreteMovement);
                        }
                    }
                }

            }
        }

        //I don't fully understand why the following part is needed (and I wrote this yesterday), but it's not obviously malicious.
        var ambiguous_movement_names_dict = {};
        for (var cand_name in cur_rule.aggregateDirReplacement) {
            if (cur_rule.aggregateDirReplacement.hasOwnProperty(cand_name)) {
                var replacementInfo = cur_rule.aggregateDirReplacement[cand_name];
                var concreteMovement = replacementInfo[0];
                var occurrenceCount = replacementInfo[1];
                var ambiguousMovement = replacementInfo[2];
                //are both the following boolean bits necessary, or just the latter? ah well, no harm it seems.
                if ((ambiguousMovement in ambiguous_movement_names_dict) || (occurrenceCount !== 1)) {
                    ambiguous_movement_names_dict[ambiguousMovement] = "INVALID";
                } else {
                    ambiguous_movement_names_dict[ambiguousMovement] = concreteMovement
                }
            }
        }        

        //for each ambiguous word, if there's a single ambiguous movement specified in the whole lhs, then replace that wholesale
        for (var ambiguousMovement in ambiguous_movement_dict) {
            if (ambiguous_movement_dict.hasOwnProperty(ambiguousMovement) && ambiguousMovement !== "INVALID") {
                concreteMovement = ambiguous_movement_dict[ambiguousMovement];
                if (concreteMovement === "INVALID") {
                    continue;
                }
                for (var j = 0; j < cur_rule.rhs.length; j++) {
                    var cellRow_rhs = cur_rule.rhs[j];
                    for (var k = 0; k < cellRow_rhs.length; k++) {
                        var cell = cellRow_rhs[k];
                        concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteMovement);
                    }
                }
            }
        }

        
        //further replacements - if a movement word appears once on the left, can use to disambiguate remaining ones on the right
        for (var ambiguousMovement in ambiguous_movement_names_dict) {
            if (ambiguous_movement_names_dict.hasOwnProperty(ambiguousMovement) && ambiguousMovement !== "INVALID") {
                concreteMovement = ambiguous_movement_names_dict[ambiguousMovement];
                if (concreteMovement === "INVALID") {
                    continue;
                }
                for (var j = 0; j < cur_rule.rhs.length; j++) {
                    var cellRow_rhs = cur_rule.rhs[j];
                    for (var k = 0; k < cellRow_rhs.length; k++) {
                        var cell = cellRow_rhs[k];
                        concretizeMovingInCellByAmbiguousMovementName(cell, ambiguousMovement, concreteMovement);
                    }
                }
            }
        }
    }

    //if any properties remain on the RHSes, bleep loudly
    var rhsAmbiguousMovementsRemain = '';
    for (var i = 0; i < result.length; i++) {
        var cur_rule = result[i];
        delete result.movingReplacement;
        for (var j = 0; j < cur_rule.rhs.length; j++) {
            var cur_rulerow = cur_rule.rhs[j];
            for (var k = 0; k < cur_rulerow.length; k++) {
                var cur_cell = cur_rulerow[k];
                var movings = getMovings(state, cur_cell);
                if (movings.length > 0) {
                    rhsAmbiguousMovementsRemain = movings[0][1];
                }
            }
        }
    }


    if (rhsAmbiguousMovementsRemain.length > 0) {
        logError('This rule has an ambiguous movement on the right-hand side, \"' + rhsAmbiguousMovementsRemain + "\", that can't be inferred from the left-hand side.  (either for every ambiguous movement associated to an entity on the right there has to be a corresponding one on the left attached to the same entity, OR, if there's a single occurrence of a particular ambiguous movement on the left, all properties of the same movement attached to the same object on the right are assumed to be the same (or something like that)).", lineNumber);
        state.invalid=true;
    }

    return result;
}

// replace all synonyms in a rule by the object they refer to
function rephraseSynonyms(state, rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellrow_l = rule.lhs[i];
        var cellrow_r = rule.rhs[i];
        for (var j = 0; j < cellrow_l.length; j++) {
            var cell_l = cellrow_l[j];
            for (var k = 1; k < cell_l.length; k += 2) {
                var name = cell_l[k];
                if (name in state.synonymsDict) {
                    cell_l[k] = state.synonymsDict[cell_l[k]];
                }
            }
            if (rule.rhs.length > 0) {
                var cell_r = cellrow_r[j];
                for (var k = 1; k < cell_r.length; k += 2) {
                    var name = cell_r[k];
                    if (name in state.synonymsDict) {
                        cell_r[k] = state.synonymsDict[cell_r[k]];
                    }
                }
            }
        }
    }
}

// replace all aggregates in a rule by the set of objects they refer to
function atomizeAggregates(state, rule) {
    for (var i = 0; i < rule.lhs.length; i++) {
        var cellrow = rule.lhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            atomizeCellAggregates(state, cell, rule.lineNumber);
        }
    }
    for (var i = 0; i < rule.rhs.length; i++) {
        var cellrow = rule.rhs[i];
        for (var j = 0; j < cellrow.length; j++) {
            var cell = cellrow[j];
            atomizeCellAggregates(state, cell, rule.lineNumber);
        }
    }
}

function atomizeCellAggregates(state, cell, lineNumber) {
    for (var i = 0; i < cell.length; i += 2) {
        var dir = cell[i];
        var c = cell[i + 1];
        if (c in state.aggregatesDict) {
            if (dir === 'no') {
                logError("You cannot use 'no' to exclude the aggregate object " + c.toUpperCase() + " (defined using 'AND'), only regular objects, or properties (objects defined using 'OR').  If you want to do this, you'll have to write it out yourself the long way.", lineNumber);
            }
            var equivs = state.aggregatesDict[c];
            cell[i + 1] = equivs[0];
            for (var j = 1; j < equivs.length; j++) {
                cell.push(cell[i]); //push the direction
                cell.push(equivs[j]);
            }
        }
    }
}

// replace all relative directions in every rule cell by absolute based on rule direction (direction and object)
function convertRelativeDirsToAbsolute(state, rule) {
    [ ...rule.lhs, ...rule.rhs ].flat().forEach(cell => {
        absolutifyRuleCell(rule.direction, cell);
    });
}

function absolutifyRuleCell(forward, cell) {
    const absOf = dir => relativeDirs.includes(dir) ? relativeDict[forward][relativeDirs.indexOf(dir)] : dir;
    for (var i = 0; i < cell.length; i += 2) {
        cell[i] = absOf(cell[i]);
        cell[i + 1] = cell[i + 1].split(':').map(p => absOf(p)).join(':');
    }
}

function rulesToMask(state) {
    /*

    */
    var layerCount = state.collisionLayers.length;
    var layerTemplate = [];
    for (var i = 0; i < layerCount; i++) {
        layerTemplate.push(null);
    }

    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        for (var j = 0; j < rule.lhs.length; j++) {
            var cellrow_l = rule.lhs[j];
            var cellrow_r = rule.rhs[j];
            for (var k = 0; k < cellrow_l.length; k++) {
                var cell_l = cellrow_l[k];
                var layersUsed_l = layerTemplate.concat([]);
                var objectsPresent = new BitVec(STRIDE_OBJ);
                var objectsMissing = new BitVec(STRIDE_OBJ);
                var anyObjectsPresent = [];
                var movementsPresent = new BitVec(STRIDE_MOV);
                var movementsMissing = new BitVec(STRIDE_MOV);

                var objectlayers_l = new BitVec(STRIDE_MOV);
                for (var l = 0; l < cell_l.length; l += 2) {
                    var object_dir = cell_l[l];
                    if (object_dir === '...') {
                        objectsPresent = ellipsisPattern;
                        if (cell_l.length !== 2) {
                            logError("You can't have anything in with an ellipsis. Sorry.", rule.lineNumber);
                        } else if ((k === 0) || (k === cellrow_l.length - 1)) {
                            logError("There's no point in putting an ellipsis at the very start or the end of a rule", rule.lineNumber);
                        } else if (rule.rhs.length > 0) {
                            var rhscell = cellrow_r[k];
                            if (rhscell.length !== 2 || rhscell[0] !== '...') {
                                logError("An ellipsis on the left must be matched by one in the corresponding place on the right.", rule.lineNumber);
                            }
                        }
                        break;
                    } else if (object_dir === 'random') {
                        logError("RANDOM cannot be matched on the left-hand side, it can only appear on the right", rule.lineNumber);
                        continue;
                    }

                    var object_name = cell_l[l + 1];
                    var object = state.objects[object_name];
                    var objectMask = state.objectMasks[object_name];
                    if (object) {
                        var layerIndex = object.layer | 0;
                    } else {
                        var layerIndex = state.propertiesSingleLayer[object_name];
                    }

                    if (typeof(layerIndex) === "undefined") {
                        logError("Oops!  " + object_name.toUpperCase() + " not assigned to a layer.", rule.lineNumber);
                    }

                    if (object_dir === 'no') {
                        objectsMissing.ior(objectMask);
                    } else {
                        var existingname = layersUsed_l[layerIndex];
                        if (existingname !== null) {
                            rule.discard=[object_name.toUpperCase(), existingname.toUpperCase()];
                        }

                        layersUsed_l[layerIndex] = object_name;

                        if (object) {
                            objectsPresent.ior(objectMask);
                            objectlayers_l.ishiftor(MOV_MASK, MOV_BITS * layerIndex);
                        } else {
                            anyObjectsPresent.push(objectMask);
                        }

                        if (object_dir === 'stationary') {
                            movementsMissing.ishiftor(MOV_MASK, MOV_BITS * layerIndex);
                        } else {
                            movementsPresent.ishiftor(dirMasks[object_dir], MOV_BITS * layerIndex);
                        }
                    }
                }

                if (rule.rhs.length > 0) {
                    var rhscell = cellrow_r[k];
                    var lhscell = cellrow_l[k];
                    if (rhscell[0] === '...' && lhscell[0] !== '...') {
                        logError("An ellipsis on the right must be matched by one in the corresponding place on the left.", rule.lineNumber);
                    }
                    for (var l = 0; l < rhscell.length; l += 2) {
                        var content = rhscell[l];
                        if (content === '...') {
                            if (rhscell.length !== 2) {
                                logError("You can't have anything in with an ellipsis. Sorry.", rule.lineNumber);
                            }
                        }
                    }
                }

                if (objectsPresent === ellipsisPattern) {
                    cellrow_l[k] = ellipsisPattern;
                    continue;
                } else {
                    cellrow_l[k] = new CellPattern([objectsPresent, objectsMissing, anyObjectsPresent, movementsPresent, movementsMissing, null]);
                }

                //if X no X, then cancel
                if (objectsPresent.anyBitsInCommon(objectsMissing)){
                    //if I'm about the remove the last representative of this line number, throw an error
                    var ln = rule.lineNumber;
                    if ( (i>0 && state.rules[i-1].lineNumber===ln) || ( (i+1<state.rules.length) && state.rules[i+1].lineNumber===ln)){
                        //all good
                    } else {
                        logWarning('This rule has some content of the form "X no X" (either directly or maybe indirectly - check closely how the terms are defined if nothing stands out) which can never match and so the rule is getting removed during compilation.', rule.lineNumber);
                    }
                    state.rules.splice(i,1);
                    i--;
                    continue;
                }
                
                if (rule.rhs.length === 0) {
                    continue;
                }

                var cell_r = cellrow_r[k];
                var layersUsed_r = layerTemplate.concat([]);
                var layersUsedRand_r = layerTemplate.concat([]);

                var objectsClear = new BitVec(STRIDE_OBJ);
                var objectsSet = new BitVec(STRIDE_OBJ);
                var movementsClear = new BitVec(STRIDE_MOV);
                var movementsSet = new BitVec(STRIDE_MOV);

                var objectlayers_r = new BitVec(STRIDE_MOV);
                var randomMask_r = new BitVec(STRIDE_OBJ);
                var postMovementsLayerMask_r = new BitVec(STRIDE_MOV);
                var randomDirMask_r = new BitVec(STRIDE_MOV);
                for (var l = 0; l < cell_r.length; l += 2) {
                    var object_dir = cell_r[l];
                    var object_name = cell_r[l + 1];

                    if (object_dir === '...') {
                        //logError("spooky ellipsis found! (should never hit this)");
                        break;
                    } else if (object_dir === 'random') {
                        if (object_name in state.objectMasks) {
                            var mask = state.objectMasks[object_name];
                            randomMask_r.ior(mask);
                            var values;
                            if (state.propertiesDict.hasOwnProperty(object_name)) {
                                values = state.propertiesDict[object_name];
                            } else {
                                //get line number declaration of object_name
                                logWarning(`In this rule you're asking me to spawn a random ${object_name.toUpperCase()} for you, but that's already a concrete single object.  You wanna be using random with properties (things defined in terms of OR in the legend) so there's some things to select between.`, rule.lineNumber);
                                values = [object_name];
                            }
                            for (var m = 0; m < values.length; m++) {
                                var subobject = values[m];
                                var layerIndex = state.objects[subobject].layer | 0;
                                var existingname = layersUsed_r[layerIndex];
                                if (existingname !== null) {
                                    var o1 = subobject.toUpperCase();
                                    var o2 = existingname.toUpperCase();
                                    if (o1 !== o2) {
                                        logWarning("This rule may try to spawn a " + o1 + " with random, but also requires a " + o2 + " be here, which is on the same layer - they shouldn't be able to coexist!", rule.lineNumber);
                                    }
                                }

                                layersUsedRand_r[layerIndex] = subobject;
                            }

                        } else {
                            logError('You want to spawn a random "' + object_name.toUpperCase() + '", but I don\'t know how to do that', rule.lineNumber);
                        }
                        continue;
                    }

                    var object = state.objects[object_name];
                    var objectMask = state.objectMasks[object_name];
                    if (object) {
                        var layerIndex = object.layer | 0;
                    } else {
                        var layerIndex = state.propertiesSingleLayer[object_name];
                    }


                    if (object_dir == 'no') {
                        objectsClear.ior(objectMask);
                    } else {
                        var existingname = layersUsed_r[layerIndex];
                        if (existingname === null) {
                            existingname = layersUsedRand_r[layerIndex];
                        }

                        if (existingname !== null) {
                            if (rule.hasOwnProperty('discard')) {

                            } else {
                                logError('Rule matches object types that can\'t overlap: "' + object_name.toUpperCase() + '" and "' + existingname.toUpperCase() + '".', rule.lineNumber);
                            }
                        }

                        layersUsed_r[layerIndex] = object_name;

                        if (object_dir.length > 0) {
                            postMovementsLayerMask_r.ishiftor(MOV_MASK, MOV_BITS * layerIndex);
                        }

                        var layerMask = state.layerMasks[layerIndex];

                        if (object) {
                            objectsSet.ibitset(object.id);
                            objectsClear.ior(layerMask);
                            objectlayers_r.ishiftor(MOV_MASK, MOV_BITS * layerIndex);
                        } else {
                            // shouldn't need to do anything here...
                        }
                        //possibility - if object not present on lhs in same position, clear movement
                        if (object_dir === 'stationary') {
                            movementsClear.ishiftor(MOV_MASK, MOV_BITS * layerIndex);
                        }                
                        if (object_dir === 'randomdir') {
                            randomDirMask_r.ishiftor(dirMasks[object_dir], MOV_BITS * layerIndex);
                        } else {
                            movementsSet.ishiftor(dirMasks[object_dir], MOV_BITS * layerIndex);
                        };
                    }
                }

                //I don't know why these two ifs here are needed.
                if (!(objectsPresent.bitsSetInArray(objectsSet.data))) {
                    objectsClear.ior(objectsPresent); // clear out old objects
                }
                if (!(movementsPresent.bitsSetInArray(movementsSet.data))) {
                    movementsClear.ior(movementsPresent); // ... and movements
                }

                /*
                for rules like this I want to clear movements on newly-spawned entities
                    [ >  Player | Crate ] -> [  >  Player | > Crate  ]
                    [ > Player | ] -> [ Crate | Player ]

                WITHOUT havin this rule remove movements
                    [ > Player | ] -> [ Crate | Player ]
                (bug #492)
                */
               
                for (var l = 0; l < layerCount; l++) {
                    if (layersUsed_l[l] !== null && layersUsed_r[l] === null) {
                        // a layer matched on the lhs, but not on the rhs
                        objectsClear.ior(state.layerMasks[l]);
                        postMovementsLayerMask_r.ishiftor(MOV_MASK, MOV_BITS * l);
                    }
                }

                objectlayers_l.iclear(objectlayers_r);

                postMovementsLayerMask_r.ior(objectlayers_l);
                if (!objectsClear.iszero() || !objectsSet.iszero() || !movementsClear.iszero() || !movementsSet.iszero() || !postMovementsLayerMask_r.iszero() || !randomMask_r.iszero() || !randomDirMask_r.iszero()) {
                    // only set a replacement if something would change
                    cellrow_l[k].replacement = new CellReplacement([objectsClear, objectsSet, movementsClear, movementsSet, postMovementsLayerMask_r, randomMask_r, randomDirMask_r]);
                } 
            }
        }
    }
}

function cellRowMasks(rule) {
    var ruleMasks = [];
    var lhs = rule[1];
    for (var i = 0; i < lhs.length; i++) {
        var cellRow = lhs[i];
        var rowMask = new BitVec(STRIDE_OBJ);
        for (var j = 0; j < cellRow.length; j++) {
            if (cellRow[j] === ellipsisPattern)
                continue;
            rowMask.ior(cellRow[j].objectsPresent);
        }
        ruleMasks.push(rowMask);
    }
    return ruleMasks;
}

function cellRowMasks_Movements(rule){
    var ruleMasks_mov = [];
    var lhs = rule[1];
    for (var i = 0; i < lhs.length; i++) {
        var cellRow = lhs[i];
        var rowMask = new BitVec(STRIDE_MOV);
        for (var j = 0; j < cellRow.length; j++) {
            if (cellRow[j] === ellipsisPattern)
                continue;
            rowMask.ior(cellRow[j].movementsPresent);
        }
        ruleMasks_mov.push(rowMask);
    }
    return ruleMasks_mov;
}

function collapseRules(groups) {
    for (var gn = 0; gn < groups.length; gn++) {
        var rules = groups[gn];
        for (var i = 0; i < rules.length; i++) {
            var oldrule = rules[i];
            var newrule = [0, [], oldrule.rhs.length > 0, oldrule.lineNumber /*ellipses,group number,rigid,commands,randomrule,[cellrowmasks]*/ ];
            var ellipses = [];
            for (var j = 0; j < oldrule.lhs.length; j++) {
                ellipses.push(0);
            }

            newrule[0] = dirMasks[oldrule.direction];
            for (var j = 0; j < oldrule.lhs.length; j++) {
                var cellrow_l = oldrule.lhs[j];
                for (var k = 0; k < cellrow_l.length; k++) {
                    if (cellrow_l[k] === ellipsisPattern) {
                        ellipses[j] ++;
                        if (ellipses[j]>2) {
                            logError("You can't use more than two ellipses in a single cell match pattern.", oldrule.lineNumber);
                        } else {
                            if (k>0 && cellrow_l[k-1]===ellipsisPattern){
                                logWarning("Why would you go and have two ellipses in a row like that? It's exactly the same as just having a single ellipsis, right?", oldrule.lineNumber);
                        }
                    }
                }
                }
                newrule[1][j] = cellrow_l;
            }
            newrule.push(ellipses);
            newrule.push(oldrule.groupNumber);
            newrule.push(oldrule.rigid);
            newrule.push(oldrule.commands);
            newrule.push(oldrule.randomRule);
            newrule.push(cellRowMasks(newrule));
            newrule.push(cellRowMasks_Movements(newrule));
            newrule.push(oldrule.globalRule);
            newrule.push(oldrule.isOnce);
            rules[i] = new Rule(newrule);
        }
    }
    matchCache = {}; // clear match cache so we don't slowly leak memory
}



function ruleGroupDiscardOverlappingTest(ruleGroup) {
    if (ruleGroup.length === 0)
        return;
    
    var discards=[];

    for (var i = 0; i < ruleGroup.length; i++) {
        var rule = ruleGroup[i];
        if (rule.hasOwnProperty('discard')) {
            
            var beforesame = i===0 ? false : ruleGroup[i-1].lineNumber === rule.lineNumber;
            var aftersame = i===(ruleGroup.length-1) ? false : ruleGroup[i+1].lineNumber === rule.lineNumber;

            ruleGroup.splice(i, 1);
            
            var found=false;
            for(var j=0;j<discards.length;j++){
                var discard=discards[j];
                if (discard[0]===rule.discard[0] && discard[1]===rule.discard[1]){
                    found=true;
                    break;
                }
            }
            if(!found){
                discards.push(rule.discard)
            }

            //if rule before isn't of same linenumber, and rule after isn't of same linenumber, 
            //then a rule has been totally erased and you should throw an error!
            if ( !(beforesame||aftersame) || ruleGroup.length===0) {
                
                const example = discards[0];
                
                var parenthetical = "";
                if (discards.length>1){
                    parenthetical = " (ditto for ";
                    for (var j=1;j<discards.length;j++){
                        if (j>1){
                            parenthetical+=", "
                            
                            if (j===discards.length-1){
                                parenthetical += "and ";
            }
                        }

                        const thisdiscard = discards[j];
                        const p1 = thisdiscard[0];
                        const p2 = thisdiscard[1];
                        parenthetical += `${p1}/${p2}`;

                        if (j===3 && discards.length>4){
                            parenthetical+=" etc.";
                            break;
                        }
                    }
                    parenthetical += ")";
                }

                logError(`${example[0]} and ${example[1]} can never overlap${parenthetical}, but this rule requires that to happen, so it's being culled.`, rule.lineNumber);
            }
            i--;
        }
    }
}

function arrangeRulesByGroupNumber(state) {
    var aggregates = {};
    var aggregates_late = {};
    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        var targetArray = aggregates;
        if (rule.late) {
            targetArray = aggregates_late;
        }

        if (targetArray[rule.groupNumber] == undefined) {
            targetArray[rule.groupNumber] = [];
        }
        targetArray[rule.groupNumber].push(rule);
    }

    var result = [];
    for (var groupNumber in aggregates) {
        if (aggregates.hasOwnProperty(groupNumber)) {
            var ruleGroup = aggregates[groupNumber];
            ruleGroupDiscardOverlappingTest(ruleGroup);
            if (ruleGroup.length > 0) {
                result.push(ruleGroup);
            }
        }
    }
    var result_late = [];
    for (var groupNumber in aggregates_late) {
        if (aggregates_late.hasOwnProperty(groupNumber)) {
            var ruleGroup = aggregates_late[groupNumber];
            ruleGroupDiscardOverlappingTest(ruleGroup);
            if (ruleGroup.length > 0) {
                result_late.push(ruleGroup);
            }
        }
    }
    state.rules = result;

    //check that there're no late movements with direction requirements on the lhs
    state.lateRules = result_late;
}

function generateRigidGroupList(state) {
	var rigidGroupIndex_to_GroupIndex=[];
	var groupIndex_to_RigidGroupIndex=[];
	var groupNumber_to_GroupIndex=[];
	var groupNumber_to_RigidGroupIndex=[];
	var rigidGroups=[];
	for (var i=0;i<state.rules.length;i++) {
		var ruleset=state.rules[i];
		var rigidFound=false;
		for (var j=0;j<ruleset.length;j++) {
			var rule=ruleset[j];
			if (rule.isRigid) {
				rigidFound=true;
			}
		}
		rigidGroups[i]=rigidFound;
		if (rigidFound) {
			var groupNumber=ruleset[0].groupNumber;
			groupNumber_to_GroupIndex[groupNumber]=i;
			var rigid_group_index = rigidGroupIndex_to_GroupIndex.length;
			groupIndex_to_RigidGroupIndex[i]=rigid_group_index;
			groupNumber_to_RigidGroupIndex[groupNumber]=rigid_group_index;
			rigidGroupIndex_to_GroupIndex.push(i);
		}
	}
    if (rigidGroupIndex_to_GroupIndex.length > 30) {
        var group_index = rigidGroupIndex_to_GroupIndex[30];
        logError("There can't be more than 30 rigid groups (rule groups containing rigid members).", state.rules[group_index][0].lineNumber);
	}

	state.rigidGroups=rigidGroups;
	state.rigidGroupIndex_to_GroupIndex=rigidGroupIndex_to_GroupIndex;
	state.groupNumber_to_RigidGroupIndex=groupNumber_to_RigidGroupIndex;
	state.groupIndex_to_RigidGroupIndex=groupIndex_to_RigidGroupIndex;
}

function getMaskFromName(state,name) {
	var objectMask=new BitVec(STRIDE_OBJ);
	if (name in state.objects) {
		var o=state.objects[name];
		objectMask.ibitset(o.id);
	}

	if (name in state.aggregatesDict) {
		var objectnames = state.aggregatesDict[name];
		for(var i=0;i<objectnames.length;i++) {
			var n=objectnames[i];
			var o = state.objects[n];
			objectMask.ibitset(o.id);
		}
	}

	if (name in state.propertiesDict) {
		var objectnames = state.propertiesDict[name];
		for(var i=0;i<objectnames.length;i++) {
			var n = objectnames[i];
			var o = state.objects[n];
			objectMask.ibitset(o.id);
		}
	}

	if (name in state.synonymsDict) {
		var n = state.synonymsDict[name];
		var o = state.objects[n];
		objectMask.ibitset(o.id);
	}

	if (!state.metadata.includes("nokeyboard") && objectMask.iszero()) {
		logErrorNoLine("error, didn't find any object called player, either in the objects section, or the legends section. there must be a player!");
	}
	return objectMask;
}

function generateMasks(state) {
    state.playerMask = getMaskFromName(state, 'player');

    var layerMasks = [];                        // doc: bit vector of object IDs in a layer
    var layerCount = state.collisionLayers.length;
    for (var layer = 0; layer < layerCount; layer++) {
        var layerMask = new BitVec(STRIDE_OBJ);
        for (var j = 0; j < state.objectCount; j++) {
            var n = state.idDict[j];
            var o = state.objects[n];
            if (o.layer == layer) {
                layerMask.ibitset(o.id);
            }
        }
        layerMasks.push(layerMask);
    }
    state.layerMasks = layerMasks;              // doc: array of layer masks indexed by layer

    var objectMask = {};
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var o = state.objects[n];
            objectMask[n] = new BitVec(STRIDE_OBJ);
            objectMask[n].ibitset(o.id);
        }
    }

    // Synonyms can depend on properties, and properties can depend on synonyms.
    // Process them in order by combining & sorting by linenumber.

    var synonyms_and_properties = state.legend_synonyms.concat(state.legend_properties);
    synonyms_and_properties.sort(function(a, b) {
        return a.lineNumber - b.lineNumber;
    });

    for (var i = 0; i < synonyms_and_properties.length; i++) {
        var synprop = synonyms_and_properties[i];
        if (synprop.length == 2) {
            // synonym (a = b)
            objectMask[synprop[0]] = objectMask[synprop[1]];
        } else {
            // property (a = b or c)
            var val = new BitVec(STRIDE_OBJ);
            for (var j = 1; j < synprop.length; j++) {
                var n = synprop[j];
                val.ior(objectMask[n]);
            }
            objectMask[synprop[0]] = val;
        }
    }

    //use \n as a delimeter for internal-only objects
    var all_obj = new BitVec(STRIDE_OBJ);
    all_obj.inot();
    objectMask["\nall\n"] = all_obj;

    state.objectMasks = objectMask;

    
    state.aggregateMasks = {};

    //set aggregate masks similarly
    for (var aggregateName of Object.keys(state.aggregatesDict)) {
        var objectnames = state.aggregatesDict[aggregateName];
        
        var aggregateMask = new BitVec(STRIDE_OBJ);
        for (var i = 0; i < objectnames.length; i++) {
            var n = objectnames[i];
            var o = state.objects[n];
            aggregateMask.ior(objectMask[n]);
        }
        state.aggregateMasks[aggregateName] = aggregateMask;
    }
}

function checkObjectsAreLayered(state) {
    for (var n in state.objects) {
        if (state.objects.hasOwnProperty(n)) {
            var found = false;
            for (var i = 0; i < state.collisionLayers.length; i++) {
                var layer = state.collisionLayers[i];
                for (var j = 0; j < layer.length; j++) {
                    if (layer[j] === n) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
            if (found === false) {
                var o = state.objects[n];
                logError('Object "' + n.toUpperCase() + '" has been defined, but not assigned to a layer.', o.lineNumber);
            }
        }
    }
}

function isInt(value) {
return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}
// convert metadata to object format and validate
function twiddleMetaData(state, update = false) {
	var newmetadata;

	if (!update) {
		newmetadata = {};
		for (var i=0;i<state.metadata.length;i+=2) {
			var key = state.metadata[i];
			var val = state.metadata[i+1];
			newmetadata[key]=val;
		}
	} else {
		newmetadata = state.metadata;
	}


    const getIntCheckedPositive = function(s,lineNumber){
        if (!isFinite(s) || !isInt(s)){
            logWarning(`Wasn't able to make sense of "${s}" as a (whole number) dimension.`,lineNumber);
            return NaN;
        }
        var result = parseInt(s);
        if (isNaN(result)){
            logWarning(`Wasn't able to make sense of "${s}" as a dimension.`,lineNumber);
        }
        if (result<=0){
            logWarning(`The dimension given to me (you gave "${s}") is baad - it should be greater than 0.`,lineNumber);
        }
        return result;
    }
    const getCoords = function(str,lineNumber){
		var coords = val.split('x');
        if (coords.length!==2){
            logWarning("Dimensions must be of the form AxB.",lineNumber);
            return null;
        } else {
            var intcoords = [getIntCheckedPositive(coords[0],lineNumber), getIntCheckedPositive(coords[1],lineNumber)];
            if (!isFinite(coords[0]) || !isFinite(coords[1]) || isNaN(intcoords[0]) || isNaN(intcoords[1])) {
                logWarning(`Couldn't understand the dimensions given to me (you gave "${val}") - should be of the form AxB.`,lineNumber);
                return null
            } else {
                if (intcoords[0]<=0 || intcoords[1]<=0){
                    logWarning(`The dimensions given to me (you gave "${val}") are baad - they should be > 0.`,lineNumber);
	}
                return intcoords;
            }
        }
    }

    if (newmetadata.flickscreen !== undefined) {
		var val = newmetadata.flickscreen;
        newmetadata.flickscreen = getCoords(val,state.metadata_lines.flickscreen);
        if (newmetadata.flickscreen===null){
            delete newmetadata.flickscreen;
        }
    }
    if (newmetadata.zoomscreen !== undefined) {
		var val = newmetadata.zoomscreen;
        newmetadata.zoomscreen = getCoords(val, state.metadata_lines.zoomscreen);
        if (newmetadata.zoomscreen === null) {
            delete newmetadata.zoomscreen;
	}
	}
	if (newmetadata.smoothscreen!==undefined) {
		var val = newmetadata.smoothscreen;
		var args = val.split(/\s+/);

		var validArguments = true

		if (args.length < 1) {
			logErrorNoLine('smoothscreen given no arguments but expects at least 1: smoothscreen [flick] WxH [IxJ] [S]')
			validArguments = false
		} else if (args.length > 4) {
			logErrorNoLine('smoothscreen given ' + args.length + ' arguments but expects at most 4: smoothscreen [flick] WxH [IxJ] [S]')
			validArguments = false
		}

		const smoothscreen = {
			screenSize: { width: 0, height: 0 },
			boundarySize: { width: 1, height: 1 },
			cameraSpeed: 0.125,
			flick: false,
			debug: !!newmetadata.smoothscreen_debug
		}

		if (args[0] === 'flick') {
			smoothscreen.flick = true
			args.shift()
		}

		const screenSizeMatch = args[0].match(/^(?<width>\d+)x(?<height>\d+)$/)
		if (screenSizeMatch) {
			smoothscreen.screenSize.width = parseInt(screenSizeMatch.groups.width)
			smoothscreen.screenSize.height = parseInt(screenSizeMatch.groups.height)

			if (smoothscreen.flick) {
				smoothscreen.boundarySize.width = smoothscreen.screenSize.width
				smoothscreen.boundarySize.height = smoothscreen.screenSize.height
			}
		} else {
			logErrorNoLine('smoothscreen given first argument ' + args[0] + ' but must be formatted WxH where W and H are integers')
			validArguments = false
		}

		if (args.length > 1) {
			const boundarySizeMatch = args[1].match(/^(?<width>\d+)x(?<height>\d+)$/)
			if (boundarySizeMatch) {
				smoothscreen.boundarySize.width = parseInt(boundarySizeMatch.groups.width)
				smoothscreen.boundarySize.height = parseInt(boundarySizeMatch.groups.height)
			} else {
				logErrorNoLine('smoothscreen given second argument ' + args[1] + ' but must be formatted IxJ where I and J are integers')
				validArguments = false
			}
		}

		if (args.length > 2) {
			const cameraSpeedMatch = args[2].match(/^(?<speed>\d+(\.\d+)?)$/)
			if (cameraSpeedMatch) {
				smoothscreen.cameraSpeed = clamp(parseFloat(cameraSpeedMatch.groups.speed), 0, 1)
			} else {
				logErrorNoLine('smoothscreen given third argument ' + args[2] + ' but must be a number')
				validArguments = false
			}
		}

		if (validArguments) {
			newmetadata.smoothscreen = smoothscreen;
		} else {
			delete newmetadata.smoothscreen
		}
	}

    if (newmetadata.tween_easing) {
        let easing = newmetadata.tween_easing;
        if (easing) {
            easing = (parseInt(easing) != NaN && easingAliases[parseInt(easing)]) ? easingAliases[parseInt(easing)] : easing.toLowerCase();
            if (EasingFunctions[easing]) 
                newmetadata.tween_easing = easing;
            else {
                logErrorNoLine(`tween easing ${newmetadata.tween_easing} is not valid.`);
                delete newmetadata.tween_easing;
            }
        }
    }

    if (newmetadata.tween_snap) {
        const snap = Math.max(parseInt(state.metadata.tween_snap), 1);
        if (snap) newmetadata.tween_snap = snap;
        else {
            logErrorNoLine(`tween ${newmetadata.tween_snap} is not valid.`);
            delete newmetadata.tween_snap;
        }
    }

    state.metadata=newmetadata;

	if (!update) {
		state.default_metadata = deepClone(newmetadata);
	}
}

function processWinConditions(state) {
    //	[-1/0/1 (no,some,all),ob1,ob2] (ob2 is background by default)
    var newconditions = [];
    for (var i = 0; i < state.winconditions.length; i++) {
        var wincondition = state.winconditions[i];
        if (wincondition.length == 0) {
            return;
        }
        var num = 0;
        switch (wincondition[0].toLowerCase()) {
            case 'no':
                { num = -1; break; }
            case 'all':
                { num = 1; break; }
        }

        var lineNumber = wincondition[wincondition.length - 1];

        var n1 = wincondition[1];
        var n2;
        if (wincondition.length == 5) {
            n2 = wincondition[3];
        } else {
            n2 = '\nall\n';
        }

        var mask1 = 0;
        var mask2 = 0;
        var aggr1 = false;
        var aggr2 = false;

        if (n1 in state.objectMasks) {
            aggr1 = false;
            mask1 = state.objectMasks[n1];
        } else if (n1 in state.aggregateMasks){
            aggr1 = true;
            mask1 = state.aggregateMasks[n1];
        } else {
            logError('Unwelcome term "' + n1 + '" found in win condition. I don\'t know what I\'m supposed to do with this. ', lineNumber);
        }
        if (n2 in state.objectMasks) {
            aggr2=false;
            mask2 = state.objectMasks[n2];
        } else if (n2 in state.aggregateMasks){
            aggr2 = true;
            mask2 = state.aggregateMasks[n2];
        } else {
            logError('Unwelcome term "' + n1 + '" found in win condition. I don\'t know what I\'m supposed to do with this. ', lineNumber);
        }
        var newcondition = [num, mask1, mask2, lineNumber, aggr1, aggr2];
        newconditions.push(newcondition);
    }
    state.winconditions = newconditions;
}

function printCellRow(cellRow) {
    var result = "[ ";
    for (var i = 0; i < cellRow.length; i++) {
        if (i > 0) {
            result += "| ";
        }
        var cell = cellRow[i];
        for (var j = 0; j < cell.length; j += 2) {
            var direction = cell[j];
            var object = cell[j + 1]
            if (direction === "...") {
                result += direction + " ";
            } else {
                result += direction + " " + object + " ";
            }
        }
    }
    result += "] ";
    return result;
}

function cacheRuleStringRep(rule) {
	var result="(<a onclick=\"jumpToLine('"+ rule.lineNumber.toString() + "');\"  href=\"javascript:void(0);\">"+rule.lineNumber+"</a>) "+ rule.direction.toString().toUpperCase()+" ";
	if (rule.rigid) {
		result = "RIGID "+result+" ";
	}
	if (rule.randomRule) {
		result = "RANDOM "+result+" ";
	}
	if (rule.globalRule) {
		result = "GLOBAL "+result+" ";
	}
	if (rule.isOnce) {
		result = "ONCE "+result+" ";
	}
	if (rule.late) {
		result = "LATE "+result+" ";
	}
	for (var i=0;i<rule.lhs.length;i++) {
		var cellRow = rule.lhs[i];
		result = result + printCellRow(cellRow);
	}
	result = result + "-> ";
	for (var i=0;i<rule.rhs.length;i++) {
		var cellRow = rule.rhs[i];
		result = result + printCellRow(cellRow);
	}
	for (var i=0;i<rule.commands.length;i++) {
		var command = rule.commands[i];
		if (command.length===1) {
			result = result +command[0].toString();
		} else {
			result = result + '('+command[0].toString()+", "+command[1].toString()+') ';			
		}
	}
	//print commands next
	rule.stringRep=result;
}

function cacheAllRuleNames(state) {

    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        cacheRuleStringRep(rule);
    }
}

function printRules(state) {
    var output = "";
    var loopIndex = 0;
    var loopEnd = -1;
    let subroutineIndex = 0;
    var discardcount = 0;
    for (var i = 0; i < state.rules.length; i++) {
        var rule = state.rules[i];
        // print subroutine - could be more than one, must come before any startloop and after any endloop!
        let subrtext = '';
        for (let subroutine = state.subroutines[subroutineIndex]; subroutine && subroutine.lineNumber < rule.lineNumber; subroutine = state.subroutines[++subroutineIndex]) {
            subrtext += `SUBROUTINE ${subroutine.label}<br>`;
        }
        if (loopIndex < state.loops.length) {
            if (state.loops[loopIndex][0] < rule.lineNumber) {
                output += subrtext + "STARTLOOP<br>";
                subrtext = '';
                loopIndex++;
                if (loopIndex < state.loops.length) { // don't die with mismatched loops
                    loopEnd = state.loops[loopIndex][0];
                    loopIndex++;
                }
            }
        }
        if (loopEnd !== -1 && loopEnd < rule.lineNumber) {
            output += "ENDLOOP<br>";
            loopEnd = -1;
        }
        output += subrtext;
        if (rule.hasOwnProperty('discard')) {
            discardcount++;
        } else {
            var sameGroupAsPrevious = i>0 && state.rules[i-1].groupNumber === rule.groupNumber;
            if (sameGroupAsPrevious){
                output += '+ ';
            } else {
                output += '&nbsp;&nbsp;';
            }
            output += rule.stringRep + "<br>";
        }
    }
    if (loopEnd !== -1) { // no more rules after loop end
        output += "ENDLOOP<br>";
    }
    output += "===========<br>";
    output = "<br>Rule Assembly : (" + (state.rules.length - discardcount) + " rules)<br>===========<br>" + output;
    consolePrint(output);
}

function removeDuplicateRules(state) {
    var record = {};
    var newrules = [];
    var lastgroupnumber = -1;
    for (var i = state.rules.length - 1; i >= 0; i--) {
        var r = state.rules[i];
        var groupnumber = r.groupNumber;
        if (groupnumber !== lastgroupnumber) {
            record = {};
        }
        var r_string = r.stringRep;
        if (record.hasOwnProperty(r_string)) {
            state.rules.splice(i, 1);
        } else {
            record[r_string] = true;
        }
        lastgroupnumber = groupnumber;
    }
}

function generateLoopPoints(state) {
    var loopPoint = {};
    var loopPointIndex = 0;
    var outside = true;
    var source = 0;
    var target = 0;
    if (state.loops.length > 0) {
        for (var i=0;i<state.loops.length;i++){
            var loop = state.loops[i];
            if (i%2===0){
                if (loop[1]===-1){         
                    logError("Found an ENDLOOP, but I'm not in a loop?",loop[0]);
                }
            } else {
                if (loop[1]===1){         
                    logError("Found a STARTLOOP, but I'm already inside a loop? (Puzzlescript can't nest loops, FWIW).",loop[0]);
                }
            }
        }
        var lastloop=state.loops[state.loops.length-1];
        if (lastloop[1]!==-1){
            logError("Yo I found a STARTLOOP without a corresponding ENDLOOP.",lastloop[0]);

        }
        // logError("Have to have matching number of  'startLoop' and 'endLoop' loop points.",state.loops[state.loops.length-1][0]);
    }

    for (var j = 0; j < state.loops.length; j++) {
        var loop = state.loops[j];
        for (var i = 0; i < state.rules.length; i++) {
            var ruleGroup = state.rules[i];

            var firstRule = ruleGroup[0];
            var lastRule = ruleGroup[ruleGroup.length - 1];

            var firstRuleLine = firstRule.lineNumber;
            var lastRuleLine = lastRule.lineNumber;

            if (loop[0] >= firstRuleLine && loop[0] <= lastRuleLine) {
                logWarning("Found a loop point in the middle of a rule. You probably don't want to do this, right?", loop[0]);
            }
            if (outside) {
                if (firstRuleLine >= loop[0]) {
                    target = i;
                    outside = false;
                    break;
                }
            } else {
                if (firstRuleLine >= loop[0]) {
                    source = i - 1;
                    loopPoint[source] = target;
                    outside = true;
                    break;
                }
            }
        }
    }
    if (outside === false) {
        var source = state.rules.length;
        loopPoint[source] = target;
    } else {}
    state.loopPoint = loopPoint;

    loopPoint = {};
    outside = true;
    for (var j = 0; j < state.loops.length; j++) {
        var loop = state.loops[j];
        for (var i = 0; i < state.lateRules.length; i++) {
            var ruleGroup = state.lateRules[i];

            var firstRule = ruleGroup[0];
            var lastRule = ruleGroup[ruleGroup.length - 1];

            var firstRuleLine = firstRule.lineNumber;
            var lastRuleLine = lastRule.lineNumber;

            if (outside) {
                if (firstRuleLine >= loop[0]) {
                    target = i;
                    outside = false;
                    break;
                }
            } else {
                if (firstRuleLine >= loop[0]) {
                    source = i - 1;
                    loopPoint[source] = target;
                    outside = true;
                    break;
                }
            }
        }
    }
    if (outside === false) {
        var source = state.lateRules.length;
        loopPoint[source] = target;
    } else {}
    state.lateLoopPoint = loopPoint;
}

var soundDirectionMasks = {
    'up':           1,
    'down':         2,
    'left':         4,
    'right':        8,
    'horizontal': 0xc,
    'vertical':     3,
    'orthogonal': 0xf,
    '_action_'  :0x10,
    '_lclick_'  :0x20,
    '_rclick_'  :0x40
};

function generateSoundData(state) {
    const sfx_Events = {};
    // doc: lists of sfx event triggers { objectMask:, directionMask:, layer:, seed: }
    const sfx_CreationMasks = [];
    const sfx_DestructionMasks = [];
    const sfx_MovementMasks = state.collisionLayers.map(x => []);     // doc: array of sfx movement triggers, indexed by layer
    const sfx_MovementFailureMasks = [];

    for (const sound of state.sounds) {
        if (sound[0] === "SOUNDEVENT") {
            const event = sound[1];
            const seed = sound[2];
            const line = sound[3];
            if (sfx_Events[event]) 
                logWarning(`${event.toUpperCase()} already declared.`, line);
            sfx_Events[event] = seed;
        } else { // SOUND
            const target = sound[1];
            let verb = sound[2];
            let directions = sound[3];
            const seed = sound[4];
            const line = sound[5];

            if (target in state.aggregatesDict)
                logError('cannot assign sound events to aggregate objects (declared with "and"), only to regular objects, or properties, things defined in terms of "or" ("' + target + '").', line);
            if (!(target in state.objectMasks))
                logError(`Object "${target}" not found.`, line);

            if (soundverbs_directional.includes(verb)) {
                if (directions.length == 0)
                    directions = ['orthogonal'];
            } else if (soundverbs_movement.includes(verb)) {
                directions = [ `_${verb}_` ];
                verb = 'move';
            } else if (directions.length > 0)
                logError('Incorrect sound declaration - cannot have directions (UP/DOWN/etc.) attached to non-directional sound verbs (CREATE is not directional, but MOVE is directional).', line);

            // construct a direction mask
            let directionMask = 0;
            for (const dir of directions) {
                if (!soundDirectionMasks[dir]) 
                    logError(`Was expecting a direction, instead found "${dir}".`, line);
                else 
                    directionMask |= soundDirectionMasks[dir];
            }

            // construct a list of targets, after expanding properties (if any)
            let targets = [target];
            let modified = true;
            while (modified) {
                modified = false;
                for (let k = 0; k < targets.length; k++) {
                    const t = targets[k];
                    if (t in state.synonymsDict) {
                        targets[k] = state.synonymsDict[t];
                        modified = true;
                    } else if (t in state.propertiesDict) {
                        modified = true;
                        const props = state.propertiesDict[t];
                        targets.splice(k, 1);
                        k--;
                        for (let l = 0; l < props.length; l++) {
                            targets.push(props[l]);
                        }
                    }
                }
            }
            
            // create 'mask' entries for runtime sound event checking, one per target object
            // this code originally kept only the masks, but could misfire if object on one mask hit direction on another
            // note: this information required to support animation
            for (let j = 0; j < targets.length; j++) {
                const targetName = targets[j];
                const targetDat = state.objects[targetName];
                const targetLayer = targetDat.layer;
                let shiftedDirectionMask = null;
                // separate masks for each layer
                if (verb === 'move' || verb === 'cantmove') {
                    shiftedDirectionMask = new BitVec(STRIDE_MOV);
                    shiftedDirectionMask.ishiftor(directionMask, MOV_BITS * targetLayer);
                }

                // doc: sfx/afx seed for target object, movement(s) as mask shifted to target layer
                const o = {
                    objId: targetDat.id,
                    directionMask: shiftedDirectionMask,
                    layer:targetLayer,
                    seed: seed
                };
                if (debugSwitch.includes('sfx')) console.log(`Sfx verb ${verb} o: ${JSON.stringify(o)}`);

                if (verb === 'move')
                    sfx_MovementMasks[targetLayer].push(o);
                else if (verb === 'cantmove') 
                    sfx_MovementFailureMasks.push(o);
                else if (verb === 'create') 
                    sfx_CreationMasks.push(o);
                else // (verb === 'destroy') 
                    sfx_DestructionMasks.push(o);
            }
        }
    }

    state.sfx_Events = sfx_Events;
    state.sfx_CreationMasks = sfx_CreationMasks;
    state.sfx_DestructionMasks = sfx_DestructionMasks;
    state.sfx_MovementMasks = sfx_MovementMasks;
    state.sfx_MovementFailureMasks = sfx_MovementFailureMasks;
}


function formatHomePage(state) {
    state.bgcolor = ('background_color' in state.metadata) ? colorToHex(colorPalette, state.metadata.background_color) : '#000000';
    state.fgcolor = ('text_color' in state.metadata) ? colorToHex(colorPalette, state.metadata.text_color) : "#FFFFFF";
    state.author_color = ('author_color' in state.metadata) ? colorToHex(colorPalette, state.metadata.author_color) : "#FFFFFF";
    state.title_color = ('title_color' in state.metadata) ? colorToHex(colorPalette, state.metadata.title_color) : "#FFFFFF";
    state.keyhint_color = ('keyhint_color' in state.metadata) ? colorToHex(colorPalette, state.metadata.keyhint_color) : "#FFFFFF"; // todo:

    if (canSetHTMLColors) {

        if ('background_color' in state.metadata) {
            document.body.style.backgroundColor = state.bgcolor;
        }

        if ('text_color' in state.metadata) {
            const separator = document.getElementById("separator");
            if (separator != null) {
                separator.style.color = state.fgcolor;
            }

            var h1Elements = document.getElementsByTagName("a");
            for (var i = 0; i < h1Elements.length; i++) {
                h1Elements[i].style.color = state.fgcolor;
            }

            var h1Elements = document.getElementsByTagName("h1");
            for (var i = 0; i < h1Elements.length; i++) {
                h1Elements[i].style.color = state.fgcolor;
            }
        }
    }

    if ('homepage' in state.metadata) {
        var url = state.metadata['homepage'];
        url = url.replace("http://", "");
        url = url.replace("https://", "");
        state.metadata['homepage'] = url;
    }
}

// load and compile a new script
function loadFile(str) {
	var processor = new codeMirrorFn();
	var state = processor.startState();

    if (!str || str.trim().length == 0) {
        logErrorNoLine('Empty file! Compilation abandoned!', true);
        return;
    }
	var lines = str.split('\n');
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i];
		state.lineNumber = i + 1;
		var ss = new CodeMirror.StringStream(line, 4);
		do {
			processor.token(ss, state);
		}		
		while (ss.eol() === false);
	}

    if (debugSwitch.includes('tag')) console.log('Tags', state.tags);
    if (debugSwitch.includes('map')) console.log('Mappings', state.mappings);
    if (debugSwitch.includes('layer')) console.log('Collision Layers', state.collisionLayers);
    if (debugSwitch.includes('layer')) console.log('Collision Layer Groups', state.collisionLayerGroups);
    generateExtraMembers(state);
	generateMasks(state);
	levelsToArray(state);
	extractSections(state);
    rulesToArray(state);
    
    if (state.invalid>0){
        return null;
    }

	cacheAllRuleNames(state);

    removeDuplicateRules(state);
    
    if (state.invalid>0){
        return null;
    }

	convertSectionNamesToIndices(state);
    
	rulesToMask(state);

	
	if (debugMode) {
		printRules(state);
	}

	arrangeRulesByGroupNumber(state);
	collapseRules(state.rules);
	collapseRules(state.lateRules);

    generateRigidGroupList(state);

	processWinConditions(state);
	checkObjectsAreLayered(state);

	twiddleMetaData(state);
	
	generateExtraMembersPart2(state);

	generateLoopPoints(state);

    fixUpGosubs(state);  //

    generateSoundData(state);

    formatHomePage(state);

    //delete intermediate representations
	delete state.commentLevel;
    delete state.commentStyle;
    delete state.line_should_end;
    delete state.line_should_end_because;
    delete state.sol_after_comment;
	delete state.names;
	delete state.abbrevNames;
	delete state.objects_candname;
	delete state.objects_section;
	delete state.objects_spritematrix;
	delete state.section;
	delete state.subsection;
	delete state.tokenIndex;
    delete state.current_line_wip_array;
	delete state.visitedSections;
	delete state.loops;
	return state;
}

var ifrm;

// compile a script for editor or testing, run inputs and return state if valid
function compile(command, text, randomseed) {
    matchCache = {};
    forceRegenImages = true;
    if (command === undefined) {
        command = ["restart"];
    }
    if (randomseed === undefined) {
        randomseed = null;
    }
    lastDownTarget = canvas;

    if (text === undefined) {
        var code = window.form1.code;

        var editor = code.editorreference;

        text = editor.getValue() + "\n";
    }
    if (canDump === true) {
        compiledText = text;
    }

    errorCount = 0;
    compiling = true;
    errorStrings = [];
    consolePrint('=================================');
    // todo: temporary console output to help with debugging
    try {
        console.log(`Begin compile: '${text.split('\n')[0]}'`);
        var state = loadFile(text);
    } catch(error) {
        consolePrint(error);
        console.error(`Compile error: ${error}`);
        console.error(`${error.stack}`);
        errorStrings.push(error);
        //errorCount++;
    } finally {
        compiling = false;
    }

    if (!state || state.invalid) {
        console.log(`End compile: aborted with error ${errorStrings[errorStrings.length - 1]}`);
        consoleError(`<span class="systemMessage">Compilation aborted. ${errorStrings[errorStrings.length - 1]}</span>`);
        return null;
    }

    console.log(`End compile: ${state && !state.invalid && errorCount == 0 ? "ok" : "FAILED, error count = " + errorCount}`);

    if (state.levels && state.levels.length === 0) {
        logError('No levels found. Add some levels!', undefined, true);
    }

    if (errorCount > 0) {
        // if (IDE===false){
        //     consoleError('<span class="systemMessage">Errors detected during compilation; the game may not work correctly.  If this is an older game, and you think it just broke because of recent changes in the puzzlescript plus engine, consider letting me know via the issue tracker.</span>');
        // } else{
            consoleError('<span class="systemMessage">Errors detected during compilation; the game may not work correctly.</span>');
        // }
    } else {
        var ruleCount = 0;
        for (var i = 0; i < state.rules.length; i++) {
            ruleCount += state.rules[i].length;
        }
        for (var i = 0; i < state.lateRules.length; i++) {
            ruleCount += state.lateRules[i].length;
        }
        consolePrint(htmlClass('systemMessage', `Successful ${command[0] == "restart" ? "compilation" : "live recompilation"}, generated ${ruleCount} instructions.`));
                
        if (debugMode) {
            consolePrint(htmlClass('systemMessage', `Tags: ${Object.keys(state.tags).length} Objects: ${state.objectCount} Layers: ${state.collisionLayers.length} Sounds: ${state.sounds.length} Levels: ${state.levels.length}.`));
        }
        
        if (IDE){
            if (state.metadata.title!==undefined) {
                document.title=`${state.metadata.title} - PuzzleScript Next`;
            }
        }
    }

    if (IDE) {
        if (state.metadata.tween_length !== undefined && state.lateRules.length >= 1) {
            logWarning("Using tweens in a game that also has LATE rules is currently experimental! If you change objects that moved with LATE then tweens might not play!", undefined, true);
            logWarning("Note that if you change objects that have moved in LATE rules, their tweens won't play!", undefined, true);
        }

        if(state.metadata.level_select_unlocked_ahead !== undefined && state.metadata.level_select_unlocked_rollover !== undefined) {
            logWarning("You can't use both level_select_unlocked_ahead and level_select_unlocked_rollover at the same time, so please choose only one!", undefined, true);
        }

        if(state.metadata.level_select === undefined && (state.metadata.level_select_lock !== undefined || state.metadata.level_select_unlocked_ahead !== undefined || state.metadata.level_select_unlocked_rollover !== undefined || state.metadata.continue_is_level_select !== undefined || state.metadata.level_select_solve_symbol !== undefined)) {
            logWarning("You're using level select prelude flags, but didn't define the 'level_select' flag.", undefined, true);
        }

        if(state.metadata.level_select_lock === undefined && (state.metadata.level_select_unlocked_ahead !== undefined || state.metadata.level_select_unlocked_rollover !== undefined)) {
            logWarning("You've defined a level unlock condition, but didn't define the 'level_select_lock' flag.", undefined, true);
        }

        if(state.metadata.runtime_metadata_twiddling_debug !== undefined) {
            logWarning("RUNTIME_METADATA_TWIDDLING_DEBUG is deprecated, however you can now use verbose logging instead to see when metadata is changed.", undefined, true);
        }

        if(state.metadata.level_select !== undefined && state.sections.length == 0) {
            logWarning("To use LEVEL_SELECT, you need to create some sections first, otherwise the level list will be empty! Please see the docs for more info.", undefined, true);
        }
        if (isSitelocked()) {
            logError("The game is sitelocked. To continue testing, add the current domain '"+window.location.origin+ "' to the list.", undefined, true);
        }
    }

    if (state) { //otherwise error
        setGameState(state, command, randomseed);
        clearInputHistory();
    }
    consoleCacheDump();

    return state;

}



function qualifyURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.href;
}

function isSitelocked() {
    if (state.metadata.sitelock_origin_whitelist === undefined && state.metadata.sitelock_hostname_whitelist === undefined) {
        return false;
    }

    if (IDE == true) {
        return false; //Don't sitelock in editor
    }

    if (state.metadata.sitelock_origin_whitelist === undefined) {
        var origins = state.metadata.sitelock_origin_whitelist.split(" ");

        var origin = window.location.origin;

        for (var i = 0; i < origins.length; i += 1) {
            if (origin == origins[i]) {
                return false;
            }
        }
    }

    if (state.metadata.sitelock_hostname_whitelist == undefined) {
        var hostnames = state.metadata.sitelock_hostname_whitelist.split(" ");

        var hostname = window.location.hostname;

        for (var i = 0; i < hostnames.length; i += 1) {
            if (hostname == hostnames[i]) {
                return false;
            }
        }
    }

    return true;
}
