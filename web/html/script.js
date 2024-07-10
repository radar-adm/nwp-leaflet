let previousSearches = [];
let currentMarker = null;

document.getElementById('location').addEventListener('focus', function() {
    const searchContainer = document.getElementById('searchContainer');
    searchContainer.style.display = 'block';
    updateSearchResults();
});

document.getElementById('location').addEventListener('blur', function() {
    setTimeout(() => {
        const searchContainer = document.getElementById('searchContainer');
        searchContainer.style.display = 'none';
    }, 200); // Delay to allow click event to register on dropdown items
});

document.getElementById('location').addEventListener('input', function() {
    updateSearchResults();
});

document.getElementById('locationForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const location = document.getElementById('location').value;
    if (location) {
        getWeather(location);
        if (!previousSearches.includes(location)) {
            previousSearches.push(location);
        }
    }
});

document.getElementById('parameterButton').addEventListener('click', function() {
    const parameterList = document.getElementById('parameterList');
    parameterList.style.display = parameterList.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('levelButton').addEventListener('click', function() {
    const levelList = document.getElementById('levelList');
    levelList.style.display = levelList.style.display === 'none' ? 'block' : 'none';
});

function updateSearchResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    const locationInput = document.getElementById('location').value.toLowerCase();
    const filteredSearches = previousSearches.filter(search => search.toLowerCase().includes(locationInput));
    filteredSearches.forEach(search => {
        const li = document.createElement('li');
        li.textContent = search;
        li.addEventListener('click', function() {
            document.getElementById('location').value = search;
            getWeather(search);
        });
        searchResults.appendChild(li);
    });
}

function getWeather(location) {
    const apiKey = 'YOUR_API_KEY';
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`)
        .then(response => response.json())
        .then(data => {
            displayWeather(data);
            const { coord } = data;
            if (coord) {
                updateMap(coord.lat, coord.lon);
            }
        })
        .catch(error => {
            alert('Error fetching weather data. Please try again.');
            console.error('Error:', error);
        });
}

function displayWeather(data) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    weatherDisplay.innerHTML = `
        <h2>${data.name}</h2>
        <p>${data.weather[0].description}</p>
        <p>Temperature: ${data.main.temp.toFixed(2)}°C</p>
        <p>Humidity: ${data.main.humidity.toFixed(2)}%</p>
        <p>Wind: ${data.wind.speed.toFixed(2)} m/s</p>
    `;
}

function updateMap(lat, lon) {
    // Remove the previous marker if it exists
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    // Creating a marker
    currentMarker = L.marker([lat, lon]);
    
    // Adding marker to the map
    currentMarker.addTo(map)
        .bindPopup(`<div>Coordinates: ${lat}, ${lon}<br><button id="openModalButton" onclick="openModal()">Open Modal</button></div>`)
        .openPopup();

    map.setView([lat, lon], 5);
}

// Initialize the map with a default view centered on Thailand
const map = L.map('map', { zoomControl: false }).setView([15.8700, 100.9925], 6); // Coordinates for Thailand
// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '© OpenStreetMap contributors'
// }).addTo(map);
var bounds = [
    [-1.256096 , 85.16322], // Southwest coordinates
    [27.709381, 115.44342]  // Northeast coordinates
];

map.fitBounds(bounds);
// Create the square box
var rectangle = L.rectangle(bounds, {color: "#FFFFFF00", weight: 1}).addTo(map);

// Get the corners of the rectangle
var corners = rectangle.getBounds();
var sw = corners.getSouthWest();
var ne = corners.getNorthEast();
var nw = L.latLng(ne.lat, sw.lng);
var se = L.latLng(sw.lat, ne.lng);
var lines = [
    [sw, nw],
    [nw, ne],
    [ne, se],
    [se, sw]
];
lines.forEach(function(line) {
    L.polyline(line, {color: "#666666", weight: 2}).addTo(map);
});


L.tileLayer('https://api.maptiler.com/maps/toner-v2/256/{z}/{x}/{y}.png?key=nvaY790YU6IdGGyvJPts', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="http://stamen.com">Stamen Design</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    opacity:0.25
}).addTo(map);

L.tileLayer('https://api.maptiler.com/tiles/hillshade/{z}/{x}/{y}.webp?key=nvaY790YU6IdGGyvJPts', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="http://stamen.com">Stamen Design</a>',
    subdomains: 'abcd',
    maxZoom: 20 ,
    opacity:0.25
}).addTo(map);


// $.getJSON("wind-global.json", function(data) { 
$.getJSON(" http://127.0.0.1:8080/streamlines/202310190000/", function(data) {
    var velocityLayer = L.velocityLayer({
      displayValues: true,
      displayOptions: {
        velocityType: "Global Wind",
        position: "bottomleft",
        emptyString: "No wind data"
      },
      data: data,
      opacity : 0.8 , 
      maxVelocity: 10
    });
    velocityLayer.addTo(map);
  });

  const weatherChart = L.tileLayer('http://127.0.0.1:8080/fcst/tiled/202310190000/prec/{z}/{x}/{y}',{ 
    opacity : 0.9 , 
    crossOrigin: true
});
weatherChart.addTo(map);

// Adding a default marker to the map
var marker = L.marker([15.8700, 100.9925]);
marker.addTo(map)
    .bindPopup(`<div>Default Marker<br><button id="openModalButton" onclick="openModal()">open chart</button></div>`)
    .openPopup();

// Initialize the datepicker slider
const datepicker = document.getElementById('datepicker');
const startDate = new Date('2024-01-01T12:00:00Z').getTime();
const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 days later

noUiSlider.create(datepicker, {
    range: {
        min: startDate,
        max: endDate
    },
    step: 3 * 60 * 60 * 1000, // Three hours in milliseconds
    start: [startDate],
    format: wNumb({
        decimals: 0
    })
});

const dateLabel = document.getElementById('dateLabel');
datepicker.noUiSlider.on('update', function(values, handle) {
    const date = new Date(+values[handle]);
    dateLabel.innerHTML = formatThaiDate(date);
});

function updateMarker(lat , lon) {
    const coordinates = {
        'lat' : 15.8700 ,
        'lon' : 100.9925
    };
    if (coordinates) {
        updateMap(coordinates.lat, coordinates.lon);
    } else {
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        map.setView([15.8700, 100.9925], 2); // Reset to default view if no coordinates are found
    }
}

// Modal functionality
function openModal() {
    var modal= document.getElementById("myModal");
    modal.style.display = "block";
    createMeteogram();
}

var span = document.getElementsByClassName("close")[0];

span.onclick = function() {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
}

window.onclick = function(event) {
    var modal = document.getElementById("myModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

function createMeteogram() {
    Highcharts.chart('meteogramContainer', {
        chart: {
            zoomType: 'x'
        },
        title: {
            text: 'Meteogram'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                formatter: function() {
                    return formatThaiDateAbbrev(new Date(this.value));
                }
            }
        },
        yAxis: [{
            title: {
                text: 'Temperature (°C)'
            },
            opposite: false
        }, {
            title: {
                text: 'Pressure (hPa)'
            },
            opposite: true
        }, {
            title: {
                text: 'Precipitation (mm)'
            },
            opposite: true,
            min: 0
        }],
        tooltip: {
            shared: true,
            formatter: function() {
                const points = this.points.map(point => {
                    const seriesName = point.series.name;
                    let value = point.y;
                    if (seriesName === 'Wind') {
                        value = `${point.point.value.toFixed(2)} m/s at ${point.point.direction.toFixed(2)}°`;
                    } else if (seriesName === 'Temperature') {
                        value = `${point.y.toFixed(2)}°C`;
                    } else if (seriesName === 'Pressure') {
                        value = `${point.y.toFixed(2)} hPa`;
                    } else if (seriesName === 'Precipitation') {
                        value = `${point.y.toFixed(2)} mm`;
                    }
                    return `<span style="color:${point.color}">\u25CF</span> ${seriesName}: <b>${value}</b><br/>`;
                }).join('');
                return `<b>${formatThaiDate(new Date(this.x))}</b><br/>${points}`;
            }
        },
        accessibility: {
            enabled: false
        },
        series: [{
            name: 'Temperature',
            type: 'spline',
            yAxis: 0,
            color: 'red', // Set temperature line to red
            zIndex: 2, // Ensure temperature line is above precipitation
            data: generateTemperatureData()
        }, {
            name: 'Pressure',
            type: 'spline',
            yAxis: 1,
            color: '#11ff33', // Set pressure line to green
            zIndex: 1, // Ensure pressure line is above precipitation but below temperature
            data: generatePressureData()
        }, {
            name: 'Precipitation',
            type: 'column',
            yAxis: 2,
            color: '#0088ff', // Set precipitation to light blue
            zIndex: 0, // Ensure precipitation column is behind both temperature and pressure lines
            data: generatePrecipitationData()
        }, {
            name: 'Wind',
            type: 'windbarb',
            onSeries: 'temperature',
            color: 'black', // Set wind barb to black
            data: generateWindData(),
            tooltip: {
                valueSuffix: ' m/s'
            },
            zIndex: 5 // Ensure windbarb is above other series
        }]
    });
}

function generateTemperatureData() {
    const data = [];
    const startDate = new Date('2024-01-01T00:00:00Z').getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 days later

    for (let time = startDate; time <= endDate; time += 3 * 60 * 60 * 1000) {
        data.push([time, Math.random() * 10 + 15]); // Random temperature between 15°C and 25°C
    }

    return data;
}

function generatePressureData() {
    const data = [];
    const startDate = new Date('2024-01-01T00:00:00Z').getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 days later

    for (let time = startDate; time <= endDate; time += 3 * 60 * 60 * 1000) {
        data.push([time, Math.random() * 10 + 1010]); // Random pressure between 1010 hPa and 1020 hPa
    }

    return data;
}

function generatePrecipitationData() {
    const data = [];
    const startDate = new Date('2024-01-01T00:00:00Z').getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 days later

    for (let time = startDate; time <= endDate; time += 3 * 60 * 60 * 1000) {
        data.push([time, Math.random() * 2]); // Random precipitation between 0 mm and 2 mm
    }

    return data;
}

function generateWindData() {
    const data = [];
    const startDate = new Date('2024-01-01T00:00:00Z').getTime();
    const endDate = startDate + 7 * 24 * 60 * 60 * 1000; // 7 days later

    for (let time = startDate; time <= endDate; time += 3 * 60 * 60 * 1000) {
        data.push({
            x: time,
            value: Math.random() * 20, // Wind speed
            direction: Math.random() * 360 // Wind direction
        });
    }

    return data;
}

function formatThaiDate(date) {
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const monthNames = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const day = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist calendar year
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${dayNumber} ${month} ${year} เวลา ${hours}:${minutes} น.`;
}

function formatThaiDateAbbrev(date) {
    const dayNames = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
    const monthNames = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const day = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist calendar year
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${dayNumber} ${month} ${year} ${hours}:${minutes} น.`;
}

function timestamp(str) {
    return new Date(str).getTime();
}

