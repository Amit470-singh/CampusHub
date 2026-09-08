/**
 * CAMPUSHUB MARKETPLACE CONTROLLER
 * Full CRUD, product search, details, and seller ownership verification.
 */

const db = require('../../../database/db');

exports.getProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const products = await db.getProducts(category || 'all', search || '');
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product listing not found.' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { title, category, price, desc, img, condition } = req.body;
    if (!title || !price) {
      return res.status(400).json({ success: false, message: 'Title and price are required' });
    }

    const sellerId = req.user ? req.user.id : null;
    const seller = req.user ? req.user.name : (req.body.seller || 'Student Seller');

    const newProduct = await db.createProduct({
      title,
      category,
      price,
      desc,
      img,
      condition,
      seller
    }, sellerId);

    res.status(201).json({ success: true, message: 'Item listed successfully', data: newProduct });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const result = await db.updateProduct(req.params.id, req.body, req.user.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product updated successfully', data: result });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the original seller can modify this listing.' });
    }
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const result = await db.deleteProduct(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED_OWNER') {
      return res.status(403).json({ success: false, message: 'Only the original seller can delete this listing.' });
    }
    next(error);
  }
};
