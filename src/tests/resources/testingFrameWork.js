// global
let strippedErrorStrings = '';

// perform a single run test
function runTest(dataarray) {
	unitTesting=true;
	levelString=dataarray[0];
	errorStrings = [];
	errorCount=0;

	for (var i=0;i<errorStrings.length;i++) {
		var s = errorStrings[i];
		throw s;
	}

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
	strippedErrorStrings = errorStrings.map(stripHTMLTags);

	var success=true;
	if (levelString !== dataarray[2]) {
		success=false;
		QUnit.assert.equal(levelString, dataarray[2], "Resulting level state is not the expected one.");
	}

	if (audio_output!==null){
		//check if soundHistory array is same as audio_output
		var audio_recorded = soundHistory.join(";");
		var audio_expected = audio_output.join(";");
		if (audio_recorded != audio_expected) {
			success = false;
			QUnit.assert.equal(audio_recorded, audio_expected, "Audio output is not as expected");
		}
	}

	// if the test succeeds ignore compile errors
	if (!success && errorCount != 0) {
		success=false;
		QUnit.assert.equal(strippedErrorStrings, '', "Unexpected errors during output testing");
	}
	return success;
}


// perform a single compiler test
function runCompilationTest(dataarray) {
	unitTesting=true;
	levelString=dataarray[0];
	var recordedErrorStrings=dataarray[1];
	var recordedErrorCount=dataarray[2];
	errorStrings = [];
	errorCount=0;

	try{
		//compile(["rebuild"],levelString);
		compile(["restart"],levelString);
	} catch (error){
		console.log(error);
	}

	success = true;
	strippedErrorStrings = errorStrings.map(stripHTMLTags);
	if (errorCount!==recordedErrorCount){
		QUnit.assert.equal(errorCount,recordedErrorCount, `Error count not as expected`);
		success = false;
	}

	var simulated_summary = processErrors(strippedErrorStrings);
	var recorded_summary = processErrors(recordedErrorStrings);
	if (simulated_summary != recorded_summary) {
		QUnit.assert.equal(simulated_summary, recorded_summary, "Error strings not as expected")
		return false;
	}
	return success;
}

function processErrors(errors) {
	return errors.map(e => e.replace(/\s+/g, ' ')).join("\n");
}