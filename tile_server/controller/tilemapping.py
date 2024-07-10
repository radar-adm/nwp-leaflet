# -*- coding: utf-8 -*-
#
import io
import os
import json
import numpy as np

import sqlite3

import math, os
from scipy.interpolate import RectBivariateSpline
from scipy.interpolate import RegularGridInterpolator

#import matplotlib
#matplotlib.use('agg')
import matplotlib.pyplot as plt
from matplotlib import colors

from datetime import datetime


cbar = 'C:/Users/iiarr/OneDrive/Desktop/workspace/dev/web/tile_server/config/colorbar.json'
dbDIR = 'C:/Users/iiarr/OneDrive/Desktop/workspace/dev/web/tile_server/database/'
tileDIR = 'C:/Users/iiarr/OneDrive/Desktop/workspace/dev/web/tile_server/tiled/'

dtime = '2023101812'
xtime = datetime.strptime(dtime , '%Y%m%d%H')
timestamp = int(round(xtime.timestamp()))

def nwp_sql_header(param):

    columns = []
        
    sqlFilePath = f'{dbDIR}/{dtime}/{param}.d01.{dtime}.sql'

    con = sqlite3.connect(sqlFilePath)
    cur = con.cursor()
    cur = con.cursor()
    cursor = cur.execute(f'SELECT * FROM {param} LIMIT 1')
    col = list(map(lambda x: x[0], cursor.description))
    col.remove('xlng')
    col.remove('ylat')
    columns += col
    con.close()

    columns = sorted(
                    list(
                        set(columns)
                    ) , reverse = False
            )

    #xt_utc_now = datetime.now(UTC)
    #xtColumns = [c for c in columns if xt_utc_now <= datetime.strptime(c , '%Y-%m-%dT%H:%M:%S')][:48]
    xtColumns = [c for c in columns][:16]
    cols =[
            { "ts" : datetime.strptime(c , '%Y-%m-%dT%H:%M:%S').strftime('%Y%m%d%H%M%S') , # .timestamp() ,
             "dtime" : "" } for c in xtColumns
        ]
    return cols

def num2deg(xtile, ytile, zoom):
    """ conversion of X,Y + zoom to lat/lon coordinates - from OSM wiki """
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def get_tileMapping(ts , param , zoom , x , y ):

    xtimeForecast = datetime.strptime(ts , '%Y%m%d%H%M%S')
    t = xtimeForecast.strftime('%Y-%m-%dT%H:00:00')
    dtimeForecast = xtimeForecast.strftime('%Y%m%d%H%M%S')
    
    if param == 'wind':
        p = ['u','v']
    else:
        p = param

    tiledZoomPath = f'{tileDIR}/{dtime}/{param}/{dtimeForecast}/{zoom:03}'
    if not os.path.exists(tiledZoomPath):
        os.makedirs(tiledZoomPath)

    tiledImagePath = f'{tiledZoomPath}/{x:03}n{y:03}.png'

    if not os.path.exists(tiledImagePath):
        with open(cbar , 'r') as fr:
            buffer = fr.read()
        j = json.loads(buffer)

        cmap_custom_hex = j[p]['color']
        cmap= colors.ListedColormap(cmap_custom_hex)

        """s
        ulcrnrlat , ulcrnrlng  ---------------------
        ---------------------  lrcrnrlat , lrcrnrlng
        """
        ulcrnrlat , lrcrnrlng = num2deg( x , y , zoom )
        lrcrnrlat , ulcrnrlng = num2deg( x+1 , y+1 , zoom )

        # -1.256096,  27.709381
        y_min = -1.256096
        y_max = 27.709381
        #  85.16322 , 115.44342
        x_min = 85.16322
        x_max = 115.44342

        # Check out of Bound...
        out_of_bound = (
                            lrcrnrlat > y_max or
                            ulcrnrlat < y_min or
                            lrcrnrlng > x_max or
                            ulcrnrlng < x_min
                        )
        if out_of_bound:
            n = np.empty((256,256))
            n[:] = np.nan

        else:
            sqlFilePath = f'{dbDIR}/{dtime}/{param}.d01.{dtime}.sql'

            con = sqlite3.connect(sqlFilePath)
            cur = con.cursor()
            q = f'SELECT * from {p} WHERE (ylat BETWEEN {lrcrnrlat - .2:.6f} AND {ulcrnrlat + .2:.6f}) AND (xlng BETWEEN {lrcrnrlng - .2:.6f} AND {ulcrnrlng + .2:.6f})'
            cursor = cur.execute(q)
            columns = list(map(lambda x: x[0], cursor.description))
            idx = columns.index(t)
            values = np.float32(cursor.fetchall())
            y = np.unique(values[:,0])
            x = np.unique(values[:,1])
            z = values[:,idx].reshape((len(y) , len(x)))
            con.close()

            if param.__contains__('prmsl'):
                z = (z / 100) - 2
            if param.__contains__('temp'):
                z = z - 273.15

            #f = RectBivariateSpline(y , x , z)
            f = RegularGridInterpolator((y , x) , z)
            x_ = np.linspace(lrcrnrlng , ulcrnrlng , 256)
            y_ = np.linspace(lrcrnrlat , ulcrnrlat , 256)
            xx , yy = np.meshgrid(x_ , y_)
            xy = np.array([yy.ravel(), xx.ravel()]).T
            zz = f(xy).reshape((256,256))
            zz[zz > j[p]['values']['max'] ] = j[p]['values']['max']
            zz[zz < j[p]['values']['min'] ] = j[p]['values']['min']

            n = (zz - j[p]['values']['min']) / (j[p]['values']['max'] - j[p]['values']['min'])

            # --> Deleting TOP
            nearest_position_top = np.argmin(np.abs(yy - y_max))
            if nearest_position_top < len(yy) - 1 :
                n[ nearest_position_top : , : ] = np.nan

            # --> Deleting BOTTOM
            nearest_position_bottom = np.argmin(np.abs(yy - y_min))
            if nearest_position_bottom > 0 :
                n[ : nearest_position_bottom , : ] = np.nan

            # --> Deleting LEFT
            nearest_position_left = np.argmin(np.abs(xx - x_min))
            if nearest_position_left  > 0 :
                n[ : , : nearest_position_left ] = np.nan

            # print(n)
            # --> Deleting RIGHT
            nearest_position_right = np.argmin(np.abs(xx - x_max))
            if nearest_position_right  < len(xx) - 1 :
                n[ : , nearest_position_right : ] = np.nan

        n = np.flipud(n)
        plt.imsave(tiledImagePath , n , cmap = cmap , vmin = 0 , vmax = 1) 

    with open(tiledImagePath , 'rb') as fr:
        buffer = fr.read()
    output = io.BytesIO(buffer)
    
    return output

def get_wind_data(t , wind_axis):
    sqlFilePath = f'{dbDIR}/{dtime}/{wind_axis}wnd_925hPa.d01.{dtime}.sql'
    con = sqlite3.connect(sqlFilePath)
    cur = con.cursor()
    selected_columns = f'"ylat","xlng","{t}"'
    parameter_number = 2 if wind_axis == 'u' else 3

    q = f'SELECT {selected_columns} from {wind_axis}wnd_925hPa WHERE (ylat BETWEEN -1.256096 AND 27.709381) AND (xlng BETWEEN 85.16322 AND 115.44342)'
    cursor = cur.execute(q)
    values = np.float32(cursor.fetchall())
    y = np.unique(values[:,0])
    x = np.unique(values[:,1])
    z = values[:,2].reshape((len(y) , len(x)))
    f = RegularGridInterpolator((y , x) , z)
    x_ = np.arange(85.16322 + .2 , 115.44342 - .2, 0.1)
    y_ = np.arange(-1.256096 + .2 , 27.709381 - .2 , 0.1)
    xx , yy = np.meshgrid(x_ , y_)
    xy = np.array([yy.ravel(), xx.ravel()]).T
    zz = np.flipud(f(xy).reshape(xx.shape))
    zz = np.ravel(zz)
    con.close()
    wind_data = {}

    wind_data['header'] = {
                            "parameterCategory" : 2 ,
                            "parameterCategoryName" : "Momentum" ,
                            "parameterNumber" : parameter_number ,
                            "parameterNumberName" : f"{wind_axis.upper()}-component_of_wind" ,
                            "parameterUnit" : "m.s-1" ,
                            "gridUnits" : "degrees" ,
                            "resolution" : 18 , 
                            "winds" : "true" ,
                            "nx" : f'{len(x_)}' ,
                            "ny" : f'{len(y_)}' ,
                            "lo1" : float(x_.min()) ,
                            "la1" : float(y_.max()) ,
                            "dx" : 0.1 ,
                            "dy" : 0.1 ,
                        }
    
    wind_data['data'] = [float(_) for _ in zz]
    return wind_data

def set_json_wind(ts):
    xtimeForecast = datetime.strptime(ts , '%Y%m%d%H%M%S')
    dtimeForecast = xtimeForecast.strftime('%Y-%m-%dT%H:00:00')
    uwnd = get_wind_data(t = dtimeForecast, wind_axis = 'u')
    vwnd = get_wind_data(t = dtimeForecast, wind_axis = 'v')
    windSpeed = np.sqrt(np.float32(uwnd['data'])**2 + np.float32(vwnd['data'])**2)
    return [uwnd , vwnd ]

if __name__ == '__main__':
    get_tileMapping('202310190000' , 'prec' ,8,203,113)
    x = set_json_wind('202310190000')