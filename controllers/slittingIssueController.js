const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const moment = require('moment');
const db = require('../models/index');
const paginate = require('express-paginate');

const { getNextDocumentNumber } = require('../helpers/helper');
const { validateInputs } = require('../helpers/validate');
const validationAttributes = require('../config/validation-attributes.json').slittingIssue;

exports.create = async (req, res, next) => {
	const { slittingIssue } = req.body;
	const { SlittingIssueItems } = slittingIssue;

	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		if (req.headers.user) slittingIssue.createdUser = req.headers.user;

		const nextDocNo = await getNextDocumentNumber('SLIS', slittingIssue.series);

		if (nextDocNo) slittingIssue.docNum = nextDocNo.nextNumber;

		slittingIssue.status = 'open';

		let month = moment(slittingIssue.docDate).month() + 1;
		let year = moment(slittingIssue.docDate).year();
		let quarter = moment(slittingIssue.docDate).quarter();

		slittingIssue.month = month;
		slittingIssue.year = year;
		slittingIssue.quarter = quarter;

		const newSlittingIssue = await db.SlittingIssue
			.create(slittingIssue, {
				transaction
			})
			.catch((e) => {
				console.log(e);
				throw e;
			});

		await insertSlittingIssueItems(
			SlittingIssueItems,
			newSlittingIssue.id,
			newSlittingIssue.slittingOrderId,
			transaction
		);

		await transaction.commit();

		return res.status(200).send({
			slittingIssue: newSlittingIssue,
			success: true,
			message: 'Success'
		});
	} catch (error) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();

		console.log(error);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: error && error.message ? error.message : error
		});
	}
};

exports.validate = async (req, res, next) => {
	let { slittingIssue } = req.body;

	const inputValidation = await validateInputs(slittingIssue, validationAttributes);

	if (!inputValidation.success) {
		return res.status(401).send({
			success: false,
			message: inputValidation.message,
			error: inputValidation.errors
		});
	}
	next();
};

exports.list = async (req, res, next) => {
	var filter = [];
	var include = [
		{
			model: db.Branch,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.SlittingOrder,
			attributes: [ 'id', 'series', 'docNum' ]
		}
	];

	if (req.query.hasOwnProperty('all')) {
		return res.send({
			slittingIssues: await db.SlittingIssue.findAll({
				include
			})
		});
	}

	if (req.query.filtered != undefined) {
		req.query.filtered = JSON.stringify(req.query.filtered);

		var filtered = JSON.parse(req.query.filtered);
		for (var i = 0; i < filtered.length; i++) {
			filtered[i] = JSON.parse(filtered[i]);
		}

		filter = filtered.map((data) => {
			if (data.param == 'statusId') {
				return {
					[data.param]: {
						[Op.eq]: data.value
					}
				};
			} else {
				return {
					[data.param]: {
						[Op.iLike]: `${data.value}%`
					}
				};
			}
		});
	}

	await db.SlittingIssue
		.findAndCountAll({
			include,
			distinct: true,
			limit: req.query.limit,
			offset: req.skip,
			where: filter,
			order: [ [ 'id', 'DESC' ] ]
		})
		.then(async (results) => {
			const itemCount = results.count;
			const pageCount = Math.ceil(results.count / req.query.limit);

			return res.send({
				slittingIssues: results.rows,
				pageCount,
				itemCount,
				pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
			});
		})
		.catch((error) => {
			console.log(error);
			return res.status(400).send({
				error: error
			});
		});
};

exports.getOne = async (req, res, next) => {
	const { id } = req.params;

	let filter = [];
	let include = [
		{
			model: db.SlittingIssueItem,
			attributes: [
				'id',
				'productId',
				'warehouseId',
				'oivlId',
				'issuedQuantity',
				'uomId',
				'plannedQuantity',
				'price',
				'total'
			],
			include: [
				{
					model: db.ItemMaster,
					attributes: [ 'id', 'code', 'name' ]
				},
				{
					model: db.UOM,
					attributes: [ 'id', 'code', 'name' ]
				},
				{
					model: db.Warehouse,
					attributes: [ 'id', 'code', 'name' ]
				},
				{
					model: db.OIVL,
					attributes: [ 'id', 'barcode' ]
				}
			]
		},
		{
			model: db.Branch,
			attributes: [ 'id', 'code', 'name' ]
		},
		{
			model: db.SlittingOrder,
			attributes: [ 'id', 'series', 'docNum' ]
		}
	];

	filter.push({
		id
	});

	await db.SlittingIssue
		.findOne({
			include,
			where: filter
		})
		.then(async (result) => {
			if (!result) {
				return res.status(400).send({
					success: false,
					message: 'Record not found'
				});
			}

			return res.send({
				slittingIssue: result,
				success: true,
				message: 'Success'
			});
		})
		.catch((error) => {
			console.log(error);
			return res.status(400).send({
				error,
				success: false,
				message: 'Action Failed'
			});
		});
};

exports.destroy = async (req, res, next) => {
	let transaction = await db.sequelize.transaction().catch((e) => {
		console.log(e);
		throw e;
	});

	try {
		const { id } = req.params;

		const slittingIssue = await db.SlittingIssue
			.findOne({
				where: {
					id
				},
				transaction,
				include: {
					model: db.SlittingIssueItem
				}
			})
			.catch((error) => {
				console.log(error);
				throw error;
			});

		if (!slittingIssue || !slittingIssue.SlittingIssueItems) {
			return res.status(404).send({
				message: 'record Not Found',
				success: false
			});
		}

		await slittingIssue
			.destroy({
				transaction
			})
			.catch((error) => {
				throw error;
			});

		for (let i = 0; i < slittingIssue.SlittingIssueItems.length; i++) {
			const item = slittingIssue.SlittingIssueItems[i];

			await resetOIVL(item.oivlId, item.coilWeight, transaction);
		}

		await transaction.commit();

		return res.status(204).send({
			message: 'Deleted Successfully.',
			success: true
		});
	} catch (error) {
		// Rollback transaction only if the transaction object is defined
		if (transaction) await transaction.rollback();

		console.log(error);
		return res.status(400).send({
			success: false,
			message: 'Failed',
			error: error && error.message ? error.message : error
		});
	}
};

const insertSlittingIssueItems = async (slittingIssueItems, slittingIssueId, slittingOrderId, transaction) => {
	console.log('########################## insertSlittingIssueItems ##############################');

	const slittingOrder = await db.SlittingOrder
		.findOne({
			where: {
				id: slittingOrderId
			},
			attributes: [ 'oivlId', 'coilWeight', 'id' ],
			transaction
		})
		.catch((e) => {
			throw e;
		});

	for (let i = 0; i < slittingIssueItems.length; i++) {
		const lineItem = slittingIssueItems[i];
		lineItem.slittingIssueId = slittingIssueId;

		await db.SlittingIssueItem
			.create(lineItem, {
				transaction
			})
			.catch((e) => {
				throw e;
			});

		// Reset the previous OIVL if the OIVL is changed
		if (lineItem.oivlId !== slittingOrder.oivlId) {
			await resetOIVL(slittingOrder.oivlId, slittingOrder.coilWeight, transaction);

			// Update the SLOR with new OIVL
			await slittingOrder
				.update(
					{
						oivlId: lineItem.oivlId,
						coilWeight: lineItem.coilWeight
					},
					{
						transaction
					}
				)
				.catch((e) => {
					throw e;
				});
		}

		// Update OIVL
		await updateOIVL(lineItem.oivlId, transaction);
	}
};

const updateOIVL = async (oivlId, transaction) => {
	console.log('########################## updateOIVL ##############################');

	const oivl = await db.OIVL
		.findOne({
			where: {
				id: oivlId,
				openQty: {
					[Op.gt]: 0
				}
			},
			transaction
		})
		.catch((e) => {
			throw e;
		});

	if (!oivl) throw new Error('Coil Number / Batch not found!');

	await oivl
		.update(
			{
				outQty: +oivl.outQty + +oivl.openQty,
				openQty: 0
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};

const resetOIVL = async (oivlId, coilWeight, transaction) => {
	console.log('########################## resetOIVL ##############################');

	const oivl = await db.OIVL
		.findOne({
			where: {
				id: oivlId
			},
			transaction
		})
		.catch((e) => {
			throw e;
		});

	if (!oivl) throw new Error('OIVL not found');

	// Update the OIVL
	await oivl
		.update(
			{
				openQty: coilWeight,
				outQty: +oivl.outQty - +coilWeight
			},
			{
				transaction
			}
		)
		.catch((e) => {
			throw e;
		});
};
