let CONFIG = {
	delay: 250, // The maximum amount of time between two inputs
	0: { // input:<id>
		directMode: false, // If the direct mode function is enabled (optional, defaults to false)
		directModeId: 0, // The id of the switch this input controls (optional, defaults to input id)
		directModeCount: 1, // The amount of times the input should be toggled to trigger direct mode (optional, defaults to 1)
		maxToggleAmount: 2, // The maximum amount of times the input can be toggled (optional, defaults to 16)
	}
};

let STORAGE = [];

function emitEvent(id) {
	let count = STORAGE[id].count;

	// Reset storage
	STORAGE[id].timer = undefined;
	STORAGE[id].count = 0;

	print("Got toggle amount ", count, " for ", id);

	// Send event
	Shelly.emitEvent(
		"input_toggle",
		{ id: id, count: count }
	);

	// Check config about other actions
	if (CONFIG[id] == undefined)
		return;

	if (CONFIG[id].directMode && (CONFIG[id].directModeCount ?? 1) == count) {
		Shelly.call(
			"Switch.Toggle",
			{ id: CONFIG[id].directModeId ?? id }
		)
	}
}

function eventHandler(event, userdata) {
	if (event == undefined || typeof event.component !== "string")
		return;

	let component = event.component.substring(0, 5); // String.startsWith is not supported
	if (component === "input") {
		let id = Number(event.component.substring(6)); // input:<id>
		if (id === Number.NaN)
			return;

		// Create the storage if not created
		if (STORAGE[id] === undefined) {
			STORAGE[id] = {
				timer: undefined,
				count: 0
			};
		}

		// Increase count and restart timer
		Timer.clear(STORAGE[id].timer);
		STORAGE[id].count += 1;

		// Check if the toggle limit has been reached
		if (
			CONFIG[id] != undefined &&
			(CONFIG[id].maxToggleAmount ?? 16) <= STORAGE[id].count
		) {
			emitEvent(id);
		} else {
			STORAGE[id].timer = Timer.set(
				CONFIG.delay,
				false,
				emitEvent,
				id
			);
		}
	}
}

Shelly.addEventHandler(eventHandler);