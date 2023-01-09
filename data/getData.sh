#!/bin/bash

SECONDS=0

########################
#
# User input
#
########################

TODAY=`date +%Y%m%d`
MODEL_RUN=$1  # 00 06 12 18
START_HR=0
END_HR=72
STEP=3

TODAYS_MODEL=$TODAY$MODEL_RUN #YYYYMMDDHH

###################################
echo 'Downloading GFS data...'
###################################

for i in {0..72..3}
do 
    if  [ $i -lt 10 ]
    then
        i="00${i}"   
    fi
    if  [ $i -ge 10 ]
    then
        i="0${i}"   
    fi
    # grib filter
    URL="https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl?file=gfs.t${MODEL_RUN}z.pgrb2.0p25.f${i}&lev_1000_mb=on&lev_100_mb=on&lev_10_m_above_ground=on&lev_150_mb=on&lev_200_mb=on&lev_250_mb=on&lev_2_m_above_ground=on&lev_300_mb=on&lev_350_mb=on&lev_400_mb=on&lev_450_mb=on&lev_500_mb=on&lev_550_mb=on&lev_600_mb=on&lev_650_mb=on&lev_700_mb=on&lev_750_mb=on&lev_800_mb=on&lev_850_mb=on&lev_900_mb=on&lev_925_mb=on&lev_950_mb=on&lev_975_mb=on&lev_surface=on&var_HGT=on&var_PRES=on&var_RH=on&var_TMP=on&var_UGRD=on&var_VGRD=on&subregion=&leftlon=-5.0&rightlon=32.5&toplat=71.5&bottomlat=38.0&dir=%2Fgfs.${TODAY}%2F${MODEL_RUN}%2Fatmos"
    
    curl "$URL" -o "gfs.t${MODEL_RUN}z.pgrb2.0p25.f${i}"

done

###################################
echo 'Converting grib to json...'
###################################
python3 grib2json.py $TODAY $MODEL_RUN $END_HR $STEP

echo ''
###################################
echo 'Removing grib data..'
###################################
rm gfs.t*

echo ''
if (( $SECONDS > 60 )) ; then
    let "minutes=(SECONDS%3600)/60"
    let "seconds=(SECONDS%3600)%60"
    echo "Completed in $minutes minute(s) and $seconds second(s)"
else
    echo "Completed in $SECONDS seconds"
fi