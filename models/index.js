'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

const config = require('../config/config.json')[env];
const db = {};

let sequelize;

console.log('env', env);

if (config.use_env_variable) {
	sequelize = new Sequelize(process.env[config.use_env_variable], {
		operatorsAliases: Op
	});
} else {
	try {
		// sequelize = new Sequelize(
		//   config.database,
		//   config.username,
		//   config.password,

		//   config,
		//   Object.assign({}, config, {
		//     port: 5432,
		//     operatorsAliases: Op,
		//     freezeTableName: true,
		//     timezone: config.timezone,
		//     pool: {
		//       max: 5,
		//       min: 0,
		//       acquire: 30000,
		//       idle: 10000,
		//     },
		//   }),
		// )

		sequelize = new Sequelize(
			config.database,
			config.username,
			config.password,
			{
				operatorsAliases: Op,
				freezeTableName: true,
				dialect: 'postgres',
				host: config.host,
				pool: {
					max: 5,
					min: 0,
					acquire: 30000,
					idle: 10000
				}
			}
			// config,
			// Object.assign({}, config, {
			//   operatorsAliases: Op,
			//   freezeTableName: true,
			//   pool: {
			//     max: 5,
			//     min: 0,
			//     acquire: 30000,
			//     idle: 10000,
			//   },
			// }),
		);

		console.log('config', config);

		sequelize
			.authenticate()
			.then(() => {
				console.log('Connection has been established successfully.');
			})
			.catch((err) => {
				console.log('###############################');
				console.error('Unable to connect to the database:', err);
			});
	} catch (error) {
		console.log('###############################', error);
	}
}

fs
	.readdirSync(__dirname)
	.filter((file) => {
		return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
	})
	.forEach((file) => {
		const model = sequelize['import'](path.join(__dirname, file));
		db[model.name] = model;
	});

Object.keys(db).forEach((modelName) => {
	if (db[modelName].associate) {
		db[modelName].associate(db);
	}
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
