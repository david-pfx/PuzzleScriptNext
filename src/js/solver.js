var abortSolver = false;
var solving = false;

const timeout = ms => new Promise(res => setTimeout(res, ms))

function byScoreAndLength(a, b) {
	if(a[0] != b[0]) {
		return a[0] < b[0];
	} else {
		return a[2].length < b[2].length;
	}
}

var distanceTable;

async function solve() {
	if(levelEditorOpened) return;
	if(solving) return;
	if(textMode || state.levels.length === 0) return;
	var was_verbose_logging = false;
	if (verbose_logging) {
		verbose_logging = false;
		cache_console_messages = false;
		was_verbose_logging = true;
		consolePrint("Disabling verbose logging to speed up solver")
	}
	precalcDistances();
	abortSolver = false;
	muted = true;
	solving = true;
	restartTarget = backupLevel();
	hasUsedCheckpoint = false;
	backups = [];
	var oldDT = deltatime;
	deltatime = 0;
	var actions = [0, 1, 2, 3, 4];
	if('noaction' in state.metadata) {
		actions = [0, 1, 2, 3];
	}
	var act2str = "uldrx";
	var exploredStates = {};
	exploredStates[curLevel.objects] = true;
	var queue = new FastPriorityQueue(byScoreAndLength);
	queue.add([0, curLevel.objects.slice(0), ""]);
	consolePrint("searching...");
	var solvingProgress = document.getElementById("solvingProgress");
	var cancelLink = document.getElementById("cancelClickLink");
	cancelLink.hidden = false;
	// console.log("searching...");
	var iters = 0;
	var size = 1;
	var discovered = 1;

	while(!queue.isEmpty()) {
		if(abortSolver) {
			consolePrint("solver aborted");
			cancelLink.hidden = true;

			verbose_logging = was_verbose_logging;
			cache_console_messages = was_verbose_logging;

			break;
		}
		iters++;
		if(iters > 250) {
			iters = 0;
			// consolePrint("searched: " + size + " queue: " + discovered);
			// console.log(discovered, size);
			solvingProgress.innerHTML = "searched: " + size;
			redraw();
			await timeout(1);
		}
		var temp = queue.poll();
		var parentState = temp[1];
		var ms = temp[2];
		discovered--;
		shuffleALittle(actions);
		for(var i = 0, len = actions.length; i < len; i++) {
			for(var k = 0, len2 = parentState.length; k < len2; k++) {
				curLevel.objects[k] = parentState[k];
			}
			var changedSomething = processInput(actions[i]);
			while(againing) {
				changedSomething = processInput(-1) || changedSomething;
			}
			
			if(changedSomething) {
				if(curLevel.objects in exploredStates) {
					continue;
				}
				var nms = ms + act2str[actions[i]];
				if(winning || hasUsedCheckpoint) {
					hasUsedCheckpoint = false;
					var chunks = "(" + chunkString(nms, 5).join(" ") + ")";

					verbose_logging = true;
					cache_console_messages = true;

					consolePrint("solution found: (" + nms.length + " steps, " + size + " positions explored)");
					consolePrint(chunks);
					console.log("solution found:\n" + chunks);


					var step_limit = 200;
					if (nms.length >= step_limit) {
						consolePrint("More than "+step_limit + " steps needed to solve puzzle, not printing individual states");
					} else {

						winning = false;
						verbose_logging = false;
						//Reload starting state
						DoRestart();

						addToDebugTimeline(curLevel, 0);

						for(var i = 0; i != nms.length; i++) {

							var char = nms[i];

							var action = -1;

							for (j=0; j != act2str.length; j++) {
								if (char == act2str[j]) {
									action = j; break;
								}
							}

							verbose_logging = false;

							var again_turns = 0;
							processInput(action);
							while(againing) {
								processInput(-1);
								again_turns++;
							}
							verbose_logging = true;

							var turn_id = addToDebugTimeline(curLevel, i+2);

							var txt = "Turn "+(i+1)+", input "+char;
							if (again_turns >= 1) {
								txt += " (again turns: "+again_turns+")";
							}
							consolePrint(txt, false, null, turn_id);
						}
					}			

					solvingProgress.innerHTML = "";
					deltatime = oldDT;
					DoRestart();

					cache_console_messages = was_verbose_logging;
					verbose_logging = was_verbose_logging;

					solving = false;
					muted = false;
					winning = false;
					playSound(13219900);

					redraw();
					cancelLink.hidden = true;
					return;
				}
				exploredStates[curLevel.objects] = true;
				size++;
				queue.add([getScore(), curLevel.objects.slice(0), nms]);
				discovered++;
			}
		}
	}
	muted = false;
	solving = false;
	DoRestart();
	consolePrint("no solution found (" + size + " positions explored)");
	console.log("no solution found");

	verbose_logging = was_verbose_logging;
	cache_console_messages = was_verbose_logging;

	solvingProgress.innerHTML = "";
	deltatime = oldDT;
	playSound(52291704);
	redraw();
	cancelLink.hidden = true;
}

function stopSolving() {
	abortSolver = true;
}

function chunkString(str, length) {
	return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

function shuffleALittle(array) {
	randomIndex = 1 + Math.floor(Math.random() * (array.length - 1));
	temporaryValue = array[0];
	array[0] = array[randomIndex];
	array[randomIndex] = temporaryValue;
}

function distance(index1, index2) {
	return Math.abs(Math.floor(index1 / curLevel.height) - Math.floor(index2 / curLevel.height)) + Math.abs( (index1 % curLevel.height) - (index2 % curLevel.height) );
}

function precalcDistances() {
	distanceTable = [];
	for(var i = 0; i < curLevel.n_tiles; i++) {
		ds = [];
		for(var j = 0; j < curLevel.n_tiles; j++) {
			ds.push(distance(i, j));
		}
		distanceTable.push(ds);
	}
}

function getScore() {
	var score = 0.0;
	var maxDistance = curLevel.width + curLevel.height;
	if(state.winconditions.length > 0)  {
		for(var wcIndex=0;wcIndex<state.winconditions.length;wcIndex++) {
			var wincondition = state.winconditions[wcIndex];
			var filter1 = wincondition[1];
			var filter2 = wincondition[2];
			if(wincondition[0] == -1) {
				// "no" conditions
				for(var i = 0; i < curLevel.n_tiles; i++) {
					var cell = curLevel.getCellInto(i,_o10);
					if( ( !filter1.bitsClearInArray(cell.data) ) && ( !filter2.bitsClearInArray(cell.data) ) ) {
						score += 1.0; // penalization for each case
					}
				}
			} else {
				// "some" or "all" conditions
				for(var i = 0; i < curLevel.n_tiles; i++) {
					if(!filter1.bitsClearInArray(curLevel.getCellInto(i, _o10).data)) {
						var minDistance = maxDistance;
						for (var j = 0; j < curLevel.n_tiles; j++) {
							if(!filter2.bitsClearInArray(curLevel.getCellInto(j, _o10).data)) {
								var dist = distanceTable[i][j];
								if(dist < minDistance) {
									minDistance = dist;
								}
							}
						}
						score += minDistance;
					}
				}
			}
		}
	}
	// console.log(score);
	return score;
}

