var PV = window.PV || {};
PV.Weather = {};

PV.Weather.fetchForecast = function(lat, lon, start, end) {
    // Check if dates are within forecast range (today through +16 days)
    var now = new Date();
    var maxForecast = new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // If entire range is outside forecast window, skip the API call
    if (start > maxForecast || end < today) {
        return Promise.resolve({ available: false, reason: 'outside_range' });
    }

    // Clamp to forecast range
    var fetchStart = start < today ? today : start;
    var fetchEnd = end > maxForecast ? maxForecast : end;

    var startStr = PV.Weather.formatDate(fetchStart);
    var endStr = PV.Weather.formatDate(fetchEnd);

    var url = 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + lat.toFixed(4) +
        '&longitude=' + lon.toFixed(4) +
        '&hourly=cloud_cover,visibility,weather_code' +
        '&start_date=' + startStr +
        '&end_date=' + endStr +
        '&timezone=auto';

    return fetch(url)
        .then(function(response) {
            if (!response.ok) throw new Error('Weather API error: ' + response.status);
            return response.json();
        })
        .then(function(data) {
            return PV.Weather.parseResponse(data);
        })
        .catch(function() {
            return { available: false, reason: 'fetch_error' };
        });
};

PV.Weather.parseResponse = function(data) {
    if (!data || !data.hourly || !data.hourly.time) {
        return { available: false, reason: 'bad_response' };
    }

    var hourly = [];
    for (var i = 0; i < data.hourly.time.length; i++) {
        hourly.push({
            time: new Date(data.hourly.time[i]),
            cloudCover: data.hourly.cloud_cover[i],
            visibility: data.hourly.visibility[i],
            weatherCode: data.hourly.weather_code[i]
        });
    }

    return { available: true, hourly: hourly };
};

PV.Weather.formatDate = function(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
};

PV.Weather.getAtTime = function(weatherData, date) {
    if (!weatherData || !weatherData.available || !weatherData.hourly.length) {
        return null;
    }

    var t = date.getTime();
    var hourly = weatherData.hourly;

    // Before first data point
    if (t <= hourly[0].time.getTime()) {
        return PV.Weather.buildResult(hourly[0]);
    }
    // After last data point
    if (t >= hourly[hourly.length - 1].time.getTime()) {
        return PV.Weather.buildResult(hourly[hourly.length - 1]);
    }

    // Find bracketing hourly entries and interpolate
    for (var i = 0; i < hourly.length - 1; i++) {
        var t0 = hourly[i].time.getTime();
        var t1 = hourly[i + 1].time.getTime();
        if (t >= t0 && t <= t1) {
            var frac = (t - t0) / (t1 - t0);
            var cloudCover = hourly[i].cloudCover + frac * (hourly[i + 1].cloudCover - hourly[i].cloudCover);
            var visibility = hourly[i].visibility + frac * (hourly[i + 1].visibility - hourly[i].visibility);
            return {
                cloudCover: Math.round(cloudCover),
                visibility: Math.round(visibility),
                weatherCode: hourly[i].weatherCode,
                magnitudePenalty: PV.Weather.computeMagnitudePenalty(cloudCover, visibility),
                description: PV.Weather.describeCondition(cloudCover)
            };
        }
    }

    return null;
};

PV.Weather.buildResult = function(entry) {
    return {
        cloudCover: entry.cloudCover,
        visibility: entry.visibility,
        weatherCode: entry.weatherCode,
        magnitudePenalty: PV.Weather.computeMagnitudePenalty(entry.cloudCover, entry.visibility),
        description: PV.Weather.describeCondition(entry.cloudCover)
    };
};

PV.Weather.computeMagnitudePenalty = function(cloudCover, visibility) {
    // Cloud cover penalty
    var cloudPenalty = 0;
    for (var i = 0; i < PV.CLOUD_COVER_THRESHOLDS.length; i++) {
        if (cloudCover <= PV.CLOUD_COVER_THRESHOLDS[i].max) {
            cloudPenalty = PV.CLOUD_COVER_THRESHOLDS[i].penalty;
            break;
        }
    }

    // Haze penalty: linear from 0 at threshold to max at 1km
    var hazePenalty = 0;
    if (visibility < PV.HAZE_VISIBILITY_THRESHOLD) {
        var ratio = 1 - (visibility / PV.HAZE_VISIBILITY_THRESHOLD);
        hazePenalty = ratio * PV.HAZE_MAX_PENALTY;
    }

    return cloudPenalty + hazePenalty;
};

PV.Weather.describeCondition = function(cloudCover) {
    if (cloudCover <= 20) return 'Clear';
    if (cloudCover <= 50) return 'Partly cloudy';
    if (cloudCover <= 80) return 'Mostly cloudy';
    return 'Overcast';
};

PV.Weather.cloudCoverColor = function(cloudCover) {
    // Dark/transparent for clear, light grey for overcast
    var t = cloudCover / 100;
    var r = Math.round(30 + t * 150);
    var g = Math.round(35 + t * 150);
    var b = Math.round(45 + t * 140);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
};
