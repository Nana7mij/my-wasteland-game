const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:Jjh85779078@db.zujpmqardtdsxnfnflqc.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

// 兼容 better-sqlite3 风格的胶水层
const db = {
    prepare(sql) {
        let paramIndex = 1;
        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

        return {
            async get(...params) {
                const client = await pool.connect();
                try {
                    const result = await client.query(pgSql, params);
                    return result.rows[0];
                } finally {
                    client.release();
                }
            },
            async run(...params) {
                const client = await pool.connect();
                try {
                    const result = await client.query(pgSql, params);
                    return {
                        lastInsertRowid: result.rows[0]?.id || result.rows[0]?.user_id || null,
                        rowCount: result.rowCount
                    };
                } finally {
                    client.release();
                }
            }
        };
    }
};

console.log('✅ Supabase 连接池配置成功！');
module.exports = db;