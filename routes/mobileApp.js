var express = require("express");
var router = express.Router();

const mobileAppController = require("../controllers").mobileApp;

router.get("/", (req, res) =>
    res.status(200).send({
        message: "Welcome to the QSIF APP API v1!"
    })
);

router.post("/login", mobileAppController.login);

router.get("/production/orders", mobileAppController.productionOrderList);
router.get("/production/orders/:id", mobileAppController.getProductionOrder);
router.post("/production/orders/:productionOrderId/issue", mobileAppController.productionIssue);
router.get("/machine/allocations/week", mobileAppController.machineAllocations);
router.get("/oivls/:barcode", mobileAppController.getOIVLDetails);
router.put("/production/orders/:productionOrderId/actual/time", mobileAppController.updateMachineActualTime);
router.get("/production/receipts", mobileAppController.productionReceiptList);
router.get("/production/receipts/:id", mobileAppController.getProductionReceipt);
router.put("/production/receipts/:id/verify", mobileAppController.verifyProductionReceipt);


module.exports = router;