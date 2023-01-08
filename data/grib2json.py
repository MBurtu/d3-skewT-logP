####################################################
#
#    Converting grib to json
#  
####################################################

import sys
from datetime import datetime, timedelta
import math
import pygrib
import json
import metpy.calc as calc
from metpy.units import units

####################################################

# user input
input = sys.argv
yyyy = int(input[1][:4])
mm = int(input[1][4:6])
dd = int(input[1][6:8])
model_run = input[2]
end_hr = int(input[3])
step = int(input[4])

locations = {'Arlanda': {'lat':59.75, 'lon':18.0},
             'Jonkoping': {'lat':57.75, 'lon':14.0},
             'Ostersund': {'lat':63.25, 'lon':14.5},
             'Gallivare': {'lat':67.25, 'lon':20.75},
             'Orsa': {'lat':61.0, 'lon':14.75},
             'Lycksele': {'lat':64.5, 'lon':18.75},
             'Sundsvall': {'lat':62.5, 'lon':17.5},
             'Hemavan': {'lat':65.75, 'lon':15.0},
             'Visby': {'lat':57.75, 'lon':18.5},
             'Kastrup': {'lat':55.75, 'lon':12.0},
             'Karup': {'lat':56.25, 'lon':9.0},
             'Gardemoen': {'lat':60.25, 'lon':11.0},
             'Bergen': {'lat':60.25, 'lon':5.25 },
             'Trondheim':{'lat':63.50, 'lon':11.0},
             'Tromso': {'lat':69.75, 'lon':19.0},
             'Helsinki': {'lat':60.25, 'lon':25.0},
             'Oulu': {'lat':65.0, 'lon':25.25},
             'Jyvaskyla': {'lat':62.25, 'lon':25.75},
             'Ivalo': {'lat': 68.5, 'lon':27.5},
             'Tallinn': {'lat':59.25, 'lon':25.0},
             'Riga': {'lat':57.0, 'lon':24.0},
             'Vilnius': {'lat':54.75, 'lon':25.25},
             'Hamburg': {'lat':53.75, 'lon':10.0},
             'Berlin': {'lat':52.25, 'lon':13.5},
             'Gdansk': {'lat':54.5, 'lon':18.25},
             'Warszawa': {'lat':52.25, 'lon':21.0},
             'Heathrow': {'lat':51.5, 'lon':-0.5},
             'CharlesDeGaulle': {'lat':49.0, 'lon':2.5},
             'Schiphol': {'lat':52.25, 'lon':4.75},
             'Prague': {'lat':50.0, 'lon':14.25},
             'Glasgow': {'lat':55.75, 'lon':-4.5},
             'Kyiv': {'lat':50.5, 'lon':30.5},
             'Vienna': {'lat':48.0, 'lon':16.5},
             'Zurich': {'lat':47.5, 'lon':8.5},
             'Bucharest': {'lat':44.5, 'lon':26.0},
             'Sarajevo': {'lat':43.75, 'lon':18.25},
             'Rome': {'lat':41.75, 'lon':12.25},
             'Bordeaux': {'lat':44.75, 'lon':-0.75},
             'Madrid': {'lat':40.5, 'lon':-3.5},
             'BothnianSea': {'lat':61.75, 'lon':19.5},
             'NorthSea': {'lat':56.25, 'lon':4.25},
             'NorwegianSea': {'lat':65.75, 'lon':6.25}
            }

sounding = {}
date = datetime(yyyy,mm,dd,int(model_run))
forecast = range(0,end_hr+step,step)

for timestep in forecast: 

    if timestep < 10:
        timestep = f'0{timestep}'

    print('')
    print(f'Timestep: +{timestep}') 

    grbs = pygrib.open(f'gfs.t{model_run}z.pgrb2.0p25.f0{timestep}')

    Psfc = grbs.select(name='Surface pressure')
    O = grbs.select(name='Orography')
    T = grbs.select(name='Temperature')
    T2m = grbs.select(name='2 metre temperature')
    GH = grbs.select(name='Geopotential Height')
    RH = grbs.select(name='Relative humidity')
    RH2m = grbs.select(name='2 metre relative humidity')
    U = grbs.select(name='U component of wind')
    U10m = grbs.select(name='10 metre U wind component')
    V = grbs.select(name='V component of wind')
    V10m = grbs.select(name='10 metre V wind component')

    levels = [100,150,200,250,300,350,400,450,500,550,600,650,700,750,800,850,900,925,950,975,1000] #hPa

    for name, loc in locations.items():

        print(name)

        location = {}

        latitude = loc["lat"]
        longitude = loc["lon"]
      
        location[f'{date}'] = []

        temperatures = []
        dewpoints = []
        heights_agl = []
        speeds = []
        directions = []
        pres_lvls = []
        
        #############################
        #
        #   Surface
        #
        #############################

        sfc_height, lat, lon = O[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
        sfc_pressure, lat, lon = Psfc[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
        temperature_2m, lat, lon = T2m[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
        relative_humidity_2m, lat, lon = RH2m[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
        u_wind_10m, lat, lon = U10m[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
        v_wind_10m, lat, lon = V10m[0].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
    
        sfc_pressure = round(float(sfc_pressure)/100) #Pa -> hPa
        sfc_height = float(sfc_height)

        temperature_2m = round(float(temperature_2m) - 273.15,1) #Kelvin -> Celsius
        relative_humidity_2m = float(relative_humidity_2m)
        dewpoint_temperature_2m = calc.dewpoint_from_relative_humidity((temperature_2m*units.degC).to(units.K),relative_humidity_2m/100).to(units('degC'))
        dewpoint_temperature_2m = round(float(dewpoint_temperature_2m.magnitude),1)

        wind_speed_10m = math.sqrt(float(u_wind_10m)**2 + float(v_wind_10m)**2)#*1.944 #m/s -> kt

        math_dir_10m = math.degrees(math.atan2(float(v_wind_10m),float(u_wind_10m)))
        wind_dir_10m = 270 - math_dir_10m
        if wind_dir_10m > 360: wind_dir_10m -= 360

        #############################
        #
        #   Atmosphere
        #
        #############################

        for i in range(0,len(levels)):
            if levels[i] < (sfc_pressure-25):

                pres_lvls.append(levels[i])

                temperature, lat, lon = T[i].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
                geopotential_height, lat, lon = GH[i].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
                relative_humidity, lat, lon = RH[i].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
                u_wind, lat, lon = U[i].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)
                v_wind, lat, lon = V[i].data(lat1=latitude,lat2=latitude,lon1=longitude,lon2=longitude)

                temperature = round(float(temperature) - 273.15,1) #Kelvin -> Celsius
                temperatures.append(temperature)

                relative_humidtity = float(relative_humidity)
                if relative_humidity == 0:
                    relative_humidity = 0.0000001
                dewpoint_temperature = calc.dewpoint_from_relative_humidity((temperature*units.degC).to(units.K),relative_humidity/100).to(units('degC'))
                dewpoint_temperature = round(float(dewpoint_temperature.magnitude),1)
                dewpoints.append(dewpoint_temperature)

                wind_speed = math.sqrt(float(u_wind)**2 + float(v_wind)**2)
                speeds.append(round(wind_speed,1))

                math_dir = math.degrees(math.atan2(float(v_wind),float(u_wind)))
                wind_dir = 270 - math_dir
                if wind_dir > 360: wind_dir -= 360
                directions.append(round(wind_dir))

                height = float(geopotential_height)
                
                hghtagl = height - sfc_height
                heights_agl.append(round(hghtagl))

        # Add surface values
        pres_lvls.append(sfc_pressure)
        heights_agl.append(2)
        temperatures.append(temperature_2m)
        dewpoints.append(dewpoint_temperature_2m)
        directions.append(round(wind_dir_10m))
        speeds.append(round(wind_speed_10m,1))        
        
        sounding[f'{name}-{timestep}'] = {
            'pres': pres_lvls[::-1],
            'hghtagl': heights_agl[::-1],
            'tmpc': temperatures[::-1],
            'dwpc': dewpoints[::-1],
            'wdir': directions[::-1],
            'wspd': speeds[::-1]
            }
            
    # Update date
    date = date + timedelta(hours=step)

print('')
print('Write to file...')    
for name, loc in locations.items():
    
    date = datetime(yyyy,mm,dd,int(model_run))
    new_sounding = {}

    for timestep in forecast: 

        if timestep < 10:
            timestep = f'0{timestep}'

        new_sounding[f'{date}'] = sounding[f'{name}-{timestep}']
        
        date = date + timedelta(hours=step)
    
    print(f'sounding_{name}.json')

    with open(f'sounding_{name}.json', 'w') as outfile:
        json.dump(new_sounding, outfile)
