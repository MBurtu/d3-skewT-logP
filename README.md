Plots model soundings and parcel profiles on a skew-T log-P diagram. Indicies such as CAPE and bulk shear are also computed and shown on a side panel. The skew-T diagram is built with the d3 library and is based on https://github.com/rsobash/d3-skewt. 

### Data Format
Json as seen below. See /data for a full example.
```javascript
{"2021-04-18 06:00:00": [{
    "pres": [1025, 975, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150, 100], // hPa
    "hght": [36, 450, 663, 880, 1103, 1566, 2054, 2567, 3109, 3682, 4292, 4944, 5645, 6401, 7226, 8132, 9144, 10298, 11677, 13489, 16050], // m
    "hghtagl": [2, 413, 626, 844, 1067, 1530, 2017, 2531, 3073, 3646, 4255, 4908, 5609, 6365, 7190, 8096, 9108, 10261, 11641, 13453, 16014], // m
    "tmpc": [7.4, 6.9, 6.1, 5.0, 3.9, 2.5, 0.3, -3.1, -7.0, -11.1, -14.8, -19.2, -25.1, -30.6, -37.5, -44.9, -52.9, -61.0, -59.3, -57.1, -58.8], // °C
    "dwpc": [-1.2, -5.6, -6.1, -7.0, -9.4, -20.3, -26.3, -24.8, -24.4, -29.5, -43.4, -35.1, -35.8, -43.5, -44.7, -51.6, -54.4, -61.3, -69.8, -81.1, -84.5], // °C
    "wdir": [47, 78, 75, 70, 71, 83, 94, 96, 95, 98, 90, 83, 86, 90, 95, 90, 87, 99, 87, 37, 310], // °
    "wspd": [2.3, 8.5, 8.4, 8.2, 7.8, 6.9, 6.9, 6.7, 6.7, 6.7, 5.7, 5.0, 5.4, 8.9, 10.1, 9.0, 8.2, 10.1, 8.3, 3.7, 4.0] // m/s
    }], 
 "2021-04-18 09:00:00": [{
    }]
 }
```

### Dependencies
- d3 v.5  
- jQuery  
- Leaflet
- OpenStreetMap
- Font Awesome  

### Known bugs
- Date grid is not generated correctly when transitioning to and from summer time.
- Top windbarb sometimes disappears and sometimes is duplicated.

### Demo
http://www.westerlies.eu/soundings/d3_skewt.html
