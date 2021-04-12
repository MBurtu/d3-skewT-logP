Plots model soundings and parcel profiles on a skew-T log-P diagram. Indicies such as CAPE and bulk shear are also computed and shown on a side panel. The skew-T diagram is built with the d3 library and is based on https://github.com/rsobash/d3-skewt. 

### Data Format
Json as seen below. See /data for a full example.
```javascript
{"2021-04-07 06:00:00": 
    [{
    "pres": 100,      // hPa
    "hght": 15493.0,  // m
    "tmpc": -53.9,    // °C
    "dwpc": -82.4,    // °C
    "wdir": 248.0,    // °
    "wspd": 16.7,     // m/s
    "hghtagl": 15456  // m
    }, {
    "pres": 150, 
    "hght": 12897.0,
    "tmpc": -55.5,
    "dwpc": -80.7,
    "wdir": 249.0,
    "wspd": 13.6,
    "hghtagl": 12860
    }, ... ],
"2021-04-07 09:00:00": ... }
```

### Dependencies
- d3 v.5  
- jQuery  
- Google maps api
- Font Awesome  

### Known bugs
- Date grid is not generated correctly when transitioning to and from summer time.
- Top windbarb sometimes disappears and sometimes is duplicated.

### Demo
http://www.westerlies.eu/soundings/d3_skewt.html
