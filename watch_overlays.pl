#!/usr/bin/perl -w

while (1) {
	if (-e "../downloads/Overlays.js") {
		print("Moving Overlays.js\n");
		rename("game/Overlays.js", "game/Overlays.js.old");
		rename("../downloads/Overlays.js", "game/Overlays.js");
		system("./build.py");
	}
	sleep(1);
}
