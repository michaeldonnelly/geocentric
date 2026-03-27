var PV = window.PV || {};
PV.UI = {};

PV.UI.formatTime = function(date) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

PV.UI.formatDate = function(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

PV.UI.formatDateTime = function(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

PV.UI.formatAltitude = function(deg) {
    return Math.round(deg) + '\u00b0 above horizon';
};

PV.UI.formatAzimuth = function(deg) {
    var directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                      'S','SSW','SW','WSW','W','WNW','NW','NNW'];
    var idx = Math.round(deg / 22.5) % 16;
    return directions[idx] + ' (' + Math.round(deg) + '\u00b0)';
};

PV.UI.formatMagnitude = function(mag) {
    var desc;
    if (mag < -4) desc = 'brilliant';
    else if (mag < -2) desc = 'very bright';
    else if (mag < 0) desc = 'bright';
    else if (mag < 2) desc = 'moderate';
    else if (mag < 4) desc = 'faint';
    else desc = 'very faint';
    return 'mag ' + mag.toFixed(1) + ' (' + desc + ')';
};

PV.UI.skyConditionColor = function(condition) {
    var colors = {
        night: '#0d1117',
        astroTwilight: '#1a2332',
        nautTwilight: '#2a3a52',
        civilTwilight: '#4a6080',
        day: '#87CEEB'
    };
    return colors[condition] || '#0d1117';
};

PV.UI.renderSunTimeline = function(sunData, container) {
    container.innerHTML = '';
    if (!sunData || sunData.length === 0) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'sun-timeline-wrapper';

    var label = document.createElement('div');
    label.className = 'sun-timeline-label';
    label.textContent = 'Sky Conditions';
    wrapper.appendChild(label);

    var bar = document.createElement('div');
    bar.className = 'sun-timeline-bar';

    // Group consecutive samples with same sky condition
    var segments = [];
    var current = { condition: sunData[0].skyCondition, start: 0, end: 0 };
    for (var i = 1; i < sunData.length; i++) {
        if (sunData[i].skyCondition === current.condition) {
            current.end = i;
        } else {
            segments.push(current);
            current = { condition: sunData[i].skyCondition, start: i, end: i };
        }
    }
    segments.push(current);

    var total = sunData.length - 1;
    for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        var widthPct = ((seg.end - seg.start + (s === segments.length - 1 ? 0 : 1)) / total * 100);
        var div = document.createElement('div');
        div.className = 'sun-timeline-segment';
        div.style.width = widthPct + '%';
        div.style.backgroundColor = PV.UI.skyConditionColor(seg.condition);
        div.title = PV.skyConditionLabel(seg.condition) + '\n' +
                    PV.UI.formatTime(sunData[seg.start].time) + ' \u2013 ' +
                    PV.UI.formatTime(sunData[seg.end].time);
        bar.appendChild(div);
    }

    wrapper.appendChild(bar);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'sun-timeline-legend';
    var conditions = ['night', 'astroTwilight', 'nautTwilight', 'civilTwilight', 'day'];
    var labels = ['Night', 'Astro Twilight', 'Nautical Twilight', 'Civil Twilight', 'Day'];
    for (var i = 0; i < conditions.length; i++) {
        var item = document.createElement('span');
        item.className = 'legend-item';
        var swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.backgroundColor = PV.UI.skyConditionColor(conditions[i]);
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(labels[i]));
        legend.appendChild(item);
    }
    wrapper.appendChild(legend);

    // Time markers
    var markers = document.createElement('div');
    markers.className = 'sun-timeline-markers';
    var startMark = document.createElement('span');
    startMark.textContent = PV.UI.formatTime(sunData[0].time);
    var endMark = document.createElement('span');
    endMark.textContent = PV.UI.formatTime(sunData[sunData.length - 1].time);
    markers.appendChild(startMark);
    markers.appendChild(endMark);
    wrapper.appendChild(markers);

    container.appendChild(wrapper);
};

PV.UI.renderSparkline = function(canvas, samples, color) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width = canvas.offsetWidth * 2;
    var h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    var dw = canvas.offsetWidth;
    var dh = canvas.offsetHeight;

    var bottomMargin = 12; // space for time labels
    var leftMargin = 12;  // space for altitude label
    var chartH = dh - bottomMargin;

    ctx.clearRect(0, 0, dw, dh);

    // Rotated "altitude" label on the left
    ctx.save();
    ctx.font = '7px -apple-system, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(5, chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('altitude', 0, 0);
    ctx.restore();

    // Find altitude range
    var maxAlt = -90, minAlt = 90;
    for (var i = 0; i < samples.length; i++) {
        if (samples[i].altitude > maxAlt) maxAlt = samples[i].altitude;
        if (samples[i].altitude < minAlt) minAlt = samples[i].altitude;
    }
    // Ensure we always show the horizon line
    if (minAlt > -5) minAlt = -5;
    if (maxAlt < 10) maxAlt = 10;
    var range = maxAlt - minAlt;

    function toY(alt) {
        return chartH - ((alt - minAlt) / range) * chartH;
    }
    var chartW = dw - leftMargin;
    function toX(idx) {
        return leftMargin + (idx / (samples.length - 1)) * chartW;
    }

    // Horizon line
    var horizonY = toY(0);
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(leftMargin, horizonY);
    ctx.lineTo(dw, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizon label
    ctx.font = '8px -apple-system, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText('horizon', leftMargin + 2, horizonY - 2);

    // Min altitude line
    var minAltY = toY(PV.MIN_ALTITUDE);
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(leftMargin, minAltY);
    ctx.lineTo(dw, minAltY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Altitude curve - visible portions highlighted
    ctx.lineWidth = 2;
    for (var i = 1; i < samples.length; i++) {
        ctx.strokeStyle = samples[i].visible ? color : '#30363d';
        ctx.beginPath();
        ctx.moveTo(toX(i - 1), toY(samples[i - 1].altitude));
        ctx.lineTo(toX(i), toY(samples[i].altitude));
        ctx.stroke();
    }

    // Fill visible regions
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    for (var i = 0; i < samples.length; i++) {
        if (samples[i].visible) {
            var x = toX(i);
            var y = toY(samples[i].altitude);
            var barWidth = dw / samples.length;
            ctx.fillRect(x - barWidth / 2, y, barWidth, horizonY - y);
        }
    }
    ctx.globalAlpha = 1.0;

    // Time labels along the bottom
    ctx.font = '8px -apple-system, sans-serif';
    ctx.fillStyle = '#484f58';
    ctx.textBaseline = 'top';
    var labelY = chartH + 2;
    var firstTime = samples[0].time.getTime();
    var lastTime = samples[samples.length - 1].time.getTime();
    var totalMs = lastTime - firstTime;

    // Find nice hour boundaries within the sample range
    var t = new Date(samples[0].time);
    t.setMinutes(0, 0, 0);
    t.setHours(t.getHours() + 1); // start at next whole hour
    var labels = [];
    while (t.getTime() <= lastTime) {
        var frac = (t.getTime() - firstTime) / totalMs;
        if (frac >= 0.05 && frac <= 0.95) {
            var hr = t.getHours();
            var ampm = hr >= 12 ? 'p' : 'a';
            var hr12 = hr % 12 || 12;
            labels.push({ x: leftMargin + frac * chartW, text: hr12 + ampm });
        }
        t.setHours(t.getHours() + 1);
    }

    // Skip labels that are too close together
    var minGap = 28;
    var drawn = [];
    for (var i = 0; i < labels.length; i++) {
        var tooClose = false;
        for (var j = 0; j < drawn.length; j++) {
            if (Math.abs(labels[i].x - drawn[j]) < minGap) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) {
            ctx.textAlign = 'center';
            ctx.fillText(labels[i].text, labels[i].x, labelY);
            drawn.push(labels[i].x);
        }
    }
};

PV.UI.renderPlanetCard = function(result) {
    var planet = result.planet;
    var card = document.createElement('div');
    card.className = 'planet-card' + (result.isVisible ? ' visible' : ' not-visible');

    // Header
    var header = document.createElement('div');
    header.className = 'planet-header';
    var dot = document.createElement('span');
    dot.className = 'planet-dot';
    dot.style.backgroundColor = planet.color;
    var name = document.createElement('span');
    name.className = 'planet-name';
    name.textContent = planet.name;
    var badge = document.createElement('span');
    badge.className = 'visibility-badge ' + (result.isVisible ? 'badge-visible' : 'badge-not-visible');
    badge.textContent = result.isVisible ? 'Visible' : 'Not Visible';
    header.appendChild(dot);
    header.appendChild(name);
    header.appendChild(badge);
    card.appendChild(header);

    if (result.isVisible) {
        // Visibility windows
        var windowsDiv = document.createElement('div');
        windowsDiv.className = 'planet-windows';
        for (var w = 0; w < result.windows.length; w++) {
            var win = result.windows[w];
            var winEl = document.createElement('div');
            winEl.className = 'planet-window';
            winEl.textContent = PV.UI.formatDateTime(win.start) + ' \u2013 ' + PV.UI.formatDateTime(win.end);
            windowsDiv.appendChild(winEl);
        }
        card.appendChild(windowsDiv);

        // Best viewing details
        var details = document.createElement('div');
        details.className = 'planet-details';
        details.innerHTML =
            '<div class="detail-row"><span class="detail-label">Best viewing</span><span class="detail-value">' +
            PV.UI.formatDateTime(result.bestTime) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Brightness</span><span class="detail-value">' +
            PV.UI.formatMagnitude(result.bestMagnitude) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Direction</span><span class="detail-value">' +
            PV.UI.formatAzimuth(result.bestAzimuth) + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Altitude</span><span class="detail-value">' +
            PV.UI.formatAltitude(result.bestAltitude) + '</span></div>';
        card.appendChild(details);
    } else {
        // Show reason from the "best" sample (highest altitude, or first sample)
        var reason = PV.UI.getBestReason(result.allSamples);
        var reasonDiv = document.createElement('div');
        reasonDiv.className = 'planet-reason';
        reasonDiv.textContent = reason;
        card.appendChild(reasonDiv);
    }

    // Sparkline
    var sparkContainer = document.createElement('div');
    sparkContainer.className = 'sparkline-container';
    var canvas = document.createElement('canvas');
    canvas.className = 'sparkline-canvas';
    sparkContainer.appendChild(canvas);
    card.appendChild(sparkContainer);


    // Defer sparkline rendering until the card is in the DOM
    requestAnimationFrame(function() {
        PV.UI.renderSparkline(canvas, result.allSamples, planet.color);
    });

    return card;
};

PV.UI.getBestReason = function(samples) {
    // Find the sample with highest altitude to get the most informative reason
    var best = samples[0];
    for (var i = 1; i < samples.length; i++) {
        if (samples[i].altitude > best.altitude) best = samples[i];
    }
    return best.reason;
};

PV.UI.renderWeatherTimeline = function(weatherData, sampleTimes, container) {
    container.innerHTML = '';
    if (!weatherData || !weatherData.available || !sampleTimes.length) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'weather-timeline-wrapper';

    var label = document.createElement('div');
    label.className = 'weather-timeline-label';
    label.textContent = 'Cloud Cover';
    wrapper.appendChild(label);

    var bar = document.createElement('div');
    bar.className = 'weather-timeline-bar';

    // Build segments by grouping samples with similar cloud conditions
    var weatherSamples = [];
    for (var i = 0; i < sampleTimes.length; i++) {
        var w = PV.Weather.getAtTime(weatherData, sampleTimes[i]);
        weatherSamples.push(w);
    }

    // Group consecutive samples with same cloud description
    var segments = [];
    var current = { description: weatherSamples[0] ? weatherSamples[0].description : 'Unknown', cloudCover: weatherSamples[0] ? weatherSamples[0].cloudCover : 0, start: 0, end: 0 };
    for (var i = 1; i < weatherSamples.length; i++) {
        var desc = weatherSamples[i] ? weatherSamples[i].description : 'Unknown';
        if (desc === current.description) {
            current.end = i;
        } else {
            segments.push(current);
            current = { description: desc, cloudCover: weatherSamples[i] ? weatherSamples[i].cloudCover : 0, start: i, end: i };
        }
    }
    segments.push(current);

    var total = sampleTimes.length - 1;
    for (var s = 0; s < segments.length; s++) {
        var seg = segments[s];
        var widthPct = ((seg.end - seg.start + (s === segments.length - 1 ? 0 : 1)) / total * 100);
        var div = document.createElement('div');
        div.className = 'weather-timeline-segment';
        div.style.width = widthPct + '%';
        div.style.backgroundColor = PV.Weather.cloudCoverColor(seg.cloudCover);
        div.title = seg.description + ' (' + seg.cloudCover + '% cloud cover)\n' +
                    PV.UI.formatTime(sampleTimes[seg.start]) + ' \u2013 ' +
                    PV.UI.formatTime(sampleTimes[seg.end]);
        bar.appendChild(div);
    }

    wrapper.appendChild(bar);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'weather-timeline-legend';
    var legendItems = [
        { label: 'Clear', cover: 10 },
        { label: 'Partly cloudy', cover: 35 },
        { label: 'Mostly cloudy', cover: 65 },
        { label: 'Overcast', cover: 90 }
    ];
    for (var i = 0; i < legendItems.length; i++) {
        var item = document.createElement('span');
        item.className = 'legend-item';
        var swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.backgroundColor = PV.Weather.cloudCoverColor(legendItems[i].cover);
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(legendItems[i].label));
        legend.appendChild(item);
    }
    wrapper.appendChild(legend);

    container.appendChild(wrapper);
};

PV.UI.renderAllResults = function(data, startDate, endDate, lat, lon, weatherData) {
    var container = document.getElementById('results');
    container.innerHTML = '';
    container.style.display = 'block';

    // Summary
    var summary = document.createElement('div');
    summary.className = 'results-summary';
    summary.textContent = PV.UI.formatDateTime(startDate) + ' \u2013 ' + PV.UI.formatDateTime(endDate) +
        '  \u00b7  ' + Math.abs(lat).toFixed(2) + '\u00b0' + (lat >= 0 ? 'N' : 'S') +
        ', ' + Math.abs(lon).toFixed(2) + '\u00b0' + (lon >= 0 ? 'E' : 'W');
    container.appendChild(summary);

    // Sun timeline
    var timelineContainer = document.createElement('div');
    timelineContainer.id = 'sun-timeline';
    container.appendChild(timelineContainer);
    PV.UI.renderSunTimeline(data.sunData, timelineContainer);

    // Weather timeline
    if (weatherData && weatherData.available) {
        var weatherContainer = document.createElement('div');
        weatherContainer.id = 'weather-timeline';
        container.appendChild(weatherContainer);
        PV.UI.renderWeatherTimeline(weatherData, data.sampleTimes, weatherContainer);
    }

    // Note
    var note = document.createElement('div');
    note.className = 'results-note';
    if (weatherData && weatherData.available) {
        note.textContent = 'Visibility windows approximate (\u00b115 min). Weather forecast from Open-Meteo. No obstructions assumed.';
    } else if (weatherData && weatherData.reason === 'outside_range') {
        note.textContent = 'Visibility windows approximate (\u00b115 min). Weather unavailable for this date range. Assumes clear skies, no obstructions.';
    } else {
        note.textContent = 'Visibility windows approximate (\u00b115 min). Assumes clear skies, no obstructions.';
    }
    container.appendChild(note);

    // Sort: visible planets first, then by order
    var sorted = data.planets.slice().sort(function(a, b) {
        if (a.isVisible && !b.isVisible) return -1;
        if (!a.isVisible && b.isVisible) return 1;
        return 0;
    });

    // Planet cards
    var grid = document.createElement('div');
    grid.className = 'planet-grid';
    for (var i = 0; i < sorted.length; i++) {
        var card = PV.UI.renderPlanetCard(sorted[i]);
        card.style.animationDelay = (i * 0.08) + 's';
        grid.appendChild(card);
    }
    container.appendChild(grid);
};

PV.UI.showError = function(msg) {
    var el = document.getElementById('error-message');
    el.textContent = msg;
    el.style.display = 'block';
};

PV.UI.clearError = function() {
    var el = document.getElementById('error-message');
    el.textContent = '';
    el.style.display = 'none';
};
