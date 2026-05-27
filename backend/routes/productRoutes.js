const express = require('express');
const {
    listProductsHandler,
    getProductByIdHandler,
    createProductHandler,
    updateProductHandler,
    deleteProductHandler,
} = require('../controllers/productController');

const router = express.Router();

router.get('/', listProductsHandler);
router.post('/', createProductHandler);
router.get('/:id', getProductByIdHandler);
router.put('/:id', updateProductHandler);
router.delete('/:id', deleteProductHandler);

module.exports = router;
