const express = require('express');
const multer = require('multer');
const {
    listOrdersHandler,
    getOrderByIdHandler,
    createOrderHandler,
    updateOrderHandler,
    deleteOrderHandler,
    uploadCsvHandler,
} = require('../controllers/orderController');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', listOrdersHandler);
router.post('/', createOrderHandler);
router.post('/upload-csv', upload.single('file'), uploadCsvHandler);
router.get('/:id', getOrderByIdHandler);
router.put('/:id', updateOrderHandler);
router.delete('/:id', deleteOrderHandler);

module.exports = router;
