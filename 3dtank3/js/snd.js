// setup
var numOfChannels = 6;
var audiochannels = [];
for (a=0;a<numOfChannels ;a++) {
	audiochannels[a] = new Array();
	if (Audio != undefined) {
		audiochannels[a]["channel"] = new Audio();
	}
	audiochannels[a]["finished"] = -1;
}


function playStaticSound (id, vol) {
	if (!soundOn || Audio == undefined) {
		return;
	}
	var volume = 1;
	if (vol != undefined) {
		volume = vol;
	}

	for (a=0;a<numOfChannels;a++) {
		thistime = new Date();
		if (audiochannels[a]["finished"] < thistime.getTime()) {   // is this channel finished?
			audiochannels[a]["finished"] = thistime.getTime() + id.duration*1000;
			audiochannels[a]["channel"].src = id.src;
			audiochannels[a]["channel"].load();
			audiochannels[a]["channel"].volume = volume;
			audiochannels[a]["channel"].play();
			break;
		}
	}
}

if (Audio != undefined) {
	// sounds
	var starSound = new Audio("star.ogg");

}