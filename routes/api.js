var express = require('express');
var router = express.Router();
const passport = require('passport');
const isAuthorized = require('../middleware/auth').isAuthorized;
const authController = require('../controllers').auth;
const userController = require('../controllers').user;
const organizationController = require('../controllers').organization;
const branchController = require('../controllers').branch;
const departmentController = require('../controllers').department;
const warehouseController = require('../controllers').warehouse;
const uomController = require('../controllers').uom;
const itemCategoryController = require('../controllers').itemCategory;
const itemAttributeController = require('../controllers').itemAttribute;
const brandController = require('../controllers').brand;
const itemMasterController = require('../controllers').itemMaster;
const transactionNumberController = require('../controllers').transactionNumber;
const inventoryTransferController = require('../controllers').inventoryTransfer;
const goodsReceiptController = require('../controllers').goodsReceipt;
const goodsIssueController = require('../controllers').goodsIssue;
const reportController = require('../controllers').report;
const productionUnitController = require('../controllers').productionUnit;
const workCenterController = require('../controllers').workCenter;
const employeeController = require('../controllers').employee;
const designationController = require('../controllers').designation;
const machineCenterController = require('../controllers').machineCenter;
const billOfMaterialsController = require('../controllers').billOfMaterials;
const productionOrderController = require('../controllers').productionOrders;
const productionIssueController = require('../controllers').productionIssues;
const productionReceiptController = require('../controllers').productionReceipts;
const businessPartnerController = require('../controllers').businessPartner;
const salesOrderController = require('../controllers').salesOrder;
const salesDeliveryNoteController = require('../controllers').salesDeliveryNote;
const purchaseOrderController = require('../controllers').purchaseOrder;
const purchaseGoodsReceiptNoteController = require('../controllers').purchaseGoodsReceiptNote;
const materialController = require('../controllers').material;
const dashboardController = require('../controllers').dashboard;
const apiController = require('../controllers').api;
const slittingPlanController = require('../controllers').slittingPlan;
const slittingOrder = require('../controllers').slittingOrder;
const slittingIssue = require('../controllers').slittingIssue;
const slittingReceipt = require('../controllers').slittingReceipt;
const productionPlan = require('../controllers').productionPlan;

const upload = require('../util/upload');
const excelUpload = require('../util/excelUpload');
/* GET users listing. */
router.get('/', (req, res) =>
	res.status(200).send({
		message: 'Welcome to the QSIF API v1!'
	})
);
router.post('/register', authController.register);
router.post('/auth', authController.auth);

//Use auth middleware for user authentication
// router.get("/users", isAuthorized, userController.list)
router.get('/users', userController.list);
router.post('/users', userController.create);
router.get('/users/:id', userController.getOne);
router.put('/users/:id', userController.update);
router.delete('/users/:id', userController.destroy);
router.get('/user/privileges/:id', userController.getUserPrivileges);

router.post('/organizations', organizationController.create);
router.get('/organizations', organizationController.list);
router.get('/organizations/:id', organizationController.getOne);
router.put('/organizations/:id', organizationController.update);
router.delete('/organizations/:id', organizationController.destroy);

router.get('/branches', branchController.list);
router.post('/branches', branchController.create);
router.get('/branches/:id', branchController.getOne);
router.put('/branches/:id', branchController.update);
router.delete('/branches/:id', branchController.destroy);

router.get('/departments', departmentController.list);
router.post('/departments', departmentController.create);
router.get('/departments/:id', departmentController.getOne);
router.put('/departments/:id', departmentController.update);
router.delete('/departments/:id', departmentController.destroy);

router.get('/warehouses', warehouseController.list);
router.post('/warehouses', upload.any(), warehouseController.create);
router.get('/warehouses/:id', warehouseController.getOne);
router.put('/warehouses/:id', upload.any(), warehouseController.update);
router.delete('/warehouses/:id', warehouseController.destroy);

router.get('/uoms', uomController.list);
router.post('/uoms', uomController.create);
router.get('/uoms/:id', uomController.getOne);
router.put('/uoms/:id', uomController.update);
router.delete('/uoms/:id', uomController.destroy);

router.get('/item/categories', itemCategoryController.list);
router.post('/item/categories', itemCategoryController.create);
router.get('/item/categories/:id', itemCategoryController.getOne);
router.put('/item/categories/:id', itemCategoryController.update);
router.delete('/item/categories/:id', itemCategoryController.destroy);
router.get('/item/category/types', itemCategoryController.categoryTypeList);
router.get('/item/category/types/:id', itemCategoryController.getOneCategoryTpe);

router.get('/item/attributes', itemAttributeController.list);
router.get('/item/attributes/list', itemAttributeController.completeList);
router.get('/item/dimension/attributes', itemAttributeController.dimensionList);
router.get('/item/property/attributes', itemAttributeController.propertyList);
router.post('/item/attributes', itemAttributeController.create);
router.get('/item/attributes/:id', itemAttributeController.getOne);
router.put('/item/attributes/:id', itemAttributeController.update);
router.delete('/item/attributes/:id', itemAttributeController.destroy);

router.get('/brands', brandController.list);
router.post('/brands', brandController.create);
router.get('/brands/:id', brandController.getOne);
router.put('/brands/:id', brandController.update);
router.delete('/brands/:id', brandController.destroy);

router.get('/item/masters', itemMasterController.list);
router.get('/item/masters/list', itemMasterController.completeList);
router.get('/item/masters/warehouse/list', itemMasterController.warehouseWiseItemList);
router.post('/item/masters', itemMasterController.create);
router.get('/item/masters/:id', itemMasterController.getOne);
router.put('/item/masters/:id', itemMasterController.update);
router.delete('/item/masters/:id', itemMasterController.destroy);
router.get('/item/masters/oivls/:itemMasterId/:warehouseId', itemMasterController.getOIVLs);
router.get('/item/masters/oivlBarcodes/:itemMasterId/:warehouseId', itemMasterController.getOIVLBarcodes);
router.get('/item/masters/oivlBundles/:itemMasterId/:warehouseId', itemMasterController.getOIVLBundles);
router.post('/item/masters/upload/excel', itemMasterController.uploadExcel);
router.post('/item/bom/upload/excel', itemMasterController.uploadBOMExcel);
router.get('/item/masters/stock/:itemMasterId/:warehouseId', itemMasterController.getStock);

router.get('/transaction/numbers', transactionNumberController.list);
router.get('/filtered/transaction/numbers', transactionNumberController.filteredList);

router.get('/inventory/transfers', inventoryTransferController.list);
router.post('/inventory/transfers', inventoryTransferController.create);
router.get('/inventory/transfers/:id', inventoryTransferController.getOne);
router.put('/inventory/transfers/:id', inventoryTransferController.update);
router.delete('/inventory/transfers/:id', inventoryTransferController.destroy);

router.get('/goods/receipts', goodsReceiptController.list);
router.post('/goods/receipts', goodsReceiptController.create);
router.get('/goods/receipts/:id', goodsReceiptController.getOne);
router.put('/goods/receipts/:id', goodsReceiptController.update);
router.delete('/goods/receipts/:id', goodsReceiptController.destroy);
router.post('/goods/receipts/upload/excel', goodsReceiptController.uploadInventoryExcel);
router.post('/goods/receipts/upload/inventory/:type', goodsReceiptController.importInventoryFromExcel);
// router.post("/goods/receipts/upload/semi/finished/inventory", goodsReceiptController.importSemiFinishedInventoryFromExcel);
// router.post("/goods/receipts/upload/finished/inventory", goodsReceiptController.importFinishedInventoryFromExcel);
router.post('/goods/receipts/update/warehouse/price', goodsReceiptController.updateWarehouseItemPriceTemp);
router.post(
	'/goods/receipts/update/warehouse/quantity/:warehouseId/:typeId',
	goodsReceiptController.updateWarehouseItemQtyTemp
);

router.get('/goods/issues', goodsIssueController.list);
router.post('/goods/issues', goodsIssueController.create);
router.get('/goods/issues/:id', goodsIssueController.getOne);
router.put('/goods/issues/:id', goodsIssueController.update);
router.delete('/goods/issues/:id', goodsIssueController.destroy);

router.get('/production/units', productionUnitController.list);
router.post('/production/unit', productionUnitController.create);
router.get('/production/unit/:id', productionUnitController.getOne);
router.put('/production/unit/:id', productionUnitController.update);
router.delete('/production/unit/:id', productionUnitController.destroy);

router.get('/work/centers', workCenterController.list);
router.post('/work/center', workCenterController.create);
router.get('/work/center/groups', workCenterController.workCenterGrouplist);
router.get('/work/center/:id', workCenterController.getOne);
router.put('/work/center/:id', workCenterController.update);
router.delete('/work/center/:id', workCenterController.destroy);

router.get('/employees', employeeController.list);
router.post('/employee', upload.any(), employeeController.create);
router.get('/employee/:id', employeeController.getOne);
router.put('/employee/:id', upload.any(), employeeController.update);
router.delete('/employee/:id', employeeController.destroy);

router.get('/designations', designationController.list);
router.post('/designations', designationController.create);
router.get('/designations/:id', designationController.getOne);
router.put('/designations/:id', designationController.update);
router.delete('/designations/:id', designationController.destroy);

router.get('/machine/centers', machineCenterController.list);
router.post('/machine/center', machineCenterController.create);
router.get('/machine/center/:id', machineCenterController.getOne);
router.put('/machine/center/:id', machineCenterController.update);
router.delete('/machine/center/:id', machineCenterController.destroy);

router.get('/bill/of/materials', billOfMaterialsController.list);
router.post('/bill/of/materials', billOfMaterialsController.create);
router.get('/bill/of/materials/:id', billOfMaterialsController.getOne);
router.put('/bill/of/materials/:id', billOfMaterialsController.update);
router.delete('/bill/of/materials/:id', billOfMaterialsController.destroy);
router.get('/bill/of/materials/product/:productId', billOfMaterialsController.getOneBasedOnProduct);
router.get('/bill/of/materials/:itemMasterId/:uomId/cost', billOfMaterialsController.getProductCost);

router.get('/production/orders', productionOrderController.list);
router.get('/production/orders/released', productionOrderController.releasedList);
router.get('/production/types', productionOrderController.productionTypeList);
router.post('/production/orders', productionOrderController.create);
router.get('/production/orders/:id', productionOrderController.getOne);
router.put('/production/orders/:id', productionOrderController.update);
router.delete('/production/orders/:id', productionOrderController.destroy);
router.get('/consumption/types', apiController.productionConsumptionList);
router.put('/production/orders/close/:id', productionOrderController.close);
router.post('/production/orders/bulk/close', productionOrderController.bulkClose);
router.put('/production/orders/release/:id', productionOrderController.release);
router.get('/production/orders/machine/allocation/:id', productionOrderController.checkMachineAllocation);
router.get('/production/order/statuswise/report', productionOrderController.statusWiseReport);
router.post('/production/order/production/plan/by/category', productionOrderController.getProductionPlanByCategory);
router.post('/production/order/create/from/category', productionOrderController.createProductionOrderFromCategory);
router.get(
	'/production/orders/reschedule/machine/allocation/:id',
	productionOrderController.checkMachineAllocationForReschedule
);
router.put('/production/orders/reschedule/:id', productionOrderController.reschedule);

router.get('/production/issues', productionIssueController.list);
router.post('/production/issues', productionIssueController.create);
router.get('/production/issues/:id', productionIssueController.getOne);
router.put('/production/issues/:id', productionIssueController.update);
router.delete('/production/issues/:id', productionIssueController.destroy);

router.get('/production/receipts', productionReceiptController.list);
router.post('/production/receipts', productionReceiptController.create);
router.get('/production/receipts/:id', productionReceiptController.getOne);
router.put('/production/receipts/:id', productionReceiptController.update);
router.delete('/production/receipts/:id', productionReceiptController.destroy);
router.post('/production/receipts/generate/bundles', productionReceiptController.generateBundleNumbers);
router.put('/production/receipts/rebundle/:id', productionReceiptController.rebundle);

router.get('/business/partners', businessPartnerController.list);
router.post('/business/partners', businessPartnerController.create);
router.get('/business/partners/:id', businessPartnerController.getOne);
router.put('/business/partners/:id', businessPartnerController.update);
router.delete('/business/partners/:id', businessPartnerController.destroy);

router.get('/sales/orders', salesOrderController.list);
router.post('/sales/orders', salesOrderController.create);
router.get('/sales/orders/:id', salesOrderController.getOne);
router.put('/sales/orders/:id', salesOrderController.update);
router.delete('/sales/orders/:id', salesOrderController.destroy);
router.post('/sales/orders/get/production/plan', salesOrderController.getProductionPlan);
router.get('/sales/order/items', salesOrderController.ItemList);
router.get('/open/sales/orders', salesOrderController.openSalesOrders);
router.post('/sales/orders/create/production/order', salesOrderController.createProductionOrders);
router.post('/import/sales/orders/excel', excelUpload.any(), salesOrderController.importSalesOrders);
router.put('/sales/orders/:id/close', salesOrderController.close);
// router.get("/import/sales/orders/google/drive", salesOrderController.importSalesOrdersFromGoogleDrive);

router.get('/sales/delivery/notes', salesDeliveryNoteController.list);
router.post('/sales/delivery/note', salesDeliveryNoteController.create);
router.get('/sales/delivery/note/:id', salesDeliveryNoteController.getOne);
router.put('/sales/delivery/note/:id', salesDeliveryNoteController.update);
router.delete('/sales/delivery/note/:id', salesDeliveryNoteController.destroy);

router.get('/purchase/goods/receipt/notes', purchaseGoodsReceiptNoteController.list);
router.post('/purchase/goods/receipt/note', purchaseGoodsReceiptNoteController.create);
router.get('/purchase/goods/receipt/note/:id', purchaseGoodsReceiptNoteController.getOne);
router.put('/purchase/goods/receipt/note/:id', purchaseGoodsReceiptNoteController.update);
router.delete('/purchase/goods/receipt/note/:id', purchaseGoodsReceiptNoteController.destroy);

router.get('/materials', materialController.list);
router.post('/materials', materialController.create);
router.get('/materials/:id', materialController.getOne);
router.put('/materials/:id', materialController.update);
router.delete('/materials/:id', materialController.destroy);

router.get('/countries', apiController.countryList);
router.get('/currencies', apiController.currencyList);
router.get('/routing/stages', apiController.routingStagesList);
router.get('/modules', apiController.modulesList);
router.get('/uom/types', apiController.uomTypeList);
router.get('/item/materials', apiController.itemMaterialList);
router.get('/item/management/types', apiController.itemManagementTypeList);

router.get('/purchase/orders', purchaseOrderController.list);
router.post('/purchase/orders', purchaseOrderController.create);
router.get('/purchase/orders/:id', purchaseOrderController.getOne);
router.put('/purchase/orders/:id', purchaseOrderController.update);
router.delete('/purchase/orders/:id', purchaseOrderController.destroy);

router.get('/slitting/plans', slittingPlanController.list);
router.post('/slitting/plans', slittingPlanController.validate, slittingPlanController.create);
router.get('/slitting/plans/:id', slittingPlanController.getOne);
router.delete('/slitting/plans/:id', slittingPlanController.destroy);

router.get('/slitting/orders', slittingOrder.list);
router.post('/slitting/orders', slittingOrder.validate, slittingOrder.create);
router.get('/slitting/orders/:id', slittingOrder.getOne);
router.delete('/slitting/orders/:id', slittingOrder.destroy);

router.get('/slitting/issues', slittingIssue.list);
router.post('/slitting/issues', slittingIssue.validate, slittingIssue.create);
router.get('/slitting/issues/:id', slittingIssue.getOne);
router.delete('/slitting/issues/:id', slittingIssue.destroy);

router.get('/slitting/receipts', slittingReceipt.list);
router.post('/slitting/receipts', slittingReceipt.validate, slittingReceipt.create);
router.get('/slitting/receipts/:id', slittingReceipt.getOne);
router.delete('/slitting/receipts/:id', slittingReceipt.destroy);

router.get('/production/plan/product/details/:itemMasterId/:warehouseId', productionPlan.getProductDetails);
router.get('/production/plans', productionPlan.list);
router.post('/production/plans', productionPlan.validate, productionPlan.create);
router.get('/production/plans/:id', productionPlan.getOne);
router.delete('/production/plans/:id', productionPlan.destroy);
router.get('/production/plan/convert/to/MT/:itemMasterId/:quantity', productionPlan.convertPiecesToMT);

router.get('/dashboard', dashboardController.dashboard);
router.get('/machine/allocation/per/day', dashboardController.machineAllocationsPerDay);

//Reports
router.get('/inventory/reports', reportController.inventoryReport);
router.get('/report/inventory/batch', reportController.inventoryBatchReport);
router.get('/production/order/machine/allocations', reportController.machineAllocations);
router.get('/report/bill/of/materials', reportController.billOfMaterials);
router.get('/report/production/orders', reportController.productionOrders);
router.get('/report/bom/components/used', reportController.bomComponentsUsedReport);
router.get('/report/oivls/used', reportController.oivlUsedInProductionIssue);
router.get('/report/allocation/load', reportController.allocationLoad);
router.get('/report/production/statement', reportController.productionStatement);
router.get('/report/production/analysis', reportController.productionAnalysis);
router.get('/report/production/costing', reportController.productionCosting);
router.get('/report/production/shortage', reportController.productionShortage);
router.get('/report/wip/valuation', reportController.wipValuation);
router.get('/report/fg/valuation', reportController.fgValuation);
router.get('/report/minimum/stock', reportController.minimumStockReport);
router.get('/purchase/plan/report', reportController.purchasePlans);
router.get('/report/daily/production', reportController.dailyProduction);
router.get('/report/excel/test', reportController.testExcel);
router.get('/report/sales/orders', reportController.salesOrders);
router.get('/report/sales/delivery/notes', reportController.salesDeliveryNotes);
router.get('/report/purchase/orders', reportController.purchaseOrders);
router.get('/report/purchase/goods/receipt/notes', reportController.purchaseGoodsReceiptNotes);
router.get('/report/scrap', reportController.scrapReport);
router.get('/report/damage', reportController.damageReport);
module.exports = router;
