var PV = window.PV || {};

PV.getSunAltitude = function(date, observer) {
    var equ = Astronomy.Equator('Sun', date, observer, true, true);
    var hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
    return hor.altitude;
};

PV.classifySkyCondition = function(sunAltitude) {
    if (sunAltitude < PV.SUN_THRESHOLDS.night) return 'night';
    if (sunAltitude < PV.SUN_THRESHOLDS.astroTwilight) return 'astroTwilight';
    if (sunAltitude < PV.SUN_THRESHOLDS.nautTwilight) return 'nautTwilight';
    if (sunAltitude < PV.SUN_THRESHOLDS.civilTwilight) return 'civilTwilight';
    return 'day';
};

PV.getPlanetPosition = function(body, date, observer) {
    var equ = Astronomy.Equator(body, date, observer, true, true);
    var hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
    var illum = Astronomy.Illumination(body, date);
    var angSep = Astronomy.AngleFromSun(body, date);
    return {
        altitude: hor.altitude,
        azimuth: hor.azimuth,
        magnitude: illum.mag,
        angularSepFromSun: angSep
    };
};

PV.isPlanetVisible = function(position, skyCondition, body, weatherAtTime) {
    // Must be above minimum altitude
    if (position.altitude < PV.MIN_ALTITUDE) {
        return { visible: false, reason: 'Below horizon' };
    }

    var weatherPenalty = (weatherAtTime && weatherAtTime.magnitudePenalty) ? weatherAtTime.magnitudePenalty : 0;
    var weatherDesc = weatherAtTime ? weatherAtTime.description : null;

    // Daytime: only special-cased planets
    if (skyCondition === 'day') {
        var rule = PV.DAYTIME_RULES[body];
        if (!rule) {
            return { visible: false, reason: 'Sun is up' };
        }
        if (weatherPenalty >= 5.0) {
            return { visible: false, reason: 'Overcast' };
        }
        if (position.magnitude > rule.maxMagnitude) {
            return { visible: false, reason: 'Too faint during daytime' };
        }
        if (position.angularSepFromSun < rule.minSunSeparation) {
            return { visible: false, reason: 'Too close to the Sun (' + Math.round(position.angularSepFromSun) + '\u00b0)' };
        }
        return { visible: true, reason: 'Visible in daylight' };
    }

    // Twilight and night: check magnitude against sky condition limit
    var magLimit = PV.MAGNITUDE_LIMITS[skyCondition] - weatherPenalty;
    if (position.magnitude > magLimit) {
        if (weatherPenalty > 0 && position.magnitude <= PV.MAGNITUDE_LIMITS[skyCondition]) {
            return { visible: false, reason: 'Too faint \u2014 ' + (weatherDesc || 'poor weather').toLowerCase() };
        }
        return { visible: false, reason: 'Too faint in ' + PV.skyConditionLabel(skyCondition) };
    }

    return { visible: true, reason: 'Visible' };
};

PV.skyConditionLabel = function(condition) {
    var labels = {
        night: 'night sky',
        astroTwilight: 'astronomical twilight',
        nautTwilight: 'nautical twilight',
        civilTwilight: 'civil twilight',
        day: 'daylight'
    };
    return labels[condition] || condition;
};

PV.generateSamples = function(start, end) {
    var rangeMs = end.getTime() - start.getTime();
    // Adaptive interval: use 5-min for ranges under 2 hours
    var interval = rangeMs < 2 * 60 * 60 * 1000
        ? 5 * 60 * 1000
        : PV.SAMPLE_INTERVAL_MS;
    var times = [];
    var t = start.getTime();
    while (t <= end.getTime()) {
        times.push(new Date(t));
        t += interval;
    }
    // Ensure we always have the end point
    if (times[times.length - 1].getTime() < end.getTime()) {
        times.push(new Date(end.getTime()));
    }
    return times;
};

PV.computeSunData = function(sampleTimes, observer) {
    return sampleTimes.map(function(time) {
        var alt = PV.getSunAltitude(time, observer);
        return {
            time: time,
            sunAltitude: alt,
            skyCondition: PV.classifySkyCondition(alt)
        };
    });
};

PV.computeVisibility = function(planet, observer, sampleTimes, sunData, weatherData) {
    var samples = [];
    for (var i = 0; i < sampleTimes.length; i++) {
        var time = sampleTimes[i];
        var sky = sunData[i];
        var pos = PV.getPlanetPosition(planet.body, time, observer);
        var weather = weatherData ? PV.Weather.getAtTime(weatherData, time) : null;
        var vis = PV.isPlanetVisible(pos, sky.skyCondition, planet.body, weather);
        samples.push({
            time: time,
            altitude: pos.altitude,
            azimuth: pos.azimuth,
            magnitude: pos.magnitude,
            angularSepFromSun: pos.angularSepFromSun,
            skyCondition: sky.skyCondition,
            visible: vis.visible,
            reason: vis.reason,
            weather: weather
        });
    }

    // Extract contiguous visibility windows
    var windows = [];
    var current = null;
    for (var i = 0; i < samples.length; i++) {
        if (samples[i].visible) {
            if (!current) {
                current = { start: samples[i].time, end: samples[i].time, samples: [samples[i]] };
            } else {
                current.end = samples[i].time;
                current.samples.push(samples[i]);
            }
        } else {
            if (current) {
                windows.push(current);
                current = null;
            }
        }
    }
    if (current) windows.push(current);

    // Find best viewing time (highest altitude within any visibility window)
    var best = null;
    for (var w = 0; w < windows.length; w++) {
        for (var s = 0; s < windows[w].samples.length; s++) {
            var sample = windows[w].samples[s];
            if (!best || sample.altitude > best.altitude) {
                best = sample;
            }
        }
    }

    return {
        planet: planet,
        isVisible: windows.length > 0,
        windows: windows,
        bestTime: best ? best.time : null,
        bestAltitude: best ? best.altitude : null,
        bestAzimuth: best ? best.azimuth : null,
        bestMagnitude: best ? best.magnitude : null,
        allSamples: samples
    };
};

PV.computeAllPlanets = function(observer, start, end, weatherData) {
    var sampleTimes = PV.generateSamples(start, end);
    var sunData = PV.computeSunData(sampleTimes, observer);

    var results = [];
    for (var i = 0; i < PV.PLANETS.length; i++) {
        results.push(PV.computeVisibility(PV.PLANETS[i], observer, sampleTimes, sunData, weatherData));
    }

    return { planets: results, sunData: sunData, sampleTimes: sampleTimes };
};
