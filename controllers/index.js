const auth = require('./authController');

const api = require('./apiController');
const user = require('./userController');
const apiController = require('./apiController');
const organization = require('./organizationController');
const branch = require('./branchController');
const department = require('./departmentController');
const warehouse = require('./warehouseController');
const uom = require('./uomController');
const itemCategory = require('./itemCategoryController');
const itemAttribute = require('./itemAttributeController');
const brand = require('./brandController');
const itemMaster = require('./itemMasterController');
const transactionNumber = require('./transactionNumberController');
const inventoryTransfer = require('./inventoryTransferController');
const goodsReceipt = require('./goodsReceiptController');
const goodsIssue = require('./goodsIssueController');
const report = require('./reportController');
const productionUnit = require('./productionUnitController');
const workCenter = require('./workCenterController');
const employee = require('./employeeController');
const designation = require('./designationController');
const machineCenter = require('./machineCenterController');
const billOfMaterials = require('./billOfMaterialsController');
const productionOrders = require('./productionOrderController');
const productionIssues = require('./productionIssueController');
const productionReceipts = require('./productionReceiptController');
const businessPartner = require('./businessPartnerController');
const salesOrder = require('./salesOrderController');
const salesDeliveryNote = require('./salesDeliveryNoteController');
const purchaseOrder = require('./purchaseOrderController');
const purchaseGoodsReceiptNote = require('./purchaseGoodsReceiptNoteController');
const material = require('./materialController');
const dashboard = require('./dashboardController');
const slittingPlan = require('./slittingPlanController');
const slittingOrder = require('./slittingOrderController');
const slittingIssue = require('./slittingIssueController');
const slittingReceipt = require('./slittingReceiptController');
const productionPlan = require('./productionPlanController');

const mobileApp = require('./mobileAppController');
module.exports = {
	api,
	auth,
	user,
	apiController,
	organization,
	branch,
	department,
	warehouse,
	uom,
	itemCategory,
	itemAttribute,
	brand,
	itemMaster,
	transactionNumber,
	inventoryTransfer,
	goodsReceipt,
	goodsIssue,
	report,
	productionUnit,
	workCenter,
	employee,
	designation,
	machineCenter,
	billOfMaterials,
	productionOrders,
	productionIssues,
	productionReceipts,
	businessPartner,
	salesOrder,
	salesDeliveryNote,
	purchaseOrder,
	purchaseGoodsReceiptNote,
	material,
	dashboard,
	mobileApp,
	slittingPlan,
	slittingOrder,
	slittingIssue,
	slittingReceipt,
	productionPlan
};
