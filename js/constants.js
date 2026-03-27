var PV = window.PV || {};

PV.PLANETS = [
    { name: 'Mercury', body: 'Mercury', color: '#b0b0b0' },
    { name: 'Venus',   body: 'Venus',   color: '#ffe4b5' },
    { name: 'Mars',    body: 'Mars',     color: '#e05040' },
    { name: 'Jupiter', body: 'Jupiter',  color: '#e0a040' },
    { name: 'Saturn',  body: 'Saturn',   color: '#c9b07a' },
    { name: 'Uranus',  body: 'Uranus',   color: '#7de3e3' },
    { name: 'Neptune', body: 'Neptune',  color: '#4169e1' }
];

// Sun altitude thresholds (degrees) for sky condition classification
PV.SUN_THRESHOLDS = {
    night: -18,
    astroTwilight: -12,
    nautTwilight: -6,
    civilTwilight: 0
};

// Minimum planet altitude above horizon to count as visible (degrees)
PV.MIN_ALTITUDE = 5;

// Default sampling interval (15 minutes)
PV.SAMPLE_INTERVAL_MS = 15 * 60 * 1000;

// Naked-eye magnitude limits by sky condition
// Lower number = brighter required; higher = fainter objects visible
PV.MAGNITUDE_LIMITS = {
    night:          6.0,
    astroTwilight:  5.0,
    nautTwilight:   4.0,
    civilTwilight:  2.0,
    day:           -3.5
};

// Special daytime visibility rules for inner/bright planets
PV.DAYTIME_RULES = {
    Venus:   { maxMagnitude: -3.5, minSunSeparation: 20 },
    Jupiter: { maxMagnitude: -1.5, minSunSeparation: 15 }
};

// Maximum allowed time range (7 days in ms)
PV.MAX_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

// Weather: cloud cover magnitude penalty thresholds
PV.CLOUD_COVER_THRESHOLDS = [
    { max: 20,  penalty: 0 },
    { max: 50,  penalty: 1.0 },
    { max: 80,  penalty: 2.5 },
    { max: 100, penalty: 5.0 }
];

// Weather: low atmospheric visibility (haze) penalty
PV.HAZE_VISIBILITY_THRESHOLD = 10000; // meters
PV.HAZE_MAX_PENALTY = 1.0;
