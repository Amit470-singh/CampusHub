const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { requireAuth, optionalAuth } = require('../middlewares/auth');

router.get('/', marketplaceController.getProducts);
router.post('/', requireAuth, marketplaceController.createProduct);
router.get('/:id', marketplaceController.getProductById);
router.put('/:id', requireAuth, marketplaceController.updateProduct);
router.delete('/:id', requireAuth, marketplaceController.deleteProduct);

module.exports = router;
