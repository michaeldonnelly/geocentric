# Geocentric

Geocentric is a web page that tells you which planets are visible from your location during a given time range. It accounts for planet altitude, sun position, sky brightness, apparent magnitude, daytime visibility, and weather conditions.

## Tech

- Vanilla HTML/CSS/JS, no build step
- [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT) via CDN for positional calculations
- [Open-Meteo](https://open-meteo.com/) for weather/cloud cover forecasts
- Browser Geolocation API for location input

## Features

- Per-planet visibility with best viewing time, brightness, direction, and altitude
- Altitude sparkline charts with time and horizon labels
- Sky Conditions timeline (sun position / twilight phases)
- Cloud Cover timeline from weather forecast data
- Auto-calculates after geolocation

## Usage

Open `index.html` in a browser. Enter your location (or click "Use My Location"), set a time range, and hit Calculate.

## Acknowledgments

Favicon derived from [Venus geocentric orbit curve simplified (pentagram)](https://commons.wikimedia.org/wiki/File:Venus_geocentric_orbit_curve_simplified_(pentagram).svg) by AnonMoos on Wikimedia Commons, released into the public domain.

Background image is [Sterne von Klein Flintbek aus](https://commons.wikimedia.org/wiki/File:2021-02-13_-_Sterne_von_Klein_Flintbek_aus_(3).jpg) by Fabian Horst, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Code written by Claude (Anthropic) via Claude Code.
