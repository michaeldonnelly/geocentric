document.addEventListener('DOMContentLoaded', function() {

    var latInput = document.getElementById('latitude');
    var lonInput = document.getElementById('longitude');
    var startInput = document.getElementById('start-time');
    var endInput = document.getElementById('end-time');
    var locateBtn = document.getElementById('locate-btn');
    var calcBtn = document.getElementById('calculate-btn');
    var locStatus = document.getElementById('location-status');

    // Set default time range: now until midnight local time
    function setDefaults() {
        var now = new Date();
        var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        startInput.value = toLocalDatetimeString(now);
        endInput.value = toLocalDatetimeString(midnight);
    }

    function toLocalDatetimeString(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        var h = String(date.getHours()).padStart(2, '0');
        var min = String(date.getMinutes()).padStart(2, '0');
        return y + '-' + m + '-' + d + 'T' + h + ':' + min;
    }

    // Geolocation
    if (!navigator.geolocation) {
        locateBtn.disabled = true;
        locateBtn.title = 'Geolocation not available in this browser';
    }

    locateBtn.addEventListener('click', function() {
        locateBtn.disabled = true;
        locateBtn.textContent = 'Locating\u2026';
        locStatus.textContent = '';
        locStatus.className = 'location-status';

        navigator.geolocation.getCurrentPosition(
            function(pos) {
                latInput.value = pos.coords.latitude.toFixed(4);
                lonInput.value = pos.coords.longitude.toFixed(4);
                locStatus.textContent = 'Location acquired';
                locStatus.className = 'location-status success';
                locateBtn.textContent = 'Use My Location';
                locateBtn.disabled = false;
                calcBtn.click();
            },
            function(err) {
                var msg = 'Could not get location';
                if (err.code === 1) msg = 'Location access denied';
                else if (err.code === 2) msg = 'Location unavailable';
                else if (err.code === 3) msg = 'Location request timed out';
                locStatus.textContent = msg + '. Enter coordinates manually.';
                locStatus.className = 'location-status error';
                locateBtn.textContent = 'Use My Location';
                locateBtn.disabled = false;
            },
            { enableHighAccuracy: false, timeout: 10000 }
        );
    });

    // Calculate
    calcBtn.addEventListener('click', function() {
        PV.UI.clearError();

        var lat = parseFloat(latInput.value);
        var lon = parseFloat(lonInput.value);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            PV.UI.showError('Latitude must be between -90 and 90.');
            return;
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
            PV.UI.showError('Longitude must be between -180 and 180.');
            return;
        }

        var startStr = startInput.value;
        var endStr = endInput.value;
        if (!startStr || !endStr) {
            PV.UI.showError('Please set both start and end times.');
            return;
        }

        var startDate = new Date(startStr);
        var endDate = new Date(endStr);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            PV.UI.showError('Invalid date format.');
            return;
        }
        if (startDate >= endDate) {
            PV.UI.showError('Start time must be before end time.');
            return;
        }
        if (endDate.getTime() - startDate.getTime() > PV.MAX_RANGE_MS) {
            PV.UI.showError('Time range cannot exceed 7 days.');
            return;
        }

        // Show loading state
        calcBtn.disabled = true;
        calcBtn.textContent = 'Calculating\u2026';
        document.getElementById('results').style.display = 'none';

        // Defer computation to let the UI update
        setTimeout(function() {
            var observer = new Astronomy.Observer(lat, lon, 0);

            PV.Weather.fetchForecast(lat, lon, startDate, endDate)
                .then(function(weatherData) {
                    var data = PV.computeAllPlanets(observer, startDate, endDate, weatherData);
                    PV.UI.renderAllResults(data, startDate, endDate, lat, lon, weatherData);
                    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
                })
                .catch(function(e) {
                    PV.UI.showError('Calculation error: ' + e.message);
                    console.error(e);
                })
                .finally(function() {
                    calcBtn.disabled = false;
                    calcBtn.textContent = 'Calculate';
                });
        }, 50);
    });

    setDefaults();
});
