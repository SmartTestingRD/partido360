const { pool } = require('./src/config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const http = require('http');

async function test() {
    try {
        const res = await pool.query("SELECT usuario_id, persona_id, rol_id FROM usuarios LIMIT 1");
        const user = res.rows[0];
        const roleRes = await pool.query("SELECT nombre FROM roles WHERE rol_id = $1", [user.rol_id]);
        const role = roleRes.rows[0].nombre;
        
        let lider_id = null;
        if (role === 'LIDER') {
            const lRes = await pool.query("SELECT lider_id FROM lideres WHERE persona_id = $1", [user.persona_id]);
            lider_id = lRes.rows[0].lider_id;
        }

        const token = jwt.sign({ usuario_id: user.usuario_id, persona_id: user.persona_id, rol_nombre: role, lider_id }, process.env.JWT_SECRET);
        
        console.log("Token:", token);
        
        const req = http.request('http://localhost:3001/api/dashboard', {
            method: 'GET',
            headers: {'Authorization': 'Bearer ' + token}
        }, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => console.log('RESPONSE:', data));
        });
        req.end();

    } catch (e) {
        console.error(e);
    }
}
test();
