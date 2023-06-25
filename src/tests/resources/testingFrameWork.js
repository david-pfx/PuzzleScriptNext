// perform a single run test
function runTest(dataarray) {
	unitTesting=true;
	levelString=dataarray[0];
	errorStrings = [];
	errorCount=0;

	// Why???
	// for (var i=0;i<errorStrings.length;i++) {
	// 	var s = errorStrings[i];
	// 	throw s;
	// }

	var inputDat = dataarray[1];
	var targetlevel = dataarray[3];
	
	var randomseed = dataarray[4]!==undefined ? dataarray[4] : null;

	var audio_output = dataarray[5]!==undefined ? dataarray[5] : null;

	if (targetlevel===undefined) {
		targetlevel=0;
	}
	if (!compile(["loadLevel",targetlevel],levelString,randomseed))
		return null;		// there is only grief if we continue.

	while (againing) {
		againing=false;
		processInput(-1);			
	}
	
	for(var i=0;i<inputDat.length;i++) {
		var val=inputDat[i];
		if (val==="undo") {
			DoUndo(false,true);
		} else if (val==="restart") {
			DoRestart();
		} else if (val==="tick") {
			processInput(-1);
		} else {
			processInput(val);
		}
		while (againing) {
			againing=false;
			processInput(-1);			
		}
	}

	unitTesting=false;
	var levelString = convertLevelToString();
	const strippedErrorStrings = errorStrings.map(stripHTMLTags);

	const levelOk = levelString === dataarray[2];
	QUnit.assert.true(levelOk, `Final level state is the expected one.`);

	const audioOk = !audio_output || soundHistory.join(";") == audio_output.join(";");
	const audioJoin = !audio_output ? '' : audio_output.join(';');
	QUnit.assert.true(audioOk, `Audio output as expected.`);

	// todo: option to suppress this
	const errorsOk = errorCount == 0;
	QUnit.assert.true(errorsOk, `No errors during testing.`);
	return levelOk && audioOk && errorsOk;
}


// perform a single compiler test
function runCompilationTest(dataarray) {
	unitTesting=true;
	const [ levelString, recordedErrorStrings, recordedErrorCount ] = dataarray;
	errorStrings = [];
	errorCount=0;

	try{
		compile(["restart"],levelString);
	} catch (error){
		console.log(error);
	}

	const strippedErrorStrings = errorStrings.map(stripHTMLTags);
	const simulated_summary = processErrors(strippedErrorStrings);
	const recorded_summary = processErrors(recordedErrorStrings);
	const errorsOk = simulated_summary == recorded_summary;
    QUnit.assert.true(errorsOk, `Error strings as expected.`)
	return errorsOk;
}

function processErrors(errors) {
	return errors.map(e => e.replace(/\s+/g, ' ')).join("\n");
}