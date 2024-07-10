from flask import Flask
from flask import Response
from flask_cors import CORS
from flask import jsonify

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Oh! Yeah..!!"

@app.route('/fcst/tiled/<string:ft>/<string:p>/<int:z>/<int:x>/<int:y>/')
def get_tile(ft , p , z , x , y):
    from controller.tilemapping import get_tileMapping
    tiled = get_tileMapping(str(ft) , p , z , x , y)
    return Response(tiled.getvalue(), mimetype='image/png')

@app.route('/streamlines/<string:ft>/')
def get_streamline_data(ft):
    from controller.tilemapping import set_json_wind
    wnd = set_json_wind(ft)
    return jsonify(wnd)
    
if __name__ == '__main__':
    app.run(debug = True , port = 8080) 